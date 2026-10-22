import { useCallback, useEffect, useRef } from "react";

import { listWords, type AgentProfile } from "../ui/agents/profile";
import type { ChatMessage } from "../ui/data/types";
import type { OfficeSim } from "../ui/office/simulation";
import { resolveModel, streamChat, type OllamaMessage } from "./ollama";
import { cleanReply, excerpt } from "./teamChat";

// Small talk while there's nothing on: every minute or two, two agents meet in
// the lounge and chat about their hobbies, each in their own personality. Their
// lines go into team chat (marked as lounge chat) and over their heads in the office.

const FIRST_CHAT = [12_000, 20_000] as const;
const CHAT_GAP = [60_000, 120_000] as const;
// After you post in team chat the agents leave you a minute to talk.
const USER_PAUSE = 60_000;
const TURNS = [4, 6] as const;

type Post = (message: Omit<ChatMessage, "id" | "time">) => string;
type Update = (id: string, text: string) => void;

export function useLoungeChat({
  sim,
  profiles,
  models,
  enabled,
  post,
  update,
}: {
  sim: OfficeSim;
  profiles: AgentProfile[];
  // Installed Ollama models.
  models: string[];
  // False while there's work on, someone is answering you, or Ollama is down.
  enabled: boolean;
  post: Post;
  update: Update;
}) {
  const latest = useRef({ profiles, models, enabled, post, update });
  useEffect(() => {
    latest.current = { profiles, models, enabled, post, update };
  });

  const running = useRef<AbortController | null>(null);
  const nextAt = useRef(0);
  const lastPair = useRef("");

  useEffect(() => {
    nextAt.current = Date.now() + between(...FIRST_CHAT);

    const converse = async (a: AgentProfile, b: AgentProfile, signal: AbortSignal) => {
      const topic = pickTopic(a, b);
      sim.hangOut(
        [
          { id: a.id, activity: `Chatting with ${b.name}` },
          { id: b.id, activity: `Chatting with ${a.name}` },
        ],
        "lounge"
      );

      try {
        // Let them get to the lounge first (but don't wait forever).
        await waitUntil(() => sim.settled([a.id, b.id]), 20_000, signal);

        const said: Line[] = [];
        const turns = Math.round(between(...TURNS));
        for (let turn = 0; turn < turns; turn++) {
          if (signal.aborted || !latest.current.enabled) break;
          const speaker = turn % 2 === 0 ? a : b;
          const partner = turn % 2 === 0 ? b : a;
          const choice = resolveModel(speaker, latest.current.models);
          if (!choice) break;

          let id: string | undefined;
          const reply = await streamChat({
            model: choice.model,
            messages: buildLoungePrompt({ speaker, partner, topic, said, last: turn === turns - 1 }),
            temperature: Math.max(speaker.model.temperature, 0.8),
            maxTokens: 120,
            signal,
            onToken: (full) => {
              const text = cleanLine(speaker, partner, full);
              if (!text) return;
              if (id) latest.current.update(id, text);
              else id = latest.current.post({ authorId: speaker.id, text, model: choice.model, casual: true });
            },
          });

          const text = cleanLine(speaker, partner, reply);
          if (!text) break;
          said.push({ speakerId: speaker.id, text });
          sim.say(speaker.id, excerpt(text), 7_000);
          // A beat to read it before the other one answers.
          await sleep(between(1_500, 3_500), signal);
        }
      } catch (error) {
        if (!signal.aborted) console.warn("Lounge chat stopped:", error);
      } finally {
        sim.release([a.id, b.id]);
      }
    };

    const timer = window.setInterval(() => {
      const { enabled, profiles } = latest.current;
      if (!enabled || running.current || Date.now() < nextAt.current) return;

      const pair = pickPair(profiles.filter((p) => p.status !== "offline"), lastPair.current);
      if (!pair) return;
      lastPair.current = pairKey(pair[0], pair[1]);

      const controller = new AbortController();
      running.current = controller;
      void converse(pair[0], pair[1], controller.signal).finally(() => {
        running.current = null;
        nextAt.current = Math.max(nextAt.current, Date.now() + between(...CHAT_GAP));
      });
    }, 2_000);

    return () => {
      window.clearInterval(timer);
      running.current?.abort();
    };
  }, [sim]);

  // Stop any small talk now and stay quiet for a bit (e.g. you've just asked something).
  const interrupt = useCallback(() => {
    running.current?.abort();
    nextAt.current = Math.max(nextAt.current, Date.now() + USER_PAUSE);
  }, []);

  return { interrupt };
}

