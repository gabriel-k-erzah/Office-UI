import type { ReactNode } from "react";

import type { RoomName } from "../../game/rooms/roomConfig";
import { Avatar } from "../agents/Avatar";
import type { AgentProfile } from "../agents/profile";

// Stylised 3/4 view of the office. In the full app this panel can host the
// Phaser canvas instead; seats below mirror the rooms in roomConfig.ts.

type Seat = { x: number; y: number; prefer?: AgentProfile["role"] };

const seats: Record<RoomName | "lounge", Seat[]> = {
  library: [{ x: 190, y: 214 }, { x: 96, y: 226 }],
  meetingRoom: [{ x: 440, y: 222 }, { x: 560, y: 222 }, { x: 500, y: 236 }],
  managerOffice: [{ x: 850, y: 200 }, { x: 740, y: 228 }],
  developerZone: [
    { x: 120, y: 470 },
    { x: 290, y: 470 },
    { x: 770, y: 474, prefer: "tester" },
    { x: 890, y: 474, prefer: "tester" },
  ],
  lounge: [{ x: 460, y: 520 }, { x: 545, y: 520 }, { x: 500, y: 410 }],
};

type Placed = { agent: AgentProfile; x: number; y: number };

function placeAgents(agents: AgentProfile[]): Placed[] {
  const taken = new Set<string>();
  const placed: Placed[] = [];
  const key = (room: string, i: number) => `${room}:${i}`;

  const take = (agent: AgentProfile, room: RoomName | "lounge", preferredOnly: boolean) => {
    const list = seats[room];
    for (let i = 0; i < list.length; i++) {
      const seat = list[i];
      if (taken.has(key(room, i))) continue;
      if (preferredOnly && seat.prefer !== agent.role) continue;
      if (!preferredOnly && seat.prefer && seat.prefer !== agent.role) continue;
      taken.add(key(room, i));
      placed.push({ agent, x: seat.x, y: seat.y });
      return true;
    }
    return false;
  };

  const remaining = agents.filter((a) => !take(a, a.homeRoom, true));
  const overflow = remaining.filter((a) => !take(a, a.homeRoom, false));
  const leftover = overflow.filter((a) => !take(a, "lounge", false));
  leftover.forEach((agent, i) => placed.push({ agent, x: 420 + (i % 4) * 50, y: 470 + Math.floor(i / 4) * 30 }));

  return placed.sort((a, b) => a.y - b.y);
}

const statusColour: Record<AgentProfile["status"], string> = {
  working: "#22c55e",
  idle: "#64748b",
  offline: "#334155",
};

type OfficeViewProps = {
  agents: AgentProfile[];
  selectedId?: string;
  onSelect: (id: string) => void;
};

export function OfficeView({ agents, selectedId, onSelect }: OfficeViewProps) {
  const placed = placeAgents(agents.filter((a) => a.status !== "offline"));

  return (
    <svg className="office-svg" viewBox="0 0 1000 580" role="img" aria-label="Office floor with agents at their desks">
      <Defs />

      {/* Base and back wall */}
      <rect x="0" y="0" width="1000" height="580" fill="#0b1324" />
      <rect x="10" y="40" width="980" height="530" fill="#1a2234" />
      <rect x="10" y="4" width="980" height="40" fill="url(#wallFace)" />
      <rect x="10" y="0" width="980" height="6" fill="#2a3550" />

      {/* Floors */}
      <rect x="20" y="44" width="320" height="216" fill="url(#wood)" />
      <rect x="350" y="44" width="300" height="216" fill="url(#carpet)" />
      <rect x="660" y="44" width="320" height="216" fill="url(#wood)" />
      <rect x="20" y="292" width="360" height="270" fill="url(#tiles)" />
      <rect x="390" y="292" width="220" height="270" fill="url(#woodLight)" />
      <rect x="620" y="292" width="360" height="270" fill="url(#tiles)" />

      <Library />
      <MeetingRoom />
      <ManagerOffice />
      <DeveloperZone />
      <Lounge />
      <TestingLab />

      {/* Partition walls */}
      <Wall x={340} y={30} w={10} d={232} />
      <Wall x={650} y={30} w={10} d={232} />
      <Wall x={380} y={278} w={10} d={286} />
      <Wall x={610} y={278} w={10} d={286} />
      <Wall x={10} y={262} w={150} d={10} h={26} />
      <Glass x={160} y={262} w={120} />
      <Wall x={360} y={262} w={60} d={10} h={26} />
      <Glass x={420} y={262} w={160} />
      <Wall x={580} y={262} w={60} d={10} h={26} />
      <Glass x={720} y={262} w={120} />
      <Wall x={900} y={262} w={90} d={10} h={26} />

      {/* Warm light pools */}
      <g style={{ mixBlendMode: "screen" }}>
        <circle cx="200" cy="150" r="140" fill="url(#warm)" />
        <circle cx="500" cy="150" r="120" fill="url(#warm)" />
        <circle cx="820" cy="160" r="140" fill="url(#warm)" />
        <circle cx="200" cy="430" r="150" fill="url(#cool)" />
        <circle cx="500" cy="470" r="120" fill="url(#warm)" />
        <circle cx="800" cy="440" r="150" fill="url(#cool)" />
      </g>

      <RoomTag x={34} y={58} label="Library" />
      <RoomTag x={364} y={58} label="Meeting room" />
      <RoomTag x={850} y={58} label="Manager" />
      <RoomTag x={34} y={306} label="Developer zone" />
      <RoomTag x={404} y={536} label="Lounge" />
      <RoomTag x={850} y={306} label="Testing lab" />

      {placed.map(({ agent, x, y }) => (
        <AgentToken
          key={agent.id}
          agent={agent}
          x={x}
          y={y}
          selected={agent.id === selectedId}
          onSelect={() => onSelect(agent.id)}
        />
      ))}
    </svg>
  );
}

