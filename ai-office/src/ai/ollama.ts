import { useSyncExternalStore } from "react";

import type { AgentProfile } from "../ui/agents/profile";

// Talks to a local Ollama (https://ollama.com) through the Vite proxy in
// vite.config.ts. Nothing leaves the machine.

const BASE = import.meta.env.VITE_OLLAMA_URL ?? "/ollama";

export type OllamaMessage = { role: "system" | "user" | "assistant"; content: string };

// ─────────────────────────────
// Connection status (one shared poller)
// ─────────────────────────────

export type OllamaStatus =
  | { state: "checking" }
  | { state: "online"; models: string[] }
  | { state: "offline" };

let status: OllamaStatus = { state: "checking" };
const listeners = new Set<() => void>();
let timer: number | undefined;

async function check() {
  try {
    const response = await fetch(`${BASE}/api/tags`);
    if (!response.ok) throw new Error(String(response.status));
    const body = (await response.json()) as { models?: { name: string }[] };
    const models = (body.models ?? []).map((m) => m.name);
    const same = status.state === "online" && status.models.join() === models.join();
    if (!same) status = { state: "online", models };
  } catch {
    if (status.state !== "offline") status = { state: "offline" };
  }
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  if (listeners.size === 1) {
    void check();
    timer = window.setInterval(check, 15_000);
  }
  return () => {
    listeners.delete(listener);
    if (!listeners.size) window.clearInterval(timer);
  };
}

export function useOllamaStatus() {
  return useSyncExternalStore(subscribe, () => status);
}

export function refreshOllamaStatus() {
  return check();
}

// ─────────────────────────────
// Which model an agent uses
// ─────────────────────────────

const strip = (name: string) => name.replace(/:latest$/, "");

// Agents set to a local model use it if it's installed. Everyone else (Claude
// and Codex aren't wired up yet) falls back to the first installed model.
export function resolveModel(profile: AgentProfile, installed: string[]) {
  if (!installed.length) return undefined;
  const { provider, id } = profile.model;
  if (provider === "local" && id.startsWith("ollama:")) {
    const wanted = id.slice("ollama:".length);
    const match = installed.find((name) => name === wanted || strip(name) === wanted || name.startsWith(`${wanted}:`));
    if (match) return { model: match, fallback: false };
  }
  return { model: installed[0], fallback: true };
}

export const displayModel = strip;

// ─────────────────────────────
// Chat (streamed)
// ─────────────────────────────

export async function streamChat({
  model,
  messages,
  temperature,
  maxTokens,
  signal,
  onToken,
}: {
  model: string;
  messages: OllamaMessage[];
  temperature: number;
  maxTokens: number;
  signal?: AbortSignal;
  onToken: (text: string) => void;
}): Promise<string> {
  const response = await fetch(`${BASE}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    signal,
    body: JSON.stringify({
      model,
      messages,
      stream: true,
      options: { temperature, num_predict: maxTokens },
    }),
  });

  if (!response.ok || !response.body) {
    const detail = await response.text().catch(() => "");
    throw new Error(detail || `Ollama answered ${response.status}`);
  }

  // Ollama streams one JSON object per line.
  const reader = response.body.pipeThrough(new TextDecoderStream()).getReader();
  let buffer = "";
  let full = "";

  for (;;) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += value;
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";
    for (const line of lines) {
      if (!line.trim()) continue;
      const chunk = JSON.parse(line) as { message?: { content?: string }; error?: string };
      if (chunk.error) throw new Error(chunk.error);
      const token = chunk.message?.content ?? "";
      if (token) {
        full += token;
        onToken(full);
      }
    }
  }

  return full;
}
