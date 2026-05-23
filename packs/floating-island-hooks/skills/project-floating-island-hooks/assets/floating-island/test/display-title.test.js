import assert from "node:assert/strict";
import test from "node:test";

import { getDisplayTitle } from "../src/display-title.js";

test("uses external title when provided", () => {
  assert.equal(getDisplayTitle({ action: "ask", title: "Approve deploy" }), "Approve deploy");
});

test("falls back to uppercase action without title", () => {
  assert.equal(getDisplayTitle({ action: "busy", title: " " }), "BUSY");
});
