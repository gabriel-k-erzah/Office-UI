import { canReadLibrary, canWriteLibrary, type AgentProfile } from "../ui/agents/profile";

// Client for the library endpoint (server/library.ts). Agents' permissions are
// checked here before anything is sent: reading needs the "Read the library"
// tool, filing needs to be the librarian.

export type DocMeta = { title: string; filedBy: string; requestedBy: string; created: string; updated?: string };
export type LibraryDoc = { file: string; meta: DocMeta; excerpt: string };
export type LibraryEntry = { file: string; meta: DocMeta; body: string };

export class LibraryPermissionError extends Error {}

const BASE = "/api/library";

async function call<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${BASE}${path}`, init);
  const body = (await response.json().catch(() => ({}))) as T & { error?: string };
  if (!response.ok) {
    const message = body.error ?? `Library answered ${response.status}`;
    throw response.status === 403 ? new LibraryPermissionError(message) : new Error(message);
  }
  return body;
}

export async function listDocs(): Promise<LibraryDoc[]> {
  const { documents } = await call<{ documents: LibraryDoc[] }>("");
  return documents;
}

// For people browsing the Library page.
export function fetchDoc(file: string) {
  return call<LibraryEntry>(`/${encodeURIComponent(file)}`);
}

export async function readDoc(reader: AgentProfile, file: string) {
  if (!canReadLibrary(reader)) throw new LibraryPermissionError(`${reader.name} isn't allowed to read the library.`);
  return fetchDoc(file);
}

// `update` rewrites that existing file (the librarian merged new notes into it);
// otherwise it's a new document and never overwrites one.
export async function fileDoc(
  librarian: AgentProfile,
  doc: { file: string; title: string; body: string; requestedBy: string; update?: boolean }
) {
  if (!canWriteLibrary(librarian)) {
    throw new LibraryPermissionError(`${librarian.name} can't write to the library: only the librarian can.`);
  }
  return call<{ file: string; meta: DocMeta; updated?: boolean }>(`/${encodeURIComponent(toFileName(doc.file || doc.title))}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      "x-office-role": "librarian",
      ...(doc.update ? { "x-office-mode": "update" } : {}),
    },
    body: JSON.stringify({ title: doc.title, body: doc.body, filedBy: librarian.name, requestedBy: doc.requestedBy }),
  });
}

// "Crypto API notes!" → "crypto-api-notes.md"
export function toFileName(text: string) {
  const stem = text
    .toLowerCase()
    .replace(/\.md$/, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60)
    .replace(/-+$/, "");
  return `${stem || "untitled"}.md`;
}
