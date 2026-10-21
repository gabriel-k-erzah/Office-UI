import { useMemo, useState, type ChangeEvent, type ReactNode } from "react";

import { Avatar } from "../agents/Avatar";
import {
  applyTemplate,
  buildSystemPrompt,
  estimateTokens,
  modelOptions,
  quirkSuggestions,
  randomAvatar,
  roleIds,
  roleInfo,
  roomOptions,
  skillCatalogue,
  swatches,
  toneIds,
  toneInfo,
  toolIds,
  toolInfo,
  traitInfo,
  traitKeys,
  withGeneratedPrompt,
  type Accessory,
  type AgentProfile,
  type AvatarConfig,
  type HairStyle,
  type ModelProvider,
  type ToolPermission,
} from "../agents/profile";
import { Icon, type IconName } from "./Icon";

type StepId = "identity" | "appearance" | "personality" | "skills" | "model" | "prompt";

const steps: { id: StepId; label: string; hint: string; icon: IconName }[] = [
  { id: "identity", label: "Identity", hint: "Name, role and home", icon: "user" },
  { id: "appearance", label: "Appearance", hint: "Avatar and colour", icon: "palette" },
  { id: "personality", label: "Personality", hint: "Traits and tone", icon: "brain" },
  { id: "skills", label: "Skills & tools", hint: "Expertise and permissions", icon: "wrench" },
  { id: "model", label: "Model", hint: "Engine and memory", icon: "cpu" },
  { id: "prompt", label: "System prompt", hint: "What the model reads", icon: "prompt" },
];

type ProfileBuilderProps = {
  initial: AgentProfile;
  isNew: boolean;
  onSave: (profile: AgentProfile) => void;
  onCancel: () => void;
  onDelete?: (id: string) => void;
};

export function ProfileBuilder({ initial, isNew, onSave, onCancel, onDelete }: ProfileBuilderProps) {
  const [draft, setDraft] = useState<AgentProfile>(initial);
  const [step, setStep] = useState<StepId>("identity");
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [triedSave, setTriedSave] = useState(false);

  const patch = (changes: Partial<AgentProfile>) =>
    setDraft((current) => withGeneratedPrompt({ ...current, ...changes }));

  const patchAvatar = (changes: Partial<AvatarConfig>) =>
    setDraft((current) => ({ ...current, avatar: { ...current.avatar, ...changes } }));

  const nameMissing = !draft.name.trim();
  const stepIndex = steps.findIndex((s) => s.id === step);

  const save = () => {
    setTriedSave(true);
    if (nameMissing) {
      setStep("identity");
      return;
    }
    onSave({ ...draft, name: draft.name.trim() });
  };

  return (
    <div className="builder-backdrop" role="dialog" aria-modal="true" aria-labelledby="builder-title">
      <div className="builder">
        <header className="builder-head">
          <div>
            <p className="eyebrow">Agent studio</p>
            <h2 id="builder-title">{isNew ? "Create an agent" : `Edit ${initial.name}`}</h2>
          </div>
          <button className="icon-btn" onClick={onCancel} aria-label="Close">
            <Icon name="close" />
          </button>
        </header>

        <div className="builder-body">
          <nav className="builder-steps" aria-label="Profile sections">
            {steps.map((s, i) => (
              <button
                key={s.id}
                className={`builder-step ${s.id === step ? "active" : ""} ${i < stepIndex ? "past" : ""}`}
                onClick={() => setStep(s.id)}
              >
                <span className="builder-step-icon">
                  <Icon name={s.icon} size={16} />
                </span>
                <span>
                  <strong>{s.label}</strong>
                  <small>{s.hint}</small>
                </span>
              </button>
            ))}
          </nav>

          <section className="builder-form">
            {step === "identity" && (
              <IdentityStep draft={draft} isNew={isNew} patch={patch} setDraft={setDraft} showErrors={triedSave} />
            )}
            {step === "appearance" && <AppearanceStep draft={draft} patch={patch} patchAvatar={patchAvatar} />}
            {step === "personality" && <PersonalityStep draft={draft} patch={patch} />}
            {step === "skills" && <SkillsStep draft={draft} patch={patch} />}
            {step === "model" && <ModelStep draft={draft} patch={patch} />}
            {step === "prompt" && <PromptStep draft={draft} setDraft={setDraft} />}
          </section>

          <aside className="builder-preview">
            <PreviewCard profile={draft} />
          </aside>
        </div>

        <footer className="builder-foot">
          <div className="builder-foot-left">
            {!isNew && onDelete && !confirmDelete && (
              <button className="btn ghost danger" onClick={() => setConfirmDelete(true)}>
                <Icon name="trash" size={16} /> Delete agent
              </button>
            )}
            {confirmDelete && onDelete && (
              <div className="confirm-inline">
                <span>Delete {initial.name}? This can't be undone.</span>
                <button className="btn danger" onClick={() => onDelete(initial.id)}>Delete</button>
                <button className="btn ghost" onClick={() => setConfirmDelete(false)}>Keep</button>
              </div>
            )}
          </div>
          <div className="builder-foot-right">
            {stepIndex > 0 && (
              <button className="btn ghost" onClick={() => setStep(steps[stepIndex - 1].id)}>Back</button>
            )}
            {stepIndex < steps.length - 1 && (
              <button className="btn secondary" onClick={() => setStep(steps[stepIndex + 1].id)}>
                Next: {steps[stepIndex + 1].label}
              </button>
            )}
            <button className="btn primary" onClick={save}>
              <Icon name="check" size={16} /> {isNew ? "Create agent" : "Save changes"}
            </button>
          </div>
        </footer>
      </div>
    </div>
  );
}