// ─────────────────────────────
// Agent token
// ─────────────────────────────

function AgentToken({
  agent,
  x,
  y,
  selected,
  onSelect,
}: {
  agent: AgentProfile;
  x: number;
  y: number;
  selected: boolean;
  onSelect: () => void;
}) {
  const label = agent.activity || "Idle";
  const width = Math.max(agent.name.length * 8.4, label.length * 6.2) + 22;
  const labelY = y - 112;

  return (
    <g
      className={`agent-token ${agent.status} ${selected ? "selected" : ""}`}
      onClick={onSelect}
      onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && onSelect()}
      tabIndex={0}
      role="button"
      aria-label={`${agent.name}, ${label}`}
    >
      <ellipse cx={x} cy={y + 2} rx="20" ry="6" fill="#000" opacity="0.35" />
      {selected && <ellipse className="select-ring" cx={x} cy={y + 2} rx="28" ry="9" fill="none" stroke={agent.colour} strokeWidth="2" />}
      <g className="bob">
        <rect x={x - 13} y={y - 30} width="26" height="30" rx="10" fill={agent.avatar.outfit} />
        <rect x={x - 13} y={y - 30} width="26" height="30" rx="10" fill="url(#bodyShade)" />
        <g transform={`translate(${x - 19},${y - 64})`}>
          <Avatar avatar={agent.avatar} size={38} ring={agent.colour} />
        </g>
        <circle cx={x + 15} cy={y - 60} r="5" fill={statusColour[agent.status]} stroke="#0b1324" strokeWidth="2" />
      </g>

      <g className="agent-label">
        <rect x={x - width / 2} y={labelY} width={width} height="36" rx="7" fill="#0b1220" fillOpacity="0.86" stroke="#ffffff" strokeOpacity="0.08" />
        <path d={`M${x - 5} ${labelY + 36} L${x} ${labelY + 42} L${x + 5} ${labelY + 36} Z`} fill="#0b1220" fillOpacity="0.86" />
        <text x={x - width / 2 + 11} y={labelY + 15} className="agent-label-name">
          {agent.name}
        </text>
        <text x={x - width / 2 + 11} y={labelY + 29} className="agent-label-status">
          {label}
        </text>
      </g>
    </g>
  );
}

// ─────────────────────────────
// Building blocks
// ─────────────────────────────

function Box({
  x, y, w, d, h, top, front, children,
}: {
  x: number; y: number; w: number; d: number; h: number; top: string; front: string; children?: ReactNode;
}) {
  return (
    <g>
      <rect x={x} y={y + d - h} width={w} height={h} fill={front} />
      <rect x={x} y={y - h} width={w} height={d} fill={top} />
      {children}
    </g>
  );
}

function Wall({ x, y, w, d, h = 30 }: { x: number; y: number; w: number; d: number; h?: number }) {
  return <Box x={x} y={y} w={w} d={d} h={h} top="#3a4663" front="#232c42" />;
}

function Glass({ x, y, w }: { x: number; y: number; w: number }) {
  return (
    <g>
      <rect x={x} y={y - 22} width={w} height="30" fill="#7dd3fc" opacity="0.12" />
      <rect x={x} y={y - 24} width={w} height="3" fill="#94a3b8" opacity="0.6" />
      <rect x={x} y={y + 6} width={w} height="2" fill="#94a3b8" opacity="0.4" />
    </g>
  );
}

