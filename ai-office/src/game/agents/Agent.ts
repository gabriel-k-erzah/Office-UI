import Phaser from "phaser";

export type AgentState =
  | "idle"
  | "walking"
  | "working"
  | "researching"
  | "meeting"
  | "reporting";

export type AgentConfig = {
  name: string;
  x: number;
  y: number;
  colour?: number;
};

export class Agent {
  protected readonly scene: Phaser.Scene;
  protected readonly character: Phaser.GameObjects.Container;

  protected state: AgentState = "idle";

  private destination?: Phaser.Math.Vector2;
  private wandering = false;
  private speechBubble?: Phaser.GameObjects.Text;

  private readonly speed = 1.5;
  private readonly arrivalDistance = 5;

  constructor(scene: Phaser.Scene, config: AgentConfig) {
    this.scene = scene;
    this.character = this.createCharacter(config);
  }

  update() {
    this.handleMovement();
  }

  // ─────────────────────────────
  // Movement
  // ─────────────────────────────

  moveTo(x: number, y: number) {
    this.destination = new Phaser.Math.Vector2(x, y);
    this.setState("walking");
  }

  moveRandomly() {
    this.moveTo(
      this.randomX(),
      this.randomY()
    );
  }

  wander() {
    this.wandering = true;
    this.startNextWander();
  }

  stopWandering() {
    this.wandering = false;
  }

  // ─────────────────────────────
  // Speech
  // ─────────────────────────────

  speak(message: string, duration = 3000) {
    this.removeCurrentSpeechBubble();

    this.speechBubble = this.createSpeechBubble(message);

    this.removeSpeechBubbleAfter(duration);
  }

  speakRandomly(messages: string[], duration = 3000) {
    if (messages.length === 0) {
      return;
    }

    const message = Phaser.Utils.Array.GetRandom(messages);

    this.speak(message, duration);
  }

  // ─────────────────────────────
  // State
  // ─────────────────────────────

  setState(state: AgentState) {
    this.state = state;
  }

  getState(): AgentState {
    return this.state;
  }

  // ─────────────────────────────
  // Timing
  // ─────────────────────────────

  wait(
    minimum: number,
    maximum: number,
    action: () => void
  ) {
    const delay = Phaser.Math.Between(
      minimum,
      maximum
    );

    this.scene.time.delayedCall(delay, action);
  }

  // ─────────────────────────────
  // Movement internals
  // ─────────────────────────────

  private handleMovement() {
    if (!this.hasDestination()) {
      return;
    }

    if (this.hasArrived()) {
      this.finishMovement();
      return;
    }

    this.takeStep();
  }

  private hasDestination() {
    return this.destination !== undefined;
  }

  private hasArrived() {
    return this.distanceToDestination() <= this.arrivalDistance;
  }

  private finishMovement() {
    this.snapToDestination();
    this.clearDestination();
    this.setState("idle");

    if (this.wandering) {
      this.scheduleNextWander();
    }
  }

  private takeStep() {
    if (!this.destination) {
      return;
    }

    const direction = this.directionToDestination();

    this.character.x +=
      Math.cos(direction) * this.speed;

    this.character.y +=
      Math.sin(direction) * this.speed;
  }

  private distanceToDestination() {
    if (!this.destination) {
      return Infinity;
    }

    return Phaser.Math.Distance.Between(
      this.character.x,
      this.character.y,
      this.destination.x,
      this.destination.y
    );
  }

  private directionToDestination() {
    if (!this.destination) {
      return 0;
    }

    return Phaser.Math.Angle.Between(
      this.character.x,
      this.character.y,
      this.destination.x,
      this.destination.y
    );
  }

  private snapToDestination() {
    if (!this.destination) {
      return;
    }

    this.character.setPosition(
      this.destination.x,
      this.destination.y
    );
  }

  private clearDestination() {
    this.destination = undefined;
  }

  // ─────────────────────────────
  // Wandering
  // ─────────────────────────────

  private startNextWander() {
    if (!this.wandering || this.hasDestination()) {
      return;
    }

    this.moveRandomly();
  }

  private scheduleNextWander() {
    this.wait(1000, 15000, () => {
      this.startNextWander();
    });
  }

  private randomX() {
    return Phaser.Math.Between(80, 720);
  }

  private randomY() {
    return Phaser.Math.Between(140, 520);
  }

  // ─────────────────────────────
  // Speech internals
  // ─────────────────────────────

  private createSpeechBubble(message: string) {
    const bubble = this.scene.add
      .text(0, -75, message, {
        fontSize: "13px",
        color: "#000000",
        backgroundColor: "#ffffff",

        padding: {
          x: 10,
          y: 6,
        },

        wordWrap: {
          width: 180,
        },

        align: "center",
      })
      .setOrigin(0.5, 1);

    this.character.add(bubble);

    return bubble;
  }

  private removeSpeechBubbleAfter(milliseconds: number) {
    this.scene.time.delayedCall(milliseconds, () => {
      this.removeCurrentSpeechBubble();
    });
  }

  private removeCurrentSpeechBubble() {
    if (!this.speechBubble) {
      return;
    }

    this.speechBubble.destroy();
    this.speechBubble = undefined;
  }

  // ─────────────────────────────
  // Character creation
  // ─────────────────────────────

  private createCharacter(config: AgentConfig) {
    const body = this.createBody(config.colour);
    const label = this.createLabel(config.name);

    return this.scene.add.container(
      config.x,
      config.y,
      [body, label]
    );
  }

  private createBody(colour = 0x3b82f6) {
    return this.scene.add.rectangle(
      0,
      0,
      32,
      48,
      colour
    );
  }

  private createLabel(name: string) {
    return this.scene.add
      .text(0, -38, name, {
        fontSize: "14px",
        color: "#ffffff",
      })
      .setOrigin(0.5);
  }
}