// ─────────────────────────────
// Steps
// ─────────────────────────────

type StepProps = {
  draft: AgentProfile;
  patch: (changes: Partial<AgentProfile>) => void;
};

function IdentityStep({
  draft,
  isNew,
  patch,
  setDraft,
  showErrors,
}: StepProps & { isNew: boolean; setDraft: (p: AgentProfile) => void; showErrors: boolean }) {
  const nameMissing = showErrors && !draft.name.trim();
  return (
    <>
      <StepHeader title="Identity" text="Who is this agent and where do they sit in the office?" />

      <Field label="Role template" hint={isNew ? "Picking a template fills in sensible defaults you can change." : "Switching template replaces traits, skills, tone and tools."}>
        <div className="role-grid">
          {roleIds.map((role) => (
            <button
              key={role}
              className={`role-card ${draft.role === role ? "active" : ""}`}
              onClick={() => setDraft(applyTemplate(draft, role))}
            >
              <strong>{roleInfo[role].label}</strong>
              <small>{roleInfo[role].summary}</small>
            </button>
          ))}
        </div>
      </Field>

      <div className="field-row">
        <Field label="Name" htmlFor="agent-name" error={nameMissing ? "Give your agent a name." : undefined}>
          <input
            id="agent-name"
            className="input"
            value={draft.name}
            placeholder="e.g. Atlas"
            maxLength={24}
            onChange={(e) => patch({ name: e.target.value })}
            aria-invalid={nameMissing}
          />
        </Field>
        <Field label="Job title" htmlFor="agent-title">
          <input
            id="agent-title"
            className="input"
            value={draft.title}
            placeholder="e.g. Staff Engineer"
            onChange={(e) => patch({ title: e.target.value })}
          />
        </Field>
      </div>

      <Field label="Mission" htmlFor="agent-description" hint="One or two sentences. This opens the system prompt.">
        <textarea
          id="agent-description"
          className="input"
          rows={3}
          value={draft.description}
          placeholder="What is this agent responsible for?"
          onChange={(e) => patch({ description: e.target.value })}
        />
      </Field>

      <div className="field-row">
        <Field label="Home room" htmlFor="agent-room" hint="Where the agent works in the office.">
          <select
            id="agent-room"
            className="input"
            value={draft.homeRoom}
            onChange={(e) => patch({ homeRoom: e.target.value as AgentProfile["homeRoom"] })}
          >
            {roomOptions.map((room) => (
              <option key={room.id} value={room.id}>{room.label}</option>
            ))}
          </select>
        </Field>
        <Field label="Status" htmlFor="agent-status">
          <select
            id="agent-status"
            className="input"
            value={draft.status}
            onChange={(e) => patch({ status: e.target.value as AgentProfile["status"] })}
          >
            <option value="working">Working</option>
            <option value="idle">Idle</option>
            <option value="offline">Offline</option>
          </select>
        </Field>
      </div>
    </>
  );
}

