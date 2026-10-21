import { rooms, type RoomName } from "../../game/rooms/roomConfig";
import type { AgentConfig } from "../../game/agents/Agent";

// ─────────────────────────────
// Profile model
// ─────────────────────────────

export type AgentRole =
  | "manager"
  | "researcher"
  | "developer"
  | "tester"
  | "designer"
  | "custom";

export type ToneId =
  | "professional"
  | "friendly"
  | "concise"
  | "playful"
  | "socratic"
  | "direct";

export type TraitKey =
  | "creativity"
  | "rigor"
  | "autonomy"
  | "verbosity"
  | "caution"
  | "collaboration";

export type ToolPermission = "allow" | "ask" | "block";

export type ToolId =
  | "readRepo"
  | "editFiles"
  | "runTests"
  | "terminal"
  | "webSearch"
  | "delegate"
  | "github";

export type ModelProvider = "claude" | "codex" | "local";

export type AgentStatus = "working" | "idle" | "offline";

export type HairStyle =
  | "short"
  | "side"
  | "long"
  | "bun"
  | "curly"
  | "buzz";

export type Accessory =
  | "none"
  | "glasses"
  | "headset"
  | "beanie";

export type AvatarConfig = {
  skin: string;
  hair: HairStyle;
  hairColour: string;
  outfit: string;
  accessory: Accessory;
  background: string;
  imageDataUrl?: string;
};

export type AgentProfile = {
  id: string;
  name: string;
  title: string;
  role: AgentRole;
  description: string;
  colour: string;
  homeRoom: RoomName;
  avatar: AvatarConfig;
  traits: Record<TraitKey, number>;
  tone: ToneId;
  quirks: string[];
  skills: string[];
  tools: Record<ToolId, ToolPermission>;
  model: {
    provider: ModelProvider;
    id: string;
    temperature: number;
    maxTokens: number;
    memory: boolean;
  };
  idleLines: string[];
  systemPrompt: string;
  systemPromptMode: "generated" | "custom";
  status: AgentStatus;
  activity: string;
  createdAt: number;
  updatedAt: number;
};

// ─────────────────────────────
// Catalogues
// ─────────────────────────────

export const traitInfo: Record<
  TraitKey,
  { label: string; low: string; high: string }
> = {
  creativity: { label: "Creativity", low: "Conventional", high: "Inventive" },
  rigor: { label: "Rigour", low: "Fast and loose", high: "Meticulous" },
  autonomy: { label: "Autonomy", low: "Checks in often", high: "Self-directed" },
  verbosity: { label: "Detail", low: "Brief", high: "Thorough" },
  caution: { label: "Caution", low: "Bold", high: "Risk-averse" },
  collaboration: { label: "Collaboration", low: "Solo", high: "Team player" },
};

export const traitKeys = Object.keys(traitInfo) as TraitKey[];

export const toneInfo: Record<
  ToneId,
  { label: string; description: string; sample: string }
> = {
  professional: {
    label: "Professional",
    description: "Clear, measured and polite.",
    sample: "I've reviewed the request. Here is the proposed approach and the main risks.",
  },
  friendly: {
    label: "Friendly",
    description: "Warm and encouraging.",
    sample: "Great idea! I've had a look and I think we can get this done today.",
  },
  concise: {
    label: "Concise",
    description: "Short answers, no filler.",
    sample: "Done. Three APIs fit. CoinGecko is the best match.",
  },
  playful: {
    label: "Playful",
    description: "Light humour, high energy.",
    sample: "Challenge accepted. Give me ten minutes and a strong coffee.",
  },
  socratic: {
    label: "Socratic",
    description: "Asks questions to sharpen the goal.",
    sample: "Before I start: who is this for, and what does success look like?",
  },
  direct: {
    label: "Direct",
    description: "Blunt and decisive.",
    sample: "That plan won't scale. Use a queue instead. I'll set it up.",
  },
};

export const toneIds = Object.keys(toneInfo) as ToneId[];

export const toolInfo: Record<ToolId, { label: string; detail: string }> = {
  readRepo: { label: "Read repository", detail: "Browse and search project files" },
  editFiles: { label: "Edit files", detail: "Write changes to the working tree" },
  runTests: { label: "Run tests", detail: "Execute the project's test suite" },
  terminal: { label: "Terminal commands", detail: "Run shell commands in the sandbox" },
  webSearch: { label: "Web search", detail: "Look things up on the internet" },
  delegate: { label: "Delegate tasks", detail: "Create and assign tasks to other agents" },
  github: { label: "GitHub", detail: "Open branches and pull requests" },
};

