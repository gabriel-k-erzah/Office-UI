import { useCallback, useEffect, useState } from "react";

import { isRoomName } from "../office/rooms";
import {
  createId,
  createProfile,
  roleTemplates,
  withGeneratedPrompt,
  type AgentProfile,
  type AgentRole,
  type AgentStatus,
} from "./profile";

const storageKey = "ai-office.agents.v1";
const librarianKey = "ai-office.librarian-added";

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

// What the seeded team are into. Also used to fill in profiles saved before
// interests existed.
const seededInterests: Record<string, string[]> = {
  agent_marcus: ["Chess", "Road cycling", "Jazz records", "Cooking curries"],
  agent_iris: ["Birdwatching", "Mystery novels", "Astronomy", "Sourdough baking"],
  agent_leo: ["Retro gaming", "Bouldering", "Mechanical keyboards", "Sci-fi films"],
  agent_tess: ["Escape rooms", "Trail running", "Board games", "True-crime podcasts"],
  agent_nova: ["Film photography", "Pottery", "Indie gigs", "Houseplants"],
  agent_ada: ["Crosswords", "Calligraphy", "Victorian novels", "Canal walks"],
};

export const FREE_ACTIVITY = "Between projects";

export function seedProfiles(): AgentProfile[] {
  const tester = createProfile("tester");
  return [
    seed("manager", "Marcus", "idle", FREE_ACTIVITY, {
      interests: seededInterests.agent_marcus,
      avatar: { ...createProfile("manager").avatar, skin: "#eebc94", hairColour: "#1c1714", background: "#5b3412" },
    }),
    seed("researcher", "Iris", "idle", FREE_ACTIVITY, {
      interests: seededInterests.agent_iris,
      avatar: { ...createProfile("researcher").avatar, skin: "#f8d5b8", hairColour: "#8a5a33", background: "#1d3b75" },
    }),
    seed("developer", "Leo", "idle", FREE_ACTIVITY, {
      interests: seededInterests.agent_leo,
      avatar: { ...createProfile("developer").avatar, skin: "#d39a6f", hairColour: "#4a2f1d", background: "#3b2a6b" },
    }),
    seed("tester", "Tess", "idle", FREE_ACTIVITY, {
      interests: seededInterests.agent_tess,
      avatar: { ...tester.avatar, skin: "#a86b45", hairColour: "#1c1714", background: "#14532d" },
    }),
    seed("designer", "Nova", "idle", FREE_ACTIVITY, {
      interests: seededInterests.agent_nova,
      avatar: { ...createProfile("designer").avatar, skin: "#eebc94", background: "#3f1d2e" },
    }),
    seedLibrarian(),
  ];
}

function seedLibrarian() {
  return seed("librarian", "Ada", "idle", FREE_ACTIVITY, {
    interests: seededInterests.agent_ada,
    avatar: { ...createProfile("librarian").avatar, skin: "#7a4a2c", hairColour: "#9aa3b2", background: "#5b3412" },
  });
}

// Activities from the old demo project ("Crypto Dashboard").
const demoActivities = new Set(["Planning next tasks", "Researching APIs", "Implementing API client", "Waiting for build"]);

// Brings profiles saved by older versions up to date:
// - testers lived in the developer zone (but sat in the lab); unknown rooms fall
//   back to the role's default
// - interests didn't exist
// - the seeded team were "working" on the demo project
function upgrade(saved: AgentProfile): AgentProfile {
  let profile = saved;
  if (profile.role === "tester" && profile.homeRoom === "developerZone") {
    profile = { ...profile, homeRoom: "testingLab" };
  }
  if (!isRoomName(profile.homeRoom)) {
    profile = { ...profile, homeRoom: roleTemplates[profile.role]?.homeRoom ?? "meetingRoom" };
  }
  if (!Array.isArray(profile.interests)) {
    profile = withGeneratedPrompt({
      ...profile,
      interests: seededInterests[profile.id] ?? [...(roleTemplates[profile.role]?.interests ?? [])],
    });
  }
  if (demoActivities.has(profile.activity) || (profile.activity === "Idle" && seededInterests[profile.id])) {
    profile = { ...profile, status: profile.status === "offline" ? "offline" : "idle", activity: FREE_ACTIVITY };
  }
  // Library tools arrived later: everyone may read; only librarians may write.
  const savedTools: Partial<AgentProfile["tools"]> = profile.tools;
  if (!savedTools.libraryRead) {
    profile = {
      ...profile,
      tools: { ...profile.tools, libraryRead: "allow", libraryWrite: profile.role === "librarian" ? "allow" : "block" },
    };
  }
  // Generated prompts are rebuilt so they pick up wording changes (custom ones are left alone).
  return withGeneratedPrompt(profile);
}

function load(): AgentProfile[] {
  try {
    const raw = localStorage.getItem(storageKey);
    if (raw) {
      const parsed = JSON.parse(raw) as AgentProfile[];
      if (Array.isArray(parsed) && parsed.length) {
        const profiles = parsed.map(upgrade);
        // The library needs a keeper: offices saved before librarians existed get
        // Ada, once (if you remove her later she stays removed).
        if (!localStorage.getItem(librarianKey) && !profiles.some((p) => p.role === "librarian")) {
          profiles.push(seedLibrarian());
        }
        localStorage.setItem(librarianKey, "1");
        return profiles;
      }
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
