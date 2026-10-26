import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { Agent, Cursor } from "@cursor/sdk";

import { STRUCTURED_JSON_SYSTEM_SUPPLEMENT } from "@/lib/translation";

export async function cursorModelAvailable(apiKey: string, model: string): Promise<boolean> {
  const models = await Cursor.models.list({ apiKey });
  return models.some((item) => item.id === model);
}

export async function translateWithCursor(options: {
  apiKey: string;
  model: string;
  systemPrompt: string;
  text: string;
}): Promise<{ text: string }> {
  const cwd = await mkdtemp(join(tmpdir(), "translategemma-"));
  const result = await Agent.prompt(
    `${options.systemPrompt}\n${STRUCTURED_JSON_SYSTEM_SUPPLEMENT}\n\n${options.text}`,
    {
      apiKey: options.apiKey,
      model: { id: options.model },
      local: {
        cwd,
        settingSources: [],
      },
    },
  );

  if (result.status !== "finished") {
    throw new Error(`Cursor run ended with status ${result.status}.`);
  }

  return { text: result.result?.trim() ?? "" };
}
