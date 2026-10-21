import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";

import { Avatar } from "../agents/Avatar";
import {
  createProfile,
  modelOptions,
  roleIds,
  roleInfo,
  roomOptions,
  toneInfo,
  traitInfo,
  traitKeys,
  type AgentProfile,
  type AgentRole,
} from "../agents/profile";
import { useAgentProfiles } from "../agents/profileStore";
import {
  agentLogs,
  initialActivity,
  initialChat,
  initialTasks,
  project,
  systemLog,
  systemStats,
  terminalLines,
  type ActivityItem,
  type ChatMessage,
  type Task,
  type TaskPriority,
  type TaskStatus,
} from "../data/mock";
import { Icon, type IconName } from "./Icon";
import Game from "../../game/Game";
import { OfficeView } from "./OfficeView";
import { ProfileBuilder, TraitRadar } from "./ProfileBuilder";

type View = "office" | "projects" | "agents" | "tasks" | "knowledge" | "settings";

const navItems: { id: View; label: string; icon: IconName }[] = [
  { id: "office", label: "Office", icon: "office" },
  { id: "projects", label: "Projects", icon: "projects" },
  { id: "agents", label: "Agents", icon: "agents" },
  { id: "tasks", label: "Tasks", icon: "tasks" },
  { id: "knowledge", label: "Knowledge", icon: "knowledge" },
  { id: "settings", label: "Settings", icon: "settings" },
];

type Editing = { profile: AgentProfile; isNew: boolean } | null;

export function Dashboard() {
  const { profiles, save, remove, duplicate } = useAgentProfiles();
  const [view, setView] = useState<View>("office");
  const [selectedId, setSelectedId] = useState<string>();
  const [editing, setEditing] = useState<Editing>(null);
  const [tasks, setTasks] = useState<Task[]>(initialTasks);
  const [activity, setActivity] = useState<ActivityItem[]>(initialActivity);
  const [officeMode, setOfficeMode] = useState<"illustrated" | "live">("illustrated");

  const byId = useMemo(() => new Map(profiles.map((p) => [p.id, p])), [profiles]);
  const selected = selectedId ? byId.get(selectedId) : undefined;

  const openNew = (role: AgentRole = "custom") => setEditing({ profile: createProfile(role), isNew: true });
  const openEdit = (profile: AgentProfile) => setEditing({ profile, isNew: false });

  const logActivity = (agentId: string, text: string) =>
    setActivity((current) => [{ id: crypto.randomUUID(), agentId, text, ago: "just now" }, ...current].slice(0, 8));

  return (
    <div className="app">
      <TopNav view={view} onView={setView} />

      <div className="shell">
        <Sidebar
          profiles={profiles}
          selectedId={selectedId}
          onSelect={(id) => { setSelectedId(id); setView("office"); }}
          onAdd={() => openNew()}
          activeTasks={tasks.filter((t) => t.status !== "done").length}
        />

        <main className="main">
          {view === "office" && (
            <div className="office-grid">
              <section className="panel office-panel">
                {officeMode === "illustrated" ? (
                  <OfficeView agents={profiles} selectedId={selectedId} onSelect={setSelectedId} />
                ) : (
                  <div className="phaser-stage"><Game /></div>
                )}
                <div className="segmented office-mode" role="radiogroup" aria-label="Office view">
                  {([
                    ["illustrated", "Illustrated"],
                    ["live", "Live (Phaser)"],
                  ] as const).map(([mode, label]) => (
                    <button
                      key={mode}
                      role="radio"
                      aria-checked={officeMode === mode}
                      className={`seg ${officeMode === mode ? "on" : ""}`}
                      onClick={() => setOfficeMode(mode)}
                    >
                      {label}
                    </button>
                  ))}
                </div>
                {selected && officeMode === "illustrated" && (
                  <AgentPopover
                    agent={selected}
                    tasks={tasks.filter((t) => t.assigneeId === selected.id)}
                    onEdit={() => openEdit(selected)}
                    onClose={() => setSelectedId(undefined)}
                  />
                )}
              </section>
              <ChatPanel profiles={profiles} byId={byId} onActivity={logActivity} />
              <TasksPanel tasks={tasks} setTasks={setTasks} profiles={profiles} byId={byId} onActivity={logActivity} />
              <div className="right-rail">
                <ProgressPanel />
                <ActivityPanel activity={activity} byId={byId} />
                <TerminalPanel agent={byId.get("agent_leo") ?? profiles[0]} />
              </div>
            </div>
          )}

          {view === "agents" && (
            <AgentsPage
              profiles={profiles}
              onNew={openNew}
              onEdit={openEdit}
              onDuplicate={duplicate}
            />
          )}

          {view === "tasks" && (
            <div className="page">
              <TasksPanel tasks={tasks} setTasks={setTasks} profiles={profiles} byId={byId} onActivity={logActivity} />
            </div>
          )}

          {(view === "projects" || view === "knowledge" || view === "settings") && (
            <div className="page">
              <div className="panel empty-state">
                <Icon name={navItems.find((n) => n.id === view)!.icon} size={28} />
                <h2>{navItems.find((n) => n.id === view)!.label}</h2>
                <p>This area is planned for the next milestone. The Office and Agents views are fully interactive.</p>
                <button className="btn primary" onClick={() => setView("agents")}>Go to Agents</button>
              </div>
            </div>
          )}
        </main>
      </div>

      {editing && (
        <ProfileBuilder
          key={editing.profile.id}
          initial={editing.profile}
          isNew={editing.isNew}
          onCancel={() => setEditing(null)}
          onSave={(profile) => {
            save(profile);
            logActivity(profile.id, editing.isNew ? "joined the team" : "updated their profile");
            setEditing(null);
          }}
          onDelete={(id) => {
            remove(id);
            if (selectedId === id) setSelectedId(undefined);
            setEditing(null);
          }}
        />
      )}
    </div>
  );
}