function AppearanceStep({
  draft,
  patch,
  patchAvatar,
}: StepProps & { patchAvatar: (changes: Partial<AvatarConfig>) => void }) {
  const { avatar } = draft;
  const [uploadError, setUploadError] = useState("");

  const onUpload = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setUploadError("Choose an image file (PNG, JPG, SVG or WebP).");
      return;
    }
    if (file.size > 1_500_000) {
      setUploadError("That image is over 1.5 MB. Pick a smaller one.");
      return;
    }
    setUploadError("");
    const reader = new FileReader();
    reader.onload = () => patchAvatar({ imageDataUrl: String(reader.result) });
    reader.readAsDataURL(file);
  };

  return (
    <>
      <StepHeader title="Appearance" text="Design how the agent looks in the office and across the dashboard." />

      <div className="avatar-studio">
        <div className="avatar-stage" style={{ ["--agent" as string]: draft.colour }}>
          <Avatar avatar={avatar} size={150} ring={draft.colour} />
          <div className="avatar-actions">
            <button className="btn secondary small" onClick={() => patchAvatar({ ...randomAvatar(), imageDataUrl: undefined })}>
              <Icon name="dice" size={15} /> Randomise
            </button>
            <label className="btn ghost small">
              <Icon name="upload" size={15} /> Upload
              <input type="file" accept="image/*" hidden onChange={onUpload} />
            </label>
            {avatar.imageDataUrl && (
              <button className="btn ghost small" onClick={() => patchAvatar({ imageDataUrl: undefined })}>
                Use illustrated
              </button>
            )}
          </div>
          {uploadError && <p className="field-error">{uploadError}</p>}
        </div>

        <div className="avatar-controls">
          <Field label="Accent colour" hint="Used for the office label, status ring and Phaser sprite.">
            <Swatches values={swatches.colour} value={draft.colour} onChange={(colour) => patch({ colour })} />
          </Field>
          <Field label="Skin">
            <Swatches values={swatches.skin} value={avatar.skin} onChange={(skin) => patchAvatar({ skin })} />
          </Field>
          <Field label="Hair style">
            <Chips<HairStyle>
              options={["short", "side", "long", "bun", "curly", "buzz"]}
              value={avatar.hair}
              onChange={(hair) => patchAvatar({ hair })}
            />
          </Field>
          <Field label="Hair colour">
            <Swatches values={swatches.hair} value={avatar.hairColour} onChange={(hairColour) => patchAvatar({ hairColour })} />
          </Field>
          <Field label="Outfit">
            <Swatches values={swatches.outfit} value={avatar.outfit} onChange={(outfit) => patchAvatar({ outfit })} />
          </Field>
          <Field label="Accessory">
            <Chips<Accessory>
              options={["none", "glasses", "headset", "beanie"]}
              value={avatar.accessory}
              onChange={(accessory) => patchAvatar({ accessory })}
            />
          </Field>
          <Field label="Backdrop">
            <Swatches values={swatches.background} value={avatar.background} onChange={(background) => patchAvatar({ background })} />
          </Field>
        </div>
      </div>
    </>
  );
}

