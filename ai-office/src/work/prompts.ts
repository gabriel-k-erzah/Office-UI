import type { OllamaMessage } from "../ai/ollama";
import { buildChatPrompt } from "../ai/teamChat";
import { canDelegate, type AgentProfile } from "../ui/agents/profile";
import type { ChatMessage, Task } from "../ui/data/types";
import type { LibraryDoc } from "./library";

// Prompts and JSON schemas for each kind of turn an agent takes. Ollama holds
// the model to the schema, so the engine can act on the answer.

const MAX_PLAN = 4;

const shelf = (docs: LibraryDoc[]) =>
  docs.length
    ? docs.map((d) => `- ${d.meta.title} (${d.file})${d.excerpt ? `: ${d.excerpt}` : ""}`).join("\n")
    : "(the library is empty)";

const roster = (team: AgentProfile[]) =>
  team.map((p) => `- ${p.name}: ${p.title || p.role}. ${p.description}`.trim()).join("\n");

// ─────────────────────────────
// Team chat replies
// ─────────────────────────────

export type ChatTurn = {
  reply: string;
  document: { wanted: boolean; title: string; notes: string };
};

export const chatTurnSchema = {
  type: "object",
  properties: {
    reply: { type: "string" },
    document: {
      type: "object",
      properties: {
        wanted: { type: "boolean" },
        title: { type: "string" },
        notes: { type: "string" },
      },
      required: ["wanted", "title", "notes"],
    },
  },
  required: ["reply", "document"],
};

export function chatTurnPrompt(args: {
  agent: AgentProfile;
  team: AgentProfile[];
  tasks: Task[];
  history: ChatMessage[];
  library: LibraryDoc[];
  librarian?: AgentProfile;
}): OllamaMessage[] {
  const { agent, librarian, library } = args;
  const [system, ...turns] = buildChatPrompt(args);
  const keeper =
    agent.role === "librarian"
      ? "You keep the library, so you file documents yourself."
      : librarian
        ? `Only ${librarian.name}, the librarian, can write to the library: if you set document.wanted, you'll take your notes to them in the library.`
        : "There's no librarian in today, so nothing can be filed.";

  return [
    {
      role: "system",
      content: [
        system.content,
        "",
        "## The library",
        "The team's documents (titles and summaries):",
        shelf(library),
        "",
        "## How to answer",
        "Answer as JSON. Put your chat message in `reply`.",
        "Set document.wanted to true only if the user asks you to document, write up or save something to the library.",
        "Then give it a short title and put the content in document.notes as Markdown (headings and bullet points). Otherwise leave title and notes empty.",
        keeper,
      ].join("\n"),
    },
    ...turns,
  ];
}

// ─────────────────────────────
// The manager's plan
// ─────────────────────────────

export type PlanTurn = {
  thinking: string;
  reply: string;
  tasks: { title: string; assignee: string; brief: string; document: boolean }[];
};

export function planSchema(team: AgentProfile[]) {
  return {
    type: "object",
    properties: {
      thinking: { type: "string" },
      reply: { type: "string" },
      tasks: {
        type: "array",
        maxItems: MAX_PLAN,
        items: {
          type: "object",
          properties: {
            title: { type: "string" },
            assignee: { type: "string", enum: team.map((p) => p.name) },
            brief: { type: "string" },
            document: { type: "boolean" },
          },
          required: ["title", "assignee", "brief", "document"],
        },
      },
    },
    required: ["thinking", "reply", "tasks"],
  };
}

