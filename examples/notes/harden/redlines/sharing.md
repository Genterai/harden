# Sharing

Intent: a person shares notes by link — success: someone with the link reads the notes and cannot change them.
Sources: `src/share.js`

## Red lines

* **[read-only]** A link shows copies of its notes; nothing can change a note through it.
* **[owner-only]** Only a note's owner can put it in a link.
* **[revoke]** A revoked link answers 404 at once.

## Proof

* **[ac-share]** Given a note Anna shared, when Dan opens the link, then he reads it and his edit does not reach it.

## Open

* Links never expire. Support has asked about it; no brief yet.