export const toolIds = Object.keys(toolInfo) as ToolId[];

export const skillCatalogue: Record<string, string[]> = {
  Planning: ["Task breakdown", "Prioritisation", "Roadmapping", "Code review", "Reporting"],
  Research: ["API research", "Documentation", "Competitor analysis", "Summarising", "Fact checking"],
  Engineering: ["TypeScript", "React", "Python", "FastAPI", "Phaser", "SQL", "WebSockets"],
  Quality: ["Unit testing", "E2E testing", "Debugging", "Accessibility", "Performance"],
  Design: ["UI design", "UX writing", "Design systems", "Prototyping"],
};

export const quirkSuggestions = [
  "Data-driven",
  "Optimistic",
  "Sceptical",
  "Mentor",
  "Perfectionist",
  "Pragmatic",
  "Curious",
  "Calm under pressure",
  "Big-picture",
  "Detail-oriented",
];

export const modelOptions: Record<ModelProvider, { id: string; label: string }[]> = {
  claude: [
    { id: "claude-opus-5-5", label: "Claude Opus 5.5" },
    { id: "claude-sonnet-5-5", label: "Claude Sonnet 5.5" },
    { id: "claude-haiku-5-5", label: "Claude Haiku 5.5" },
    { id: "claude-fable-5-1", label: "Claude Fable 5.1" },
  ],
  codex: [{ id: "codex", label: "Codex" }],
  local: [
    { id: "ollama:llama3", label: "Ollama · Llama 3" },
    { id: "ollama:qwen2.5-coder", label: "Ollama · Qwen 2.5 Coder" },
  ],
};

export const roleInfo: Record<AgentRole, { label: string; summary: string }> = {
  manager: { label: "Manager", summary: "Breaks goals into tasks, delegates and reviews results." },
  researcher: { label: "Researcher", summary: "Investigates sources and shares findings." },
  developer: { label: "Developer", summary: "Reads and edits code, runs tests, reports outcomes." },
  tester: { label: "Tester", summary: "Writes and runs tests, hunts for regressions." },
  designer: { label: "Designer", summary: "Shapes interfaces, flows and visual polish." },
  custom: { label: "Custom", summary: "Start from a blank slate." },
};

export const roleIds = Object.keys(roleInfo) as AgentRole[];

export const roomOptions = (Object.keys(rooms) as RoomName[]).map((id) => ({
  id,
  label: rooms[id].name,
}));

export const swatches = {
  skin: ["#f8d5b8", "#eebc94", "#d39a6f", "#a86b45", "#7a4a2c", "#4f3020"],
  hair: ["#1c1714", "#4a2f1d", "#8a5a33", "#d8a657", "#b3472e", "#9aa3b2", "#7c5cff"],
  outfit: ["#2f6bff", "#22a06b", "#8b5cf6", "#f59e0b", "#e5484d", "#334155", "#0ea5b7"],
  background: ["#1d3b75", "#3b2a6b", "#14532d", "#5b3412", "#3f1d2e", "#1e293b"],
  colour: ["#3b82f6", "#22c55e", "#a855f7", "#f59e0b", "#ef4444", "#14b8a6", "#ec4899"],
};

// ─────────────────────────────
// Templates
// ─────────────────────────────

const allTools = (permission: ToolPermission): Record<ToolId, ToolPermission> =>
  toolIds.reduce(
    (acc, id) => ({ ...acc, [id]: permission }),
    {} as Record<ToolId, ToolPermission>
  );

type Template = Pick<
  AgentProfile,
  "title" | "description" | "colour" | "homeRoom" | "traits" | "tone" | "quirks" | "skills" | "tools" | "idleLines"
> & { avatar: Partial<AvatarConfig> };