export function planPrompt(args: {
  agent: AgentProfile;
  team: AgentProfile[];
  tasks: Task[];
  history: ChatMessage[];
  library: LibraryDoc[];
}): OllamaMessage[] {
  const { agent, team, library } = args;
  const [system, ...turns] = buildChatPrompt(args);
  const librarian = team.find((p) => p.role === "librarian");
  const others = team.filter((p) => p.id !== agent.id && canDelegate(p) === false);

  return [
    {
      role: "system",
      content: [
        system.content,
        "",
        "## Planning and delegating",
        "You can turn the user's goals into tasks for the team. Answer as JSON.",
        "1. `thinking`: reason it through first, in a few sentences. What is the user actually asking for? Is it work, or just a question or chat?",
        "   If it's work: what are the steps, in what order, who on the team is best suited to each (by role and skills), and which results are worth keeping in the library?",
        `2. \`tasks\`: only when the user gives you work. At most ${MAX_PLAN}, usually 1 to 3, in the order they should happen. Each has:`,
        "   - title: short and specific, starting with a verb",
        "   - assignee: the one person best suited (use their name exactly)",
        "   - brief: two or three sentences on what to do and what a good result looks like",
        "   - document: true if the result should be written up and filed in the library",
        "   Don't make tasks just for filing or formatting: setting document=true is enough, the result goes to the librarian automatically.",
        "   Only give the librarian a task if it's about the library itself (e.g. tidying or summarising what's there).",
        "   For questions or small talk, leave `tasks` empty and just reply.",
        "3. `reply`: your team chat message. If you made tasks, say who's doing what, by name, in one to three sentences.",
        "",
        "## Your team",
        roster(others),
        librarian
          ? `${librarian.name} keeps the library: anyone's results marked document=true get taken to them to file.`
          : "There's no librarian in today, so nothing can be filed.",
        "",
        "## The library",
        shelf(library),
      ].join("\n"),
    },
    ...turns,
  ];
}

// ─────────────────────────────
// Working on a task
// ─────────────────────────────

export const pickReadingSchema = (docs: LibraryDoc[]) => ({
  type: "object",
  properties: {
    read: { type: "array", maxItems: 2, items: { type: "string", enum: docs.map((d) => d.file) } },
  },
  required: ["read"],
});

export function pickReadingPrompt(agent: AgentProfile, task: Task, docs: LibraryDoc[]): OllamaMessage[] {
  return [
    { role: "system", content: agent.systemPrompt },
    {
      role: "user",
      content: [
        `Your task: ${task.title}`,
        task.brief ?? "",
        "",
        "These documents are in the team library:",
        shelf(docs),
        "",
        "Which of them (at most two) would help with this task? Answer as JSON with their file names in `read`, or an empty list if none are relevant.",
      ].join("\n"),
    },
  ];
}

export type TaskResult = { notes: string; update: string; document: boolean };

export const taskResultSchema = {
  type: "object",
  properties: {
    notes: { type: "string" },
    update: { type: "string" },
    document: { type: "boolean" },
  },
  required: ["notes", "update", "document"],
};

export function taskPrompt(args: {
  agent: AgentProfile;
  task: Task;
  assignedBy?: AgentProfile;
  reading: { title: string; body: string }[];
}): OllamaMessage[] {
  const { agent, task, assignedBy, reading } = args;
  return [
    {
      role: "system",
      content: [
        agent.systemPrompt,
        "",
        "## Right now",
        "You can't browse the web, run code or edit project files yet. Work from what you know and from the library, and say clearly what would need checking.",
        "Answer as JSON:",
        "- `notes`: your actual work, in Markdown with headings and bullet points (about 120 to 350 words).",
        "- `update`: one or two sentences telling the team what you did or found.",
        "- `document`: true if your notes are worth keeping in the team library.",
      ].join("\n"),
    },
    {
      role: "user",
      content: [
        `${assignedBy ? `${assignedBy.name} has asked you to` : "Your task:"} ${task.title}`,
        task.brief ? `Brief: ${task.brief}` : "",
        ...reading.map((doc) => `\n--- From the library: ${doc.title} ---\n${doc.body}`),
      ].join("\n"),
    },
  ];
}

// ─────────────────────────────
// Filing with the librarian
// ─────────────────────────────

export function handOverPrompt(requester: AgentProfile, librarian: AgentProfile, title: string, notes: string): OllamaMessage[] {
  return [
    { role: "system", content: requester.systemPrompt },
    {
      role: "user",
      content: [
        `You're in the library handing your notes on "${title}" to ${librarian.name}, the librarian, to write up and file.`,
        `Your notes start:\n${notes.slice(0, 700)}`,
        "",
        "In one or two sentences, in your own voice, ask them to file it and say what it covers. Plain text only, no name prefix.",
      ].join("\n"),
    },
  ];
}

