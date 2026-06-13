import assert from "node:assert/strict";
import test from "node:test";

import {
  filterCompetitionParticipants,
  isCompetitionParticipant,
} from "./participation";

const users = [
  { id: "paid-active", has_paid: true, is_active: true },
  { id: "paid-inactive", has_paid: true, is_active: false },
  { id: "unpaid-active", has_paid: false, is_active: true },
  { id: "legacy-paid", has_paid: true },
];

test("solo considera participantes a usuarios pagados y activos", () => {
  assert.equal(isCompetitionParticipant(users[0]), true);
  assert.equal(isCompetitionParticipant(users[1]), false);
  assert.equal(isCompetitionParticipant(users[2]), false);
});

test("trata perfiles antiguos sin is_active como activos", () => {
  assert.equal(isCompetitionParticipant(users[3]), true);
});

test("filtra usuarios no participantes sin mutar la lista original", () => {
  const filtered = filterCompetitionParticipants(users);

  assert.deepEqual(filtered.map((user) => user.id), ["paid-active", "legacy-paid"]);
  assert.equal(users.length, 4);
});
