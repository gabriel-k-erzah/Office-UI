import { chatJson, resolveModel, streamChat } from "../ai/ollama";
import { cleanReply, excerpt } from "../ai/teamChat";
import { canDelegate, canReadLibrary, canWriteLibrary, type AgentProfile } from "../ui/agents/profile";
import type { Task } from "../ui/data/types";
import type { RoomName } from "../ui/office/rooms";
import type { OfficeSim } from "../ui/office/simulation";
import { fetchDoc, fileDoc, LibraryPermissionError, listDocs, readDoc, type LibraryDoc } from "./library";
import {
  chatTurnPrompt,
  chatTurnSchema,
  filingPrompt,
  filingSchema,
  handOverPrompt,
  pickReadingPrompt,
  pickReadingSchema,
  planPrompt,
  planSchema,
  shelfCheckPrompt,
  shelfCheckSchema,
  taskPrompt,
  taskResultSchema,
  wrapUpPrompt,
  type ChatTurn,
  type FilingTurn,
  type PlanTurn,
  type TaskResult,
} from "./prompts";
import type { OfficeStore } from "./store";

// Turns chat and tasks into real work, and makes the office show it:
//
// - You talk to someone in team chat. A manager (anyone allowed to delegate)
//   reasons about it and may create and assign tasks; anyone else replies and
//   may ask for something to be documented.
// - Tasks run one at a time: the agent may go to the library to read, works at
//   their desk, posts an update, and takes anything worth keeping to the librarian.
// - Only the librarian writes to the library. Everyone else walks to the
//   library, hands their notes over in chat, and the librarian writes and files
//   the document.

const WALK_LIMIT = 25_000;
const READ_LIMIT = 6_000;

type Plan = { goal: string; managerId: string };

export class WorkEngine {
  private profiles: AgentProfile[] = [];
  private models: string[] = [];
  private jobs: (() => Promise<void>)[] = [];
  private running = false;
  private plans = new Map<string, Plan>();
  private filedByPlan = new Map<string, string[]>();
  private failures = new Map<string, number>();
  private store: OfficeStore;
  private sim: OfficeSim;

  constructor(store: OfficeStore, sim: OfficeSim) {
    this.store = store;
    this.sim = sim;
    // Tasks added on the board (by you or a manager) get picked up.
    let tasks = store.get().tasks;
    store.subscribe(() => {
      if (store.get().tasks !== tasks) {
        tasks = store.get().tasks;
        void this.drain();
      }
    });
  }

  update(profiles: AgentProfile[], models: string[]) {
    this.profiles = profiles;
    this.models = models;
    void this.drain();
  }

  private get present() {
    return this.profiles.filter((p) => p.status !== "offline");
  }

  private get librarian() {
    return this.present.find((p) => p.role === "librarian");
  }

  private find(id: string) {
    return this.profiles.find((p) => p.id === id);
  }

  private model(agent: AgentProfile) {
    return resolveModel(agent, this.models)?.model;
  }

  // ─────────────────────────────
  // Team chat
  // ─────────────────────────────

  async reply(text: string) {
    const { store } = this;
    const history = [...store.get().messages];
    store.post({ authorId: "user", text });
    history.push({ id: "", time: "", authorId: "user", text });

    const present = this.present;
    const mentioned = present.find((p) => text.toLowerCase().includes(p.name.toLowerCase()));
    const responder = mentioned ?? present.find(canDelegate) ?? present[0];
    if (!responder) return;

    const model = this.model(responder);
    if (!model) {
      store.post({ authorId: responder.id, error: true, text: "I can't reach a model in Ollama. Open the Ollama app (and pull a model) and ask me again." });
      return;
    }

    store.typing(responder.id, true);
    this.sim.setTask(responder.id, canDelegate(responder) ? "Thinking it through…" : "Thinking…");
    let replyId: string | undefined;
    const show = (text: string) => {
      const clean = cleanReply(responder, text);
      if (!clean) return;
      if (replyId) {
        store.edit(replyId, clean);
      } else {
        store.typing(responder.id, false);
        this.sim.setTask(responder.id, "Replying in team chat");
        replyId = store.post({ authorId: responder.id, text: clean, model });
      }
    };

    try {
      const library = await listDocs().catch(() => [] as LibraryDoc[]);
      const context = { agent: responder, team: this.profiles, tasks: store.get().tasks, history, library };

      if (canDelegate(responder)) {
        const plan = await chatJson<PlanTurn>({
          model,
          messages: planPrompt(context),
          schema: planSchema(present),
          temperature: Math.min(responder.model.temperature, 0.5),
          maxTokens: 900,
          onField: { key: "reply", update: show },
        });
        show(plan.reply);
        this.sim.say(responder.id, excerpt(cleanReply(responder, plan.reply)));
        this.adoptPlan(responder, text, plan);
      } else {
        const turn = await chatJson<ChatTurn>({
          model,
          messages: chatTurnPrompt({ ...context, librarian: this.librarian }),
          schema: chatTurnSchema,
          temperature: responder.model.temperature,
          maxTokens: 700,
          onField: { key: "reply", update: show },
        });
        show(turn.reply);
        this.sim.say(responder.id, excerpt(cleanReply(responder, turn.reply)));
        const doc = turn.document;
        if (doc?.wanted && doc.notes.trim()) {
          store.log(responder.id, "tool", `wants to document "${doc.title || "notes"}"`);
          this.enqueue(async () => {
            await this.file(responder, doc.title || "Notes", doc.notes);
          });
        }
      }
    } catch (error) {
      store.post({ authorId: responder.id, error: true, text: `I couldn't answer that (${reason(error)}).` });
      store.log("system", "error", `${responder.name}'s reply failed: ${reason(error)}`);
    } finally {
      store.typing(responder.id, false);
      this.sim.setTask(responder.id, null);
    }
  }