function RoomTag({ x, y, label }: { x: number; y: number; label: string }) {
  const width = label.length * 7.4 + 18;
  return (
    <g>
      <rect x={x} y={y} width={width} height="20" rx="4" fill="#0b1220" fillOpacity="0.72" />
      <text x={x + 9} y={y + 14} className="room-tag">
        {label.toUpperCase()}
      </text>
    </g>
  );
}

function Plant({ x, y, s = 1 }: { x: number; y: number; s?: number }) {
  return (
    <g transform={`translate(${x},${y}) scale(${s})`}>
      <ellipse cx="0" cy="4" rx="14" ry="4" fill="#000" opacity="0.3" />
      <path d="M-9 -12 L9 -12 L7 4 L-7 4 Z" fill="#4b3a2e" />
      <rect x="-10" y="-14" width="20" height="4" rx="1" fill="#5d4838" />
      <circle cx="-8" cy="-26" r="10" fill="#1f6b3a" />
      <circle cx="8" cy="-28" r="10" fill="#26803f" />
      <circle cx="0" cy="-40" r="11" fill="#2f9a4b" />
      <circle cx="-4" cy="-34" r="6" fill="#43b562" opacity="0.6" />
    </g>
  );
}

function Desk({ x, y, w = 90, monitors = 1, glow = "#60a5fa" }: { x: number; y: number; w?: number; monitors?: number; glow?: string }) {
  const gap = w / (monitors + 1);
  return (
    <g>
      <ellipse cx={x + w / 2} cy={y + 34} rx={w / 2 + 6} ry="8" fill="#000" opacity="0.25" />
      <Box x={x} y={y} w={w} d={30} h={20} top="#3b2a20" front="#24190f" />
      {Array.from({ length: monitors }, (_, i) => {
        const mx = x + gap * (i + 1);
        return (
          <g key={i}>
            <rect x={mx - 2} y={y - 26} width="4" height="10" fill="#111827" />
            <rect x={mx - 16} y={y - 44} width="32" height="20" rx="2" fill="#0f172a" stroke="#1f2937" />
            <rect x={mx - 14} y={y - 42} width="28" height="16" rx="1" fill={glow} opacity="0.85" />
            <rect x={mx - 12} y={y - 39} width="16" height="2" fill="#fff" opacity="0.5" />
            <rect x={mx - 12} y={y - 35} width="20" height="2" fill="#fff" opacity="0.35" />
          </g>
        );
      })}
    </g>
  );
}

function Chair({ x, y, colour = "#1e293b" }: { x: number; y: number; colour?: string }) {
  return (
    <g>
      <ellipse cx={x} cy={y + 8} rx="10" ry="3" fill="#000" opacity="0.3" />
      <rect x={x - 9} y={y - 14} width="18" height="10" rx="4" fill={colour} />
      <rect x={x - 10} y={y - 6} width="20" height="9" rx="4" fill={colour} />
      <rect x={x - 1} y={y + 2} width="2" height="6" fill="#0f172a" />
    </g>
  );
}

function Shelf({ x, y, w }: { x: number; y: number; w: number }) {
  const colours = ["#b45309", "#1d4ed8", "#15803d", "#7c2d12", "#a16207", "#6d28d9", "#be123c", "#0f766e"];
  const rows = [0, 1, 2];
  return (
    <g>
      <rect x={x} y={y} width={w} height="64" fill="#2b1d14" />
      {rows.map((r) => (
        <g key={r}>
          <rect x={x + 3} y={y + 4 + r * 20} width={w - 6} height="17" fill="#1a110b" />
          {Array.from({ length: Math.floor((w - 8) / 6) }, (_, i) => (
            <rect
              key={i}
              x={x + 5 + i * 6}
              y={y + 6 + r * 20 + ((i * 7 + r) % 4)}
              width="5"
              height={15 - ((i * 7 + r) % 4)}
              fill={colours[(i * 3 + r * 5) % colours.length]}
              opacity="0.9"
            />
          ))}
        </g>
      ))}
    </g>
  );
}

function Rug({ cx, cy, rx, ry, fill }: { cx: number; cy: number; rx: number; ry: number; fill: string }) {
  return (
    <g>
      <ellipse cx={cx} cy={cy} rx={rx} ry={ry} fill={fill} />
      <ellipse cx={cx} cy={cy} rx={rx - 8} ry={ry - 4} fill="none" stroke="#ffffff" strokeOpacity="0.08" strokeWidth="2" />
    </g>
  );
}

