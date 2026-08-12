import Phaser from "phaser";
import { OfficeScene } from "./scenes/OfficeScene";

export const gameConfig: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  width: 800,
  height: 600,
  parent: "phaser-container",
  backgroundColor: "#1f2937",
  scene: [OfficeScene],
};