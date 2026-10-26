import { GoogleGenAI } from "@google/genai";
import { NextResponse } from "next/server";

import { cursorModelAvailable } from "@/lib/cursor-translate";
import { geminiErrorMessage, isAuthError, isModelMissingError } from "@/lib/gemini-error";
import { DEFAULT_GEMINI_MODEL, isCursorModel, isModelId, modelOptions } from "@/lib/models";

export async function GET(request: Request) {
  const configured = process.env.GEMINI_MODEL?.trim() || DEFAULT_GEMINI_MODEL;
  const requested = new URL(request.url).searchParams.get("model")?.trim();
  const model = requested && isModelId(requested) ? requested : configured;
  const models = modelOptions(configured);

  if (isCursorModel(model)) {
    return cursorHealth(model, configured, models);
  }

  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) {
    return NextResponse.json({
      apiOk: false,
      modelOk: false,
      provider: "gemini",
      model,
      defaultModel: configured,
      models,
      message: "GEMINI_API_KEY is not set. Add it to .env.local.",
    });
  }

  try {
    const ai = new GoogleGenAI({ apiKey });
    await ai.models.get({ model });
    return NextResponse.json({
      apiOk: true,
      modelOk: true,
      provider: "gemini",
      model,
      defaultModel: configured,
      models,
      message: `Gemini API OK, model ${model} is available.`,
    });
  } catch (error) {
    const detail = geminiErrorMessage(error);
    if (isAuthError(detail)) {
      return NextResponse.json({
        apiOk: false,
        modelOk: false,
        provider: "gemini",
        model,
        defaultModel: configured,
        models,
        message: "Gemini rejected the API key. Check GEMINI_API_KEY in .env.local.",
      });
    }
    if (isModelMissingError(detail)) {
      return NextResponse.json({
        apiOk: true,
        modelOk: false,
        provider: "gemini",
        model,
        defaultModel: configured,
        models,
        message: `Gemini API OK, but model ${model} was not found.`,
      });
    }
    return NextResponse.json({
      apiOk: false,
      modelOk: false,
      provider: "gemini",
      model,
      defaultModel: configured,
      models,
      message: `Cannot reach Gemini: ${detail}`,
    });
  }
}

async function cursorHealth(model: string, configured: string, models: string[]) {
  const apiKey = process.env.CURSOR_API_KEY?.trim();
  if (!apiKey) {
    return NextResponse.json({
      apiOk: false,
      modelOk: false,
      provider: "cursor",
      model,
      defaultModel: configured,
      models,
      message: "CURSOR_API_KEY is not set. Add it to .env.local.",
    });
  }

  try {
    const available = await cursorModelAvailable(apiKey, model);
    if (!available) {
      return NextResponse.json({
        apiOk: true,
        modelOk: false,
        provider: "cursor",
        model,
        defaultModel: configured,
        models,
        message: `Cursor API OK, but model ${model} was not found.`,
      });
    }
    return NextResponse.json({
      apiOk: true,
      modelOk: true,
      provider: "cursor",
      model,
      defaultModel: configured,
      models,
      message: `Cursor API OK, model ${model} is available.`,
    });
  } catch (error) {
    const detail = error instanceof Error ? error.message : "Cursor request failed";
    return NextResponse.json({
      apiOk: false,
      modelOk: false,
      provider: "cursor",
      model,
      defaultModel: configured,
      models,
      message: `Cannot reach Cursor: ${detail}`,
    });
  }
}
