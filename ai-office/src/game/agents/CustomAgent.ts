import Phaser from "phaser";

import { Agent } from "./Agent";
import {
  profileToAgentConfig,
  type AgentProfile,
} from "../../ui/agents/profile";

// An office agent built from a profile made in the Agent studio.
export class CustomAgent extends Agent {
  readonly profile: AgentProfile;

  constructor(
    scene: Phaser.Scene,
    profile: AgentProfile,
    x?: number,
    y?: number
  ) {
    super(
      scene,
      profileToAgentConfig(profile, x, y)
    );

    this.profile = profile;

    this.wander();
    this.randomWanderSpeech();
  }

  private randomWanderSpeech() {
    this.wait(
      5000,
      15000,
      () => {
        this.speakRandomly(
          this.profile.idleLines
        );

        this.randomWanderSpeech();
      }
    );
  }
}
