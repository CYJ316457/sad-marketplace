#!/usr/bin/env node
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function parseArgs(argv) {
  const args = { _: [], open: false };
  for (let i = 0; i < argv.length; i += 1) {
    const item = argv[i];
    if (item === '--open') {
      args.open = true;
    } else if (item === '--traces') {
      args.traces = argv[++i];
    } else if (item === '--projects') {
      args.projects = argv[++i];
    } else if (item === '--out') {
      args.out = argv[++i];
    } else {
      args._.push(item);
    }
  }
  return args;
}

function openFile(file) {
  const target = path.resolve(file);
  if (process.platform === 'win32') {
    spawnSync('cmd', ['/c', 'start', '', target], { stdio: 'ignore', windowsHide: true });
  } else if (process.platform === 'darwin') {
    spawnSync('open', [target], { stdio: 'ignore' });
  } else {
    spawnSync('xdg-open', [target], { stdio: 'ignore' });
  }
}

const args = parseArgs(process.argv.slice(2));
const traceRoot = path.resolve(args.traces || args._[0] || path.join(os.homedir(), '.codebuddy', 'traces'));
const projectsRoot = path.resolve(args.projects || path.join(os.homedir(), '.codebuddy', 'projects'));
const outFile = path.resolve(args.out || args._[1] || path.join(process.cwd(), 'codebuddy-usage-report.html'));

function walk(dir, extensions = ['.json']) {
  const files = [];
  if (!fs.existsSync(dir)) return files;
  for (const item of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, item.name);
    if (item.isDirectory()) files.push(...walk(full, extensions));
    else if (item.isFile() && extensions.some(ext => item.name.endsWith(ext))) files.push(full);
  }
  return files;
}

