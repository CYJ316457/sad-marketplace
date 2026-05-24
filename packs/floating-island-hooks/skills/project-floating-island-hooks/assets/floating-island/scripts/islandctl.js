#!/usr/bin/env node
const args = process.argv.slice(2);
const parsed = parseArgs(args);
const action = parsed.action || "busy";
const title = parsed.title;
const message = parsed.message;
const port = parsed.port || Number(process.env.FLOATING_ISLAND_PORT) || 17321;
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

function parseArgs(argv) {
  let port;
  let index = 0;

  while (index < argv.length) {
    const arg = argv[index];
    if (arg === "--port") {
      const value = Number(argv[index + 1]);
      if (!Number.isFinite(value) || value <= 0) {
        console.error("Invalid --port value");
        process.exit(1);
      }
      port = value;
      index += 2;
      continue;
    }
    break;
  }

  return {
    port,
    action: argv[index],
    title: argv[index + 1],
    message: argv.slice(index + 2).join(" ")
  };
}
