Here’s a README you can drop straight into README.md:

# 🏢 AI Office
AI Office is an experimental virtual ecosystem where autonomous AI agents are represented as employees inside a game-like office.
Instead of interacting with AI through a traditional chat interface, the goal is to make AI activity visual and understandable. Agents can move around an office, communicate, perform specialised roles, interact with other agents, and eventually collaborate to solve tasks.
The project is currently focused on building the visual simulation and agent architecture before connecting real AI models.
---
## 🎯 Project Goal
The long-term idea is to create a virtual company populated by specialised AI agents.
For example:
- 🔎 Researcher — gathers and analyses information
- 💻 Developer — builds and tests solutions
- 📋 Manager — coordinates work between agents
Rather than watching logs or terminal output, the user will be able to visually observe agents:
- walking around the office
- entering different rooms
- talking
- working
- collaborating
- researching
- exchanging information
- completing tasks
Eventually, actions in the game will represent real AI operations happening behind the scenes.
---
## 🚧 Current Progress — v0.1
The first prototype of the office simulation is working.
Currently implemented:
- Phaser game environment
- TypeScript architecture
- Shared `Agent` parent class
- Researcher agent
- Developer agent
- Manager agent
- Autonomous random movement
- Random waiting between movements
- Agent states
- Speech bubbles
- Role-specific random dialogue
- Modular agent inheritance
- Central OfficeScene
- Agent update loop
The agents currently wander around the office and periodically display role-specific dialogue.
No AI model is connected yet.
---
## 🏗️ Current Architecture
```text
                    OfficeScene
                         │
                         │ creates
                         ▼
                  ┌─────────────┐
                  │   Agents    │
                  └──────┬──────┘
                         │
                         ▼
                      Agent
                   Parent Class
                         │
          ┌──────────────┼──────────────┐
          │              │              │
          ▼              ▼              ▼
     Researcher      Developer       Manager

Agent.ts provides the shared capabilities available to every employee.

Agent
│
├── Movement
│   ├── moveTo()
│   ├── moveRandomly()
│   ├── wander()
│   └── stopWandering()
│
├── Speech
│   ├── speak()
│   └── speakRandomly()
│
├── State
│   ├── setState()
│   └── getState()
│
├── Timing
│   └── wait()
│
└── Rendering
    ├── character
    ├── label
    └── speech bubble

Specialised agents inherit these capabilities and add behaviour related to their role.

For example:

Researcher
└── research()
Developer
└── develop()
Manager
└── manage()

⸻

📁 Project Structure

src/
│
├── game/
│   │
│   ├── agents/
│   │   ├── Agent.ts
│   │   ├── Researcher.ts
│   │   ├── Developer.ts
│   │   └── Manager.ts
│   │
│   ├── scenes/
│   │   └── OfficeScene.ts
│   │
│   ├── events/
│   │   └── gameEvents.ts
│   │
│   └── config.ts
│
├── App.tsx
├── App.css
├── index.css
└── main.tsx

⸻

🤖 Agent Design

Every employee extends the base Agent class.

Example:

export class Researcher extends Agent {
  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, {
      name: "Researcher",
      x,
      y,
      colour: 0x3b82f6,
    });
    this.wander();
  }
  research() {
    this.setState("researching");
    this.speak("Starting research...");
  }
}

This means generic functionality does not need to be rewritten for every employee.

Every agent automatically has access to functionality such as:

this.moveTo(...)
this.moveRandomly()
this.wander()
this.stopWandering()
this.speak(...)
this.speakRandomly(...)
this.setState(...)
this.getState()
this.wait(...)

Individual agent classes are therefore responsible only for their specialised behaviour and personality.

⸻

🚶 Autonomous Movement

Agents currently follow a simple autonomous wandering loop:

Choose random destination
          │
          ▼
        Walk
          │
          ▼
       Arrive
          │
          ▼
   Wait 1–15 seconds
          │
          ▼
Choose new destination
          │
          └───────────► Repeat

This is currently visual behaviour only.

Eventually, movement will represent actual agent activity.

For example:

Research task received
        │
        ▼
Researcher walks to Library
        │
        ▼
Research process begins
        │
        ▼
Research completed
        │
        ▼
Researcher walks to Meeting Room
        │
        ▼
Findings passed to Manager

⸻

💬 Agent Speech

Agents can display speech bubbles using:

this.speak("Hello!");

Agents can also choose randomly from a set of dialogue:

this.speakRandomly([
  "Interesting...",
  "Let me think...",
  "I should research that."
]);

Each employee currently has their own role-specific wandering dialogue.

In the future, the same interface can display output generated by an AI model:

this.speak(aiResponse);

This allows the visual system to remain independent from whichever AI model is eventually used.

⸻

🧠 Future AI Architecture

The eventual system could look roughly like:

                        USER
                          │
                          ▼
                    Give Objective
                          │
                          ▼
                       Manager
                          │
                    Break Down Task
                          │
             ┌────────────┴────────────┐
             ▼                         ▼
        Researcher                 Developer
             │                         │
        Research                     Build
             │                         │
             └────────────┬────────────┘
                          ▼
                       Manager
                          │
                       Review
                          │
                          ▼
                        USER

The Phaser office becomes a visual representation of this underlying agent system.

⸻

🔮 Planned Features

Future development may include:

* Office rooms
* Library / research area
* Developer workspace
* Meeting room
* Manager office
* Room-aware navigation
* Character sprites and animations
* Agent-to-agent conversations
* Task assignment
* Task queues
* Agent memory
* Agent personalities
* Knowledge libraries
* Local document retrieval
* Research tools
* Web research
* Developer tools
* Shared company knowledge
* Agent collaboration
* Visual task progress
* User interaction with employees
* Local AI model integration

⸻

🧠 Local AI Goal

A major goal of the project is to avoid requiring large numbers of expensive API calls.

The intended architecture is to explore using a local language model as the underlying intelligence.

Multiple agents do not necessarily require multiple models.

Instead:

                    Local LLM
                       │
          ┌────────────┼────────────┐
          │            │            │
          ▼            ▼            ▼
     Researcher    Developer     Manager
      Context       Context       Context
          │            │            │
          ▼            ▼            ▼
     Personality   Personality   Personality
          │            │            │
          ▼            ▼            ▼
       Tools         Tools         Tools

A single model could therefore power multiple virtual employees by providing each agent with different:

* system instructions
* personalities
* tools
* memories
* knowledge
* objectives
* context

This will be explored after the core game interface is established.

⸻

🛠️ Technology

Current stack:

* TypeScript
* React
* Phaser
* Vite
* Node.js / npm

Planned AI/backend technologies are still being evaluated.

⸻

▶️ Running the Project

Install dependencies:

npm install

Start the development server:

npm run dev

Vite will provide a local development address, usually:

http://localhost:5173

Open it in your browser to view the office.

Stop the server with:

Ctrl + C

⸻

🗺️ Development Philosophy

The project is being developed in layers.

PHASE 1
Visual Office
    ↓
Agents move and exist in the world
PHASE 2
Agent Behaviour
    ↓
Rooms, tasks, interactions and activities
PHASE 3
Agent Intelligence
    ↓
Connect agents to an AI model
PHASE 4
Agent Collaboration
    ↓
Agents exchange information and solve tasks
PHASE 5
Virtual AI Company
    ↓
User gives objectives and watches the office work

The game interface and AI system should remain separated.

Phaser is responsible for visualising what is happening.

The agent system is responsible for deciding what happens.

The AI model will eventually be responsible for reasoning about what to do.

⸻

📌 Current Milestone

v0.1 — Autonomous Office Prototype

Three employees currently exist:

🔎 Researcher
💻 Developer
📋 Manager

They can:

✓ Spawn in the office
✓ Move autonomously
✓ Wander randomly
✓ Wait between movements
✓ Maintain states
✓ Display speech bubbles
✓ Produce role-specific idle dialogue

The next major milestone is to turn the empty movement space into an actual office with rooms and meaningful destinations.

This captures both where the project is now and the architecture we’re building toward. 