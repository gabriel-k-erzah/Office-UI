import type { AgentProfile } from "../agents/profile";
import {
  FRONT_DOOR,
  roomNames,
  rooms,
  route,
  type Point,
  type RoomName,
  type Spot,
} from "./rooms";

// Moves agents around the office. Pure TypeScript (no React, no DOM): OfficeView
// calls tick() every animation frame and reads positions back.
//
// For now behaviour is ambient: agents sit at their desk, wander, visit other
// rooms and get pulled into stand-ups. send() is the hook for real events later
// ("researcher → library, activity: Searching the docs").

export type AgentView = {
  id: string;
  room: RoomName;
  walking: boolean;
  away: boolean;
  activity: string;
  speech?: string;
};

type Destination = { room: RoomName; spot: string; activity?: string };

type SimAgent = {
  profile: AgentProfile;
  x: number;
  y: number;
  room: RoomName;
  // Spot the agent is standing at (null while walking or in the corridor).
  at: string | null;
  // Spot the agent is walking to.
  target: string | null;
  homeSpot: string | null;
  path: Point[];
  walkingTo: RoomName;
  arrivalActivity?: string;
  pending?: Destination;
  activity: string;
  speech?: string;
  speechUntil: number;
  nextAt: number;
  inMeeting: boolean;
  // Real work in progress (e.g. answering in team chat). Keeps them at their desk.
  task?: string;
  // Held somewhere on purpose (e.g. chatting in the lounge) until released.
  engaged: boolean;
};

export const WALK_SPEED = 80; // px per second
const FIRST_MEETING = [20_000, 30_000] as const;
const MEETING_GAP = [60_000, 90_000] as const;
const MEETING_LENGTH = 15_000; // once everyone's seated
const GATHER_LIMIT = 30_000;

const between = (min: number, max: number) => min + Math.random() * (max - min);
const pick = <T,>(items: T[]): T | undefined => items[Math.floor(Math.random() * items.length)];

const spotKey = (room: RoomName, index: number) => `${room}:${index}`;

function spotOf(key: string): { room: RoomName; spot: Spot } {
  const [room, index] = key.split(":") as [RoomName, string];
  return { room, spot: rooms[room].spots[Number(index)] };
}

export class OfficeSim {
  private agents = new Map<string, SimAgent>();
  private listeners = new Set<() => void>();
  private snapshot: AgentView[] = [];
  private now = 0;
  private synced = false;
  private changed = false;
  private meeting: { phase: "gathering" | "running"; until: number } | null = null;
  private nextMeetingAt = between(...FIRST_MEETING);
  private hasWork = false;

  private speed = WALK_SPEED;

  // ─────────────────────────────
  // React glue (useSyncExternalStore)
  // ─────────────────────────────