// ─────────────────────────────
// Chrome
// ─────────────────────────────

function TopNav({ view, onView }: { view: View; onView: (v: View) => void }) {
  return (
    <header className="topnav">
      <div className="brand">
        <span className="brand-mark"><Icon name="logo" size={22} /></span>
        <div>
          <p className="brand-name">AI Ecosystem <span className="beta">Beta</span></p>
          <p className="brand-tag">Your AI workforce, in one place.</p>
        </div>
      </div>

      <nav className="topnav-tabs" aria-label="Main">
        {navItems.map((item) => (
          <button
            key={item.id}
            className={`topnav-tab ${view === item.id ? "active" : ""}`}
            onClick={() => onView(item.id)}
            aria-current={view === item.id ? "page" : undefined}
          >
            <Icon name={item.icon} size={20} />
            <span>{item.label}</span>
          </button>
        ))}
      </nav>

      <div className="topnav-tools">
        <label className="search">
          <Icon name="search" size={16} />
          <input id="global-search" placeholder="Search anything..." />
        </label>
        <button className="icon-btn" aria-label="Notifications">
          <Icon name="bell" />
          <span className="notif-dot" />
        </button>
        <span className="me">GB</span>
      </div>
    </header>
  );
}

function Sidebar({
  profiles, selectedId, onSelect, onAdd, activeTasks,
}: {
  profiles: AgentProfile[]; selectedId?: string; onSelect: (id: string) => void; onAdd: () => void; activeTasks: number;
}) {
  const links: { label: string; icon: IconName }[] = [
    { label: "Overview", icon: "overview" },
    { label: "Requirements", icon: "requirements" },
    { label: "Tasks", icon: "list" },
    { label: "Files", icon: "file" },
    { label: "Terminal", icon: "terminal" },
    { label: "GitHub", icon: "github" },
    { label: "Settings", icon: "settings" },
  ];

  return (
    <aside className="sidebar">
      <div className="side-section">
        <p className="side-label">Project</p>
        <button className="project-select">
          {project.name} <Icon name="chevronDown" size={16} />
        </button>
        <span className="pill ok"><span className="dot" /> Active</span>
      </div>

      <nav className="side-links">
        {links.map((l, i) => (
          <button key={l.label} className={`side-link ${i === 0 ? "active" : ""}`}>
            <Icon name={l.icon} size={17} /> {l.label}
          </button>
        ))}
      </nav>

      <div className="side-section">
        <p className="side-label">Agents · {profiles.length}</p>
        <ul className="side-agents">
          {profiles.map((p) => (
            <li key={p.id}>
              <button className={`side-agent ${selectedId === p.id ? "active" : ""}`} onClick={() => onSelect(p.id)}>
                <Avatar avatar={p.avatar} size={36} />
                <span className="side-agent-text">
                  <strong>{p.name}</strong>
                  <small>{p.status === "working" ? p.activity : p.status === "idle" ? "Idle" : "Offline"}</small>
                </span>
                <span className={`status-dot ${p.status}`} style={p.status === "working" ? { background: p.colour } : undefined} />
              </button>
            </li>
          ))}
        </ul>
        <button className="add-agent" onClick={onAdd}>
          <Icon name="plus" size={16} /> Add agent
        </button>
      </div>

      <div className="side-section">
        <p className="side-label">System</p>
        <dl className="sys-stats">
          {systemStats.map((s) => (
            <div key={s.label}>
              <dt>{s.label}</dt>
              <dd>{s.label === "Active tasks" ? activeTasks : s.value}</dd>
            </div>
          ))}
        </dl>
        <span className="pill ok"><span className="dot" /> All systems operational</span>
      </div>
    </aside>
  );
}

