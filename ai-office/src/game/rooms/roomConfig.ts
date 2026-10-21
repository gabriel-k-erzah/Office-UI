export type RoomName =
  | "library"
  | "meetingRoom"
  | "developerZone"
  | "managerOffice";

export type Room = {
  name: string;

  entrance: {
    x: number;
    y: number;
  };

  bounds: {
    xMin: number;
    xMax: number;
    yMin: number;
    yMax: number;
  };
};

export const rooms: Record<RoomName, Room> = {
  library: {
    name: "Library",

    entrance: {
      x: 150,
      y: 350,
    },

    bounds: {
      xMin: 50,
      xMax: 250,
      yMin: 350,
      yMax: 550,
    },
  },

  meetingRoom: {
    name: "Meeting Room",

    entrance: {
      x: 400,
      y: 250,
    },

    bounds: {
      xMin: 300,
      xMax: 500,
      yMin: 80,
      yMax: 250,
    },
  },

  developerZone: {
    name: "Developer Zone",

    entrance: {
      x: 650,
      y: 350,
    },

    bounds: {
      xMin: 550,
      xMax: 750,
      yMin: 350,
      yMax: 550,
    },
  },

  managerOffice: {
    name: "Manager Office",

    entrance: {
      x: 150,
      y: 250,
    },

    bounds: {
      xMin: 50,
      xMax: 250,
      yMin: 80,
      yMax: 250,
    },
  },
};