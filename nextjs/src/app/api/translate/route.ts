import { GoogleGenAI } from "@google/genai";
import { NextResponse } from "next/server";

import { translateWithCursor } from "@/lib/cursor-translate";
import { geminiErrorMessage } from "@/lib/gemini-error";
import { getLanguage } from "@/lib/languages";
import { DEFAULT_GEMINI_MODEL, isCursorModel, isModelId } from "@/lib/models";
import {
  STRUCTURED_JSON_SYSTEM_SUPPLEMENT,
  TRANSLATION_JSON_SCHEMA,
  parseTranslationJson,
  type TranslationResult,
} from "@/lib/translation";

type TranslateBody = {
  text?: unknown;
  languageCode?: unknown;
  model?: unknown;
};

export async function POST(request: Request) {
  let body: TranslateBody;
  try {
    body = (await request.json()) as TranslateBody;
  } catch {
    return NextResponse.json({ error: "Request body must be JSON." }, { status: 400 });
  }

  const text = typeof body.text === "string" ? body.text.trim() : "";
  if (!text) {
    return NextResponse.json({ error: "Enter text to translate." }, { status: 400 });
  }

  const languageCode = typeof body.languageCode === "string" ? body.languageCode : "de-uk";
  const language = getLanguage(languageCode);
  if (!language) {
    return NextResponse.json({ error: `Unknown language pair ${languageCode}.` }, { status: 400 });
  }

  const requestedModel = typeof body.model === "string" ? body.model.trim() : "";
  const model =
    requestedModel && isModelId(requestedModel)
      ? requestedModel
      : process.env.GEMINI_MODEL?.trim() || DEFAULT_GEMINI_MODEL;

  if (isCursorModel(model)) {
    const apiKey = process.env.CURSOR_API_KEY?.trim();
    if (!apiKey) {
      return NextResponse.json(
        { error: "CURSOR_API_KEY is not set. Add it to .env.local." },
        { status: 500 },
      );
    }

    try {
      const cursor = await translateWithCursor({
        apiKey,
        model,
        systemPrompt: language.systemPrompt,
        text,
      });
      if (!cursor.text) {
        return NextResponse.json(
          { error: "Model returned no text. Check the model name and try again.", kind: "warning" },
          { status: 502 },
        );
      }

      let translation: TranslationResult;
      try {
        translation = parseTranslationJson(cursor.text);
      } catch (error) {
        const message = error instanceof Error ? error.message : "Invalid JSON";
        return NextResponse.json(
          {
            error: `Model output did not match the expected JSON shape: ${message}`,
            raw: cursor.text,
          },
          { status: 422 },
        );
      }

      return NextResponse.json({ translation, model });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Cursor request failed";
      return NextResponse.json({ error: message }, { status: 502 });
    }
  }

  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) {
    return NextResponse.json(
      { error: "GEMINI_API_KEY is not set. Add it to .env.local." },
      { status: 500 },
    );
  }

  try {
    const ai = new GoogleGenAI({ apiKey });
    const response = await ai.models.generateContent({
      model,
      contents: text,
      config: {
        systemInstruction: language.skipJsonSupplement
          ? language.systemPrompt
          : `${language.systemPrompt}\n${STRUCTURED_JSON_SYSTEM_SUPPLEMENT}`,
        responseMimeType: "application/json",
        responseJsonSchema: TRANSLATION_JSON_SCHEMA,
      },
    });

    const raw = response.text?.trim() ?? "";
    if (!raw) {
      return NextResponse.json(
        {
          error: "Model returned no text. Check the model name and try again.",
          kind: "warning",
        },
        { status: 502 },
      );
    }

    let translation: TranslationResult;
    try {
      translation = parseTranslationJson(raw);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Invalid JSON";
      return NextResponse.json(
        {
          error: `Model output did not match the expected JSON shape: ${message}`,
          raw,
        },
        { status: 422 },
      );
    }

    const promptTokens = response.usageMetadata?.promptTokenCount ?? 0;
    const completionTokens = response.usageMetadata?.candidatesTokenCount ?? 0;
    if (promptTokens || completionTokens) {
      translation.token_usage = {
        prompt_tokens: promptTokens,
        completion_tokens: completionTokens,
        total_tokens: promptTokens + completionTokens,
      };
    }

    return NextResponse.json({ translation, model });
  } catch (error) {
    const message = geminiErrorMessage(error);
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