function PersonalityStep({ draft, patch }: StepProps) {
  const [customQuirk, setCustomQuirk] = useState("");
  const [newLine, setNewLine] = useState("");

  const toggleQuirk = (quirk: string) =>
    patch({
      quirks: draft.quirks.includes(quirk)
        ? draft.quirks.filter((q) => q !== quirk)
        : [...draft.quirks, quirk],
    });

  const addQuirk = () => {
    const value = customQuirk.trim();
    if (value && !draft.quirks.includes(value)) patch({ quirks: [...draft.quirks, value] });
    setCustomQuirk("");
  };

  const addLine = () => {
    const value = newLine.trim();
    if (value) patch({ idleLines: [...draft.idleLines, value] });
    setNewLine("");
  };

  const quirkOptions = Array.from(new Set([...quirkSuggestions, ...draft.quirks]));

  return (
    <>
      <StepHeader title="Personality" text="Shape how the agent thinks, decides and talks. Every change updates the system prompt." />

      <Field label="Traits">
        <div className="trait-list">
          {traitKeys.map((key) => {
            const info = traitInfo[key];
            const value = draft.traits[key];
            return (
              <div className="trait" key={key}>
                <div className="trait-head">
                  <label htmlFor={`trait-${key}`}>{info.label}</label>
                  <span className="trait-value">{value}</span>
                </div>
                <input
                  id={`trait-${key}`}
                  type="range"
                  min={0}
                  max={100}
                  step={5}
                  value={value}
                  style={{ ["--fill" as string]: `${value}%` }}
                  onChange={(e) => patch({ traits: { ...draft.traits, [key]: Number(e.target.value) } })}
                />
                <div className="trait-scale">
                  <span>{info.low}</span>
                  <span>{info.high}</span>
                </div>
              </div>
            );
          })}
        </div>
      </Field>

      <Field label="Tone of voice">
        <div className="tone-grid">
          {toneIds.map((tone) => (
            <button
              key={tone}
              className={`tone-card ${draft.tone === tone ? "active" : ""}`}
              onClick={() => patch({ tone })}
            >
              <strong>{toneInfo[tone].label}</strong>
              <small>{toneInfo[tone].description}</small>
            </button>
          ))}
        </div>
      </Field>

      <Field label="Character tags" hint="Short descriptors that colour the agent's behaviour.">
        <div className="chip-wrap">
          {quirkOptions.map((quirk) => (
            <button
              key={quirk}
              className={`chip ${draft.quirks.includes(quirk) ? "on" : ""}`}
              onClick={() => toggleQuirk(quirk)}
              aria-pressed={draft.quirks.includes(quirk)}
            >
              {quirk}
            </button>
          ))}
        </div>
        <form className="inline-add" onSubmit={(e) => { e.preventDefault(); addQuirk(); }}>
          <input id="custom-quirk" className="input" placeholder="Add your own tag" value={customQuirk} onChange={(e) => setCustomQuirk(e.target.value)} />
          <button className="btn secondary small" type="submit"><Icon name="plus" size={15} /> Add</button>
        </form>
      </Field>

      <Field label="Office chatter" hint="Lines the agent says in speech bubbles while wandering the office.">
        <ul className="line-list">
          {draft.idleLines.map((line, i) => (
            <li key={`${line}-${i}`}>
              <span>“{line}”</span>
              <button
                className="icon-btn small"
                aria-label={`Remove "${line}"`}
                onClick={() => patch({ idleLines: draft.idleLines.filter((_, j) => j !== i) })}
              >
                <Icon name="close" size={14} />
              </button>
            </li>
          ))}
          {draft.idleLines.length === 0 && <li className="muted">No lines yet. The agent will stay quiet.</li>}
        </ul>
        <form className="inline-add" onSubmit={(e) => { e.preventDefault(); addLine(); }}>
          <input id="new-line" className="input" placeholder="e.g. Has anyone seen my coffee?" value={newLine} onChange={(e) => setNewLine(e.target.value)} />
          <button className="btn secondary small" type="submit"><Icon name="plus" size={15} /> Add</button>
        </form>
      </Field>
    </>
  );
}