// ─────────────────────────────
// Office panels
// ─────────────────────────────

function AgentPopover({
  agent, tasks, onEdit, onClose,
}: {
  agent: AgentProfile; tasks: Task[]; onEdit: () => void; onClose: () => void;
}) {
  const current = tasks.find((t) => t.status === "inProgress") ?? tasks.find((t) => t.status !== "done");
  return (
    <div className="popover" style={{ ["--agent" as string]: agent.colour }}>
      <button className="icon-btn small popover-close" onClick={onClose} aria-label="Close agent card">
        <Icon name="close" size={14} />
      </button>
      <div className="popover-head">
        <Avatar avatar={agent.avatar} size={52} ring={agent.colour} />
        <div>
          <strong>{agent.name}</strong>
          <small>{agent.title}</small>
        </div>
      </div>
      <dl className="popover-facts">
        <div><dt>Doing</dt><dd>{agent.activity}</dd></div>
        <div><dt>Room</dt><dd>{roomOptions.find((r) => r.id === agent.homeRoom)?.label}</dd></div>
        <div><dt>Tone</dt><dd>{toneInfo[agent.tone].label}</dd></div>
        {current && <div><dt>Task</dt><dd>{current.title}</dd></div>}
      </dl>
      <button className="btn primary small block" onClick={onEdit}>
        <Icon name="edit" size={15} /> Edit profile
      </button>
    </div>
  );
}

function PanelHead({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="panel-head">
      <h2>{title}</h2>
      {children}
    </div>
  );
}

