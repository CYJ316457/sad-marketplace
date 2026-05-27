#!/usr/bin/env node
import fs from 'node:fs';
import http from 'node:http';
import net from 'node:net';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const WEB_ROOT = path.join(__dirname, '..', 'web');
const DEFAULT_PORT = 3477;
const DEFAULT_HOST = '127.0.0.1';
const PORT_WINDOW = 200;
const START_TIMEOUT_MS = 5000;

function parseArgs(argv) {
  const args = { _: [] };
  for (let i = 0; i < argv.length; i += 1) {
    const part = argv[i];
    if (part.startsWith('--')) {
      const key = part.slice(2);
      const next = argv[i + 1];
      if (!next || next.startsWith('--')) {
        args[key] = true;
      } else {
        args[key] = next;
        i += 1;
      }
    } else {
      args._.push(part);
    }
  }
  return args;
}

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function readText(file) {
  try {
    return fs.readFileSync(file, 'utf8');
  } catch {
    return '';
  }
}

function readJson(file, fallback) {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch {
    return fallback;
  }
}

function readJsonl(file) {
  if (!fs.existsSync(file)) return [];
  return readText(file)
    .split(/\r?\n/)
    .filter(Boolean)
    .map((line) => {
      try {
        return JSON.parse(line);
      } catch {
        return { raw: line, parseError: true };
      }
    });
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function findRepoRoot(startDir) {
  let current = path.resolve(startDir);
  while (true) {
    if (fs.existsSync(path.join(current, '.trellis'))) return current;
    const parent = path.dirname(current);
    if (parent === current) return null;
    current = parent;
  }
}

function listTaskDirs(baseDir) {
  if (!fs.existsSync(baseDir)) return [];
  return fs.readdirSync(baseDir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && entry.name !== 'archive')
    .map((entry) => path.join(baseDir, entry.name))
    .sort();
}

function listArchivedTaskDirs(archiveRoot) {
  if (!fs.existsSync(archiveRoot)) return [];
  const out = [];
  for (const month of fs.readdirSync(archiveRoot, { withFileTypes: true })) {
    if (!month.isDirectory()) continue;
    const monthDir = path.join(archiveRoot, month.name);
    for (const entry of fs.readdirSync(monthDir, { withFileTypes: true })) {
      if (entry.isDirectory()) out.push(path.join(monthDir, entry.name));
    }
  }
  return out.sort();
}

function readDeveloper(repoRoot) {
  const text = readText(path.join(repoRoot, '.trellis', '.developer'));
  for (const line of text.split(/\r?\n/)) {
    if (line.startsWith('name=')) return line.slice(5).trim();
  }
  return 'unknown';
}

function listResearch(taskDir) {
  const dir = path.join(taskDir, 'research');
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir, { withFileTypes: true })
    .filter((entry) => entry.isFile())
    .map((entry) => ({
      name: entry.name,
      content: readText(path.join(dir, entry.name)),
    }));
}

function summarizeTask(taskDir, repoRoot, archived = false) {
  const task = readJson(path.join(taskDir, 'task.json'), {});
  const id = task.id || path.basename(taskDir);
  const implementContext = readJsonl(path.join(taskDir, 'implement.jsonl'));
  const checkContext = readJsonl(path.join(taskDir, 'check.jsonl'));
  const research = listResearch(taskDir);

  return {
    id,
    title: task.title || id,
    status: task.status || (archived ? 'completed' : 'unknown'),
    assignee: task.assignee || '',
    creator: task.creator || '',
    package: task.package || '',
    branch: task.branch || '',
    baseBranch: task.baseBranch || '',
    createdAt: task.createdAt || '',
    completedAt: task.completedAt || '',
    archived,
    relPath: path.relative(repoRoot, taskDir).replace(/\\/g, '/'),
    taskDir,
    prdPresent: fs.existsSync(path.join(taskDir, 'prd.md')),
    infoPresent: fs.existsSync(path.join(taskDir, 'info.md')),
    summaryPresent: fs.existsSync(path.join(taskDir, 'summary.md')),
    implementContextCount: implementContext.length,
    checkContextCount: checkContext.length,
    researchFileCount: research.length,
    artifactProgress: [
      fs.existsSync(path.join(taskDir, 'prd.md')),
      fs.existsSync(path.join(taskDir, 'implement.jsonl')),
      fs.existsSync(path.join(taskDir, 'check.jsonl')),
    ].filter(Boolean).length,
    artifactTotal: 3,
  };
}