// ─────────────────────────────
// Rooms
// ─────────────────────────────

function Library() {
  return (
    <g>
      <Shelf x={30} y={0} w={130} />
      <Shelf x={180} y={0} w={150} />
      <Rug cx={170} cy={200} rx={120} ry={42} fill="#5a2f22" />
      <Desk x={140} y={150} w={100} />
      <Chair x={190} y={208} colour="#3f2a1f" />
      <g>
        <ellipse cx="80" cy="220" rx="26" ry="7" fill="#000" opacity="0.3" />
        <Box x={56} y={186} w={48} d={30} h={22} top="#3a3f4b" front="#272b35" />
        <rect x="56" y="160" width="48" height="12" rx="5" fill="#3a3f4b" />
      </g>
      <g>
        <rect x="270" y="110" width="3" height="40" fill="#1f2937" />
        <ellipse cx="271" cy="108" rx="12" ry="8" fill="#fde68a" />
        <circle cx="271" cy="108" r="22" fill="url(#warm)" />
      </g>
      <Plant x={316} y={230} />
      <Plant x={40} y={110} s={0.85} />
    </g>
  );
}

function MeetingRoom() {
  return (
    <g>
      <g filter="url(#glow)">
        <rect x="410" y="4" width="180" height="34" rx="3" fill="#0b1b3a" stroke="#3b82f6" strokeWidth="1.5" />
      </g>
      <path d="M440 26 L446 12 L452 26 M442.5 21 H449.5" stroke="#60a5fa" strokeWidth="2" fill="none" />
      <text x="460" y="24" className="screen-title">AI Ecosystem</text>
      <text x="460" y="34" className="screen-sub">Build · Collaborate · Achieve</text>

      {[440, 480, 520, 560].map((cx) => (
        <Chair key={`t${cx}`} x={cx} y={112} colour="#111827" />
      ))}
      <g>
        <ellipse cx="500" cy="196" rx="96" ry="14" fill="#000" opacity="0.3" />
        <Box x={414} y={126} w={172} d={60} h={16} top="#5b3a26" front="#3a2417" />
        <rect x="420" y="114" width="160" height="2" fill="#fff" opacity="0.08" />
      </g>
      {[440, 480, 520, 560].map((cx) => (
        <Chair key={`b${cx}`} x={cx} y={200} colour="#111827" />
      ))}
      <Plant x={372} y={240} s={0.9} />
      <Plant x={628} y={240} s={0.9} />
    </g>
  );
}

function ManagerOffice() {
  return (
    <g>
      <Shelf x={680} y={0} w={110} />
      <rect x="810" y="8" width="70" height="26" rx="2" fill="#0b1b3a" stroke="#334155" />
      <rect x="814" y="12" width="62" height="18" fill="#1e3a8a" opacity="0.6" />
      <Rug cx={830} cy={190} rx={120} ry={46} fill="#2a2f3d" />
      <Desk x={790} y={140} w={120} monitors={2} />
      <Chair x={850} y={198} colour="#111827" />
      <Plant x={700} y={130} />
      <Plant x={960} y={236} s={0.9} />
      <g>
        <ellipse cx="740" cy="236" rx="24" ry="6" fill="#000" opacity="0.3" />
        <Box x={718} y={206} w={44} d={26} h={18} top="#334155" front="#1e293b" />
      </g>
    </g>
  );
}

function DeveloperZone() {
  return (
    <g>
      <Shelf x={30} y={296} w={80} />
      <Desk x={70} y={412} w={100} monitors={2} />
      <Desk x={240} y={412} w={100} monitors={2} glow="#a78bfa" />
      <Chair x={120} y={468} />
      <Chair x={290} y={468} />
      <Plant x={350} y={540} />
      <Plant x={40} y={540} s={0.9} />
      <g>
        <ellipse cx="200" cy="350" rx="40" ry="8" fill="#000" opacity="0.25" />
        <Box x={160} y={316} w={80} d={30} h={24} top="#374151" front="#1f2937" />
        <rect x="166" y="296" width="20" height="10" rx="2" fill="#475569" />
        <rect x="196" y="298" width="12" height="8" rx="2" fill="#64748b" />
      </g>
    </g>
  );
}