function ChatPanel({
  profiles, byId, onActivity,
}: {
  profiles: AgentProfile[]; byId: Map<string, AgentProfile>; onActivity: (agentId: string, text: string) => void;
}) {
  const [tab, setTab] = useState<"chat" | "logs" | "system">("chat");
  const [messages, setMessages] = useState<ChatMessage[]>(initialChat);
  const [draft, setDraft] = useState("");
  const [typing, setTyping] = useState<AgentProfile>();
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, typing, tab]);

  const now = () => new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

  const send = () => {
    const text = draft.trim();
    if (!text) return;
    setMessages((m) => [...m, { id: crypto.randomUUID(), authorId: "user", time: now(), text }]);
    setDraft("");

    const mentioned = profiles.find((p) => text.toLowerCase().includes(p.name.toLowerCase()));
    const responder = mentioned ?? profiles.find((p) => p.role === "manager") ?? profiles[0];
    if (!responder) return;
    setTyping(responder);
    setTimeout(() => {
      setTyping(undefined);
      setMessages((m) => [...m, { id: crypto.randomUUID(), authorId: responder.id, time: now(), text: replyFor(responder) }]);
      onActivity(responder.id, "replied in team chat");
    }, 1100);
  };

  const shown = tab === "chat" ? messages : tab === "logs" ? agentLogs : systemLog;

  return (
    <section className="panel chat-panel">
      <div className="tabs" role="tablist">
        {([
          ["chat", "Team chat"],
          ["logs", "Agent logs"],
          ["system", "System"],
        ] as const).map(([id, label]) => (
          <button key={id} role="tab" aria-selected={tab === id} className={`tab ${tab === id ? "on" : ""}`} onClick={() => setTab(id)}>
            {label}
          </button>
        ))}
      </div>

      <div className="chat-list" ref={listRef}>
        {shown.map((m) => {
          const author = m.authorId === "user" ? undefined : byId.get(m.authorId);
          return (
            <div key={m.id} className={`msg ${m.authorId === "user" ? "mine" : ""} ${tab !== "chat" ? "log" : ""}`}>
              {m.authorId === "user" ? <span className="me small">GB</span> : author && <Avatar avatar={author.avatar} size={30} />}
              <div className="msg-body">
                <p className="msg-meta">
                  <strong>{m.authorId === "user" ? "You" : author?.name ?? "Agent"}</strong> <time>{m.time}</time>
                </p>
                <p className="msg-text">{m.text}</p>
              </div>
            </div>
          );
        })}
        {typing && tab === "chat" && (
          <div className="msg">
            <Avatar avatar={typing.avatar} size={30} />
            <div className="msg-body typing"><span /><span /><span /></div>
          </div>
        )}
      </div>

      <form className="chat-input" onSubmit={(e) => { e.preventDefault(); send(); }}>
        <input id="chat-message" placeholder="Message the team… mention an agent by name" value={draft} onChange={(e) => setDraft(e.target.value)} />
        <button className="send" type="submit" aria-label="Send"><Icon name="send" size={18} /></button>
      </form>
    </section>
  );
}

function replyFor(agent: AgentProfile) {
  const replies: Record<AgentProfile["tone"], string> = {
    professional: "Understood. I'll take this on and report back with findings shortly.",
    friendly: "Love it! I'm on it and will share an update soon.",
    concise: "On it. Update in 10.",
    playful: "Ooh, a new quest. Grabbing my keyboard now!",
    socratic: "Good question. What outcome matters most to you here, speed or polish?",
    direct: "Clear. Starting now. I'll flag blockers immediately.",
  };
  return replies[agent.tone];
}

const statusLabel: Record<TaskStatus, string> = {
  todo: "To do",
  inProgress: "In progress",
  review: "Review",
  done: "Done",
};

const nextStatus: Record<TaskStatus, TaskStatus> = {
  todo: "inProgress",
  inProgress: "review",
  review: "done",
  done: "todo",
};

