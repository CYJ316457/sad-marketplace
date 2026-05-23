#!/usr/bin/env node
const action = process.argv[2] || "busy";
const title = process.argv[3];
const message = process.argv.slice(4).join(" ");
const port = Number(process.env.FLOATING_ISLAND_PORT) || 17321;
const token = process.env.FLOATING_ISLAND_TOKEN;

const headers = { "content-type": "application/json" };
if (token) {
  headers["x-floating-island-token"] = token;
}

const response = await fetch(`http://127.0.0.1:${port}/method/${encodeURIComponent(action)}`, {
  method: "POST",
  headers,
  body: JSON.stringify({ title, message })
});

const json = await response.json();
if (!response.ok) {
  console.error(json.error || `Request failed with ${response.status}`);
  process.exit(1);
}

console.log(JSON.stringify(json.state, null, 2));
