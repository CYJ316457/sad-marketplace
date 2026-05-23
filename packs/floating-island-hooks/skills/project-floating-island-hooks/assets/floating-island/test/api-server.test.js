import assert from "node:assert/strict";
import test from "node:test";

import { createApiServer } from "../src/api-server.js";
import { createIslandState } from "../src/island-state.js";

async function postJson(port, path, body) {
  const response = await fetch(`http://127.0.0.1:${port}${path}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body)
  });

  const json = await response.json();
  return { response, json };
}

test("POST /island applies commands to the island state", async () => {
  const island = createIslandState();
  const api = createApiServer({ island });
  await api.start(0);

  try {
    const { response, json } = await postJson(api.port, "/island", {
      action: "ask",
      title: "Attention",
      message: "Continue?"
    });

    assert.equal(response.status, 200);
    assert.equal(json.ok, true);
    assert.equal(json.state.action, "ask");
    assert.equal(island.getState().message, "Continue?");
  } finally {
    await api.stop();
  }
});

test("GET /status returns the current state", async () => {
  const island = createIslandState();
  island.applyCommand({ action: "busy", progress: 42 });
  const api = createApiServer({ island });
  await api.start(0);

  try {
    const response = await fetch(`http://127.0.0.1:${api.port}/status`);
    const json = await response.json();

    assert.equal(response.status, 200);
    assert.equal(json.ok, true);
    assert.equal(json.state.progress, 42);
  } finally {
    await api.stop();
  }
});

test("POST /method/:action applies method-style commands", async () => {
  const island = createIslandState();
  const api = createApiServer({ island });
  await api.start(0);

  try {
    const { response, json } = await postJson(api.port, "/method/busy", {
      title: "Publishing",
      message: "Release is uploading"
    });

    assert.equal(response.status, 200);
    assert.equal(json.ok, true);
    assert.equal(json.state.action, "busy");
    assert.equal(json.state.title, "Publishing");
  } finally {
    await api.stop();
  }
});

test("invalid JSON requests return 400", async () => {
  const api = createApiServer({ island: createIslandState() });
  await api.start(0);

  try {
    const response = await fetch(`http://127.0.0.1:${api.port}/island`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: "{"
    });
    const json = await response.json();

    assert.equal(response.status, 400);
    assert.equal(json.ok, false);
  } finally {
    await api.stop();
  }
});