// ─────────────────────────────
// Who talks about what
// ─────────────────────────────

const pairKey = (a: AgentProfile, b: AgentProfile) => [a.id, b.id].sort().join("+");

function pickPair(people: AgentProfile[], avoid: string): [AgentProfile, AgentProfile] | undefined {
  if (people.length < 2) return undefined;
  const pairs: [AgentProfile, AgentProfile][] = [];
  for (const a of people) {
    for (const b of people) {
      if (a !== b && (people.length < 3 || pairKey(a, b) !== avoid)) pairs.push([a, b]);
    }
  }
  return pairs[Math.floor(Math.random() * pairs.length)];
}

function pickTopic(a: AgentProfile, b: AgentProfile) {
  const theirs = new Set(b.interests.map((i) => i.toLowerCase()));
  const shared = a.interests.filter((i) => theirs.has(i.toLowerCase()));
  const pool = shared.length ? shared : a.interests.length ? a.interests : b.interests;
  return pool[Math.floor(Math.random() * pool.length)]?.toLowerCase() ?? "weekend plans";
}

// ─────────────────────────────
// Prompt
// ─────────────────────────────

type Line = { speakerId: string; text: string };

export function buildLoungePrompt({
  speaker,
  partner,
  topic,
  said,
  last,
}: {
  speaker: AgentProfile;
  partner: AgentProfile;
  topic: string;
  said: Line[];
  last: boolean;
}): OllamaMessage[] {
  const system = [
    speaker.systemPrompt,
    "",
    "## Break time",
    `There's no project on right now, so you're on a break in the office lounge with ${partner.name}, the ${partner.title || partner.role}.`,
    partner.interests.length ? `${partner.name} is into ${listWords(partner.interests)}.` : "",
    "Chat like a real colleague: casual and warm, in your own tone and personality.",
    "Talk about hobbies, interests and life outside work. Don't talk about work tasks.",
    `Reply as ${speaker.name} only, with one or two short sentences.`,
    "No name prefix, no markdown, no emojis and no actions in asterisks.",
    last
      ? "This is your last message: wrap the chat up naturally, like heading back to your desk."
      : "Keep it going: react to what they said, share something of your own, or ask them something.",
  ].join("\n");

  const opener: OllamaMessage = {
    role: "user",
    content: said.length
      ? `(You and ${partner.name} are chatting in the lounge about ${topic}.)`
      : `(You bump into ${partner.name} in the lounge. Start a chat about ${topic}.)`,
  };

  const turns: OllamaMessage[] = said.map((line) =>
    line.speakerId === speaker.id
      ? { role: "assistant", content: line.text }
      : { role: "user", content: `${partner.name}: ${line.text}` }
  );

  return [{ role: "system", content: system }, ...mergeRuns([opener, ...turns])];
}

// Chat templates expect user and assistant to alternate.
function mergeRuns(messages: OllamaMessage[]) {
  const merged: OllamaMessage[] = [];
  for (const message of messages) {
    const previous = merged[merged.length - 1];
    if (previous && previous.role === message.role) previous.content += `\n${message.content}`;
    else merged.push({ ...message });
  }
  return merged;
}

// Small models sometimes keep going and write the other person's line too.
function cleanLine(speaker: AgentProfile, partner: AgentProfile, text: string) {
  const own = cleanReply(speaker, text);
  const cut = own.search(new RegExp(`\\n\\s*(${escape(partner.name)}|${escape(speaker.name)})\\s*:`, "i"));
  return (cut >= 0 ? own.slice(0, cut) : own).replace(/\*[^*]+\*/g, "").trim();
}

const escape = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

// ─────────────────────────────
// Timing
// ─────────────────────────────

function between(min: number, max: number) {
  return min + Math.random() * (max - min);
}

function sleep(ms: number, signal: AbortSignal) {
  return new Promise<void>((resolve, reject) => {
    if (signal.aborted) return reject(signal.reason);
    const timer = window.setTimeout(resolve, ms);
    signal.addEventListener("abort", () => {
      window.clearTimeout(timer);
      reject(signal.reason);
    }, { once: true });
  });
}

async function waitUntil(done: () => boolean, limit: number, signal: AbortSignal) {
  const until = Date.now() + limit;
  while (!done() && Date.now() < until) await sleep(500, signal);
}
