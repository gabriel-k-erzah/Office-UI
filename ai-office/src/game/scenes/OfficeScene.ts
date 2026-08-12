import Phaser from "phaser";

import { Agent } from "../agents/Agent";
import { Researcher } from "../agents/Researcher";
import { Developer } from "../agents/Developer";
import { Manager } from "../agents/Manager";

export class OfficeScene extends Phaser.Scene {
  private agents: Agent[] = [];

  constructor() {
    super("OfficeScene");
  }

  create() {
    this.createResearcher();
    this.createDeveloper();
    this.createManager();
  }

  update() {
    this.updateAgents();
  }

  private createResearcher() {
    const researcher = new Researcher(this, 200, 300);

    this.agents.push(researcher);
  }

  private createDeveloper() {
    const developer = new Developer(this, 400, 300);

    this.agents.push(developer);
  }

  private createManager() {
    const manager = new Manager(this, 600, 300);

    this.agents.push(manager);
  }

  private updateAgents() {
    this.agents.forEach((agent) => {
      agent.update();
    });
  }
}