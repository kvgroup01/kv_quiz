"use client";

// Edição "clique no texto real pra editar" usada pelo builder — tanto na
// trilha clássica (app/builder/page.tsx) quanto nos nós do editor visual de
// fluxo (app/builder/graph/*). Extraído sem alterar comportamento.

import { useEffect, useState } from "react";

export function parseRich(str: string): string {
  return String(str || "")
    .replace(/\*\*(.+?)\*\*/g, "<b>$1</b>")
    .replace(/\*(.+?)\*/g, '<em class="accent">$1</em>');
}

export function EditableText({
  value, onChange, as = "span", className = "", placeholder, multiline
}: { value: string; onChange: (v: string) => void; as?: string; className?: string; placeholder?: string; multiline?: boolean }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  useEffect(() => { if (!editing) setDraft(value); }, [value, editing]);

  function commit() {
    setEditing(false);
    if (draft !== value) onChange(draft);
  }

  if (editing) {
    return multiline ? (
      <textarea autoFocus className={"b-inline-edit " + className} value={draft} rows={2}
        onChange={(e) => setDraft(e.target.value)} onBlur={commit} />
    ) : (
      <input autoFocus className={"b-inline-edit " + className} value={draft}
        onChange={(e) => setDraft(e.target.value)} onBlur={commit}
        onKeyDown={(e) => { if (e.key === "Enter") (e.target as HTMLInputElement).blur(); }} />
    );
  }

  const Tag = as as any;
  return (
    <Tag className={"b-editable " + className} onClick={() => setEditing(true)}>
      {value ? value : <span className="b-placeholder">{placeholder || "clique pra editar"}</span>}
    </Tag>
  );
}

export function EditableHeadline({ value, onChange, tag = "h1", className = "" }: { value: string; onChange: (v: string) => void; tag?: string; className?: string }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  useEffect(() => { if (!editing) setDraft(value); }, [value, editing]);
  if (editing) {
    return (
      <textarea autoFocus className={"b-inline-edit " + className} value={draft} rows={3}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={() => { setEditing(false); if (draft !== value) onChange(draft); }} />
    );
  }
  const Tag = tag as any;
  return <Tag className={"b-editable " + className} onClick={() => setEditing(true)} dangerouslySetInnerHTML={{ __html: parseRich(value) || '<span class="b-placeholder">clique pra editar</span>' }} />;
}