function tryJson(value) {
  if (value == null) return null;
  if (typeof value !== 'string') return value;
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

function num(...values) {
  for (const value of values) {
    if (typeof value === 'number' && Number.isFinite(value)) return value;
  }
  return 0;
}

function first(...values) {
  for (const value of values) {
    if (value !== undefined && value !== null && value !== '') return value;
  }
  return '';
}

function normalizeUsage(usage) {
  const promptDetails = usage.prompt_tokens_details || usage.input_tokens_details || {};
  const completionDetails = usage.completion_tokens_details || usage.output_tokens_details || {};
  const promptTokens = num(usage.prompt_tokens, usage.input_tokens, usage.inputTokens, usage.promptTokens);
  const completionTokens = num(usage.completion_tokens, usage.output_tokens, usage.outputTokens, usage.completionTokens);
  const totalTokens = num(usage.total_tokens, usage.totalTokens, promptTokens + completionTokens);
  const cachedTokens = num(
    promptDetails.cached_tokens,
    promptDetails.cache_read_input_tokens,
    usage.prompt_cache_hit_tokens,
    usage.cache_read_input_tokens,
    usage.cacheReadInputTokens,
    usage.cached_tokens,
  );
  const cacheWriteTokens = num(
    promptDetails.cache_creation_input_tokens,
    usage.prompt_cache_write_tokens,
    usage.cache_creation_input_tokens,
    usage.cacheCreationInputTokens,
  );
  const reasoningTokens = num(
    completionDetails.reasoning_tokens,
    usage.completion_thinking_tokens,
    usage.reasoning_tokens,
    usage.reasoningTokens,
  );
  return {
    promptTokens,
    completionTokens,
    totalTokens,
    cachedTokens,
    cacheWriteTokens,
    reasoningTokens,
    credit: first(usage.credit, usage.credits, ''),
    cacheRate: promptTokens > 0 ? cachedTokens / promptTokens : 0,
  };
}

function extractGenerations(file) {
  const raw = fs.readFileSync(file, 'utf8');
  const doc = JSON.parse(raw);
  const sessionId = path.basename(path.dirname(file));
  const rows = [];

  for (const span of doc.spans || []) {
    if (span.type !== 'generation') continue;
    const output = tryJson(span.toolOutput);
    const responses = Array.isArray(output) ? output : output ? [output] : [];
    for (const response of responses) {
      const usage = response.usage || response.message?.usage || response.data?.usage;
      if (!usage) continue;
      const normalized = normalizeUsage({ ...usage, credit: first(usage.credit, usage.credits, response.credit, response.credits, '') });
      const requestId = first(response.id, response.requestId, response.request_id, span.requestId, '');

      rows.push({
        traceFile: file,
        traceId: doc.trace?.traceId || span.traceId || '',
        sessionId,
        startedAt: span.startedAt || doc.trace?.startedAt || '',
        endedAt: span.endedAt || doc.trace?.endedAt || '',
        durationMs: num(span.duration, doc.trace?.duration),
        status: span.status || doc.trace?.status || '',
        agent: span.agentName || '',
        model: first(response.model, span.model, ''),
        requestId,
        conversationRequestId: '',
        ...normalized,
      });
    }
  }
  return rows;
}

function extractProjectUsage(file) {
  const rows = [];
  const sessionIdFromPath = path.basename(path.dirname(file));
  const lines = fs.readFileSync(file, 'utf8').split(/\r?\n/).filter(Boolean);
  for (const line of lines) {
    let event;
    try {
      event = JSON.parse(line);
    } catch {
      continue;
    }
    const rawUsage = event.providerData?.rawUsage;
    if (!rawUsage) continue;
    const timestamp = typeof event.timestamp === 'number' ? new Date(event.timestamp).toISOString() : '';
    rows.push({
      traceFile: file,
      traceId: '',
      sessionId: first(event.sessionId, sessionIdFromPath),
      startedAt: timestamp,
      endedAt: timestamp,
      durationMs: 0,
      status: event.status || '',
      agent: event.providerData?.agent || '',
      model: first(event.providerData?.requestModelId, event.providerData?.model, ''),
      requestId: first(event.providerData?.messageId, event.providerData?.requestId, event.id, ''),
      conversationRequestId: event.providerData?.conversationRequestId || '',
      ...normalizeUsage(rawUsage),
    });
  }
  return rows;
}

function mergeRows(traceRows, projectRows) {
  const merged = [...traceRows];
  const byRequestId = new Map();
  for (const row of merged) {
    if (row.requestId) byRequestId.set(row.requestId, row);
  }
  for (const row of projectRows) {
    const existing = row.requestId ? byRequestId.get(row.requestId) : null;
    if (existing) {
      if (row.credit !== '') existing.credit = row.credit;
      if (!existing.agent && row.agent) existing.agent = row.agent;
      if (!existing.model && row.model) existing.model = row.model;
      if (!existing.conversationRequestId && row.conversationRequestId) existing.conversationRequestId = row.conversationRequestId;
    } else {
      merged.push(row);
      if (row.requestId) byRequestId.set(row.requestId, row);
    }
  }
  return merged;
}

function fmtDate(ts) {
  if (!ts) return '';
  const d = new Date(ts);
  if (Number.isNaN(d.getTime())) return ts;
  return d.toLocaleString('zh-CN', { hour12: false });
}

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function buildHtml(rows) {
  const generatedAt = new Date().toLocaleString('zh-CN', { hour12: false });
  const data = JSON.stringify(rows).replace(/</g, '\\u003c');
  return `<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>CodeBuddy Usage Report</title>
  <style>
    :root {
      --bg: #f6f7f9;
      --panel: #ffffff;
      --ink: #1c2028;
      --muted: #667085;
      --line: #d9dee7;
      --accent: #007c89;
      --accent-soft: #e4f4f5;
      --accent-2: #b42318;
      --ok: #067647;
      --warn: #b54708;
      --shadow: 0 10px 30px rgba(24, 33, 52, 0.08);
      font-family: "Segoe UI", "Microsoft YaHei", Arial, sans-serif;
    }
    * { box-sizing: border-box; }
    html, body { width: 100%; height: 100%; overflow: hidden; }
    body { margin: 0; background: var(--bg); color: var(--ink); }
    .app { height: 100vh; display: grid; grid-template-rows: auto auto 1fr; }
    header { padding: 12px 20px 8px; border-bottom: 1px solid var(--line); background: #fbfcfe; }
    .topline { display: flex; align-items: baseline; justify-content: space-between; gap: 16px; }
    h1 { margin: 0; font-size: 18px; font-weight: 750; letter-spacing: 0; }
    .sub { color: var(--muted); font-size: 12px; display: flex; gap: 14px; flex-wrap: wrap; margin-top: 4px; }
    .toolbar { display: grid; grid-template-columns: minmax(220px, 1.5fr) repeat(5, minmax(116px, 1fr)); gap: 8px; padding: 10px 20px; background: #fff; border-bottom: 1px solid var(--line); }
    input, select, button { height: 32px; border: 1px solid var(--line); border-radius: 6px; background: #fff; color: var(--ink); padding: 0 9px; font-size: 12px; }
    button { cursor: pointer; font-weight: 650; background: var(--ink); color: #fff; border-color: var(--ink); }
    main { min-height: 0; padding: 12px 20px 16px; display: grid; grid-template-rows: auto 1fr; gap: 10px; }
    .tabs { display: flex; gap: 6px; align-items: center; }
    .tab { height: 32px; padding: 0 14px; border: 1px solid var(--line); background: #fff; color: var(--ink); }
    .tab.active { background: var(--ink); color: #fff; border-color: var(--ink); }
    .tab-panel { min-height: 0; display: none; }
    .tab-panel.active { display: grid; gap: 10px; height: 100%; }
    #overview.active { grid-template-rows: auto 1fr; }
    #trends.active { grid-template-rows: auto 1fr; }
    #breakdown.active { grid-template-rows: 1fr; }
    #details.active { grid-template-rows: auto 1fr auto; }
    .metrics { display: grid; grid-template-columns: repeat(6, minmax(130px, 1fr)); gap: 10px; }
    .metric { background: var(--panel); border: 1px solid var(--line); border-radius: 8px; padding: 10px 12px; box-shadow: var(--shadow); min-height: 68px; }
    .metric .label { color: var(--muted); font-size: 11px; margin-bottom: 5px; }
    .metric .value { font-size: 19px; font-weight: 760; white-space: nowrap; }
    .metric .hint { color: var(--muted); font-size: 11px; margin-top: 4px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .grid2 { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; min-height: 0; }
    .panel { background: var(--panel); border: 1px solid var(--line); border-radius: 8px; box-shadow: var(--shadow); overflow: hidden; min-height: 0; display: grid; grid-template-rows: auto 1fr; }
    .panel h2 { margin: 0; padding: 9px 12px; font-size: 13px; border-bottom: 1px solid var(--line); }
    .panel-body { min-height: 0; overflow: hidden; padding: 8px 0; }
    .bar-row { display: grid; grid-template-columns: 150px 1fr 110px; gap: 9px; align-items: center; padding: 6px 12px; font-size: 12px; }
    .bar { height: 9px; background: #e8edf2; border-radius: 999px; overflow: hidden; }
    .bar span { display: block; height: 100%; background: var(--accent); }
    .chart-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; min-height: 0; }
    .chart { width: 100%; height: calc(100% - 22px); min-height: 300px; display: block; }
    .chart text { fill: var(--muted); font-size: 11px; }
    .chart .axis { stroke: #cfd6df; stroke-width: 1; }
    .chart .line { fill: none; stroke: var(--accent); stroke-width: 2.5; stroke-dasharray: 1400; animation: drawLine .75s ease-out both; }
    .chart .area { fill: var(--accent-soft); }
    .chart .hit { fill: transparent; cursor: crosshair; }
    .chart .point { opacity: .85; transition: r .12s ease; }
    .chart .point:hover { r: 5; }
    .chart-help { height: 22px; padding: 0 12px 6px; color: var(--muted); font-size: 11px; }
    .tooltip { position: fixed; pointer-events: none; z-index: 10; display: none; min-width: 150px; padding: 8px 10px; border: 1px solid var(--line); border-radius: 6px; background: #111827; color: #fff; font-size: 12px; box-shadow: var(--shadow); }
    .tooltip .muted { color: #cbd5e1; font-size: 11px; margin-top: 3px; }
    @keyframes drawLine { from { stroke-dashoffset: 1400; } to { stroke-dashoffset: 0; } }
    .table-wrap { overflow: auto; min-height: 0; border-radius: 8px; border: 1px solid var(--line); background: var(--panel); box-shadow: var(--shadow); }
    table { width: 100%; border-collapse: collapse; min-width: 1320px; font-size: 12px; }
    th, td { padding: 7px 9px; border-bottom: 1px solid var(--line); text-align: left; white-space: nowrap; }
    th { position: sticky; top: 0; background: #eef2f6; z-index: 1; font-size: 12px; cursor: pointer; }
    tr:hover td { background: #f8fafc; }
    .num { text-align: right; font-variant-numeric: tabular-nums; }
    .rate.ok { color: var(--ok); font-weight: 700; }
    .rate.mid { color: var(--warn); font-weight: 700; }
    .rate.low { color: var(--accent-2); font-weight: 700; }
    .empty { padding: 24px; color: var(--muted); text-align: center; }
    .pager { display: flex; align-items: center; justify-content: space-between; gap: 10px; color: var(--muted); font-size: 12px; }
    .pager .controls { display: flex; align-items: center; gap: 6px; }
    .pager button { min-width: 64px; }
    .pager button:disabled { opacity: .45; cursor: default; }
    @media (max-width: 1100px) {
      .toolbar, .metrics, .grid2, .chart-grid { grid-template-columns: 1fr; }
      .metrics { overflow: auto; }
    }
  </style>
</head>
<body>
  <div class="app">
    <header>
      <div class="topline"><h1>CodeBuddy 用量统计</h1></div>
      <div class="sub">
        <span>数据源：${escapeHtml(traceRoot)} + ${escapeHtml(projectsRoot)}</span>
        <span>生成：${escapeHtml(generatedAt)}</span>
        <span>记录：${rows.length}</span>
      </div>
    </header>
    <div class="toolbar">
      <input id="q" placeholder="搜索 session / agent / model / requestId">
      <select id="session"></select>
      <select id="model"></select>
      <select id="agent"></select>
      <select id="metricMode"><option value="credit">积分</option><option value="totalTokens">Token</option></select>
      <button id="exportBtn">导出 CSV</button>
    </div>
    <main>
      <nav class="tabs">
        <button class="tab active" data-tab="overview">总览</button>
        <button class="tab" data-tab="trends">趋势</button>
        <button class="tab" data-tab="breakdown">分组</button>
        <button class="tab" data-tab="details">明细</button>
      </nav>
      <section id="overview" class="tab-panel active">
        <div class="metrics" id="metrics"></div>
        <div class="grid2">
          <div class="panel"><h2>按模型统计</h2><div class="panel-body" id="byModel"></div></div>
          <div class="panel"><h2>按会话统计</h2><div class="panel-body" id="bySession"></div></div>
        </div>
      </section>
      <section id="trends" class="tab-panel">
        <div class="chart-grid">
          <div class="panel"><h2>每日曲线</h2><div class="panel-body"><svg id="dailyChart" class="chart" viewBox="0 0 720 380" preserveAspectRatio="none"></svg><div class="chart-help">滚轮缩放，拖拽平移，悬停查看当日用量</div></div></div>
          <div class="panel"><h2>小时曲线</h2><div class="panel-body"><svg id="hourlyChart" class="chart" viewBox="0 0 720 380" preserveAspectRatio="none"></svg><div class="chart-help">滚轮缩放，拖拽平移，悬停查看当小时用量</div></div></div>
        </div>
      </section>
      <section id="breakdown" class="tab-panel">
        <div class="grid2">
          <div class="panel"><h2>按 Agent 统计</h2><div class="panel-body" id="byAgent"></div></div>
          <div class="panel"><h2>按日期统计</h2><div class="panel-body" id="byDay"></div></div>
        </div>
      </section>
      <section id="details" class="tab-panel">
        <div class="pager"><span id="pageInfoTop"></span><div class="controls"><span>每页</span><select id="pageSize"><option>20</option><option>50</option><option>100</option></select></div></div>
        <div class="table-wrap"><table><thead><tr id="head"></tr></thead><tbody id="body"></tbody></table></div>
        <div class="pager"><span id="pageInfo"></span><div class="controls"><button id="prevPage">上一页</button><button id="nextPage">下一页</button></div></div>
      </section>
    </main>
  </div>
  <div id="tooltip" class="tooltip"></div>
  <script>
    const rows = ${data};
    const columns = [
      ['startedAt', '时间'], ['sessionId', '会话'], ['agent', 'Agent'], ['model', '模型'], ['status', '状态'],
      ['durationMs', '耗时(ms)'], ['promptTokens', '输入'], ['cachedTokens', '缓存读'], ['cacheWriteTokens', '缓存写'],
      ['completionTokens', '输出'], ['reasoningTokens', '推理'], ['totalTokens', '总Token'], ['cacheRate', '缓存率'], ['credit', '积分'], ['requestId', 'RequestId']
    ];
    let sortKey = 'startedAt';
    let sortDir = -1;
    let activeTab = 'overview';
    let page = 1;
    const chartState = {
      dailyChart: { zoom: 1, offset: 0, dragging: false, startX: 0, startOffset: 0 },
      hourlyChart: { zoom: 1, offset: 0, dragging: false, startX: 0, startOffset: 0 },
    };

    const fmt = new Intl.NumberFormat('zh-CN');
    const compactFmt = new Intl.NumberFormat('zh-CN', { notation: 'compact', maximumFractionDigits: 1 });
    const pct = v => ((v || 0) * 100).toFixed(2) + '%';
    const date = v => v ? new Date(v).toLocaleString('zh-CN', { hour12: false }) : '';
    const sum = (list, key) => list.reduce((a, r) => a + (Number(r[key]) || 0), 0);
    const uniq = key => [...new Set(rows.map(r => r[key]).filter(Boolean))].sort();

    function fillSelect(id, label, values) {
      const el = document.getElementById(id);
      el.innerHTML = '<option value="">' + label + '</option>' + values.map(v => '<option>' + escapeHtml(v) + '</option>').join('');
    }

    function escapeHtml(value) {
      return String(value ?? '').replace(/[&<>\"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '\"': '&quot;' }[c]));
    }

    function filteredRows() {
      const q = document.getElementById('q').value.trim().toLowerCase();
      const session = document.getElementById('session').value;
      const model = document.getElementById('model').value;
      const agent = document.getElementById('agent').value;
      return rows.filter(r => {
        if (session && r.sessionId !== session) return false;
        if (model && r.model !== model) return false;
        if (agent && r.agent !== agent) return false;
        if (!q) return true;
        return [r.sessionId, r.agent, r.model, r.requestId, r.traceId].some(v => String(v || '').toLowerCase().includes(q));
      });
    }

    function metric(label, value, hint) {
      return '<div class="metric"><div class="label">' + label + '</div><div class="value">' + value + '</div><div class="hint">' + hint + '</div></div>';
    }

    function dayKey(value) {
      const d = new Date(value);
      if (Number.isNaN(d.getTime())) return '';
      return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
    }

    function hourKey(value) {
      const d = new Date(value);
      if (Number.isNaN(d.getTime())) return '';
      return dayKey(value) + ' ' + String(d.getHours()).padStart(2, '0') + ':00';
    }

    function metricKey() {
      return document.getElementById('metricMode').value;
    }

    function metricLabel() {
      return metricKey() === 'credit' ? '积分' : 'Token';
    }

    function metricValue(row) {
      return Number(row[metricKey()]) || 0;
    }

    function renderMetrics(list) {
      const mode = metricKey();
      const prompt = sum(list, 'promptTokens');
      const cached = sum(list, 'cachedTokens');
      const completion = sum(list, 'completionTokens');
      const total = sum(list, 'totalTokens');
      const credits = list.map(r => Number(r.credit)).filter(Number.isFinite);
      const primary = mode === 'credit' ? credits.reduce((a, b) => a + b, 0) : total;
      document.getElementById('metrics').innerHTML = [
        metric('请求次数', fmt.format(list.length), 'generation usage 记录'),
        metric('当前口径', fmt.format(primary), metricLabel() + ' 汇总'),
        metric('输入 Token', fmt.format(prompt), 'prompt_tokens'),
        metric('缓存命中率', pct(prompt ? cached / prompt : 0), fmt.format(cached) + ' cached / ' + fmt.format(prompt)),
        metric('输出 Token', fmt.format(completion), 'completion_tokens'),
        metric('积分', credits.length ? fmt.format(credits.reduce((a, b) => a + b, 0)) : '-', credits.length ? 'usage.credit 汇总' : 'trace 中未发现 credit')
      ].join('');
    }

    function groupBy(list, key) {
      const map = new Map();
      for (const r of list) {
        const k = r[key] || '(empty)';
        if (!map.has(k)) map.set(k, []);
        map.get(k).push(r);
      }
      return [...map.entries()].map(([name, items]) => ({ name, count: items.length, value: items.reduce((a, r) => a + metricValue(r), 0), tokens: sum(items, 'totalTokens'), credit: sum(items, 'credit') }))
        .sort((a, b) => b.value - a.value);
    }

    function groupByDate(list, keyFn, valueKey) {
      const map = new Map();
      for (const r of list) {
        const key = keyFn(r.startedAt);
        if (!key) continue;
        map.set(key, (map.get(key) || 0) + (Number(r[valueKey]) || 0));
      }
      return [...map.entries()].map(([name, value]) => ({ name, value })).sort((a, b) => a.name.localeCompare(b.name));
    }

    function renderBars(id, grouped) {
      const max = Math.max(1, ...grouped.map(g => g.value ?? g.tokens));
      document.getElementById(id).innerHTML = grouped.slice(0, 10).map(g => {
        const value = g.value ?? g.tokens;
        const width = Math.max(2, (value / max) * 100);
        return '<div class="bar-row"><div title="' + escapeHtml(g.name) + '">' + escapeHtml(g.name) + '</div><div class="bar"><span style="width:' + width + '%"></span></div><div class="num">' + fmt.format(value) + '</div></div>';
      }).join('') || '<div class="empty">无数据</div>';
    }

    function renderChart(id, points) {
      const svg = document.getElementById(id);
      if (!points.length) { svg.innerHTML = '<text x="360" y="160" text-anchor="middle">无数据</text>'; return; }
      const state = chartState[id];
      const visibleCount = Math.max(2, Math.ceil(points.length / state.zoom));
      state.offset = Math.min(Math.max(0, state.offset), Math.max(0, points.length - visibleCount));
      const view = points.slice(Math.floor(state.offset), Math.floor(state.offset) + visibleCount);
      const w = 720, h = 380, p = 46;
      const max = Math.max(1, ...view.map(p => p.value));
      const step = view.length > 1 ? (w - p * 2) / (view.length - 1) : 0;
      const coords = view.map((pt, i) => {
        const x = p + i * step;
        const y = h - p - (pt.value / max) * (h - p * 2);
        return { ...pt, x, y };
      });
      const line = coords.map((pt, i) => (i ? 'L' : 'M') + pt.x.toFixed(1) + ',' + pt.y.toFixed(1)).join(' ');
      const area = 'M' + coords[0].x.toFixed(1) + ',' + (h - p) + ' ' + line + ' L' + coords[coords.length - 1].x.toFixed(1) + ',' + (h - p) + ' Z';
      const labels = [coords[0], coords[Math.floor(coords.length / 2)], coords[coords.length - 1]].filter(Boolean);
      svg.innerHTML = '<line class="axis" x1="' + p + '" y1="' + (h - p) + '" x2="' + (w - p) + '" y2="' + (h - p) + '"></line>' +
        '<line class="axis" x1="' + p + '" y1="' + p + '" x2="' + p + '" y2="' + (h - p) + '"></line>' +
        '<text x="' + p + '" y="20">' + compactFmt.format(max) + '</text>' +
        '<path class="area" d="' + area + '"></path><path class="line" d="' + line + '"></path>' +
        coords.map((pt, i) => '<circle class="point" data-index="' + i + '" cx="' + pt.x.toFixed(1) + '" cy="' + pt.y.toFixed(1) + '" r="3" fill="var(--accent)"></circle>').join('') +
        coords.map((pt, i) => '<rect class="hit" data-index="' + i + '" x="' + Math.max(0, pt.x - Math.max(8, step / 2)).toFixed(1) + '" y="0" width="' + Math.max(16, step).toFixed(1) + '" height="' + h + '"></rect>').join('') +
        labels.map(pt => '<text x="' + pt.x.toFixed(1) + '" y="' + (h - 16) + '" text-anchor="middle">' + escapeHtml(pt.name.slice(-8)) + '</text>').join('');
      bindChart(svg, id, coords, points.length);
    }

    function bindChart(svg, id, coords, totalCount) {
      const state = chartState[id];
      const tooltip = document.getElementById('tooltip');
      svg.onwheel = event => {
        event.preventDefault();
        const oldZoom = state.zoom;
        state.zoom = Math.min(20, Math.max(1, state.zoom * (event.deltaY < 0 ? 1.25 : 0.8)));
        const ratio = event.offsetX / Math.max(1, svg.clientWidth);
        const oldVisible = totalCount / oldZoom;
        const newVisible = totalCount / state.zoom;
        state.offset += (oldVisible - newVisible) * ratio;
        render();
      };
      svg.onpointerdown = event => {
        state.dragging = true;
        state.startX = event.clientX;
        state.startOffset = state.offset;
        svg.setPointerCapture(event.pointerId);
      };
      svg.onpointermove = event => {
        if (state.dragging) {
          const visibleCount = Math.max(2, Math.ceil(totalCount / state.zoom));
          const dx = event.clientX - state.startX;
          state.offset = state.startOffset - dx / Math.max(1, svg.clientWidth) * visibleCount;
          render();
          return;
        }
      };
      svg.onpointerup = event => {
        state.dragging = false;
        try { svg.releasePointerCapture(event.pointerId); } catch {}
      };
      svg.onpointerleave = () => { tooltip.style.display = 'none'; state.dragging = false; };
      svg.querySelectorAll('.hit').forEach(hit => {
        hit.addEventListener('mousemove', event => {
          const pt = coords[Number(hit.dataset.index)];
          tooltip.innerHTML = '<strong>' + escapeHtml(pt.name) + '</strong><div class="muted">' + metricLabel() + '：' + fmt.format(pt.value) + '</div>';
          tooltip.style.left = (event.clientX + 12) + 'px';
          tooltip.style.top = (event.clientY + 12) + 'px';
          tooltip.style.display = 'block';
        });
        hit.addEventListener('mouseleave', () => { tooltip.style.display = 'none'; });
      });
    }

    function renderTable(list) {
      const sorted = [...list].sort((a, b) => {
        const av = a[sortKey], bv = b[sortKey];
        if (typeof av === 'number' || typeof bv === 'number') return ((av || 0) - (bv || 0)) * sortDir;
        return String(av || '').localeCompare(String(bv || '')) * sortDir;
      });
      const pageSize = Number(document.getElementById('pageSize').value || 20);
      const totalPages = Math.max(1, Math.ceil(sorted.length / pageSize));
      page = Math.min(Math.max(1, page), totalPages);
      const shown = sorted.slice((page - 1) * pageSize, page * pageSize);
      document.getElementById('head').innerHTML = columns.map(([key, label]) => '<th data-key="' + key + '">' + label + (key === sortKey ? (sortDir > 0 ? ' ↑' : ' ↓') : '') + '</th>').join('');
      document.getElementById('body').innerHTML = shown.map(r => '<tr>' + columns.map(([key]) => {
        let v = r[key];
        let cls = '';
        if (key === 'startedAt') v = date(v);
        if (key === 'cacheRate') { cls = 'rate ' + (v >= 0.7 ? 'ok' : v >= 0.3 ? 'mid' : 'low'); v = pct(v); }
        if (typeof v === 'number' && key !== 'cacheRate') { cls = 'num'; v = fmt.format(v); }
        if (key === 'requestId') v = String(v || '').slice(0, 32);
        return '<td class="' + cls + '">' + escapeHtml(v) + '</td>';
      }).join('') + '</tr>').join('') || '<tr><td class="empty" colspan="' + columns.length + '">无数据</td></tr>';
      const start = sorted.length ? (page - 1) * pageSize + 1 : 0;
      const end = Math.min(page * pageSize, sorted.length);
      const info = '第 ' + fmt.format(page) + ' / ' + fmt.format(totalPages) + ' 页，' + fmt.format(start) + '-' + fmt.format(end) + ' / ' + fmt.format(sorted.length);
      document.getElementById('pageInfo').textContent = info;
      document.getElementById('pageInfoTop').textContent = info;
      document.getElementById('prevPage').disabled = page <= 1;
      document.getElementById('nextPage').disabled = page >= totalPages;
      document.querySelectorAll('th').forEach(th => th.onclick = () => {
        const key = th.dataset.key;
        if (sortKey === key) sortDir *= -1;
        else { sortKey = key; sortDir = key === 'startedAt' ? -1 : 1; }
        render();
      });
    }

    function render() {
      const list = filteredRows();
      renderMetrics(list);
      renderBars('byModel', groupBy(list, 'model'));
      renderBars('bySession', groupBy(list, 'sessionId'));
      renderBars('byAgent', groupBy(list, 'agent'));
      renderBars('byDay', groupByDate(list, dayKey, metricKey()).map(g => ({ name: g.name, value: g.value })));
      const mode = document.getElementById('metricMode').value;
      renderChart('dailyChart', groupByDate(list, dayKey, mode));
      renderChart('hourlyChart', groupByDate(list, hourKey, mode));
      renderTable(list);
    }

    function exportCsv() {
      const list = filteredRows();
      const header = columns.map(c => c[1]);
      const csvRows = [header, ...list.map(r => columns.map(([key]) => key === 'startedAt' ? date(r[key]) : r[key]))];
      const csv = csvRows.map(row => row.map(v => '"' + String(v ?? '').replace(/"/g, '""') + '"').join(',')).join('\\n');
      const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = 'codebuddy-usage-report.csv';
      a.click();
      URL.revokeObjectURL(a.href);
    }

    fillSelect('session', '全部会话', uniq('sessionId'));
    fillSelect('model', '全部模型', uniq('model'));
    fillSelect('agent', '全部 Agent', uniq('agent'));
    document.getElementById('q').addEventListener('input', render);
    document.getElementById('session').addEventListener('change', render);
    document.getElementById('model').addEventListener('change', render);
    document.getElementById('agent').addEventListener('change', render);
    document.getElementById('metricMode').addEventListener('change', render);
    document.getElementById('pageSize').addEventListener('change', () => { page = 1; render(); });
    document.getElementById('prevPage').addEventListener('click', () => { page--; render(); });
    document.getElementById('nextPage').addEventListener('click', () => { page++; render(); });
    document.querySelectorAll('.tab').forEach(btn => btn.addEventListener('click', () => {
      activeTab = btn.dataset.tab;
      document.querySelectorAll('.tab').forEach(b => b.classList.toggle('active', b === btn));
      document.querySelectorAll('.tab-panel').forEach(panel => panel.classList.toggle('active', panel.id === activeTab));
      render();
    }));
    document.getElementById('exportBtn').addEventListener('click', exportCsv);
    render();
  </script>
</body>
</html>`;
}

const traceRows = [];
const projectRows = [];
const errors = [];
for (const file of walk(traceRoot, ['.json'])) {
  try {
    traceRows.push(...extractGenerations(file));
  } catch (error) {
    errors.push(`${file}: ${error.message}`);
  }
}
for (const file of walk(projectsRoot, ['.jsonl'])) {
  try {
    projectRows.push(...extractProjectUsage(file));
  } catch (error) {
    errors.push(`${file}: ${error.message}`);
  }
}

const rows = mergeRows(traceRows, projectRows);
rows.sort((a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime());
fs.writeFileSync(outFile, buildHtml(rows), 'utf8');

console.log(`Report: ${outFile}`);
console.log(`Trace root: ${traceRoot}`);
console.log(`Projects root: ${projectsRoot}`);
console.log(`Trace usage rows: ${traceRows.length}`);
console.log(`Project credit rows: ${projectRows.length}`);
console.log(`Usage rows: ${rows.length}`);
console.log(`Rows with credit: ${rows.filter(row => row.credit !== '').length}`);
if (errors.length) {
  console.log(`Skipped files: ${errors.length}`);
  for (const line of errors.slice(0, 10)) console.log(line);
}
if (args.open) {
  openFile(outFile);
}
