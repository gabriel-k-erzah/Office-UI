import type { AgentProfile } from "../ui/agents/profile";
import type { ChatMessage, Task } from "../ui/data/types";
import type { OllamaMessage } from "./ollama";

// Turns the team chat into a prompt for one agent: their own system prompt, who
// else is in the office, what's on the board, and the recent conversation.

const HISTORY = 12;
// Chat replies should be short whatever the profile allows.
export const CHAT_MAX_TOKENS = 300;

export function buildChatPrompt({
  agent,
  team,
  tasks,
  history,
}: {
  agent: AgentProfile;
  team: AgentProfile[];
  tasks: Task[];
  history: ChatMessage[];
}): OllamaMessage[] {
  const nameOf = (id: string) =>
    id === "user" ? "The user" : team.find((p) => p.id === id)?.name ?? "Someone";

  const colleagues = team
    .filter((p) => p.id !== agent.id && p.status !== "offline")
    .map((p) => `- ${p.name}, ${p.title}`)
    .join("\n");

  const board = tasks
    .map((t) => `- ${t.title} (${nameOf(t.assigneeId)}, ${t.status})`)
    .join("\n");

  const system = [
    agent.systemPrompt,
    "",
    "## Team chat",
    "You're replying in the office's team chat. The user runs the office.",
    colleagues ? `Your colleagues:\n${colleagues}` : "",
    board ? `Current tasks:\n${board}` : "",
    "",
    `Reply as ${agent.name} only, in one to three short sentences of plain text.`,
    "Don't start with your name, don't use markdown, and don't describe actions in asterisks.",
    "You can't run tools from the chat yet: never claim you've already searched, run or changed anything.",
    "Say what you'd do next instead, and ask if something is unclear.",
  ].join("\n");

  const turns: OllamaMessage[] = history
    .filter((m) => !m.error && m.text.trim())
    .slice(-HISTORY)
    .map((m) =>
      m.authorId === agent.id
        ? { role: "assistant", content: m.text }
        : { role: "user", content: `${nameOf(m.authorId)}: ${m.text}` }
    );

  return [{ role: "system", content: system }, ...turns];
}

// Models sometimes echo the speaker label ("Iris: ...") or wrap the reply in quotes.
export function cleanReply(agent: AgentProfile, text: string) {
  return text
    .replace(new RegExp(`^\\s*${escape(agent.name)}\\s*:\\s*`, "i"), "")
    .replace(/^"([\s\S]*)"$/, "$1")
    .trim();
}

const escape = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

// A short line for the agent's office label.
export function excerpt(text: string, max = 46) {
  const flat = text.replace(/\s+/g, " ").trim();
  if (flat.length <= max) return flat;
  const cut = flat.slice(0, max);
  return `${cut.slice(0, cut.lastIndexOf(" ") > 20 ? cut.lastIndexOf(" ") : max)}…`;
}