  private adoptPlan(manager: AgentProfile, goal: string, plan: PlanTurn) {
    const { store } = this;
    if (plan.thinking?.trim()) store.log(manager.id, "thinking", plan.thinking.trim());
    const tasks = (plan.tasks ?? []).filter((t) => t.title?.trim());
    if (!tasks.length) return;

    const planId = crypto.randomUUID();
    this.plans.set(planId, { goal, managerId: manager.id });
    const created: Task[] = tasks.map((task) => {
      const assignee = this.present.find((p) => p.name.toLowerCase() === task.assignee?.toLowerCase()) ?? manager;
      store.log(manager.id, "tool", `task.create → "${task.title.trim()}" for ${assignee.name}${task.document ? " (to be filed)" : ""}`);
      return {
        id: crypto.randomUUID(),
        title: task.title.trim(),
        assigneeId: assignee.id,
        status: "todo",
        priority: "medium",
        due: "Today",
        brief: task.brief?.trim(),
        document: Boolean(task.document),
        planId,
      };
    });
    store.did(manager.id, `planned ${tasks.length} task${tasks.length === 1 ? "" : "s"}`);
    // All at once, so work starts only after the whole plan is on the board.
    store.setTasks((current) => [...current, ...created]);
  }

  // ─────────────────────────────
  // Queue: tasks and filings, one at a time
  // ─────────────────────────────

  private enqueue(job: () => Promise<void>) {
    this.jobs.push(job);
    void this.drain();
  }

  private async drain() {
    if (this.running || !this.models.length) return;
    this.running = true;
    this.store.setWorking(true);
    try {
      for (;;) {
        const job = this.jobs.shift() ?? this.nextTask();
        if (!job) break;
        await job().catch((error: unknown) => {
          this.store.log("system", "error", `Work stopped: ${reason(error)}`);
        });
        if (!this.models.length) break;
      }
    } finally {
      this.running = false;
      this.store.setWorking(false);
    }
  }

  private nextTask() {
    const present = new Set(this.present.map((p) => p.id));
    const task = this.store.get().tasks.find((t) => t.status === "todo" && present.has(t.assigneeId));
    if (!task) return undefined;
    // Claim it now so it isn't picked twice.
    this.store.updateTask(task.id, { status: "inProgress" });
    return () => this.work(task);
  }

