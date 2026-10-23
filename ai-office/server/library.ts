import { promises as fs } from "node:fs";
import type { IncomingMessage, ServerResponse } from "node:http";
import path from "node:path";

import type { Plugin } from "vite";

// The office library: real .md files in one folder, served by the dev server.
//
//   GET /api/library            list documents (front matter + excerpt)
//   GET /api/library/<file>.md  read one
//   PUT /api/library/<file>.md  file a document — librarian only
//                               (x-office-mode: update rewrites an existing one in place)
//
// Writes must come from the librarian (x-office-role: librarian). The app only
// ever sends that header for an agent whose role is librarian; everyone else's
// request is refused here as well.

const FILE = /^[a-z0-9][a-z0-9-]{0,79}\.md$/;
const MAX_BYTES = 200_000;

export type DocMeta = {
  title: string;
  filedBy: string;
  requestedBy: string;
  created: string;
  updated?: string;
};

export function libraryPlugin(dir: string): Plugin {
  return {
    name: "office-library",
    configureServer(server) {
      server.middlewares.use("/api/library", (req, res) => {
        handle(dir, req, res).catch((error: unknown) => {
          send(res, 500, { error: error instanceof Error ? error.message : String(error) });
        });
      });
    },
  };
}

async function handle(dir: string, req: IncomingMessage, res: ServerResponse) {
  const name = decodeURIComponent((req.url ?? "/").split("?")[0].replace(/^\/+/, ""));

  if (!name) {
    if (req.method !== "GET") return send(res, 405, { error: "Method not allowed" });
    return send(res, 200, { documents: await list(dir) });
  }

  if (!FILE.test(name)) return send(res, 400, { error: "File names are lowercase words joined by hyphens, ending .md" });
  const file = path.join(dir, name);

  if (req.method === "GET") {
    const raw = await fs.readFile(file, "utf8").catch(() => null);
    if (raw === null) return send(res, 404, { error: `${name} isn't in the library` });
    const { meta, body } = parse(raw);
    return send(res, 200, { file: name, meta, body });
  }

  if (req.method === "PUT") {
    if (req.headers["x-office-role"] !== "librarian") {
      return send(res, 403, { error: "Only the librarian can write to the library." });
    }
    const input = JSON.parse(await readBody(req)) as Partial<DocMeta> & { body?: string };
    if (!input.title?.trim() || !input.body?.trim()) return send(res, 400, { error: "A document needs a title and a body" });

    await fs.mkdir(dir, { recursive: true });
    const stamp = new Date().toISOString();

    // Updating: the librarian merged new notes into a document that's already here.
    if (req.headers["x-office-mode"] === "update") {
      const existing = await fs.readFile(file, "utf8").catch(() => null);
      if (existing === null) return send(res, 404, { error: `${name} isn't in the library to update` });
      const before = parse(existing).meta;
      const askers = [before.requestedBy, oneLine(input.requestedBy ?? "")].filter(Boolean);
      const meta: DocMeta = {
        title: oneLine(input.title),
        filedBy: oneLine(input.filedBy ?? before.filedBy),
        requestedBy: [...new Set(askers.join(", ").split(/,\s*/).filter(Boolean))].join(", "),
        created: before.created || stamp,
        updated: stamp,
      };
      await fs.writeFile(file, render(meta, input.body), "utf8");
      return send(res, 200, { file: name, meta, updated: true });
    }

    const saved = await freeName(dir, name);
    const meta: DocMeta = {
      title: oneLine(input.title),
      filedBy: oneLine(input.filedBy ?? ""),
      requestedBy: oneLine(input.requestedBy ?? ""),
      created: stamp,
    };
    await fs.writeFile(path.join(dir, saved), render(meta, input.body), "utf8");
    return send(res, 201, { file: saved, meta });
  }

  send(res, 405, { error: "Method not allowed" });
}

async function list(dir: string) {
  const names = await fs.readdir(dir).catch(() => [] as string[]);
  const documents = await Promise.all(
    names
      .filter((name) => FILE.test(name))
      .map(async (name) => {
        const { meta, body } = parse(await fs.readFile(path.join(dir, name), "utf8"));
        return { file: name, meta, excerpt: excerpt(body) };
      })
  );
  const latest = (meta: DocMeta) => meta.updated || meta.created;
  return documents.sort((a, b) => latest(b.meta).localeCompare(latest(a.meta)));
}

// Never overwrite: a second "notes.md" becomes "notes-2.md".
async function freeName(dir: string, name: string) {
  const stem = name.replace(/\.md$/, "");
  for (let n = 1; ; n++) {
    const candidate = n === 1 ? name : `${stem}-${n}.md`;
    const exists = await fs.access(path.join(dir, candidate)).then(() => true, () => false);
    if (!exists) return candidate;
  }
}

// ─────────────────────────────
// Front matter
// ─────────────────────────────

function render(meta: DocMeta, body: string) {
  return [
    "---",
    `title: ${meta.title}`,
    `filed_by: ${meta.filedBy}`,
    `requested_by: ${meta.requestedBy}`,
    `created: ${meta.created}`,
    ...(meta.updated ? [`updated: ${meta.updated}`] : []),
    "---",
    "",
    body.trim(),
    "",
  ].join("\n");
}

function parse(raw: string): { meta: DocMeta; body: string } {
  const meta: DocMeta = { title: "", filedBy: "", requestedBy: "", created: "" };
  const match = raw.match(/^---\n([\s\S]*?)\n---\n?/);
  if (match) {
    for (const line of match[1].split("\n")) {
      const [key, ...rest] = line.split(":");
      const value = rest.join(":").trim();
      if (key === "title") meta.title = value;
      if (key === "filed_by") meta.filedBy = value;
      if (key === "requested_by") meta.requestedBy = value;
      if (key === "created") meta.created = value;
      if (key === "updated") meta.updated = value;
    }
  }
  const body = match ? raw.slice(match[0].length) : raw;
  if (!meta.title) meta.title = body.match(/^#\s+(.+)$/m)?.[1] ?? "Untitled";
  return { meta, body: body.trim() };
}

const oneLine = (text: string) => text.replace(/\s+/g, " ").trim();

function excerpt(body: string) {
  const text = body.replace(/^#.*$/gm, "").replace(/[*_`>#-]/g, "").replace(/\s+/g, " ").trim();
  return text.length > 160 ? `${text.slice(0, 157)}…` : text;
}

// ─────────────────────────────
// HTTP helpers
// ─────────────────────────────

function readBody(req: IncomingMessage) {
  return new Promise<string>((resolve, reject) => {
    let size = 0;
    const chunks: Buffer[] = [];
    req.on("data", (chunk: Buffer) => {
      size += chunk.length;
      if (size > MAX_BYTES) reject(new Error("Document too large"));
      else chunks.push(chunk);
    });
    req.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
    req.on("error", reject);
  });
}

function send(res: ServerResponse, status: number, body: unknown) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json");
  res.end(JSON.stringify(body));
}
