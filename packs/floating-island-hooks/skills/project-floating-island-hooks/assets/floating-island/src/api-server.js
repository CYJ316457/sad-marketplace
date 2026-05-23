import http from "node:http";

const LOCAL_HOST = "127.0.0.1";
const MAX_BODY_BYTES = 64 * 1024;

export function createApiServer({ island, token = process.env.FLOATING_ISLAND_TOKEN } = {}) {
  if (!island) {
    throw new Error("createApiServer requires an island state store.");
  }

  let server;
  let port = 0;

  return {
    get port() {
      return port;
    },
    async start(requestedPort = Number(process.env.FLOATING_ISLAND_PORT) || 17321) {
      server = http.createServer((request, response) => {
        handleRequest({ request, response, island, token });
      });

      await new Promise((resolve, reject) => {
        server.once("error", reject);
        server.listen(requestedPort, LOCAL_HOST, () => {
          server.off("error", reject);
          port = server.address().port;
          resolve();
        });
      });

      return port;
    },
    async stop() {
      if (!server) {
        return;
      }

      await new Promise((resolve, reject) => {
        server.close((error) => (error ? reject(error) : resolve()));
      });
      server = null;
      port = 0;
    }
  };
}

async function handleRequest({ request, response, island, token }) {
  setCorsHeaders(response);

  if (request.method === "OPTIONS") {
    sendJson(response, 204, null);
    return;
  }

  if (token && request.headers["x-floating-island-token"] !== token) {
    sendJson(response, 401, { ok: false, error: "Unauthorized" });
    return;
  }

  const url = new URL(request.url, `http://${LOCAL_HOST}`);

  try {
    if (request.method === "GET" && url.pathname === "/status") {
      sendJson(response, 200, { ok: true, state: island.getState() });
      return;
    }

    if (request.method === "POST" && url.pathname === "/island") {
      const command = await readJson(request);
      const state = island.applyCommand(command);
      sendJson(response, 200, { ok: true, state });
      return;
    }

    if (request.method === "POST" && url.pathname.startsWith("/method/")) {
      const action = decodeURIComponent(url.pathname.slice("/method/".length));
      const body = await readJson(request);
      const state = island.applyCommand({ ...body, action });
      sendJson(response, 200, { ok: true, state });
      return;
    }

    sendJson(response, 404, { ok: false, error: "Not found" });
  } catch (error) {
    sendJson(response, 400, { ok: false, error: error.message });
  }
}

function readJson(request) {
  return new Promise((resolve, reject) => {
    let body = "";

    request.setEncoding("utf8");
    request.on("data", (chunk) => {
      body += chunk;
      if (Buffer.byteLength(body, "utf8") > MAX_BODY_BYTES) {
        request.destroy();
        reject(new Error("Request body is too large"));
      }
    });
    request.on("error", reject);
    request.on("end", () => {
      if (!body.trim()) {
        resolve({});
        return;
      }

      try {
        resolve(JSON.parse(body));
      } catch {
        reject(new Error("Request body must be valid JSON"));
      }
    });
  });
}

function setCorsHeaders(response) {
  response.setHeader("access-control-allow-origin", "*");
  response.setHeader("access-control-allow-methods", "GET,POST,OPTIONS");
  response.setHeader("access-control-allow-headers", "content-type,x-floating-island-token");
}

function sendJson(response, statusCode, payload) {
  response.statusCode = statusCode;

  if (statusCode === 204) {
    response.end();
    return;
  }

  response.setHeader("content-type", "application/json; charset=utf-8");
  response.end(JSON.stringify(payload));
}