function readSessions(repoRoot) {
  const dir = path.join(repoRoot, '.trellis', '.runtime', 'sessions');
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir, { withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name.endsWith('.json'))
    .map((entry) => ({
      id: entry.name,
      data: readJson(path.join(dir, entry.name), {}),
    }));
}

function buildTaskDetail(taskDir) {
  return {
    task: readJson(path.join(taskDir, 'task.json'), {}),
    prd: readText(path.join(taskDir, 'prd.md')),
    info: readText(path.join(taskDir, 'info.md')),
    summary: readText(path.join(taskDir, 'summary.md')),
    implementContext: readJsonl(path.join(taskDir, 'implement.jsonl')),
    checkContext: readJsonl(path.join(taskDir, 'check.jsonl')),
    research: listResearch(taskDir),
  };
}

function buildState(repoRoot) {
  const tasksRoot = path.join(repoRoot, '.trellis', 'tasks');
  const archiveRoot = path.join(tasksRoot, 'archive');
  const tasks = listTaskDirs(tasksRoot).map((dir) => summarizeTask(dir, repoRoot, false));
  const archivedTasks = listArchivedTaskDirs(archiveRoot).map((dir) => summarizeTask(dir, repoRoot, true));
  const sessions = readSessions(repoRoot);
  const activePointer = sessions.find((session) => session.data && session.data.task_path);
  const currentTask = tasks.find((task) => task.relPath === (activePointer?.data?.task_path || '')) || null;
  const events = readJsonl(path.join(repoRoot, '.trellis', '.runtime', 'dashboard-events.jsonl')).slice(-200).reverse();
  const byStatus = {};

  for (const task of tasks) {
    byStatus[task.status] = (byStatus[task.status] || 0) + 1;
  }

  return {
    repoRoot,
    developer: readDeveloper(repoRoot),
    currentTask,
    currentAgent: (events.find((event) => event.agent) || {}).agent || '',
    tasks,
    archivedTasks,
    events,
    sessions: sessions.map((session) => ({
      id: session.id,
      taskPath: session.data.task_path || '',
      source: session.data.source || '',
    })),
    summary: {
      activeCount: tasks.length,
      archivedCount: archivedTasks.length,
      byStatus,
    },
    updatedAt: new Date().toISOString(),
  };
}

function sendJson(res, code, payload) {
  res.writeHead(code, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(payload));
}

function sendText(res, code, payload, contentType = 'text/plain; charset=utf-8') {
  res.writeHead(code, { 'Content-Type': contentType });
  res.end(payload);
}

function openBrowser(url) {
  if (process.platform === 'win32') {
    spawn('cmd', ['/c', 'start', '', url], { detached: true, stdio: 'ignore' }).unref();
    return;
  }
  if (process.platform === 'darwin') {
    spawn('open', [url], { detached: true, stdio: 'ignore' }).unref();
    return;
  }
  spawn('xdg-open', [url], { detached: true, stdio: 'ignore' }).unref();
}

function dashboardRuntimeDir(repoRoot) {
  return path.join(repoRoot, '.trellis', '.runtime', 'dashboard');
}

function dashboardRecordPath(repoRoot) {
  return path.join(dashboardRuntimeDir(repoRoot), 'server.json');
}