// Before writing, the librarian checks the shelf: new document, or merge into one?
export const shelfCheckSchema = (docs: LibraryDoc[]) => ({
  type: "object",
  properties: { file: { type: "string", enum: ["new", ...docs.map((d) => d.file)] } },
  required: ["file"],
});

export function shelfCheckPrompt(librarian: AgentProfile, title: string, notes: string, docs: LibraryDoc[]): OllamaMessage[] {
  return [
    { role: "system", content: librarian.systemPrompt },
    {
      role: "user",
      content: [
        `New notes to file: "${title}"`,
        notes.slice(0, 900),
        "",
        "Already in the library:",
        shelf(docs),
        "",
        "Is there already a document on the same topic that these notes belong in? Answer as JSON: `file` is that document's file name, or \"new\" if this deserves its own document.",
      ].join("\n"),
    },
  ];
}

export type FilingTurn = { reply: string; title: string; file: string; body: string };

export const filingSchema = {
  type: "object",
  properties: {
    reply: { type: "string" },
    title: { type: "string" },
    file: { type: "string" },
    body: { type: "string" },
  },
  required: ["reply", "title", "file", "body"],
};

export function filingPrompt(args: {
  librarian: AgentProfile;
  requester: AgentProfile;
  title: string;
  notes: string;
  library: LibraryDoc[];
  // Set when merging into a document that's already filed.
  existing?: { file: string; title: string; body: string };
}): OllamaMessage[] {
  const { librarian, requester, title, notes, library, existing } = args;
  const self = requester.id === librarian.id;
  return [
    {
      role: "system",
      content: [
        librarian.systemPrompt,
        "",
        "## Filing",
        self
          ? "You're filing your own notes in the library."
          : `${requester.name} (${requester.title || requester.role}) has brought you notes to file in the library.`,
        existing
          ? `They belong in "${existing.title}" (${existing.file}), which is already filed. Merge the new notes into it: keep everything that's still right, add what's new, remove repetition.`
          : "Turn them into a clean Markdown document: a # title, a one-line summary in italics, then well-organised sections with headings and bullet points.",
        "Keep their facts and don't invent new ones. If something is uncertain in the notes, keep it marked as needing checking.",
        ...(existing
          ? []
          : ["Already in the library (don't reuse these file names):", shelf(library), ""]),
        "Answer as JSON:",
        "- `title`: the document title",
        existing ? `- \`file\`: "${existing.file}"` : "- `file`: a short file name, lowercase words joined by hyphens, ending .md",
        existing ? "- `body`: the full merged Markdown document" : "- `body`: the full Markdown document",
        self
          ? "- `reply`: one sentence for the team chat saying what you've filed."
          : `- \`reply\`: one or two sentences to ${requester.name}, in your own voice, saying what you've filed.`,
      ].join("\n"),
    },
    {
      role: "user",
      content: [
        existing ? `The document as it stands:\n\n${existing.body}\n\n---\n` : "",
        `Notes on "${title}" from ${requester.name}:\n\n${notes}`,
      ].join("\n"),
    },
  ];
}

// ─────────────────────────────
// Wrapping up a plan
// ─────────────────────────────

export function wrapUpPrompt(manager: AgentProfile, goal: string, done: { task: Task; who: string }[], filed: string[]): OllamaMessage[] {
  return [
    { role: "system", content: manager.systemPrompt },
    {
      role: "user",
      content: [
        `The team has finished the plan for: "${goal}"`,
        "",
        ...done.map(({ task, who }) => `- ${task.title} (${who}): ${task.result ? task.result.slice(0, 600) : "done"}`),
        filed.length ? `\nFiled in the library: ${filed.join(", ")}` : "",
        "",
        "Sum it up for the user in two or three sentences of plain text: what was done, anything that still needs checking, and what's in the library. No name prefix.",
      ].join("\n"),
    },
  ];
}
