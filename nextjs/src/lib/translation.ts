export type WordTranslation = {
  word: string;
  translation: string;
  explanation: string | null;
};

export type TokenUsage = {
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
};

export type TranslationResult = {
  original_phrase: string;
  words: WordTranslation[];
  full_phrase_translation: string;
  token_usage: TokenUsage | null;
};

export const STRUCTURED_JSON_SYSTEM_SUPPLEMENT = `Your reply MUST be a single JSON object only — no markdown fences and no text before or after.
Use exactly these keys:
- "original_phrase": string (the source sentence as given by the user)
- "words": array of objects, each with "word", "translation", and optionally "explanation" (string or null)
- "full_phrase_translation": string (fluent translation of the whole sentence)

Do not include "token_usage"; the client fills it from API metadata.

Apply every linguistic rule from the instructions above; express the result only through this JSON.
`;

export const TRANSLATION_JSON_SCHEMA = {
  type: "object",
  properties: {
    original_phrase: { type: "string" },
    words: {
      type: "array",
      items: {
        type: "object",
        properties: {
          word: { type: "string" },
          translation: { type: "string" },
          explanation: { type: "string" },
        },
        required: ["word", "translation"],
      },
    },
    full_phrase_translation: { type: "string" },
  },
  required: ["original_phrase", "words", "full_phrase_translation"],
} as const;

function stripJsonFence(raw: string): string {
  const text = raw.trim();
  const match = text.match(/^```(?:json)?\s*\n?([\s\S]*?)\n?```\s*$/i);
  return match ? match[1].trim() : text;
}

export function parseTranslationJson(raw: string): TranslationResult {
  let data: unknown;
  try {
    data = JSON.parse(stripJsonFence(raw));
  } catch {
    throw new Error("Response was not valid JSON.");
  }

  if (!data || typeof data !== "object") {
    throw new Error("Expected a JSON object.");
  }

  const record = data as Record<string, unknown>;
  if (typeof record.original_phrase !== "string") {
    throw new Error('Missing string field "original_phrase".');
  }
  if (typeof record.full_phrase_translation !== "string") {
    throw new Error('Missing string field "full_phrase_translation".');
  }
  if (!Array.isArray(record.words)) {
    throw new Error('Missing array field "words".');
  }

  const words = record.words.map((item, index) => {
    if (!item || typeof item !== "object") {
      throw new Error(`words[${index}] is not an object.`);
    }
    const row = item as Record<string, unknown>;
    if (typeof row.word !== "string" || typeof row.translation !== "string") {
      throw new Error(`words[${index}] needs string "word" and "translation".`);
    }
    if (row.explanation != null && typeof row.explanation !== "string") {
      throw new Error(`words[${index}].explanation must be a string or null.`);
    }
    return {
      word: row.word,
      translation: row.translation,
      explanation: typeof row.explanation === "string" ? row.explanation : null,
    };
  });

  return {
    original_phrase: record.original_phrase,
    words,
    full_phrase_translation: record.full_phrase_translation,
    token_usage: null,
  };
}

export function formatTokenUsage(usage: TokenUsage | null | undefined): string | null {
  if (!usage) return null;
  if (usage.prompt_tokens === 0 && usage.completion_tokens === 0) return null;
  return `Tokens consumed: ${usage.prompt_tokens} prompt + ${usage.completion_tokens} generated = ${usage.total_tokens} total`;
}

export function formatElapsedSeconds(seconds: number | null): string | null {
  if (seconds == null || seconds < 0) return null;
  if (seconds >= 60) {
    const minutes = Math.floor(seconds / 60);
    const remainder = seconds % 60;
    return `Time taken: ${minutes}m ${remainder.toFixed(1)}s`;
  }
  return `Time taken: ${seconds.toFixed(1)} s`;
}
