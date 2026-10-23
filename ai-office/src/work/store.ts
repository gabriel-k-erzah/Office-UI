import { useSyncExternalStore } from "react";

import type { ActivityItem, ChatMessage, LogEntry, Task } from "../ui/data/types";

// Everything the office is doing, in one place: the dashboard panels read it,
// the work engine and lounge chat write to it.

export type OfficeState = {
  tasks: Task[];
  messages: ChatMessage[];
  logs: LogEntry[];
  activity: ActivityItem[];
  // Agents composing a chat message right now (typing dots).
  typing: string[];
  // A task or filing is in progress.
  working: boolean;
  // Bumped whenever a document is filed, so library views refetch.
  libraryVersion: number;
};

const now = () => new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
const id = () => crypto.randomUUID();

export class OfficeStore {
  private state: OfficeState = {
    tasks: [],
    messages: [],
    logs: [],
    activity: [],
    typing: [],
    working: false,
    libraryVersion: 0,
  };
  private listeners = new Set<() => void>();

  subscribe = (listener: () => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  get = () => this.state;

  private set(patch: Partial<OfficeState>) {
    this.state = { ...this.state, ...patch };
    this.listeners.forEach((listener) => listener());
  }

  // ─────────────────────────────
  // Chat
  // ─────────────────────────────

  post = (message: Omit<ChatMessage, "id" | "time">) => {
    const messageId = id();
    this.set({ messages: [...this.state.messages, { id: messageId, time: now(), ...message }] });
    return messageId;
  };

  edit = (messageId: string, text: string) => {
    this.set({ messages: this.state.messages.map((m) => (m.id === messageId ? { ...m, text } : m)) });
  };

  typing(agentId: string, on: boolean) {
    const rest = this.state.typing.filter((t) => t !== agentId);
    this.set({ typing: on ? [...rest, agentId] : rest });
  }

  // ─────────────────────────────
  // Tasks
  // ─────────────────────────────

  setTasks = (update: (tasks: Task[]) => Task[]) => {
    this.set({ tasks: update(this.state.tasks) });
  };

  addTask(task: Omit<Task, "id">) {
    const taskId = id();
    this.set({ tasks: [...this.state.tasks, { id: taskId, ...task }] });
    return taskId;
  }

  updateTask(taskId: string, patch: Partial<Task>) {
    this.set({ tasks: this.state.tasks.map((t) => (t.id === taskId ? { ...t, ...patch } : t)) });
  }

  setWorking(working: boolean) {
    if (working !== this.state.working) this.set({ working });
  }

  // ─────────────────────────────
  // Logs, activity, library
  // ─────────────────────────────

  log(agentId: string | "system", kind: LogEntry["kind"], text: string) {
    this.set({ logs: [...this.state.logs, { id: id(), time: now(), agentId, kind, text }].slice(-300) });
  }

  did = (agentId: string, text: string) => {
    this.set({ activity: [{ id: id(), agentId, text, ago: now() }, ...this.state.activity].slice(0, 50) });
  };

  libraryChanged() {
    this.set({ libraryVersion: this.state.libraryVersion + 1 });
  }
}

export function useOffice(store: OfficeStore) {
  return useSyncExternalStore(store.subscribe, store.get);
}
