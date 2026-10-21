export type LanguagePair = {
  code: string;
  systemPrompt: string;
  heading: string;
  caption: string;
  sourceLabel: string;
  sourcePlaceholder: string;
  translateButton: string;
  translationHeading: string;
  specialCharacters: readonly string[];
  /** Schema already forces JSON, so the shared format addendum is skipped. */
  skipJsonSupplement?: boolean;
};

const PAIRS: Record<string, LanguagePair> = {
  "de-uk": {
    code: "de-uk",
    systemPrompt: `German→Ukrainian. One source token per row, in order; omit nothing.
Nouns: Ukrainian gloss; explanation=der/die/das, однина: nominative singular (Tag → der, однина: день).
Verbs: Ukrainian infinitive; explanation=infinitive, Präteritum, Perfekt (haben, hatte, hat gehabt).
Other words: context gloss; comma-separate senses. No prose.
Prefixed verbs stay one token (be- er- ver- zer- emp- ent- miss- wider- ein-). Separable verbs: base form in explanation.`,
    skipJsonSupplement: true,
    heading: "German → Ukrainian",
    caption: "Powered by Gemini.",
    sourceLabel: "German text",
    sourcePlaceholder: "Guten Tag, wie geht es Ihnen?",
    translateButton: "Translate to Ukrainian",
    translationHeading: "Translation",
    specialCharacters: ["ä", "ö", "ü", "ß", "Ä", "Ö", "Ü"],
  },
  "es-uk": {
    code: "es-uk",
    systemPrompt: `Spanish→Ukrainian. One source token per row, in order; omit nothing.
Nouns: Ukrainian gloss; explanation=el/la, однина: nominative singular (casa → la, однина: хата).
Verbs: Ukrainian infinitive; explanation starts with the Spanish infinitive, then gerund and participle (leer, leyendo, leído).
Other words: context gloss; comma-separate senses. No prose.`,
    skipJsonSupplement: true,
    heading: "Spanish → Ukrainian",
    caption: "Powered by Gemini.",
    sourceLabel: "Spanish text",
    sourcePlaceholder: "Hola, ¿cómo está usted?",
    translateButton: "Translate to Ukrainian",
    translationHeading: "Translation",
    specialCharacters: [
      "á",
      "é",
      "í",
      "ó",
      "ú",
      "ñ",
      "ü",
      "Á",
      "É",
      "Í",
      "Ó",
      "Ú",
      "Ñ",
      "Ü",
      "¿",
      "¡",
    ],
  },
  "fr-uk": {
    code: "fr-uk",
    systemPrompt: `French→Ukrainian. One source token per row, in order; omit nothing. Keep apostrophes and contractions as one token.
Nouns: Ukrainian gloss; explanation=le/la, однина: nominative singular (jour → le, однина: день).
Verbs: Ukrainian infinitive; explanation=infinitive, passé composé, imparfait (parler, a parlé, parlait).
Other words: context gloss; comma-separate senses. No prose.`,
    skipJsonSupplement: true,
    heading: "French → Ukrainian",
    caption: "Powered by Gemini.",
    sourceLabel: "French text",
    sourcePlaceholder: "Bonjour, comment allez-vous ?",
    translateButton: "Translate to Ukrainian",
    translationHeading: "Translation",
    specialCharacters: [
      "à",
      "â",
      "ä",
      "ç",
      "é",
      "è",
      "ê",
      "ë",
      "î",
      "ï",
      "ô",
      "ö",
      "ù",
      "û",
      "ü",
      "ÿ",
      "œ",
      "æ",
      "À",
      "Â",
      "Ä",
      "Ç",
      "É",
      "È",
      "Ê",
      "Ë",
      "Î",
      "Ï",
      "Ô",
      "Ö",
      "Ù",
      "Û",
      "Ü",
      "Ÿ",
      "Œ",
      "Æ",
    ],
  },
  "pl-uk": {
    code: "pl-uk",
    systemPrompt: `Polish→Ukrainian. One source token per row, in order; omit nothing.
Nouns: Ukrainian gloss; explanation=m./f./n., однина: nominative singular (dzień → m., однина: день).
Verbs: Ukrainian gloss; explanation=infinitive, 1sg present, past; note perfective/imperfective (czytać, czytam, czytał).
Other words: context gloss; comma-separate senses. No prose.`,
    skipJsonSupplement: true,
    heading: "Polish → Ukrainian",
    caption: "Powered by Gemini.",
    sourceLabel: "Polish text",
    sourcePlaceholder: "Dzień dobry, jak się Pan ma?",
    translateButton: "Translate to Ukrainian",
    translationHeading: "Translation",
    specialCharacters: [
      "ą",
      "ć",
      "ę",
      "ł",
      "ń",
      "ó",
      "ś",
      "ź",
      "ż",
      "Ą",
      "Ć",
      "Ę",
      "Ł",
      "Ń",
      "Ó",
      "Ś",
      "Ź",
      "Ż",
    ],
  },
  "uk-fr": {
    code: "uk-fr",
    systemPrompt: `Ukrainian→French. One source token per row, in order; omit nothing.
Nouns: French gloss; explanation=le/la, singulier: singular (день → le, singulier: jour).
Verbs: French gloss; explanation=infinitive, 1sg present, participle (читати → lire, je lis, lu).
Other words: context gloss; comma-separate senses. No prose.`,
    skipJsonSupplement: true,
    heading: "Ukrainian → French",
    caption: "Powered by Gemini.",
    sourceLabel: "Ukrainian text",
    sourcePlaceholder: "Привіт, як справи?",
    translateButton: "Translate to French",
    translationHeading: "Translation",
    specialCharacters: ["і", "ї", "є", "ґ", "І", "Ї", "Є", "Ґ", "'", "’"],
  },
};

export const LANGUAGE_CODES = Object.keys(PAIRS).sort();

export function getLanguage(code: string): LanguagePair | undefined {
  return PAIRS[code.trim().toLowerCase()];
}