  private async work(task: Task) {
    const { store, sim } = this;
    const agent = this.find(task.assigneeId);
    const model = agent && this.model(agent);
    if (!agent || !model) {
      store.updateTask(task.id, { status: "todo" });
      return;
    }

    const plan = task.planId ? this.plans.get(task.planId) : undefined;
    const assignedBy = plan ? this.find(plan.managerId) : undefined;
    store.did(agent.id, `started "${task.title}"`);
    store.log(agent.id, "tool", `task.start → "${task.title}"`);

    try {
      // 1. Anything useful in the library? Reading happens in the library.
      const reading: { title: string; body: string }[] = [];
      const docs = canReadLibrary(agent) ? await listDocs().catch(() => [] as LibraryDoc[]) : [];
      if (docs.length) {
        sim.setTask(agent.id, "Checking the library catalogue");
        const { read } = await chatJson<{ read: string[] }>({
          model,
          messages: pickReadingPrompt(agent, task, docs),
          schema: pickReadingSchema(docs),
          temperature: 0.2,
          maxTokens: 120,
        });
        const files = [...new Set(read ?? [])].filter((file) => docs.some((d) => d.file === file));
        if (files.length) {
          await this.walk(agent, "library", `Reading ${files.length === 1 ? docs.find((d) => d.file === files[0])?.meta.title : `${files.length} documents`}`);
          for (const file of files) {
            const doc = await readDoc(agent, file);
            reading.push({ title: doc.meta.title, body: doc.body.slice(0, READ_LIMIT) });
            store.log(agent.id, "tool", `library.read → ${file}`);
          }
        }
      }

      // 2. The work itself, at their desk.
      sim.setTask(agent.id, `Working on: ${excerpt(task.title, 34)}`);
      const result = await chatJson<TaskResult>({
        model,
        messages: taskPrompt({ agent, task, assignedBy, reading }),
        schema: taskResultSchema,
        temperature: agent.model.temperature,
        maxTokens: 1200,
      });
      const update = cleanReply(agent, result.update || "Done.");
      store.post({ authorId: agent.id, text: update, model });
      sim.say(agent.id, excerpt(update));
      store.log(agent.id, "tool", `task.result → "${task.title}" (${result.notes.split(/\s+/).length} words)`);

      // 3. Worth keeping? Only the librarian writes, so take it to them.
      if ((task.document || result.document) && result.notes.trim()) {
        const filed = await this.file(agent, task.title, result.notes);
        if (filed && task.planId) this.filedByPlan.set(task.planId, [...(this.filedByPlan.get(task.planId) ?? []), filed]);
      }

      store.updateTask(task.id, { status: "done", result: result.notes });
      store.did(agent.id, `finished "${task.title}"`);
    } catch (error) {
      const failures = (this.failures.get(task.id) ?? 0) + 1;
      this.failures.set(task.id, failures);
      const retry = failures < 2;
      // One retry, then it waits in Review for a person to look at it.
      store.updateTask(task.id, { status: retry ? "todo" : "review" });
      store.post({
        authorId: agent.id,
        error: true,
        text: retry
          ? `I got stuck on "${task.title}" (${reason(error)}). I'll try again shortly.`
          : `I'm still stuck on "${task.title}" (${reason(error)}), so I've put it in Review for you.`,
      });
      store.log("system", "error", `${agent.name} stopped "${task.title}": ${reason(error)}`);
      if (retry) await pause(15_000);
    } finally {
      sim.setTask(agent.id, null);
    }

    if (task.planId) await this.maybeWrapUp(task.planId);
  }

  // ─────────────────────────────
  // The library
  // ─────────────────────────────