function TasksPanel({
  tasks, setTasks, profiles, byId, onActivity,
}: {
  tasks: Task[];
  setTasks: (fn: (t: Task[]) => Task[]) => void;
  profiles: AgentProfile[];
  byId: Map<string, AgentProfile>;
  onActivity: (agentId: string, text: string) => void;
}) {
  const [filter, setFilter] = useState<TaskStatus | "all">("all");
  const [adding, setAdding] = useState(false);
  const [title, setTitle] = useState("");
  const [assignee, setAssignee] = useState(profiles[0]?.id ?? "");
  const [priority, setPriority] = useState<TaskPriority>("medium");

  const shown = filter === "all" ? tasks : tasks.filter((t) => t.status === filter);

  const add = () => {
    if (!title.trim()) return;
    const id = assignee || profiles[0]?.id;
    setTasks((t) => [{ id: crypto.randomUUID(), title: title.trim(), assigneeId: id, status: "todo", priority, due: "This week" }, ...t]);
    onActivity(id, `was assigned "${title.trim()}"`);
    setTitle("");
    setAdding(false);
  };

  return (
    <section className="panel tasks-panel">
      <PanelHead title="Tasks">
        <button className="btn primary small" onClick={() => setAdding((a) => !a)}>
          <Icon name="plus" size={15} /> New task
        </button>
      </PanelHead>

      <div className="filters">
        {(["all", "todo", "inProgress", "review", "done"] as const).map((f) => (
          <button key={f} className={`filter ${filter === f ? "on" : ""}`} onClick={() => setFilter(f)}>
            {f === "all" ? "All" : statusLabel[f]}
          </button>
        ))}
      </div>

      {adding && (
        <form className="task-form" onSubmit={(e) => { e.preventDefault(); add(); }}>
          <input id="task-title" className="input" autoFocus placeholder="What needs doing?" value={title} onChange={(e) => setTitle(e.target.value)} />
          <select id="task-assignee" className="input" value={assignee} onChange={(e) => setAssignee(e.target.value)} aria-label="Assignee">
            {profiles.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
          <select id="task-priority" className="input" value={priority} onChange={(e) => setPriority(e.target.value as TaskPriority)} aria-label="Priority">
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>
          <button className="btn primary small" type="submit">Add</button>
        </form>
      )}

      <div className="table-wrap">
        <table className="tasks">
          <thead>
            <tr><th>Task</th><th>Agent</th><th>Status</th><th>Priority</th><th>Due</th></tr>
          </thead>
          <tbody>
            {shown.map((t) => {
              const agent = byId.get(t.assigneeId);
              return (
                <tr key={t.id}>
                  <td>
                    <button
                      className={`task-check ${t.status}`}
                      onClick={() => setTasks((all) => all.map((x) => (x.id === t.id ? { ...x, status: nextStatus[x.status] } : x)))}
                      aria-label={`Move "${t.title}" to ${statusLabel[nextStatus[t.status]]}`}
                    >
                      {t.status === "done" && <Icon name="check" size={12} />}
                    </button>
                    <span className="task-title">{t.title}</span>
                  </td>
                  <td>
                    {agent ? (
                      <span className="task-agent"><Avatar avatar={agent.avatar} size={22} /> {agent.name}</span>
                    ) : (
                      <span className="muted">Unassigned</span>
                    )}
                  </td>
                  <td><span className={`badge ${t.status}`}>{statusLabel[t.status]}</span></td>
                  <td><span className={`badge prio-${t.priority}`}>{t.priority[0].toUpperCase() + t.priority.slice(1)}</span></td>
                  <td className="muted">{t.status === "done" ? <Icon name="check" size={14} className="ok-text" /> : t.due}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function ProgressPanel() {
  const done = project.milestones.filter((m) => m.state === "done").length;
  const pct = Math.round(((done + 0.5) / project.milestones.length) * 100);
  return (
    <section className="panel">
      <p className="eyebrow">Project progress</p>
      <div className="progress-head">
        <h2>{project.name}</h2>
        <span className="pill ok">{project.status}</span>
      </div>
      <div className="progress-bar" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
        <span style={{ width: `${pct}%` }} />
      </div>
      <p className="progress-pct">{pct}%</p>
      <ul className="milestones">
        {project.milestones.map((m) => (
          <li key={m.title} className={m.state}>
            <span className="ms-icon">{m.state === "done" && <Icon name="check" size={12} />}</span>
            {m.title}
          </li>
        ))}
      </ul>
    </section>
  );
}

function ActivityPanel({ activity, byId }: { activity: ActivityItem[]; byId: Map<string, AgentProfile> }) {
  return (
    <section className="panel">
      <p className="eyebrow">Live activity</p>
      <ul className="activity">
        {activity.slice(0, 5).map((a) => {
          const agent = byId.get(a.agentId);
          return (
            <li key={a.id}>
              {agent ? <Avatar avatar={agent.avatar} size={32} ring={agent.colour} /> : <span className="act-blank" />}
              <div>
                <p><strong>{agent?.name ?? "Someone"}</strong> {a.text}</p>
                <small>{a.ago}</small>
              </div>
            </li>
          );
        })}
      </ul>
      <button className="link-btn">View all activity <Icon name="arrowRight" size={14} /></button>
    </section>
  );
}

function TerminalPanel({ agent }: { agent?: AgentProfile }) {
  const [reduced] = useState(() => window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false);
  const [count, setCount] = useState(reduced ? terminalLines.length : 0);

  useEffect(() => {
    if (reduced) return;
    const timer = setInterval(() => setCount((c) => (c >= terminalLines.length ? c : c + 1)), 350);
    return () => clearInterval(timer);
  }, [reduced]);

  return (
    <section className="panel terminal">
      <div className="terminal-head">
        <span><Icon name="terminal" size={15} /> Terminal {agent && <em style={{ color: agent.colour }}>({agent.name})</em>}</span>
        <Icon name="expand" size={14} />
      </div>
      <pre className="terminal-body">
        {terminalLines.slice(0, count).map((l, i) => (
          <span key={i} className={`t-${l.kind}`}>
            {l.kind === "cmd" ? "> " : l.kind === "ok" ? "✓ " : ""}
            {l.text}
            {"\n"}
          </span>
        ))}
        <span className="cursor">▍</span>
      </pre>
    </section>
  );
}

// ─────────────────────────────
// Agents page
// ─────────────────────────────

function AgentsPage({
  profiles, onNew, onEdit, onDuplicate,
}: {
  profiles: AgentProfile[];
  onNew: (role?: AgentRole) => void;
  onEdit: (p: AgentProfile) => void;
  onDuplicate: (id: string) => void;
}) {
  return (
    <div className="page">
      <div className="page-head">
        <div>
          <p className="eyebrow">Your workforce</p>
          <h1>Agents</h1>
          <p className="muted">Design each agent's identity, personality, skills and permissions. Changes show up in the office straight away.</p>
        </div>
        <button className="btn primary" onClick={() => onNew()}>
          <Icon name="plus" size={16} /> Create agent
        </button>
      </div>

      <div className="template-row">
        <span className="muted">Start from a template</span>
        {roleIds.filter((r) => r !== "custom").map((role) => (
          <button key={role} className="chip" onClick={() => onNew(role)}>
            <Icon name="sparkle" size={13} /> {roleInfo[role].label}
          </button>
        ))}
      </div>

      <div className="agent-grid">
        {profiles.map((p) => (
          <AgentCard key={p.id} profile={p} onEdit={() => onEdit(p)} onDuplicate={() => onDuplicate(p.id)} />
        ))}
        <button className="agent-card new" onClick={() => onNew()}>
          <span className="new-plus"><Icon name="plus" size={24} /></span>
          <strong>New agent</strong>
          <small>Build a custom profile from scratch</small>
        </button>
      </div>
    </div>
  );
}

function AgentCard({ profile, onEdit, onDuplicate }: { profile: AgentProfile; onEdit: () => void; onDuplicate: () => void }) {
  const top = [...traitKeys].sort((a, b) => profile.traits[b] - profile.traits[a]).slice(0, 3);
  const model = modelOptions[profile.model.provider].find((m) => m.id === profile.model.id)?.label ?? profile.model.id;

  return (
    <article className="agent-card" style={{ ["--agent" as string]: profile.colour }}>
      <div className="agent-card-head">
        <Avatar avatar={profile.avatar} size={56} ring={profile.colour} />
        <div>
          <h3>{profile.name}</h3>
          <p>{profile.title || roleInfo[profile.role].label}</p>
        </div>
        <span className={`pill status-${profile.status}`}>{profile.status}</span>
      </div>

      <p className="agent-card-desc">{profile.description || roleInfo[profile.role].summary}</p>

      <div className="agent-card-mid">
        <TraitRadar traits={profile.traits} colour={profile.colour} size={128} />
        <ul className="top-traits">
          {top.map((k) => (
            <li key={k}>
              <span>{traitInfo[k].label}</span>
              <span className="mini-bar"><span style={{ width: `${profile.traits[k]}%` }} /></span>
            </li>
          ))}
          <li className="muted">{toneInfo[profile.tone].label} tone</li>
        </ul>
      </div>

      <div className="chip-wrap compact">
        {profile.skills.slice(0, 4).map((s) => <span key={s} className="chip static">{s}</span>)}
        {profile.skills.length > 4 && <span className="chip static">+{profile.skills.length - 4}</span>}
      </div>

      <div className="agent-card-foot">
        <span className="muted"><Icon name="cpu" size={14} /> {model}</span>
        <div>
          <button className="btn ghost small" onClick={onDuplicate}><Icon name="copy" size={14} /> Duplicate</button>
          <button className="btn secondary small" onClick={onEdit}><Icon name="edit" size={14} /> Edit</button>
        </div>
      </div>
    </article>
  );
}
