import Phaser from "phaser";
import { Agent } from "./Agent";

export class Researcher extends Agent {
  private readonly wanderSpeech = [
    "Interesting...",
    "Let me think...",
    "I should look into that.",
    "I wonder what the data says.",
    "There might be another approach.",
    "I should research that.",
  ];

  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, {
      name: "Researcher",
      x,
      y,
      colour: 0x3b82f6,
      startingRoom: "library",
    });

    this.wander();
    this.randomWanderSpeech();
  }

  research() {
    this.stopWandering();
    this.setState("researching");
    this.speak("Starting research...");
    this.moveToLibrary();
  }

  report() {
    this.stopWandering();
    this.setState("reporting");
    this.speak("Research complete.");
    this.moveToMeetingRoom();
  }

  private randomWanderSpeech() {
    this.wait(5000, 15000, () => {
      this.speakRandomly(this.wanderSpeech);
      this.randomWanderSpeech();
    });
  }
}