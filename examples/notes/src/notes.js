// Notes in memory: each note has one owner, and only the owner changes it.
const notes = new Map();
let next = 1;

export function createNote(owner, text) {
  const note = { id: next++, owner, text, updatedAt: Date.now() };
  notes.set(note.id, note);
  return { ...note };
}

export function editNote(user, id, text) {
  const note = notes.get(id);
  if (!note) throw new Error("not found");
  if (note.owner !== user) throw new Error("forbidden");
  note.text = text;
  note.updatedAt = Date.now();
  return { ...note };
}

export const getNote = (id) => (notes.has(id) ? { ...notes.get(id) } : null);
