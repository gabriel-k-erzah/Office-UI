import Phaser from "phaser";

import { Agent } from "./Agent";
import { Researcher } from "./Researcher";
import { Developer } from "./Developer";

export class Manager extends Agent {
  private readonly wanderSpeech = [
    "What's everyone working on?",
    "We should review our priorities.",
    "I need an update from the team.",
    "What's our next objective?",
    "Let's keep things moving.",
    "I should check the progress.",
  ];

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number
  ) {
    super(scene, {
      name: "Manager",
      x,
      y,
      colour: 0xf59e0b,
      startingRoom: "managerOffice",
    });

    this.wander();
    this.randomWanderSpeech();
  }

  manage() {
    this.stopWandering();

    this.setState("working");

    this.speak(
      "Reviewing the office..."
    );

    this.moveToManagerOffice();
  }

  assignResearch(
    researcher: Researcher
  ) {
    this.speak(
      "Please investigate this."
    );

    researcher.research();
  }

  assignDevelopment(
    developer: Developer
  ) {
    this.speak(
      "Please start development."
    );

    developer.develop();
  }

  callMeeting(
    researcher: Researcher,
    developer: Developer
  ) {
    this.speak(
      "Let's meet and review."
    );

    this.moveToMeetingRoom();

    researcher.report();
    developer.report();
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