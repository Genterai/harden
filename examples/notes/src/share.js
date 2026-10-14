import { randomBytes } from "node:crypto";
import { getNote } from "./notes.js";

// Share links: one token opens one or more notes of their owner, read-only, until it is revoked.
const links = new Map();

export function share(owner, noteIds) {
  const ids = [...new Set([].concat(noteIds))];
  if (!ids.length) throw new Error("nothing to share");
  for (const id of ids) if (getNote(id)?.owner !== owner) throw new Error("forbidden");
  const token = randomBytes(16).toString("base64url");
  links.set(token, { owner, ids, createdAt: Date.now() });
  return token;
}

// What a link shows: copies of its notes, so nothing can change them through it.
export function open(token) {
  const link = links.get(token);
  if (!link) return { status: 404 };
  return { status: 200, notes: link.ids.map(getNote).filter(Boolean).map(({ id, text }) => ({ id, text })) };
}

export function revoke(owner, token) {
  const link = links.get(token);
  if (!link || link.owner !== owner) return false;
  links.delete(token);
  return true;
}
