// Example data for the dashboard until the FastAPI/WebSocket backend is wired in.

export type TaskStatus = "todo" | "inProgress" | "review" | "done";
export type TaskPriority = "high" | "medium" | "low";

export type Task = {
  id: string;
  title: string;
  assigneeId: string;
  status: TaskStatus;
  priority: TaskPriority;
  due: string;
};

export type ChatMessage = {
  id: string;
  authorId: string | "user";
  time: string;
  text: string;
};

export type ActivityItem = {
  id: string;
  agentId: string;
  text: string;
  ago: string;
};

export const project = {
  name: "Crypto Dashboard",
  status: "On track",
  milestones: [
    { title: "Research cryptocurrency APIs", state: "done" },
    { title: "Design application architecture", state: "done" },
    { title: "Implement API client", state: "active" },
    { title: "Create dashboard UI", state: "todo" },
    { title: "Test and deploy", state: "todo" },
  ] as { title: string; state: "done" | "active" | "todo" }[],
};

export const initialTasks: Task[] = [
  { id: "t1", title: "Research cryptocurrency APIs", assigneeId: "agent_iris", status: "done", priority: "high", due: "Done" },
  { id: "t2", title: "Design application architecture", assigneeId: "agent_marcus", status: "done", priority: "high", due: "Done" },
  { id: "t3", title: "Implement API client", assigneeId: "agent_leo", status: "inProgress", priority: "high", due: "Today" },
  { id: "t4", title: "Create dashboard UI", assigneeId: "agent_nova", status: "todo", priority: "medium", due: "Tomorrow" },
  { id: "t5", title: "Set up data storage", assigneeId: "agent_leo", status: "todo", priority: "medium", due: "Tomorrow" },
  { id: "t6", title: "Write tests", assigneeId: "agent_tess", status: "review", priority: "medium", due: "Tomorrow" },
  { id: "t7", title: "Deploy application", assigneeId: "agent_marcus", status: "todo", priority: "low", due: "This week" },
];

export const initialChat: ChatMessage[] = [
  { id: "c1", authorId: "agent_marcus", time: "10:24", text: "I've created the initial project plan. Iris, can you look into cryptocurrency APIs and provide a comparison?" },
  { id: "c2", authorId: "agent_iris", time: "10:26", text: "On it. I'll research the main options and analyse their features, pricing and documentation." },
  { id: "c3", authorId: "agent_leo", time: "10:27", text: "I'll start setting up the project structure and basic API client." },
  { id: "c4", authorId: "agent_marcus", time: "10:28", text: "Great. Let's aim for a first working prototype within a few hours." },
];

export const agentLogs: ChatMessage[] = [
  { id: "l1", authorId: "agent_leo", time: "10:31", text: "tool.editFiles → src/api/client.ts (+84 −3)" },
  { id: "l2", authorId: "agent_iris", time: "10:33", text: "tool.webSearch → \"coingecko api rate limits\" (6 results)" },
  { id: "l3", authorId: "agent_leo", time: "10:36", text: "tool.runTests → 12 passed, 0 failed (2.3s)" },
  { id: "l4", authorId: "agent_marcus", time: "10:38", text: "task.created → \"Create dashboard UI\" assigned to Nova" },
];

export const systemLog: ChatMessage[] = [
  { id: "s1", authorId: "agent_marcus", time: "10:20", text: "Session started · model adapters ready" },
  { id: "s2", authorId: "agent_tess", time: "10:35", text: "Approval requested: terminal → npm run e2e" },
];

export const initialActivity: ActivityItem[] = [
  { id: "a1", agentId: "agent_leo", text: "committed code", ago: "2 min ago" },
  { id: "a2", agentId: "agent_iris", text: "found 3 suitable APIs", ago: "8 min ago" },
  { id: "a3", agentId: "agent_marcus", text: "created 4 new tasks", ago: "12 min ago" },
  { id: "a4", agentId: "agent_leo", text: "is running tests", ago: "15 min ago" },
  { id: "a5", agentId: "agent_iris", text: "shared research report", ago: "22 min ago" },
];

export type TerminalLine = { kind: "cmd" | "out" | "ok" | "info"; text: string };

export const terminalLines: TerminalLine[] = [
  { kind: "cmd", text: "npm run dev" },
  { kind: "out", text: "Starting development server..." },
  { kind: "ok", text: "Server running on http://localhost:3000" },
  { kind: "cmd", text: "python api_client.py" },
  { kind: "out", text: "Fetching cryptocurrency data..." },
  { kind: "ok", text: "Successfully retrieved data from CoinGecko" },
  { kind: "cmd", text: "npm run test" },
  { kind: "out", text: "Running tests..." },
  { kind: "ok", text: "12 tests passed (2.3s)" },
  { kind: "cmd", text: "git status" },
  { kind: "out", text: "On branch feature/crypto-dashboard" },
  { kind: "info", text: "  modified:   src/api/client.ts" },
  { kind: "info", text: "  modified:   src/components/Dashboard.tsx" },
];

export const systemStats = [
  { label: "API usage", value: "32%" },
  { label: "Storage", value: "1.2 GB" },
  { label: "Active tasks", value: "5" },
  { label: "Uptime", value: "3h 24m" },
];
