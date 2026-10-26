"use client";

import { useEffect, useRef, useState } from "react";

import { LANGUAGE_CODES, getLanguage } from "@/lib/languages";
import { DEFAULT_GEMINI_MODEL, isCursorModel, modelOptions as defaultModelOptions } from "@/lib/models";
import {
  formatElapsedSeconds,
  formatTokenUsage,
  type TranslationResult,
} from "@/lib/translation";

type Health = {
  apiOk: boolean;
  modelOk: boolean;
  provider?: "gemini" | "cursor";
  model: string;
  defaultModel?: string;
  models: string[];
  message: string;
};

type Notice =
  | { kind: "error" | "warning"; message: string; raw?: string }
  | null;

const CHAR_COLUMNS = 5;

export function Translator() {
  const [languageCode, setLanguageCode] = useState("de-uk");
  const [model, setModel] = useState(DEFAULT_GEMINI_MODEL);
  const [modelOptions, setModelOptions] = useState<string[]>(defaultModelOptions());
  const [source, setSource] = useState("");
  const [health, setHealth] = useState<Health | null>(null);
  const [healthLoading, setHealthLoading] = useState(true);
  const [translating, setTranslating] = useState(false);
  const [result, setResult] = useState<TranslationResult | null>(null);
  const [elapsedSeconds, setElapsedSeconds] = useState<number | null>(null);
  const [notice, setNotice] = useState<Notice>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const appliedDefaultModel = useRef(false);
  const language = getLanguage(languageCode) ?? getLanguage("de-uk")!;

  useEffect(() => {
    const field = textareaRef.current;
    if (!field) return;
    field.focus();
    const end = field.value.length;
    field.setSelectionRange(end, end);
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    let switchedModel = false;

    fetch(`/api/health?model=${encodeURIComponent(model)}`, { signal: controller.signal })
      .then(async (response) => (await response.json()) as Health)
      .then((data) => {
        if (data.models?.length) {
          setModelOptions((current) => (sameModels(current, data.models) ? current : data.models));
        }
        if (!appliedDefaultModel.current) {
          appliedDefaultModel.current = true;
          const preferred = data.defaultModel?.trim();
          if (preferred && preferred !== model) {
            switchedModel = true;
            setModel(preferred);
            return;
          }
        }
        setHealth(data);
      })
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === "AbortError") return;
        setHealth({
          apiOk: false,
          modelOk: false,
          model,
          models: defaultModelOptions(),
          message: "Cannot reach the translation server.",
        });
      })
      .finally(() => {
        if (!controller.signal.aborted && !switchedModel) setHealthLoading(false);
      });

    return () => controller.abort();
  }, [model]);

  function focusSource(nextValue: string) {
    requestAnimationFrame(() => {
      const field = textareaRef.current;
      if (!field) return;
      field.focus();
      field.setSelectionRange(nextValue.length, nextValue.length);
    });
  }

  function appendCharacter(character: string) {
    setSource((current) => {
      const next = current + character;
      focusSource(next);
      return next;
    });
  }

  function changeLanguage(nextCode: string) {
    setLanguageCode(nextCode);
    setResult(null);
    setElapsedSeconds(null);
    setNotice(null);
    focusSource(source);
  }

  function changeModel(nextModel: string) {
    appliedDefaultModel.current = true;
    setHealthLoading(true);
    setModel(nextModel);
    setResult(null);
    setElapsedSeconds(null);
    setNotice(null);
  }

  async function translate() {
    const text = source.trim();
    if (!text || translating) return;

    setTranslating(true);
    setNotice(null);
    const started = performance.now();

    try {
      const response = await fetch("/api/translate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, languageCode, model }),
      });
      const data = (await response.json()) as {
        translation?: TranslationResult;
        error?: string;
        raw?: string;
        kind?: string;
      };

      if (!response.ok || !data.translation) {
        setNotice({
          kind: data.kind === "warning" ? "warning" : "error",
          message: data.error ?? "Translation request failed.",
          raw: data.raw,
        });
        return;
      }

      setResult(data.translation);
      setElapsedSeconds((performance.now() - started) / 1000);
      setSource("");
      focusSource("");
    } catch {
      setNotice({ kind: "error", message: "Could not reach the server." });
    } finally {
      setTranslating(false);
    }
  }

  const geminiModels = modelOptions.filter((option) => !isCursorModel(option));
  const cursorModels = modelOptions.filter((option) => isCursorModel(option));
  const canTranslate = Boolean(source.trim()) && health?.apiOk && health.modelOk && !translating;
  const tokenLine = formatTokenUsage(result?.token_usage);
  const elapsedLine = formatElapsedSeconds(elapsedSeconds);

  return (
    <div className="flex min-h-screen bg-white text-[#31333f]">
      <aside className="flex w-[21rem] shrink-0 flex-col gap-4 bg-[#f0f2f6] px-6 py-6">
        <label className="flex flex-col gap-1 text-sm">
          Model
          <select
            value={model}
            onChange={(event) => changeModel(event.target.value)}
            className="rounded-md border border-[#d5d7de] bg-white px-3 py-1.5 text-sm outline-none focus:border-[#ff4b4b] focus:ring-1 focus:ring-[#ff4b4b]"
          >
            <optgroup label="Gemini">
              {geminiModels.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </optgroup>
            <optgroup label="Cursor">
              {cursorModels.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </optgroup>
          </select>
        </label>

        <StatusBanner health={health} loading={healthLoading} model={model} />

        <label className="flex flex-col gap-1 text-sm">
          Language pair
          <select
            value={language.code}
            onChange={(event) => changeLanguage(event.target.value)}
            className="rounded-md border border-[#d5d7de] bg-white px-3 py-1.5 text-sm outline-none focus:border-[#ff4b4b] focus:ring-1 focus:ring-[#ff4b4b]"
          >
            {LANGUAGE_CODES.map((code) => (
              <option key={code} value={code}>
                {getLanguage(code)?.heading ?? code}
              </option>
            ))}
          </select>
        </label>

        {language.specialCharacters.length > 0 && (
          <div className="mt-2 border-t border-[#d5d7de] pt-4">
            <p className="mb-3 text-sm text-[#5c5f6e]">
              Special characters — click to append to the source text:
            </p>
            <div
              className="grid gap-2"
              style={{ gridTemplateColumns: `repeat(${CHAR_COLUMNS}, minmax(0, 1fr))` }}
            >
              {language.specialCharacters.map((character, index) => (
                <button
                  key={`${language.code}-${index}`}
                  type="button"
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => appendCharacter(character)}
                  className="rounded-md border border-[#d5d7de] bg-white px-2 py-1.5 text-sm hover:border-[#ff4b4b]"
                >
                  {character}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="border-t border-[#d5d7de]" />
      </aside>

      <main className="min-w-0 flex-1 px-6 py-8">
        <div className="mx-auto w-full max-w-3xl">
          <h1 className="text-4xl font-bold tracking-tight text-[#262730]">{language.heading}</h1>
          <p className="mt-2 text-sm text-[#808495]">{language.caption}</p>

          <label className="mt-6 flex flex-col gap-1 text-sm" htmlFor="source-text">
            {language.sourceLabel}
            <textarea
              id="source-text"
              ref={textareaRef}
              value={source}
              onChange={(event) => setSource(event.target.value)}
              placeholder={language.sourcePlaceholder}
              rows={7}
              className="min-h-[180px] resize-y rounded-md border border-[#d5d7de] bg-[#f0f2f6] px-3 py-2 text-base outline-none placeholder:text-[#808495] focus:border-[#ff4b4b] focus:ring-1 focus:ring-[#ff4b4b]"
            />
          </label>

          <button
            type="button"
            onClick={translate}
            disabled={!canTranslate}
            title={
              health?.apiOk && health.modelOk
                ? undefined
                : "Set the API key for this model and choose one that is available."
            }
            className="mt-4 rounded-md border border-transparent bg-[#ff4b4b] px-4 py-2 text-sm font-medium text-white hover:bg-[#ff2b2b] disabled:cursor-not-allowed disabled:border-[#e6e9ef] disabled:bg-[#f0f2f6] disabled:text-[#a0a4b0]"
          >
            {language.translateButton}
          </button>

          {translating && <p className="mt-4 text-sm text-[#5c5f6e]">Translating…</p>}

          {notice && (
            <div
              className={`mt-4 rounded-lg px-4 py-3 text-sm ${
                notice.kind === "warning"
                  ? "bg-[#fff4e5] text-[#8a5a00]"
                  : "bg-[#ffe8e6] text-[#9b1c1c]"
              }`}
            >
              <p>{notice.message}</p>
              {notice.raw && (
                <details className="mt-2">
                  <summary className="cursor-pointer">Raw model output</summary>
                  <pre className="mt-2 overflow-x-auto whitespace-pre-wrap rounded bg-white/70 p-2 text-xs">
                    {notice.raw}
                  </pre>
                </details>
              )}
            </div>
          )}

          {result && (
            <section className="mt-8">
              <h2 className="text-2xl font-semibold text-[#262730]">{language.translationHeading}</h2>
              <p className="mt-3">
                <span className="font-semibold">Original phrase:</span> {result.original_phrase}
              </p>
              <p className="mt-3 font-semibold">Words:</p>
              <ul className="mt-1 list-disc space-y-1 pl-5">
                {result.words.map((word, index) => (
                  <li key={`${word.word}-${index}`}>
                    <span className="font-semibold">{word.word}</span>
                    {" — "}
                    {word.translation}
                    {word.explanation ? (
                      <>
                        {" — "}
                        <em>{word.explanation}</em>
                      </>
                    ) : null}
                  </li>
                ))}
              </ul>
              <p className="mt-3">
                <span className="font-semibold">Full phrase translation:</span>{" "}
                {result.full_phrase_translation}
              </p>
              {tokenLine && <p className="mt-3 text-sm text-[#808495]">{tokenLine}</p>}
              {elapsedLine && <p className="text-sm text-[#808495]">{elapsedLine}</p>}
            </section>
          )}
        </div>
      </main>
    </div>
  );
}

function sameModels(left: string[], right: string[]): boolean {
  return left.length === right.length && left.every((item, index) => item === right[index]);
}

function StatusBanner({
  health,
  loading,
  model,
}: {
  health: Health | null;
  loading: boolean;
  model: string;
}) {
  if (loading && !health) {
    return (
      <div className="rounded-lg bg-white px-4 py-3 text-sm text-[#5c5f6e]">Checking model…</div>
    );
  }

  if (!health) return null;

  if (health.apiOk && health.modelOk) {
    return (
      <div className="rounded-lg bg-[#d8f3dc] px-4 py-3 text-sm text-[#146c43]">
        {health.provider === "cursor" ? "Cursor" : "Gemini"} API OK, model{" "}
        <span className="font-semibold">{model}</span> is available.
      </div>
    );
  }

  const tone = health.apiOk ? "bg-[#fff4e5] text-[#8a5a00]" : "bg-[#ffe8e6] text-[#9b1c1c]";
  return <div className={`rounded-lg px-4 py-3 text-sm ${tone}`}>{health.message}</div>;
}
