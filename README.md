# AI Office

An office you can watch AI agents work in.

Instead of reading logs or a chat transcript, you see the team: agents walk between rooms, sit at their desks, gather for stand-ups, chat in the lounge, and carry their work to the library. Behind the scenes they run on local language models through [Ollama](https://ollama.com), so nothing leaves your machine.

Part of [Gabriel Erzah's portfolio](https://gabrielerzah.com).

## What it does

- **Agent studio.** Build each agent: role (manager, researcher, developer, tester, designer, librarian or custom), tone, personality traits, a model, and per-tool permissions (allow, ask or block).
- **A walking office.** Six rooms: library, meeting room, manager's office, developer zone, testing lab and lounge. Agents route through doors and a corridor, so they never walk through walls.
- **Team chat.** Talk to anyone. A manager (any agent allowed to delegate) reasons about your request and may turn it into tasks for the team; anyone else replies in their own voice.
- **A work engine.** Tasks run one at a time. The agent may go to the library to read first, works at their desk, posts an update, and takes anything worth keeping to the librarian.
- **A real library.** Documents are actual `.md` files. Only the librarian files them: everyone else walks over and hands their notes in, and the dev server refuses writes from any other role.
- **Lounge small talk.** When there's no work on, two agents meet in the lounge every minute or two and chat about their hobbies, each in their own personality.

## How it's put together

```text
React UI ── OfficeView (SVG floor plan) ◄── OfficeSim (pure TS: positions, routes, activities)
   │
   ├── Team chat / lounge chat ──► Ollama (streamed replies, via the Vite proxy)
   │
   └── WorkEngine ── plans · tasks · hand-overs ──► /api/library (Vite plugin, librarian-only writes)
                                                     └── ./library/*.md
```

- **Simulation is separate from the UI.** `OfficeSim` is plain TypeScript with no React or DOM. The view calls `tick()` every frame and reads positions back.
- **Rooms are data.** Each room has a door, a hub and named spots (desks, seats, standing places), so routes are always spot → hub → door → corridor → door → hub → spot.
- **Structured model output.** Planning, task results, filing and reading choices ask the model for JSON against a schema, so the engine can act on the reply rather than parse prose.
- **Permissions are enforced twice.** The app only sends the librarian header for a librarian, and the server checks it again.
- **Local first.** The browser talks to `/ollama`, and Vite forwards it to Ollama, so there's no CORS setup or API key. Agents set to Claude or Codex fall back to the first installed local model for now.

## Running it

You need Node.js and [Ollama](https://ollama.com) with at least one model pulled, for example:

```sh
ollama pull llama3.2
cd ai-office
npm install
npm run dev
```

Open the address Vite prints. The status indicator shows whether Ollama is reachable. If Ollama runs elsewhere, set `OLLAMA_URL` before starting the dev server.

## History

- **v0.1:** a Phaser prototype. Scripted agents wandered between rooms with speech bubbles, moving in straight lines (straight through walls).
- **Now:** rebuilt in React with an SVG office, routed movement, an agent studio, Ollama-powered team chat, manager planning, the work engine and the librarian-kept library.

## Next

- Connect Claude and Codex as model providers.
- Let tool permissions drive real tools (repository reads, tests, GitHub).
- Show a task's whole journey through the office as a replayable timeline.