function SkillsStep({ draft, patch }: StepProps) {
  const [custom, setCustom] = useState("");

  const toggleSkill = (skill: string) =>
    patch({
      skills: draft.skills.includes(skill)
        ? draft.skills.filter((s) => s !== skill)
        : [...draft.skills, skill],
    });

  const known = new Set(Object.values(skillCatalogue).flat());
  const customSkills = draft.skills.filter((s) => !known.has(s));

  const addCustom = () => {
    const value = custom.trim();
    if (value && !draft.skills.includes(value)) patch({ skills: [...draft.skills, value] });
    setCustom("");
  };

  return (
    <>
      <StepHeader title="Skills & tools" text="Pick what the agent is good at and what it's allowed to touch." />

      <Field label={`Skills · ${draft.skills.length} selected`}>
        <div className="skill-groups">
          {Object.entries(skillCatalogue).map(([group, skills]) => (
            <div className="skill-group" key={group}>
              <p className="skill-group-label">{group}</p>
              <div className="chip-wrap">
                {skills.map((skill) => (
                  <button
                    key={skill}
                    className={`chip ${draft.skills.includes(skill) ? "on" : ""}`}
                    onClick={() => toggleSkill(skill)}
                    aria-pressed={draft.skills.includes(skill)}
                  >
                    {skill}
                  </button>
                ))}
              </div>
            </div>
          ))}
          {customSkills.length > 0 && (
            <div className="skill-group">
              <p className="skill-group-label">Custom</p>
              <div className="chip-wrap">
                {customSkills.map((skill) => (
                  <button key={skill} className="chip on" onClick={() => toggleSkill(skill)} aria-pressed>
                    {skill}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
        <form className="inline-add" onSubmit={(e) => { e.preventDefault(); addCustom(); }}>
          <input id="custom-skill" className="input" placeholder="Add a custom skill" value={custom} onChange={(e) => setCustom(e.target.value)} />
          <button className="btn secondary small" type="submit"><Icon name="plus" size={15} /> Add</button>
        </form>
      </Field>

      <Field label="Tool permissions" hint="Ask means a human approves each use. Destructive actions always need approval.">
        <div className="perm-table">
          {toolIds.map((id) => (
            <div className="perm-row" key={id}>
              <div>
                <strong>{toolInfo[id].label}</strong>
                <small>{toolInfo[id].detail}</small>
              </div>
              <Segmented<ToolPermission>
                label={toolInfo[id].label}
                options={[
                  { value: "allow", label: "Allow" },
                  { value: "ask", label: "Ask" },
                  { value: "block", label: "Block" },
                ]}
                value={draft.tools[id]}
                onChange={(value) => patch({ tools: { ...draft.tools, [id]: value } })}
              />
            </div>
          ))}
        </div>
      </Field>
    </>
  );
}

function ModelStep({ draft, patch }: StepProps) {
  const { model } = draft;
  const setModel = (changes: Partial<AgentProfile["model"]>) => patch({ model: { ...model, ...changes } });

  const providers: { id: ModelProvider; label: string; note: string }[] = [
    { id: "claude", label: "Claude", note: "Recommended" },
    { id: "codex", label: "Codex", note: "Coming soon" },
    { id: "local", label: "Local", note: "Ollama" },
  ];

  return (
    <>
      <StepHeader title="Model" text="Choose the engine behind this agent. Nothing is called until the backend is connected." />

      <Field label="Provider">
        <div className="provider-grid">
          {providers.map((p) => (
            <button
              key={p.id}
              className={`role-card ${model.provider === p.id ? "active" : ""}`}
              onClick={() => setModel({ provider: p.id, id: modelOptions[p.id][0].id })}
            >
              <strong>{p.label}</strong>
              <small>{p.note}</small>
            </button>
          ))}
        </div>
      </Field>

      <Field label="Model" htmlFor="agent-model">
        <select id="agent-model" className="input" value={model.id} onChange={(e) => setModel({ id: e.target.value })}>
          {modelOptions[model.provider].map((m) => (
            <option key={m.id} value={m.id}>{m.label}</option>
          ))}
        </select>
      </Field>

      <div className="field-row">
        <Field label={`Temperature · ${model.temperature.toFixed(1)}`} htmlFor="agent-temp" hint="Lower is more focused, higher is more varied.">
          <input
            id="agent-temp"
            type="range"
            min={0}
            max={1}
            step={0.1}
            value={model.temperature}
            style={{ ["--fill" as string]: `${model.temperature * 100}%` }}
            onChange={(e) => setModel({ temperature: Number(e.target.value) })}
          />
        </Field>
        <Field label="Max output tokens" htmlFor="agent-tokens">
          <select id="agent-tokens" className="input" value={model.maxTokens} onChange={(e) => setModel({ maxTokens: Number(e.target.value) })}>
            {[1024, 2048, 4096, 8192, 16384].map((n) => (
              <option key={n} value={n}>{n.toLocaleString()}</option>
            ))}
          </select>
        </Field>
      </div>

      <label className="toggle-row" htmlFor="agent-memory">
        <span>
          <strong>Project memory</strong>
          <small>Remember decisions, findings and preferences across sessions.</small>
        </span>
        <input id="agent-memory" type="checkbox" className="switch" checked={model.memory} onChange={(e) => setModel({ memory: e.target.checked })} />
      </label>
    </>
  );
}

function PromptStep({ draft, setDraft }: { draft: AgentProfile; setDraft: (p: AgentProfile) => void }) {
  const [copied, setCopied] = useState(false);
  const generated = draft.systemPromptMode === "generated";

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(draft.systemPrompt);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      setCopied(false);
    }
  };

  return (
    <>
      <StepHeader title="System prompt" text="This is exactly what the model receives. It's written from the profile, or you can take over." />

      <div className="prompt-toolbar">
        <Segmented<"generated" | "custom">
          label="Prompt mode"
          options={[
            { value: "generated", label: "Auto from profile" },
            { value: "custom", label: "Custom" },
          ]}
          value={draft.systemPromptMode}
          onChange={(mode) =>
            setDraft(mode === "generated"
              ? { ...draft, systemPromptMode: mode, systemPrompt: buildSystemPrompt(draft) }
              : { ...draft, systemPromptMode: mode })
          }
        />
        <div className="prompt-meta">
          <span>{estimateTokens(draft.systemPrompt).toLocaleString()} tokens</span>
          {!generated && (
            <button className="btn ghost small" onClick={() => setDraft({ ...draft, systemPrompt: buildSystemPrompt(draft) })}>
              <Icon name="sparkle" size={15} /> Regenerate
            </button>
          )}
          <button className="btn ghost small" onClick={copy}>
            <Icon name="copy" size={15} /> {copied ? "Copied" : "Copy"}
          </button>
        </div>
      </div>

      <textarea
        id="agent-prompt"
        className="input prompt-editor"
        value={draft.systemPrompt}
        readOnly={generated}
        onChange={(e) => setDraft({ ...draft, systemPrompt: e.target.value })}
        spellCheck={false}
      />
      {generated && <p className="field-hint">Switch to Custom to edit by hand. Profile changes stop updating it after that.</p>}
    </>
  );
}

// ─────────────────────────────
// Preview
// ─────────────────────────────

export function PreviewCard({ profile }: { profile: AgentProfile }) {
  const tone = toneInfo[profile.tone];
  const modelLabel = useMemo(
    () => modelOptions[profile.model.provider].find((m) => m.id === profile.model.id)?.label ?? profile.model.id,
    [profile.model]
  );
  const allowed = toolIds.filter((id) => profile.tools[id] === "allow").length;
  const asks = toolIds.filter((id) => profile.tools[id] === "ask").length;

  return (
    <div className="preview" style={{ ["--agent" as string]: profile.colour }}>
      <p className="eyebrow">Live preview</p>
      <div className="preview-hero">
        <Avatar avatar={profile.avatar} size={84} ring={profile.colour} />
        <div>
          <h3>{profile.name.trim() || "Unnamed agent"}</h3>
          <p>{profile.title || roleInfo[profile.role].label}</p>
          <span className="pill" style={{ color: profile.colour }}>
            {roomOptions.find((r) => r.id === profile.homeRoom)?.label}
          </span>
        </div>
      </div>

      <TraitRadar traits={profile.traits} colour={profile.colour} />

      <div className="preview-bubble">
        <Avatar avatar={profile.avatar} size={26} />
        <p>{tone.sample}</p>
      </div>
      <p className="preview-caption">{tone.label} tone{profile.quirks.length ? ` · ${profile.quirks.slice(0, 3).join(", ")}` : ""}</p>

      {profile.skills.length > 0 && (
        <div className="chip-wrap compact">
          {profile.skills.slice(0, 8).map((s) => (
            <span key={s} className="chip static">{s}</span>
          ))}
          {profile.skills.length > 8 && <span className="chip static">+{profile.skills.length - 8}</span>}
        </div>
      )}

      <dl className="preview-stats">
        <div><dt>Model</dt><dd>{modelLabel}</dd></div>
        <div><dt>Tools</dt><dd>{allowed} allowed · {asks} ask</dd></div>
        <div><dt>Prompt</dt><dd>{estimateTokens(profile.systemPrompt)} tokens</dd></div>
      </dl>
    </div>
  );
}

export function TraitRadar({ traits, colour, size = 200 }: { traits: AgentProfile["traits"]; colour: string; size?: number }) {
  const c = 100;
  const r = 58;
  const point = (i: number, value: number) => {
    // Radius leaves room for axis labels inside the 200px viewBox.
    const angle = (Math.PI * 2 * i) / traitKeys.length - Math.PI / 2;
    return [c + Math.cos(angle) * r * value, c + Math.sin(angle) * r * value] as const;
  };
  const poly = traitKeys.map((k, i) => point(i, traits[k] / 100).join(",")).join(" ");

  return (
    <svg className="radar" viewBox="-18 -4 236 208" width={size} height={size} role="img" aria-label="Trait profile">
      {[0.25, 0.5, 0.75, 1].map((s) => (
        <polygon key={s} points={traitKeys.map((_, i) => point(i, s).join(",")).join(" ")} className="radar-grid" />
      ))}
      {traitKeys.map((k, i) => {
        const [x, y] = point(i, 1);
        const [lx, ly] = point(i, 1.32);
        return (
          <g key={k}>
            <line x1={c} y1={c} x2={x} y2={y} className="radar-axis" />
            <text x={lx} y={ly + 3} textAnchor="middle" className="radar-label">{traitInfo[k].label}</text>
          </g>
        );
      })}
      <polygon points={poly} fill={colour} fillOpacity="0.22" stroke={colour} strokeWidth="2" strokeLinejoin="round" />
      {traitKeys.map((k, i) => {
        const [x, y] = point(i, traits[k] / 100);
        return <circle key={k} cx={x} cy={y} r="3" fill={colour} />;
      })}
    </svg>
  );
}

// ─────────────────────────────
// Form primitives
// ─────────────────────────────

function StepHeader({ title, text }: { title: string; text: string }) {
  return (
    <div className="step-header">
      <h3>{title}</h3>
      <p>{text}</p>
    </div>
  );
}

function Field({
  label, hint, error, htmlFor, children,
}: {
  label: string; hint?: string; error?: string; htmlFor?: string; children: ReactNode;
}) {
  return (
    <div className="field">
      {htmlFor ? <label className="field-label" htmlFor={htmlFor}>{label}</label> : <p className="field-label">{label}</p>}
      {children}
      {error ? <p className="field-error">{error}</p> : hint && <p className="field-hint">{hint}</p>}
    </div>
  );
}

function Swatches({ values, value, onChange }: { values: string[]; value: string; onChange: (v: string) => void }) {
  return (
    <div className="swatches">
      {values.map((v) => (
        <button
          key={v}
          className={`swatch ${v === value ? "on" : ""}`}
          style={{ background: v }}
          onClick={() => onChange(v)}
          aria-label={v}
          aria-pressed={v === value}
        />
      ))}
      <label className="swatch custom" aria-label="Custom colour">
        <input type="color" value={value} onChange={(e) => onChange(e.target.value)} />
        <Icon name="plus" size={14} />
      </label>
    </div>
  );
}

function Chips<T extends string>({ options, value, onChange }: { options: T[]; value: T; onChange: (v: T) => void }) {
  return (
    <div className="chip-wrap">
      {options.map((o) => (
        <button key={o} className={`chip ${o === value ? "on" : ""}`} onClick={() => onChange(o)} aria-pressed={o === value}>
          {o.charAt(0).toUpperCase() + o.slice(1)}
        </button>
      ))}
    </div>
  );
}

function Segmented<T extends string>({
  label, options, value, onChange,
}: {
  label: string; options: { value: T; label: string }[]; value: T; onChange: (v: T) => void;
}) {
  return (
    <div className="segmented" role="radiogroup" aria-label={label}>
      {options.map((o) => (
        <button
          key={o.value}
          role="radio"
          aria-checked={o.value === value}
          className={`seg ${o.value} ${o.value === value ? "on" : ""}`}
          onClick={() => onChange(o.value)}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
