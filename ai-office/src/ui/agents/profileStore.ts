import { useCallback, useEffect, useState } from "react";

import {
  createId,
  createProfile,
  withGeneratedPrompt,
  type AgentProfile,
  type AgentRole,
  type AgentStatus,
} from "./profile";

const storageKey = "ai-office.agents.v1";

function seed(
  role: AgentRole,
  name: string,
  status: AgentStatus,
  activity: string,
  overrides: Partial<AgentProfile> = {}
): AgentProfile {
  const profile = createProfile(role, name);
  return withGeneratedPrompt({
    ...profile,
    ...overrides,
    id: `agent_${name.toLowerCase()}`,
    status,
    activity,
  });
}

export function seedProfiles(): AgentProfile[] {
  const tester = createProfile("tester");
  return [
    seed("manager", "Marcus", "working", "Planning next tasks", {
      avatar: { ...createProfile("manager").avatar, skin: "#eebc94", hairColour: "#1c1714", background: "#5b3412" },
    }),
    seed("researcher", "Iris", "working", "Researching APIs", {
      avatar: { ...createProfile("researcher").avatar, skin: "#f8d5b8", hairColour: "#8a5a33", background: "#1d3b75" },
    }),
    seed("developer", "Leo", "working", "Implementing API client", {
      avatar: { ...createProfile("developer").avatar, skin: "#d39a6f", hairColour: "#4a2f1d", background: "#3b2a6b" },
    }),
    seed("tester", "Tess", "idle", "Waiting for build", {
      homeRoom: "developerZone",
      avatar: { ...tester.avatar, skin: "#a86b45", hairColour: "#1c1714", background: "#14532d" },
    }),
    seed("designer", "Nova", "idle", "Idle", {
      avatar: { ...createProfile("designer").avatar, skin: "#eebc94", background: "#3f1d2e" },
    }),
  ];
}

function load(): AgentProfile[] {
  try {
    const raw = localStorage.getItem(storageKey);
    if (raw) {
      const parsed = JSON.parse(raw) as AgentProfile[];
      if (Array.isArray(parsed) && parsed.length) return parsed;
    }
  } catch {
    // Storage can be unavailable (private mode, sandboxed frames).
  }
  return seedProfiles();
}

function persist(profiles: AgentProfile[]) {
  try {
    localStorage.setItem(storageKey, JSON.stringify(profiles));
  } catch {
    // Ignore: profiles still live in memory for this session.
  }
}

export function useAgentProfiles() {
  const [profiles, setProfiles] = useState<AgentProfile[]>(load);

  useEffect(() => {
    persist(profiles);
  }, [profiles]);

  const save = useCallback((profile: AgentProfile) => {
    const stamped = { ...profile, updatedAt: Date.now() };
    setProfiles((current) => {
      const exists = current.some((p) => p.id === profile.id);
      return exists
        ? current.map((p) => (p.id === profile.id ? stamped : p))
        : [...current, stamped];
    });
  }, []);

  const remove = useCallback((id: string) => {
    setProfiles((current) => current.filter((p) => p.id !== id));
  }, []);

  const duplicate = useCallback((id: string) => {
    setProfiles((current) => {
      const source = current.find((p) => p.id === id);
      if (!source) return current;
      const now = Date.now();
      const copy: AgentProfile = {
        ...structuredClone(source),
        id: createId(),
        name: `${source.name} copy`,
        status: "idle",
        activity: "Idle",
        createdAt: now,
        updatedAt: now,
      };
      return [...current, withGeneratedPrompt(copy)];
    });
  }, []);

  const reset = useCallback(() => setProfiles(seedProfiles()), []);

  return { profiles, save, remove, duplicate, reset };
}