export const roleTemplates: Record<AgentRole, Template> = {
  manager: {
    title: "Engineering Manager",
    description: "Turns goals into a plan, keeps the team unblocked and reports progress.",
    colour: "#f59e0b",
    homeRoom: "managerOffice",
    traits: { creativity: 45, rigor: 70, autonomy: 75, verbosity: 55, caution: 60, collaboration: 90 },
    tone: "professional",
    quirks: ["Big-picture", "Calm under pressure"],
    skills: ["Task breakdown", "Prioritisation", "Code review", "Reporting"],
    tools: { ...allTools("block"), readRepo: "allow", delegate: "allow", github: "ask" },
    idleLines: ["What's everyone working on?", "We should review our priorities.", "Let's keep things moving."],
    avatar: { outfit: "#334155", hair: "side", accessory: "none" },
  },
  researcher: {
    title: "Research Analyst",
    description: "Finds, compares and summarises the best sources for the task.",
    colour: "#3b82f6",
    homeRoom: "library",
    traits: { creativity: 60, rigor: 85, autonomy: 60, verbosity: 75, caution: 55, collaboration: 65 },
    tone: "friendly",
    quirks: ["Curious", "Data-driven"],
    skills: ["API research", "Documentation", "Summarising", "Fact checking"],
    tools: { ...allTools("block"), readRepo: "allow", webSearch: "allow" },
    idleLines: ["Interesting...", "I wonder what the data says.", "There might be another approach."],
    avatar: { outfit: "#22a06b", hair: "long", accessory: "none" },
  },
  developer: {
    title: "Software Engineer",
    description: "Implements features in small, tested steps.",
    colour: "#a855f7",
    homeRoom: "developerZone",
    traits: { creativity: 65, rigor: 75, autonomy: 70, verbosity: 35, caution: 50, collaboration: 60 },
    tone: "concise",
    quirks: ["Pragmatic", "Detail-oriented"],
    skills: ["TypeScript", "React", "Python", "FastAPI", "Debugging"],
    tools: { ...allTools("ask"), readRepo: "allow", editFiles: "allow", runTests: "allow", webSearch: "block" },
    idleLines: ["I should refactor that...", "Maybe I should check the logs.", "That could probably be automated."],
    avatar: { outfit: "#2f6bff", hair: "short", accessory: "headset" },
  },
  tester: {
    title: "QA Engineer",
    description: "Breaks things on purpose so users never do.",
    colour: "#14b8a6",
    homeRoom: "developerZone",
    traits: { creativity: 50, rigor: 95, autonomy: 55, verbosity: 50, caution: 85, collaboration: 60 },
    tone: "direct",
    quirks: ["Sceptical", "Perfectionist"],
    skills: ["Unit testing", "E2E testing", "Debugging", "Performance"],
    tools: { ...allTools("block"), readRepo: "allow", runTests: "allow", terminal: "ask" },
    idleLines: ["What if the input is empty?", "That edge case worries me.", "Green tests, happy tester."],
    avatar: { outfit: "#0ea5b7", hair: "buzz", accessory: "glasses" },
  },
  designer: {
    title: "Product Designer",
    description: "Designs clear, beautiful interfaces and writes the words in them.",
    colour: "#ec4899",
    homeRoom: "meetingRoom",
    traits: { creativity: 90, rigor: 60, autonomy: 60, verbosity: 55, caution: 40, collaboration: 80 },
    tone: "playful",
    quirks: ["Optimistic", "Detail-oriented"],
    skills: ["UI design", "UX writing", "Design systems", "Accessibility"],
    tools: { ...allTools("block"), readRepo: "allow", editFiles: "ask" },
    idleLines: ["That button needs more breathing room.", "What would delight the user here?"],
    avatar: { outfit: "#8b5cf6", hair: "curly", accessory: "beanie", hairColour: "#7c5cff" },
  },
  custom: {
    title: "",
    description: "",
    colour: "#3b82f6",
    homeRoom: "meetingRoom",
    traits: { creativity: 50, rigor: 50, autonomy: 50, verbosity: 50, caution: 50, collaboration: 50 },
    tone: "professional",
    quirks: [],
    skills: [],
    tools: { ...allTools("ask"), readRepo: "allow" },
    idleLines: [],
    avatar: {},
  },
};

// ─────────────────────────────
// Factories
// ─────────────────────────────

export const defaultAvatar: AvatarConfig = {
  skin: swatches.skin[1],
  hair: "short",
  hairColour: swatches.hair[1],
  outfit: swatches.outfit[0],
  accessory: "none",
  background: swatches.background[0],
};

export function createId() {
  return `agent_${Math.random().toString(36).slice(2, 10)}`;
}

export function applyTemplate(profile: AgentProfile, role: AgentRole): AgentProfile {
  const template = roleTemplates[role];
  const next: AgentProfile = {
    ...profile,
    ...template,
    role,
    avatar: { ...profile.avatar, ...template.avatar },
    traits: { ...template.traits },
    tools: { ...template.tools },
    quirks: [...template.quirks],
    skills: [...template.skills],
    idleLines: [...template.idleLines],
  };
  return withGeneratedPrompt(next);
}