function Lounge() {
  return (
    <g>
      <g>
        <Box x={400} y={306} w={200} d={34} h={34} top="#2f3a52" front="#202839" />
        {[410, 440, 470, 500, 530, 560, 585].map((cx, i) => (
          <circle key={cx} cx={cx} cy={272 + (i % 2) * 6} r="14" fill={i % 2 ? "#26803f" : "#1f6b3a"} />
        ))}
        <path d="M454 330 L460 318 L466 330 M456.5 326 H463.5" stroke="#60a5fa" strokeWidth="1.8" fill="none" />
        <text x="472" y="330" className="planter-title">AI Ecosystem</text>
      </g>
      <Rug cx={500} cy={470} rx={92} ry={40} fill="#8a6a4a" />
      <g>
        <ellipse cx="500" cy="442" rx="70" ry="10" fill="#000" opacity="0.3" />
        <Box x={440} y={400} w={120} d={36} h={22} top="#2a2f3a" front="#1b1f28" />
        <rect x="440" y="384" width="120" height="14" rx="6" fill="#333a48" />
      </g>
      <g>
        <ellipse cx="500" cy="490" rx="24" ry="7" fill="#000" opacity="0.35" />
        <ellipse cx="500" cy="478" rx="24" ry="9" fill="#1f2937" />
        <ellipse cx="500" cy="476" rx="20" ry="7" fill="#273244" />
        <circle cx="500" cy="474" r="4" fill="#4ade80" />
      </g>
      <Plant x={410} y={550} s={0.85} />
      <Plant x={592} y={550} s={0.85} />
    </g>
  );
}

function TestingLab() {
  return (
    <g>
      <Shelf x={890} y={296} w={80} />
      <Desk x={700} y={414} w={130} monitors={3} glow="#5eead4" />
      <Desk x={850} y={414} w={100} monitors={2} glow="#5eead4" />
      <Chair x={770} y={472} />
      <Chair x={890} y={472} />
      <Plant x={640} y={420} />
      <Plant x={960} y={550} s={0.9} />
      <g>
        <ellipse cx="700" cy="540" rx="26" ry="6" fill="#000" opacity="0.3" />
        <ellipse cx="700" cy="530" rx="22" ry="10" fill="#c98a4b" />
        <circle cx="684" cy="524" r="8" fill="#d99a5b" />
        <path d="M678 518 L676 512 L682 516 Z" fill="#a86b3c" />
        <circle cx="681" cy="524" r="1.2" fill="#1f1308" />
      </g>
    </g>
  );
}

function Defs() {
  return (
    <defs>
      <linearGradient id="wallFace" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#2b3650" />
        <stop offset="1" stopColor="#1c2438" />
      </linearGradient>
      <linearGradient id="bodyShade" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#ffffff" stopOpacity="0.18" />
        <stop offset="1" stopColor="#000000" stopOpacity="0.25" />
      </linearGradient>
      <radialGradient id="warm">
        <stop offset="0" stopColor="#ffb867" stopOpacity="0.32" />
        <stop offset="1" stopColor="#ffb867" stopOpacity="0" />
      </radialGradient>
      <radialGradient id="cool">
        <stop offset="0" stopColor="#7aa7ff" stopOpacity="0.16" />
        <stop offset="1" stopColor="#7aa7ff" stopOpacity="0" />
      </radialGradient>
      <pattern id="wood" width="60" height="14" patternUnits="userSpaceOnUse">
        <rect width="60" height="14" fill="#5a3d2b" />
        <rect y="13" width="60" height="1" fill="#3e2a1d" />
        <rect x="38" width="1" height="14" fill="#3e2a1d" />
        <rect width="60" height="6" fill="#ffffff" opacity="0.025" />
      </pattern>
      <pattern id="woodLight" width="60" height="14" patternUnits="userSpaceOnUse">
        <rect width="60" height="14" fill="#6b4a33" />
        <rect y="13" width="60" height="1" fill="#4a3324" />
        <rect x="22" width="1" height="14" fill="#4a3324" />
      </pattern>
      <pattern id="carpet" width="8" height="8" patternUnits="userSpaceOnUse">
        <rect width="8" height="8" fill="#3a3f4c" />
        <circle cx="2" cy="2" r="0.8" fill="#ffffff" opacity="0.05" />
      </pattern>
      <pattern id="tiles" width="36" height="22" patternUnits="userSpaceOnUse">
        <rect width="36" height="22" fill="#3b4150" />
        <rect width="36" height="1" fill="#2c313d" />
        <rect width="1" height="22" fill="#2c313d" />
      </pattern>
      <filter id="glow" x="-20%" y="-50%" width="140%" height="200%">
        <feGaussianBlur stdDeviation="4" result="b" />
        <feMerge>
          <feMergeNode in="b" />
          <feMergeNode in="SourceGraphic" />
        </feMerge>
      </filter>
    </defs>
  );
}