  subscribe = (listener: () => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  getSnapshot = () => this.snapshot;

  // Reduced motion: agents still change rooms, they just don't walk there.
  setReducedMotion(reduce: boolean) {
    this.speed = reduce ? Infinity : WALK_SPEED;
  }

  position(id: string): Point | undefined {
    const agent = this.agents.get(id);
    return agent && { x: agent.x, y: agent.y };
  }

  // ─────────────────────────────
  // Profiles
  // ─────────────────────────────

  sync(profiles: AgentProfile[]) {
    const present = profiles.filter((p) => p.status !== "offline");
    const ids = new Set(present.map((p) => p.id));

    for (const id of this.agents.keys()) {
      if (!ids.has(id)) this.agents.delete(id);
    }

    for (const profile of present) {
      const existing = this.agents.get(profile.id);
      if (existing) {
        const movedHome = existing.profile.homeRoom !== profile.homeRoom;
        existing.profile = profile;
        if (movedHome) {
          existing.homeSpot = null;
          this.goHome(existing);
        } else if (existing.at && existing.at === existing.homeSpot) {
          existing.activity = existing.task ?? profile.activity;
        }
      } else {
        this.add(profile);
      }
    }

    this.synced = true;
    this.changed = true;
    this.emit();
  }

  // Drive an agent from outside (e.g. a backend event). Uses any free spot in
  // the room; the agent finishes their current walk first.
  // The agent is busy with something real: they head to their desk (unless
  // they're in a stand-up) and show it until the task is cleared with null.
  setTask(id: string, task: string | null) {
    const agent = this.agents.get(id);
    if (!agent) return;
    agent.task = task ?? undefined;

    if (agent.task && !agent.inMeeting && agent.at !== agent.homeSpot) {
      this.goHome(agent);
    } else if (!agent.path.length) {
      agent.activity = agent.task ?? this.activityAt(agent);
      agent.nextAt = this.now + between(4_000, 9_000);
    }
    this.changed = true;
    this.emit();
  }

  say(id: string, text: string, ms = 6_000) {
    const agent = this.agents.get(id);
    if (!agent) return;
    agent.speech = text;
    agent.speechUntil = this.now + ms;
    this.changed = true;
    this.emit();
  }

  // Stand-ups only happen when there's work on.
  setHasWork(hasWork: boolean) {
    if (hasWork && !this.hasWork) this.nextMeetingAt = this.now + between(...FIRST_MEETING);
    this.hasWork = hasWork;
  }

  // Send agents somewhere together and keep them there (no wandering, no
  // stand-ups) until release(). Each gets their own activity label.
  hangOut(people: { id: string; activity: string }[], room: RoomName) {
    for (const { id, activity } of people) {
      const agent = this.agents.get(id);
      if (!agent) continue;
      agent.engaged = true;
      const spot = this.freeSpot(agent, room, (s) => s.kind !== "desk");
      if (spot) {
        this.goTo(agent, { room, spot, activity });
      } else {
        agent.activity = activity;
      }
    }
    this.changed = true;
    this.emit();
  }

  release(ids: string[]) {
    for (const id of ids) {
      const agent = this.agents.get(id);
      if (!agent) continue;
      agent.engaged = false;
      agent.nextAt = this.now + between(1_000, 4_000);
    }
  }

  // Everyone listed has finished walking (or isn't in the office any more).
  settled(ids: string[]) {
    return ids.every((id) => {
      const agent = this.agents.get(id);
      return !agent || (!agent.path.length && !agent.pending);
    });
  }

  send(id: string, room: RoomName, activity?: string) {
    const agent = this.agents.get(id);
    const spot = agent && this.freeSpot(agent, room);
    if (!agent || !spot) return;
    this.goTo(agent, { room, spot, activity });
    this.emit();
  }

  private add(profile: AgentProfile) {
    const agent: SimAgent = {
      profile,
      x: FRONT_DOOR.x,
      y: FRONT_DOOR.y,
      room: profile.homeRoom,
      at: null,
      target: null,
      homeSpot: null,
      path: [],
      walkingTo: profile.homeRoom,
      activity: profile.activity,
      speechUntil: 0,
      nextAt: this.now + between(2_000, 8_000),
      inMeeting: false,
      engaged: false,
    };
    this.agents.set(profile.id, agent);

    const home = this.claimHome(agent);

    // On first load everyone is already at their desk; agents created later
    // walk in through the front door.
    if (!this.synced && home) {
      const { room, spot } = spotOf(home);
      Object.assign(agent, { x: spot.x, y: spot.y, room, at: home });
    } else {
      this.goHome(agent, null);
    }
  }

  // ─────────────────────────────
  // Frame loop
  // ─────────────────────────────

  tick(ms: number) {
    this.now += ms;

    for (const agent of this.agents.values()) {
      if (agent.path.length) {
        this.walk(agent, ms);
      } else if (this.now >= agent.nextAt) {
        this.decide(agent);
      }

      if (agent.speech && this.now >= agent.speechUntil) {
        agent.speech = undefined;
        this.changed = true;
      }
    }

    this.runMeetings();
    this.emit();
  }

  private walk(agent: SimAgent, ms: number) {
    let budget = (this.speed * ms) / 1000;

    while (budget > 0 && agent.path.length) {
      const next = agent.path[0];
      const dx = next.x - agent.x;
      const dy = next.y - agent.y;
      const distance = Math.hypot(dx, dy);

      if (distance <= budget) {
        agent.x = next.x;
        agent.y = next.y;
        agent.path.shift();
        budget -= distance;
      } else {
        agent.x += (dx / distance) * budget;
        agent.y += (dy / distance) * budget;
        budget = 0;
      }
    }

    if (!agent.path.length) this.arrive(agent);
  }

  private arrive(agent: SimAgent) {
    agent.at = agent.target;
    agent.target = null;
    agent.room = agent.walkingTo;
    agent.activity = this.activityAt(agent, agent.arrivalActivity);
    agent.arrivalActivity = undefined;
    agent.nextAt = this.now + (agent.at === agent.homeSpot ? between(8_000, 18_000) : between(6_000, 12_000));
    this.changed = true;

    if (agent.pending) {
      const pending = agent.pending;
      agent.pending = undefined;
      this.goTo(agent, pending);
    }
  }

  // ─────────────────────────────
  // Behaviour
  // ─────────────────────────────

  private decide(agent: SimAgent) {
    // Default pause; the branches below replace it when they start a walk.
    agent.nextAt = this.now + 5_000;
    if (agent.inMeeting || agent.engaged) return;
    if (agent.task) {
      // Busy: stay put, or get back to the desk if a stand-up pulled them away.
      if (agent.at !== agent.homeSpot) this.goHome(agent);
      return;
    }

    const lines = agent.profile.idleLines.filter(Boolean);
    if (lines.length && Math.random() < 0.3) {
      agent.speech = pick(lines);
      agent.speechUntil = this.now + 4_000;
      this.changed = true;
    }

    const atHome = agent.at !== null && agent.at === agent.homeSpot;
    if (!atHome) {
      this.goHome(agent);
      return;
    }

    const working = agent.profile.status === "working";
    const roll = Math.random();
    const stay = working ? 0.55 : 0.35;
    const wander = stay + 0.2;

    if (roll < stay) {
      agent.nextAt = this.now + between(6_000, 14_000);
    } else if (roll < wander) {
      const spot = this.freeSpot(agent, agent.profile.homeRoom, (s) => s.kind !== "desk");
      if (spot) this.goTo(agent, { room: agent.profile.homeRoom, spot });
    } else {
      this.visitSomewhere(agent);
    }
  }

  private visitSomewhere(agent: SimAgent) {
    const home = agent.profile.homeRoom;
    // The lounge is popular, especially when there's nothing to do.
    const loungeWeight = agent.profile.status === "working" ? 1 : 3;
    const options = roomNames
      .filter((room) => room !== home)
      .flatMap((room) => Array<RoomName>(room === "lounge" ? loungeWeight : 1).fill(room));

    for (let tries = 0; tries < 4; tries++) {
      const room = pick(options);
      const spot = room && this.freeSpot(agent, room, (s) => s.kind !== "desk");
      if (room && spot) {
        this.goTo(agent, { room, spot });
        return;
      }
    }
  }

  private goHome(agent: SimAgent, from: SimAgent["at"] | undefined = undefined) {
    const home = this.claimHome(agent);
    if (home) {
      this.goTo(agent, { room: spotOf(home).room, spot: home }, from);
      return;
    }
    // No desk free anywhere: hang around the lounge.
    const spot = this.freeSpot(agent, "lounge");
    if (spot) this.goTo(agent, { room: "lounge", spot }, from);
  }

  // ─────────────────────────────
  // Stand-ups
  // ─────────────────────────────

  private runMeetings() {
    const meeting = this.meeting;

    if (meeting?.phase === "gathering") {
      const attendees = [...this.agents.values()].filter((a) => a.inMeeting);
      const seated = attendees.every((a) => !a.path.length && !a.pending && a.room === "meetingRoom");
      // The clock starts once everyone's sat down (or after a while, for stragglers).
      if (seated || this.now >= meeting.until) {
        this.meeting = { phase: "running", until: this.now + MEETING_LENGTH };
      }
    } else if (meeting?.phase === "running") {
      if (this.now >= meeting.until) this.endMeeting();
    } else if (this.hasWork && this.now >= this.nextMeetingAt && this.agents.size >= 2) {
      this.startMeeting();
    }
  }

  private startMeeting() {
    const everyone = [...this.agents.values()];
    const host = everyone.find((a) => a.profile.role === "manager" && !a.engaged) ?? pick(everyone.filter((a) => !a.engaged));
    // Wait for the host to be somewhere before they call everyone in.
    if (!host || host.path.length) return;

    host.speech = "Quick stand-up, everyone!";
    host.speechUntil = this.now + 4_000;

    // Host first so they get the head of the table.
    for (const agent of [host, ...everyone.filter((a) => a !== host)]) {
      if (agent.engaged) continue;
      agent.inMeeting = true;
      if (agent.at && spotOf(agent.at).room === "meetingRoom" && !agent.path.length) {
        // Already at the table (e.g. a designer whose desk is in here).
        agent.activity = "In the stand-up";
        continue;
      }
      const spot = this.freeSpot(agent, "meetingRoom");
      if (spot) this.goTo(agent, { room: "meetingRoom", spot, activity: "In the stand-up" });
      else agent.inMeeting = false;
    }

    this.meeting = { phase: "gathering", until: this.now + GATHER_LIMIT };
    this.changed = true;
  }

  private endMeeting() {
    for (const agent of this.agents.values()) {
      if (!agent.inMeeting) continue;
      agent.inMeeting = false;
      // Leave in ones and twos rather than all at once.
      agent.nextAt = this.now + between(0, 3_000);
    }
    this.meeting = null;
    this.nextMeetingAt = this.now + between(...MEETING_GAP);
    this.changed = true;
  }

  // ─────────────────────────────
  // Moving
  // ─────────────────────────────

  private goTo(agent: SimAgent, destination: Destination, from: SimAgent["at"] | undefined = agent.at) {
    if (agent.path.length) {
      agent.pending = destination;
      return;
    }

    const { room, spot } = spotOf(destination.spot);
    const leaving = from === null ? null : { room: agent.room, via: from ? (spotOf(from).spot.via ?? []) : [] };

    agent.path = route(leaving, { room, spot });
    agent.target = destination.spot;
    agent.walkingTo = room;
    agent.arrivalActivity = destination.activity;
    const sameRoom = room === agent.room && agent.at !== null;
    agent.at = null;
    if (sameRoom) {
      // Moving about inside a room: keep doing what they were doing.
      agent.activity = destination.activity ?? this.activityIn(agent, room, spot);
    } else {
      agent.activity =
        destination.spot === agent.homeSpot ? "Heading back to desk" : `Heading to the ${rooms[room].name.toLowerCase()}`;
    }
    this.changed = true;
  }

  private activityAt(agent: SimAgent, override?: string) {
    if (override) return override;
    return this.activityIn(agent, agent.room, agent.at ? spotOf(agent.at).spot : undefined);
  }

  // In your own room you carry on with your work; elsewhere the spot says what you're up to.
  private activityIn(agent: SimAgent, room: RoomName, spot?: Spot) {
    if (agent.task) return agent.task;
    if (room === agent.profile.homeRoom) return agent.profile.activity;
    return spot?.activity ?? rooms[room].visitActivity;
  }

  // ─────────────────────────────
  // Spots
  // ─────────────────────────────

  private claimHome(agent: SimAgent) {
    const home = agent.profile.homeRoom;
    if (agent.homeSpot && spotOf(agent.homeSpot).room === home) return agent.homeSpot;

    agent.homeSpot =
      this.freeSpot(agent, home, (s) => s.kind === "desk") ??
      this.freeSpot(agent, home) ??
      null;
    return agent.homeSpot;
  }

  private taken(key: string, except: SimAgent) {
    for (const other of this.agents.values()) {
      if (other === except) continue;
      if (other.at === key || other.target === key || other.homeSpot === key || other.pending?.spot === key) return true;
    }
    return false;
  }

  private freeSpot(agent: SimAgent, room: RoomName, filter: (spot: Spot) => boolean = () => true) {
    const free = rooms[room].spots
      .map((spot, index) => ({ spot, key: spotKey(room, index) }))
      .filter(({ spot, key }) => filter(spot) && key !== agent.at && !this.taken(key, agent));
    // Meeting chairs fill in order; everywhere else pick at random.
    const choice = room === "meetingRoom" ? free[0] : pick(free);
    return choice?.key;
  }

  // ─────────────────────────────
  // Snapshot for React
  // ─────────────────────────────

  private emit() {
    if (!this.changed) return;
    this.changed = false;
    this.snapshot = [...this.agents.values()].map((agent) => ({
      id: agent.profile.id,
      room: agent.room,
      walking: agent.path.length > 0,
      away: agent.room !== agent.profile.homeRoom || agent.inMeeting,
      activity: agent.activity,
      speech: agent.speech,
    }));
    this.listeners.forEach((listener) => listener());
  }
}
