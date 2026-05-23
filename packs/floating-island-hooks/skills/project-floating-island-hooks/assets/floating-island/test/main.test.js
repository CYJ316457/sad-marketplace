import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("main process does not start the demo state cycle", async () => {
  const source = await readFile(new URL("../src/main.js", import.meta.url), "utf8");

  assert.equal(source.includes("state-cycle"), false);
  assert.equal(source.includes("stateCycle.start"), false);
});
