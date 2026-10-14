import { test } from "node:test";
import assert from "node:assert/strict";
import { createNote, editNote } from "../src/notes.js";
import { open, revoke, share } from "../src/share.js";

test("[rl:sharing/read-only] [rl:sharing/ac-share] a link shows the notes and cannot change them", () => {
  const n = createNote("anna", "groceries");
  const t = share("anna", n.id);
  const seen = open(t);
  assert.equal(seen.status, 200);
  seen.notes[0].text = "changed through the link";
  assert.equal(open(t).notes[0].text, "groceries");
});

test("[rl:sharing/owner-only] only a note's owner shares it", () => {
  const n = createNote("anna", "diary");
  assert.throws(() => share("dan", n.id), /forbidden/);
});

test("[rl:sharing/revoke] a revoked link answers 404 at once", () => {
  const t = share("anna", createNote("anna", "x").id);
  assert.equal(revoke("anna", t), true);
  assert.equal(open(t).status, 404);
});

test("[rl:notes/owner-edits] only the owner edits a note", () => {
  const n = createNote("anna", "plan");
  assert.throws(() => editNote("dan", n.id, "mine now"), /forbidden/);
  assert.equal(editNote("anna", n.id, "plan v2").text, "plan v2");
});