async function waitForDashboardRecord(repoRoot, timeoutMs = START_TIMEOUT_MS) {
  const file = dashboardRecordPath(repoRoot);
  const startedAt = Date.now();
  while ((Date.now() - startedAt) < timeoutMs) {
    const record = readJson(file, null);
    if (record && record.url) return record;
    await sleep(100);
  }
  return null;
}

function hashRepoRoot(repoRoot) {
  let hash = 0;
  for (const ch of repoRoot.toLowerCase()) {
    hash = ((hash * 31) + ch.charCodeAt(0)) >>> 0;
  }
  return hash;
}

function isPortFree(host, port) {
  return new Promise((resolve) => {
    const server = net.createServer();
    server.once('error', () => resolve(false));
    server.once('listening', () => server.close(() => resolve(true)));
    server.listen(port, host);
  });
}

async function selectPort(repoRoot, host, requestedPort) {
  if (requestedPort) return Number(requestedPort);
  const base = DEFAULT_PORT + (hashRepoRoot(repoRoot) % PORT_WINDOW);
  for (let offset = 0; offset < PORT_WINDOW; offset += 1) {
    const candidate = base + offset;
    if (await isPortFree(host, candidate)) return candidate;
  }
  throw new Error('No free dashboard port available');
}

function createServer(repoRoot, host, port) {
  let state = buildState(repoRoot);
  const clients = new Set();
  const watchers = [
    path.join(repoRoot, '.trellis', 'tasks'),
    path.join(repoRoot, '.trellis', '.runtime'),
  ]
    .filter((target) => fs.existsSync(target))
    .map((target) => fs.watch(target, { recursive: true }, () => {
      state = buildState(repoRoot);
      const reason = path.relative(repoRoot, target).replace(/\\/g, '/');
      const payload = `event: update\ndata: ${JSON.stringify({ reason, state })}\n\n`;
      for (const client of clients) client.write(payload);
    }));

  const server = http.createServer((req, res) => {
    const url = new URL(req.url || '/', `http://${host}:${port}`);

    if (url.pathname === '/api/overview') return sendJson(res, 200, state);
    if (url.pathname === '/api/tasks') {
      return sendJson(res, 200, {
        tasks: state.tasks,
        archivedTasks: state.archivedTasks,
        summary: state.summary,
      });
    }
    if (url.pathname.startsWith('/api/tasks/')) {
      const id = decodeURIComponent(url.pathname.slice('/api/tasks/'.length));
      const task = [...state.tasks, ...state.archivedTasks].find((item) => item.id === id);
      if (!task) return sendJson(res, 404, { error: 'task-not-found' });
      return sendJson(res, 200, { summary: task, detail: buildTaskDetail(task.taskDir) });
    }
    if (url.pathname === '/api/events') return sendJson(res, 200, { events: state.events });
    if (url.pathname === '/api/current-session') {
      return sendJson(res, 200, {
        currentTask: state.currentTask,
        currentAgent: state.currentAgent,
        sessions: state.sessions,
      });
    }
    if (url.pathname === '/api/stream') {
      res.writeHead(200, {
        'Content-Type': 'text/event-stream; charset=utf-8',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
      });
      clients.add(res);
      res.write(`event: update\ndata: ${JSON.stringify({ reason: 'init', state })}\n\n`);
      req.on('close', () => clients.delete(res));
      return;
    }

    const assetPath = url.pathname === '/' ? 'index.html' : url.pathname.replace(/^\//, '');
    const asset = path.join(WEB_ROOT, assetPath);
    if (!asset.startsWith(WEB_ROOT) || !fs.existsSync(asset) || fs.statSync(asset).isDirectory()) {
      return sendText(res, 404, 'not found');
    }

    const ext = path.extname(asset);
    const type = ext === '.js'
      ? 'text/javascript; charset=utf-8'
      : ext === '.css'
        ? 'text/css; charset=utf-8'
        : 'text/html; charset=utf-8';
    return sendText(res, 200, fs.readFileSync(asset, 'utf8'), type);
  });

  server.on('close', () => watchers.forEach((watcher) => watcher.close()));
  return server;
}

async function startCommand(args) {
  const repoRoot = findRepoRoot(args.project || process.cwd());
  if (!repoRoot) {
    console.error('No .trellis directory found from project root');
    process.exit(1);
  }

  const host = args.host || DEFAULT_HOST;
  const foreground = Boolean(args.foreground);
  const shouldOpen = Boolean(args.open);
  const record = readJson(dashboardRecordPath(repoRoot), {});

  if (record.pid) {
    try {
      process.kill(record.pid, 0);
      console.log(JSON.stringify({
        status: 'already-running',
        url: record.url,
        pid: record.pid,
        repoRoot,
      }));
      if (shouldOpen) openBrowser(record.url);
      return;
    } catch {
      // stale pid, continue start flow
    }
  }

  const port = await selectPort(repoRoot, host, args.port);
  if (!foreground) {
    const child = spawn(process.execPath, [
      __filename,
      'start',
      '--project',
      repoRoot,
      '--host',
      host,
      '--port',
      String(port),
      '--foreground',
    ], {
      detached: true,
      stdio: 'ignore',
    });
    child.unref();

    const recordAfterStart = await waitForDashboardRecord(repoRoot);
    const url = recordAfterStart?.url || `http://${host}:${port}`;
    console.log(JSON.stringify({
      status: recordAfterStart ? 'running' : 'starting',
      url,
      pid: child.pid,
      repoRoot,
    }));
    if (shouldOpen) openBrowser(url);
    return;
  }

  const server = createServer(repoRoot, host, port);
  server.listen(port, host, () => {
    const url = `http://${host}:${port}`;
    ensureDir(dashboardRuntimeDir(repoRoot));
    fs.writeFileSync(dashboardRecordPath(repoRoot), JSON.stringify({
      pid: process.pid,
      host,
      port,
      url,
      repoRoot,
      startedAt: new Date().toISOString(),
    }, null, 2), 'utf8');
    console.log(JSON.stringify({ status: 'running', url, pid: process.pid, repoRoot }));
    if (shouldOpen) openBrowser(url);
  });

  const cleanup = () => {
    try {
      fs.rmSync(dashboardRecordPath(repoRoot), { force: true });
    } catch {
      // ignore cleanup errors
    }
    server.close(() => process.exit(0));
  };

  process.on('SIGINT', cleanup);
  process.on('SIGTERM', cleanup);
}

function openCommand(args) {
  const repoRoot = findRepoRoot(args.project || process.cwd());
  if (!repoRoot) {
    console.error('No .trellis directory found from project root');
    process.exit(1);
  }

  const record = readJson(dashboardRecordPath(repoRoot), {});
  if (!record.url) {
    console.error('Dashboard is not running for this project');
    process.exit(1);
  }

  openBrowser(record.url);
  console.log(JSON.stringify({ status: 'opened', url: record.url, repoRoot }));
}

function stopCommand(args) {
  const repoRoot = findRepoRoot(args.project || process.cwd());
  if (!repoRoot) {
    console.error('No .trellis directory found from project root');
    process.exit(1);
  }

  const record = readJson(dashboardRecordPath(repoRoot), {});
  if (record.pid) {
    try {
      process.kill(record.pid);
    } catch {
      // ignore stale pid
    }
  }
  try {
    fs.rmSync(dashboardRecordPath(repoRoot), { force: true });
  } catch {
    // ignore cleanup errors
  }

  console.log(JSON.stringify({
    status: record.pid ? 'stopped' : 'not-running',
    pid: record.pid || null,
    repoRoot,
  }));
}

const args = parseArgs(process.argv.slice(2));
const command = args._[0] || 'start';

if (command === 'start') {
  await startCommand(args);
} else if (command === 'open') {
  openCommand(args);
} else if (command === 'stop') {
  stopCommand(args);
} else {
  console.error(`Unknown command: ${command}`);
  process.exit(1);
}