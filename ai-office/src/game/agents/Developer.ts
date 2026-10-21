import Phaser from "phaser";

import { Agent } from "./Agent";

export class Developer extends Agent {
  private readonly wanderSpeech = [
    "I should refactor that...",
    "There must be a cleaner solution.",
    "I wonder why that's broken.",
    "I'll need to test that.",
    "That could probably be automated.",
    "Maybe I should check the logs.",
  ];

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number
  ) {
    super(scene, {
      name: "Developer",
      x,
      y,
      colour: 0x22c55e,
      startingRoom: "developerZone",
    });

    this.wander();
    this.randomWanderSpeech();
  }

  develop() {
    this.stopWandering();

    this.speak(
      "Starting development..."
    );

    this.moveToDeveloperZone();
  }

  report() {
    this.stopWandering();

    this.setState("reporting");

    this.speak(
      "Development complete."
    );

    this.moveToMeetingRoom();
  }

  private randomWanderSpeech() {
    this.wait(
      5000,
      15000,
      () => {
        this.speakRandomly(
          this.wanderSpeech
        );

        this.randomWanderSpeech();
      }
    );
  }
}