export function geminiErrorMessage(error: unknown): string {
  const raw = error instanceof Error ? error.message : "Gemini request failed";
  try {
    const parsed = JSON.parse(raw) as { error?: { message?: unknown; status?: unknown } };
    const message = parsed.error?.message;
    if (typeof message === "string" && message.trim()) return message.trim();
  } catch {
    // The SDK sometimes returns a plain string.
  }
  return raw;
}

export function isModelMissingError(message: string): boolean {
  return /404|not found|invalid model|model .* does not exist/i.test(message);
}

export function isAuthError(message: string): boolean {
  return /api key not valid|unauthenticated|api_key_invalid|permission denied/i.test(message);
}
