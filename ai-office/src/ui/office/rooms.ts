// Office floor plan in OfficeView's SVG coordinates (viewBox 0 0 1000 580).
//
// Agents never walk through walls: every room has a door onto the corridor that
// runs between the top and bottom rows, and a hub just inside the door that every
// spot in the room can be reached from in a straight line. A walk between rooms is
// spot → hub → door → corridor → door → hub → spot.

export type Point = { x: number; y: number };

export type SpotKind = "desk" | "seat" | "stand";

export type Spot = Point & {
  kind: SpotKind;
  // Points walked through between the hub and this spot (e.g. around a table).
  via?: Point[];
  // What an agent is doing while parked here, when it isn't their own desk.
  activity?: string;
  // Kept for agents with this role (e.g. the librarian's desk).
  prefer?: string;
};

export type RoomName =
  | "library"
  | "meetingRoom"
  | "managerOffice"
  | "developerZone"
  | "lounge"
  | "testingLab";

export type Room = {
  name: string;
  // Corridor x where the room's door is.
  door: number;
  // Just inside the doorway.
  entry: Point;
  hub: Point;
  spots: Spot[];
  // Shown while visiting this room (not at your own desk).
  visitActivity: string;
};

export const CORRIDOR_Y = 280;

// New agents walk in from the right-hand end of the corridor.
export const FRONT_DOOR: Point = { x: 1010, y: CORRIDOR_Y };

export const rooms: Record<RoomName, Room> = {
  library: {
    name: "Library",
    door: 290,
    entry: { x: 290, y: 245 },
    hub: { x: 250, y: 228 },
    visitActivity: "Looking something up",
    spots: [
      { x: 190, y: 214, kind: "desk", prefer: "librarian" },
      { x: 96, y: 226, kind: "seat", activity: "Reading in the armchair" },
      { x: 300, y: 128, kind: "stand", activity: "Browsing the shelves" },
      { x: 130, y: 238, kind: "stand", activity: "Looking something up" },
    ],
  },

  meetingRoom: {
    name: "Meeting room",
    door: 500,
    entry: { x: 500, y: 245 },
    hub: { x: 500, y: 232 },
    visitActivity: "In the meeting room",
    // Chairs are ordered so a small group spreads out round the table.
    spots: [
      { x: 440, y: 210, kind: "seat" },
      { x: 520, y: 210, kind: "seat" },
      { x: 480, y: 118, kind: "seat", via: [{ x: 402, y: 214 }, { x: 402, y: 120 }] },
      { x: 560, y: 118, kind: "seat", via: [{ x: 598, y: 214 }, { x: 598, y: 120 }] },
      { x: 560, y: 210, kind: "seat" },
      { x: 440, y: 118, kind: "seat", via: [{ x: 402, y: 214 }, { x: 402, y: 120 }] },
      { x: 480, y: 210, kind: "seat" },
      { x: 520, y: 118, kind: "seat", via: [{ x: 598, y: 214 }, { x: 598, y: 120 }] },
    ],
  },

  managerOffice: {
    name: "Manager's office",
    door: 810,
    entry: { x: 810, y: 245 },
    hub: { x: 810, y: 225 },
    visitActivity: "Checking in with the manager",
    spots: [
      { x: 850, y: 198, kind: "desk" },
      { x: 778, y: 210, kind: "stand", activity: "Checking in with the manager" },
      { x: 925, y: 205, kind: "stand", activity: "Checking in with the manager" },
    ],
  },

  developerZone: {
    name: "Developer zone",
    door: 360,
    entry: { x: 360, y: 300 },
    hub: { x: 365, y: 485 },
    visitActivity: "Pairing with the developers",
    spots: [
      { x: 290, y: 468, kind: "desk" },
      { x: 120, y: 468, kind: "desk" },
      { x: 205, y: 492, kind: "stand", activity: "Looking over a shoulder" },
      { x: 62, y: 488, kind: "stand", activity: "Pairing with the developers" },
    ],
  },

  lounge: {
    name: "Lounge",
    door: 410,
    entry: { x: 410, y: 300 },
    hub: { x: 415, y: 460 },
    visitActivity: "Taking a break",
    spots: [
      { x: 470, y: 410, kind: "seat", activity: "Taking a break" },
      { x: 530, y: 410, kind: "seat", activity: "Taking a break" },
      { x: 460, y: 522, kind: "stand", activity: "Grabbing a coffee" },
      { x: 545, y: 522, kind: "stand", activity: "Grabbing a coffee" },
    ],
  },

  testingLab: {
    name: "Testing lab",
    door: 675,
    entry: { x: 675, y: 300 },
    hub: { x: 675, y: 492 },
    visitActivity: "Checking the test lab",
    spots: [
      { x: 770, y: 472, kind: "desk" },
      { x: 890, y: 472, kind: "desk" },
      { x: 830, y: 496, kind: "stand", activity: "Watching a test run" },
      { x: 950, y: 478, kind: "stand", activity: "Checking the test lab" },
    ],
  },
};

export const roomNames = Object.keys(rooms) as RoomName[];

export function isRoomName(value: unknown): value is RoomName {
  return typeof value === "string" && value in rooms;
}

// Waypoints from where an agent stands to a spot. `fromVia` is the via list of
// the spot they're leaving (walked in reverse); `from` null means they're in the
// corridor (just arrived through the front door).
export function route(
  from: { room: RoomName; via: Point[] } | null,
  to: { room: RoomName; spot: Spot }
): Point[] {
  const target = rooms[to.room];
  const arrive = [target.hub, ...(to.spot.via ?? []), to.spot];

  if (!from) {
    return [{ x: target.door, y: CORRIDOR_Y }, target.entry, ...arrive];
  }

  const leave = [...from.via].reverse();
  if (from.room === to.room) {
    return [...leave, ...arrive];
  }

  const origin = rooms[from.room];
  return [
    ...leave,
    origin.hub,
    origin.entry,
    { x: origin.door, y: CORRIDOR_Y },
    { x: target.door, y: CORRIDOR_Y },
    target.entry,
    ...arrive,
  ];
}
