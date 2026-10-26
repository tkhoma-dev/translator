export const DEFAULT_GEMINI_MODEL = "gemini-3.5-flash-lite";

export const GEMINI_MODEL_OPTIONS = [
  "gemini-3.8-flash",
  "gemini-3.6-flash",
  "gemini-3.5-flash-lite",
] as const;

export const CURSOR_MODEL_OPTIONS = ["composer-2.5", "grok-4.6"] as const;

export function isCursorModel(value: string): boolean {
  return (CURSOR_MODEL_OPTIONS as readonly string[]).includes(value);
}

export function modelOptions(preferred?: string): string[] {
  const extra = preferred?.trim();
  const options: string[] = [...GEMINI_MODEL_OPTIONS, ...CURSOR_MODEL_OPTIONS];
  if (extra && !options.includes(extra)) {
    options.unshift(extra);
  }
  return options;
}

export function isModelId(value: string): boolean {
  return /^[a-zA-Z0-9._:-]{1,80}$/.test(value);
}
