import assert from "node:assert/strict";
import test from "node:test";

import { createIslandState, normalizeIslandCommand } from "../src/island-state.js";

test("normalizes an ask command into island state", () => {
  const state = normalizeIslandCommand({
    action: "ask",
    title: "Need input",
    message: "Approve this action?",
    durationMs: 1500
  });

  assert.equal(state.action, "ask");
  assert.equal(state.title, "Need input");
  assert.equal(state.message, "Approve this action?");
  assert.equal(state.durationMs, 1500);
  assert.equal(state.tone, "ask");
});

test("rejects unsupported actions", () => {
  assert.throws(
    () => normalizeIslandCommand({ action: "explode" }),
    /Unsupported action/
  );
});

test("busy can carry clamped progress", () => {
  const high = normalizeIslandCommand({ action: "busy", progress: 133 });
  const low = normalizeIslandCommand({ action: "busy", progress: -12 });

  assert.equal(high.progress, 100);
  assert.equal(low.progress, 0);
});

test("legacy animation actions are not public states", () => {
  assert.throws(
    () => normalizeIslandCommand({ action: "success" }),
    /Unsupported action/
  );
});

test("state store records commands and notifies subscribers", () => {
  const island = createIslandState();
  const received = [];

  const unsubscribe = island.subscribe((state) => received.push(state));
  const current = island.applyCommand({ action: "busy", title: "Syncing" });
  unsubscribe();
  island.applyCommand({ action: "ask", title: "Ignored" });

  assert.equal(current.action, "busy");
  assert.equal(current.tone, "busy");
  assert.equal(received.length, 1);
  assert.equal(received[0].title, "Syncing");
});