export function createProfile(role: AgentRole = "custom", name = ""): AgentProfile {
  const now = Date.now();
  const blank: AgentProfile = {
    id: createId(),
    name,
    title: "",
    role,
    description: "",
    colour: swatches.colour[0],
    homeRoom: "meetingRoom",
    avatar: { ...defaultAvatar },
    traits: { ...roleTemplates.custom.traits },
    tone: "professional",
    quirks: [],
    skills: [],
    tools: { ...roleTemplates.custom.tools },
    model: { provider: "claude", id: "claude-sonnet-5-5", temperature: 0.4, maxTokens: 4096, memory: true },
    idleLines: [],
    systemPrompt: "",
    systemPromptMode: "generated",
    status: "idle",
    activity: "Idle",
    createdAt: now,
    updatedAt: now,
  };
  return applyTemplate(blank, role);
}

export function randomAvatar(): AvatarConfig {
  const pick = <T,>(items: T[]) => items[Math.floor(Math.random() * items.length)];
  return {
    skin: pick(swatches.skin),
    hair: pick<HairStyle>(["short", "side", "long", "bun", "curly", "buzz"]),
    hairColour: pick(swatches.hair),
    outfit: pick(swatches.outfit),
    accessory: pick<Accessory>(["none", "none", "glasses", "headset", "beanie"]),
    background: pick(swatches.background),
  };
}

// ─────────────────────────────
// System prompt
// ─────────────────────────────

const traitSentences: Record<TraitKey, [string, string]> = {
  creativity: [
    "Prefer proven, conventional solutions over novel ones.",
    "Look for inventive approaches and suggest alternatives others might miss.",
  ],
  rigor: [
    "Favour speed; a good-enough answer now beats a perfect one later.",
    "Be meticulous: verify facts, check edge cases and test before reporting done.",
  ],
  autonomy: [
    "Check in with the Manager before starting anything significant.",
    "Work independently and only escalate real blockers.",
  ],
  verbosity: [
    "Keep messages brief: lead with the result in one or two sentences.",
    "Explain your reasoning thoroughly so others can follow and review it.",
  ],
  caution: [
    "Be bold and move quickly; reversible mistakes are acceptable.",
    "Be risk-averse: prefer small, reversible steps and flag anything destructive.",
  ],
  collaboration: [
    "Work mostly on your own and share finished results.",
    "Collaborate actively: share progress early and ask teammates for input.",
  ],
};

const permissionWords: Record<ToolPermission, string> = {
  allow: "may use freely",
  ask: "must request approval before using",
  block: "must never use",
};

export function buildSystemPrompt(profile: AgentProfile): string {
  const lines: string[] = [];
  const name = profile.name.trim() || "this agent";
  const title = profile.title.trim() || roleInfo[profile.role].label;

  lines.push(`You are ${name}, the ${title} in the AI Ecosystem virtual office.`);
  if (profile.description.trim()) {
    lines.push(profile.description.trim());
  } else {
    lines.push(roleInfo[profile.role].summary);
  }

  lines.push("", "## Personality");
  for (const key of traitKeys) {
    const value = profile.traits[key];
    if (value <= 35) lines.push(`- ${traitSentences[key][0]}`);
    else if (value >= 65) lines.push(`- ${traitSentences[key][1]}`);
  }
  if (profile.quirks.length) {
    lines.push(`- You are known for being ${profile.quirks.join(", ").toLowerCase()}.`);
  }

  const tone = toneInfo[profile.tone];
  lines.push("", "## Tone", `${tone.label}. ${tone.description}`, `Example: "${tone.sample}"`);

  if (profile.skills.length) {
    lines.push("", "## Expertise", profile.skills.map((skill) => `- ${skill}`).join("\n"));
  }

  lines.push("", "## Tools");
  for (const id of toolIds) {
    lines.push(`- ${toolInfo[id].label}: you ${permissionWords[profile.tools[id]]}.`);
  }

  lines.push(
    "",
    "## Working rules",
    "- Communicate with other agents only through explicit tasks and events.",
    "- Report status, outputs and failures so the office can display them.",
    "- Never expose credentials or run destructive commands without approval."
  );

  return lines.join("\n");
}

export function withGeneratedPrompt(profile: AgentProfile): AgentProfile {
  if (profile.systemPromptMode === "custom") return profile;
  return { ...profile, systemPrompt: buildSystemPrompt(profile) };
}

export function estimateTokens(text: string) {
  return Math.ceil(text.length / 4);
}

// ─────────────────────────────
// Phaser bridge
// ─────────────────────────────

export function profileToAgentConfig(
  profile: AgentProfile,
  x?: number,
  y?: number
): AgentConfig {
  const room = rooms[profile.homeRoom];
  return {
    name: profile.name,
    x: x ?? room.entrance.x,
    y: y ?? room.entrance.y,
    colour: parseInt(profile.colour.replace("#", ""), 16),
    startingRoom: profile.homeRoom,
  };
}