  // Returns the file name, or undefined if it couldn't be filed.
  private async file(requester: AgentProfile, title: string, notes: string): Promise<string | undefined> {
    const { store, sim } = this;
    const librarian = this.librarian;
    if (!librarian || !canWriteLibrary(librarian)) {
      store.post({
        authorId: requester.id,
        error: true,
        text: `I wanted to file my notes on "${title}", but there's no librarian in to do it.`,
      });
      store.log("system", "error", `No librarian available to file "${title}" for ${requester.name}`);
      return undefined;
    }

    const self = requester.id === librarian.id;
    const librarianModel = this.model(librarian);
    if (!librarianModel) return undefined;

    try {
      if (!self) {
        // Everyone else goes to the librarian's office and asks.
        sim.setTask(librarian.id, `Expecting ${requester.name}`);
        await this.walk(requester, "library", `Taking notes to ${librarian.name}`);
        sim.setTask(requester.id, `Talking to ${librarian.name}`, "library");
        sim.setTask(librarian.id, `Helping ${requester.name}`);

        const requesterModel = this.model(requester) ?? librarianModel;
        const ask = await streamChat({
          model: requesterModel,
          messages: handOverPrompt(requester, librarian, title, notes),
          temperature: requester.model.temperature,
          maxTokens: 120,
          onToken: () => {},
        });
        const askText = cleanReply(requester, ask) || `Could you file my notes on "${title}"?`;
        store.post({ authorId: requester.id, text: askText, model: requesterModel });
        sim.say(requester.id, excerpt(askText));
        store.log(requester.id, "tool", `asked ${librarian.name} to file "${title}"`);
      } else {
        sim.setTask(librarian.id, `Filing "${excerpt(title, 30)}"`);
      }

      store.typing(librarian.id, true);
      const library = await listDocs().catch(() => [] as LibraryDoc[]);

      // Check the shelf first: notes on a topic that's already filed get merged in.
      let existing: { file: string; title: string; body: string } | undefined;
      if (library.length) {
        sim.setTask(librarian.id, "Checking the shelves");
        const { file } = await chatJson<{ file: string }>({
          model: librarianModel,
          messages: shelfCheckPrompt(librarian, title, notes, library),
          schema: shelfCheckSchema(library),
          temperature: 0.1,
          maxTokens: 60,
        });
        if (file && file !== "new" && library.some((d) => d.file === file)) {
          const current = await fetchDoc(file);
          existing = { file, title: current.meta.title, body: current.body };
          store.log(librarian.id, "tool", `library.read → ${file} (to merge "${title}" into it)`);
        }
      }

      sim.setTask(librarian.id, `${existing ? "Updating" : "Writing up"} "${excerpt(existing?.title ?? title, 28)}"`);
      const doc = await chatJson<FilingTurn>({
        model: librarianModel,
        messages: filingPrompt({ librarian, requester, title, notes, library, existing }),
        schema: filingSchema,
        temperature: Math.min(librarian.model.temperature, 0.4),
        maxTokens: 1500,
      });
      store.typing(librarian.id, false);

      const saved = await fileDoc(librarian, {
        file: existing?.file ?? (doc.file || doc.title || title),
        title: doc.title?.trim() || existing?.title || title,
        body: doc.body?.trim() || notes,
        requestedBy: self ? "" : requester.name,
        update: Boolean(existing),
      });
      const replyText = cleanReply(librarian, doc.reply || "Filed.");
      // Make sure the real file name is in the message (the server may have renamed it).
      const text = replyText.includes(saved.file) ? replyText : `${replyText} (${saved.file})`;
      store.post({ authorId: librarian.id, text, model: librarianModel });
      sim.say(librarian.id, `${saved.updated ? "Updated" : "Filed"} ${saved.file}`);
      const verb = saved.updated ? "updated" : "filed";
      store.log(librarian.id, "tool", `library.write → ${saved.file} (${verb}${self ? "" : ` for ${requester.name}`})`);
      store.did(librarian.id, `${verb} ${saved.file}${self ? "" : ` for ${requester.name}`}`);
      store.libraryChanged();
      return saved.file;
    } catch (error) {
      store.typing(librarian.id, false);
      const blocked = error instanceof LibraryPermissionError;
      store.post({ authorId: librarian.id, error: true, text: blocked ? reason(error) : `I couldn't file "${title}" (${reason(error)}).` });
      store.log("system", "error", `Filing "${title}" failed: ${reason(error)}`);
      return undefined;
    } finally {
      sim.setTask(librarian.id, null);
      if (!self) sim.setTask(requester.id, null);
    }
  }

  private async maybeWrapUp(planId: string) {
    const plan = this.plans.get(planId);
    const tasks = this.store.get().tasks.filter((t) => t.planId === planId);
    if (!plan || !tasks.length || tasks.some((t) => t.status !== "done")) return;
    this.plans.delete(planId);

    const manager = this.find(plan.managerId);
    const model = manager && this.model(manager);
    if (!manager || !model) return;

    const done = tasks.map((task) => ({ task, who: this.find(task.assigneeId)?.name ?? "someone" }));
    const filed = this.filedByPlan.get(planId) ?? [];
    this.filedByPlan.delete(planId);

    this.store.typing(manager.id, true);
    this.sim.setTask(manager.id, "Reviewing the results");
    try {
      const summary = await streamChat({
        model,
        messages: wrapUpPrompt(manager, plan.goal, done, filed),
        temperature: Math.min(manager.model.temperature, 0.5),
        maxTokens: 250,
        onToken: () => {},
      });
      const text = cleanReply(manager, summary);
      if (text) {
        this.store.post({ authorId: manager.id, text, model });
        this.sim.say(manager.id, excerpt(text));
      }
      this.store.did(manager.id, "wrapped up the plan");
    } finally {
      this.store.typing(manager.id, false);
      this.sim.setTask(manager.id, null);
    }
  }

  // ─────────────────────────────
  // Helpers
  // ─────────────────────────────

  // Send an agent somewhere for their task and wait until they're there (or a while has passed).
  private async walk(agent: AgentProfile, room: RoomName, activity: string) {
    this.sim.setTask(agent.id, activity, room);
    const until = Date.now() + WALK_LIMIT;
    while (!this.sim.isIn(agent.id, room) && Date.now() < until) await pause(400);
  }
}

const reason = (error: unknown) => (error instanceof Error ? error.message : String(error));
const pause = (ms: number) => new Promise((resolve) => window.setTimeout(resolve, ms));
