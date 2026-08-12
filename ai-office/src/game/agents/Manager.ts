import Phaser from "phaser";
import { Agent } from "./Agent";

export class Manager extends Agent {
  private readonly wanderSpeech = [
    "What's everyone working on?",
    "We should review our priorities.",
    "I need an update from the team.",
    "What's our next objective?",
    "Let's keep things moving.",
    "I should check the progress.",
  ];

  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, {
      name: "Manager",
      x,
      y,
      colour: 0xf59e0b,
    });

    this.wander();
    this.randomWanderSpeech();
  }

  manage() {
    this.setState("working");
    this.speak("Managing the office...");
  }

  private randomWanderSpeech() {
    this.wait(5000, 15000, () => {
      this.speakRandomly(this.wanderSpeech);
      this.randomWanderSpeech();
    });
  }
}