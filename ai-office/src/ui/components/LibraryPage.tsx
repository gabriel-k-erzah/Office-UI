import { useEffect, useState } from "react";

import { fetchDoc, listDocs, type LibraryDoc, type LibraryEntry } from "../../work/library";
import { useOffice, type OfficeStore } from "../../work/store";
import { Avatar } from "../agents/Avatar";
import type { AgentProfile } from "../agents/profile";
import { Icon } from "./Icon";
import { Markdown } from "./Markdown";

// The team library: every .md file the librarian has filed (ai-office/library/).
// Read-only here: documents only get in through the librarian.

type Load<T> = { state: "loading" } | { state: "ready"; value: T } | { state: "error"; message: string };

export function LibraryPage({ store, byId }: { store: OfficeStore; byId: Map<string, AgentProfile> }) {
  const { libraryVersion } = useOffice(store);
  const [docs, setDocs] = useState<Load<LibraryDoc[]>>({ state: "loading" });
  const [open, setOpen] = useState<string>();
  const [entry, setEntry] = useState<Load<LibraryEntry>>({ state: "loading" });

  useEffect(() => {
    let live = true;
    listDocs().then(
      (value) => live && setDocs({ state: "ready", value }),
      (error: Error) => live && setDocs({ state: "error", message: error.message })
    );
    return () => {
      live = false;
    };
  }, [libraryVersion]);

  const byName = (name: string) => [...byId.values()].find((p) => p.name === name);
  const list = docs.state === "ready" ? docs.value : [];
  // The newest document is open until you pick another.
  const selected = open ?? list[0]?.file;

  useEffect(() => {
    if (!selected) return;
    let live = true;
    fetchDoc(selected).then(
      (value) => live && setEntry({ state: "ready", value }),
      (error: Error) => live && setEntry({ state: "error", message: error.message })
    );
    return () => {
      live = false;
    };
  }, [selected, libraryVersion]);

  return (
    <div className="page library-page">
      <section className="panel library-list">
        <p className="eyebrow">Library · {list.length} document{list.length === 1 ? "" : "s"}</p>
        {docs.state === "loading" && <p className="panel-empty">Opening the library…</p>}
        {docs.state === "error" && <p className="panel-empty">Couldn't open the library ({docs.message}).</p>}
        {docs.state === "ready" && list.length === 0 && (
          <p className="panel-empty">
            Nothing filed yet. Ask someone to document something, or give the manager a goal: the librarian files anything worth keeping.
          </p>
        )}
        <ul>
          {list.map((doc) => {
            const filer = byName(doc.meta.filedBy);
            return (
              <li key={doc.file}>
                <button
                  className={`library-item ${selected === doc.file ? "on" : ""}`}
                  onClick={() => {
                    setEntry({ state: "loading" });
                    setOpen(doc.file);
                  }}
                >
                  <strong>{doc.meta.title}</strong>
                  <small className="library-file">{doc.file}</small>
                  {doc.excerpt && <span className="library-excerpt">{doc.excerpt}</span>}
                  <span className="library-by">
                    {filer && <Avatar avatar={filer.avatar} size={18} />}
                    Filed by {doc.meta.filedBy || "the librarian"}
                    {doc.meta.requestedBy && ` for ${doc.meta.requestedBy}`}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      </section>

      <section className="panel library-doc">
        {!selected && (
          <div className="empty-state">
            <Icon name="knowledge" size={28} />
            <p>Documents the librarian files show up here.</p>
          </div>
        )}
        {selected && <DocView file={selected} entry={entry} />}
      </section>
    </div>
  );
}

function DocView({ file, entry }: { file: string; entry: Load<LibraryEntry> }) {
  if (entry.state === "loading") return <p className="panel-empty">Opening {file}…</p>;
  if (entry.state === "error") return <p className="panel-empty">Couldn't open {file} ({entry.message}).</p>;

  const { meta, body } = entry.value;
  return (
    <article>
      <p className="eyebrow">{entry.value.file}</p>
      <p className="library-meta">
        Filed by {meta.filedBy || "the librarian"}
        {meta.requestedBy && ` for ${meta.requestedBy}`}
        {meta.created && ` · ${when(meta.created)}`}
        {meta.updated && ` · updated ${when(meta.updated)}`}
      </p>
      <Markdown text={body} />
    </article>
  );
}

const when = (iso: string) => new Date(iso).toLocaleString([], { dateStyle: "medium", timeStyle: "short" });
