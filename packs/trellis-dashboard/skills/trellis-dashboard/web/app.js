const TASKS_PER_PAGE = 10;
const ALL_STATUS = 'all';
const ALL_ASSIGNEES = 'all';

const state = {
  overview: null,
  selectedTaskId: null,
  selectedTab: 'overview',
  selectedPage: 'tasks',
  selectedStatus: ALL_STATUS,
  selectedAssignee: ALL_ASSIGNEES,
  currentPage: 1,
  selectedSpecName: '',
};

const repoMeta = document.getElementById('repoMeta');
const summaryStats = document.getElementById('summaryStats');
const taskList = document.getElementById('taskList');
const currentPanel = document.getElementById('currentPanel');
const detailBody = document.getElementById('detailBody');
const eventList = document.getElementById('eventList');
const statusFilters = document.getElementById('statusFilters');
const assigneeFilter = document.getElementById('assigneeFilter');
const taskCount = document.getElementById('taskCount');
const pageInfo = document.getElementById('pageInfo');
const prevPage = document.getElementById('prevPage');
const nextPage = document.getElementById('nextPage');
const deleteTaskBtn = document.getElementById('deleteTaskBtn');
const specsBody = document.getElementById('specsBody');
const summaryBody = document.getElementById('summaryBody');
const pageViews = [...document.querySelectorAll('.page-view')];
const pageTabs = [...document.querySelectorAll('.page-tab')];
const tabs = [...document.querySelectorAll('.tab')];

tabs.forEach((tab) => tab.addEventListener('click', () => {
  state.selectedTab = tab.dataset.tab;
  tabs.forEach((item) => item.classList.toggle('active', item === tab));
  renderDetail();
}));

pageTabs.forEach((tab) => tab.addEventListener('click', async () => {
  state.selectedPage = tab.dataset.page;
  pageTabs.forEach((item) => item.classList.toggle('active', item === tab));
  pageViews.forEach((view) => view.classList.toggle('active', view.id === `${state.selectedPage === 'trellis-summary' ? 'summary' : state.selectedPage}Page`));
  if (state.selectedPage === 'specs') await renderSpecs();
  if (state.selectedPage === 'trellis-summary') await renderTrellisSummary();
}));

assigneeFilter.addEventListener('change', () => {
  state.selectedAssignee = assigneeFilter.value;
  state.currentPage = 1;
  renderOverview();
  renderDetail();
});

prevPage.addEventListener('click', () => {
  if (state.currentPage > 1) {
    state.currentPage -= 1;
    renderOverview();
    renderDetail();
  }
});

nextPage.addEventListener('click', () => {
  const { totalPages } = getPagination(getVisibleTasks());
  if (state.currentPage < totalPages) {
    state.currentPage += 1;
    renderOverview();
    renderDetail();
  }
});

deleteTaskBtn.addEventListener('click', async () => {
  if (!state.selectedTaskId) return;
  const taskId = state.selectedTaskId;
  const task = getAllTasks().find((item) => item.id === taskId);
  const label = task ? `${task.title} (${task.id})` : taskId;
  if (!window.confirm(`确认删除 task：${label}？\n该操作会删除 task 目录。`)) return;
  const res = await fetch(`/api/tasks/${encodeURIComponent(taskId)}`, { method: 'DELETE' });
  const payload = await res.json().catch(() => ({}));
  if (!res.ok || payload.existsAfterDelete) {
    window.alert(`删除失败：${payload.error || res.statusText}${payload.taskDir ? `\n${payload.taskDir}` : ''}`);
    await refresh();
    return;
  }
  const removedFromOverview = await waitForTaskRemoval(taskId);
  if (!removedFromOverview) {
    renderOverview();
    await renderDetail();
    window.alert(`后端返回删除成功，但刷新后任务仍在列表里：${payload.deleted || label}\n${payload.taskDir || ''}`);
    return;
  }
  window.alert(`删除成功：${payload.deleted || label}`);
  state.selectedTaskId = null;
  state.selectedSpecName = '';
  renderOverview();
  await renderDetail();
});

async function fetchOverview() {
  const res = await fetch('/api/overview', { cache: 'no-store' });
  return res.json();
}

function taskExistsInOverview(overview, taskId) {
  return [...(overview.tasks || []), ...(overview.archivedTasks || [])].some((task) => task.id === taskId);
}

async function waitForTaskRemoval(taskId) {
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const overview = await fetchOverview();
    if (!taskExistsInOverview(overview, taskId)) {
      state.overview = overview;
      return true;
    }
    await new Promise((resolve) => setTimeout(resolve, 200));
  }
  state.overview = await fetchOverview();
  return !taskExistsInOverview(state.overview, taskId);
}

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>\"]/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[ch]));
}

function getAllTasks() {
  const overview = state.overview;
  if (!overview) return [];
  return [...overview.tasks, ...overview.archivedTasks];
}

function getStatusOptions(tasks) {
  const preferred = ['planning', 'in_progress', 'blocked', 'review', 'completed'];
  const seen = new Set(tasks.map((task) => task.status).filter(Boolean));
  const ordered = preferred.filter((status) => seen.has(status));
  const extra = [...seen].filter((status) => status !== 'unknown' && !preferred.includes(status)).sort();
  return [ALL_STATUS, ...ordered, ...extra];
}

function getAssigneeOptions(tasks) {
  const names = [...new Set(tasks.map((task) => task.assignee || 'unassigned'))].sort((a, b) => a.localeCompare(b));
  return [ALL_ASSIGNEES, ...names];
}

function getVisibleTasks() {
  return getAllTasks().filter((task) => {
    const assignee = task.assignee || 'unassigned';
    const statusMatch = state.selectedStatus === ALL_STATUS || task.status === state.selectedStatus;
    const assigneeMatch = state.selectedAssignee === ALL_ASSIGNEES || assignee === state.selectedAssignee;
    return statusMatch && assigneeMatch;
  });
}

function getPagination(tasks) {
  const totalPages = Math.max(1, Math.ceil(tasks.length / TASKS_PER_PAGE));
  const page = Math.min(state.currentPage, totalPages);
  const start = (page - 1) * TASKS_PER_PAGE;
  return {
    page,
    totalPages,
    pageItems: tasks.slice(start, start + TASKS_PER_PAGE),
  };
}

function ensureSelection(visibleTasks) {
  if (!visibleTasks.length) {
    state.selectedTaskId = null;
    return;
  }
  if (!visibleTasks.some((task) => task.id === state.selectedTaskId)) {
    state.selectedTaskId = (state.overview.currentTask && visibleTasks.some((task) => task.id === state.overview.currentTask.id))
      ? state.overview.currentTask.id
      : visibleTasks[0].id;
  }
}

function renderStatusFilters(tasks) {
  const options = getStatusOptions(tasks);
  if (!options.includes(state.selectedStatus)) {
    state.selectedStatus = ALL_STATUS;
  }

  statusFilters.innerHTML = '';
  for (const status of options) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'filter-chip' + (state.selectedStatus === status ? ' active' : '');
    button.textContent = status === ALL_STATUS ? '全部' : status;
    button.addEventListener('click', () => {
      state.selectedStatus = status;
      state.currentPage = 1;
      renderOverview();
      renderDetail();
    });
    statusFilters.appendChild(button);
  }
}

function renderAssigneeFilter(tasks) {
  const options = getAssigneeOptions(tasks);
  if (!options.includes(state.selectedAssignee)) {
    state.selectedAssignee = ALL_ASSIGNEES;
  }

  assigneeFilter.innerHTML = options
    .map((value) => `<option value="${escapeHtml(value)}">${value === ALL_ASSIGNEES ? '全部人员' : escapeHtml(value)}</option>`)
    .join('');
  assigneeFilter.value = state.selectedAssignee;
}

function renderTaskList(tasks) {
  const { page, totalPages, pageItems } = getPagination(tasks);
  state.currentPage = page;
  ensureSelection(pageItems.length ? pageItems : tasks);

  taskList.innerHTML = '';
  for (const task of pageItems) {
    const card = document.createElement('div');
    card.className = 'task-card' + (task.id === state.selectedTaskId ? ' active' : '');
    card.innerHTML = [
      `<div class="task-title-row"><strong>${escapeHtml(task.title)}</strong><span class="badge ${escapeHtml(task.status)}">${escapeHtml(task.status)}</span></div>`,
      `<div class="task-meta">${escapeHtml(task.id)}</div>`,
      `<div class="task-meta">${escapeHtml(task.assignee || 'unassigned')} · ${task.researchFileCount} research · ${task.implementContextCount}/${task.checkContextCount} ctx</div>`,
    ].join('');
    card.addEventListener('click', () => {
      state.selectedTaskId = task.id;
      state.selectedSpecName = '';
      renderOverview();
      renderDetail();
    });
    taskList.appendChild(card);
  }

  taskCount.textContent = tasks.length ? `共 ${tasks.length} 个任务` : '暂无任务';
  pageInfo.textContent = `${page}/${totalPages} 页`;
  prevPage.disabled = page <= 1;
  nextPage.disabled = page >= totalPages;
}

function renderOverview() {
  const overview = state.overview;
  if (!overview) return;

  repoMeta.textContent = `${overview.repoRoot} · developer: ${overview.developer} · updated: ${overview.updatedAt}`;
  summaryStats.innerHTML = '';

  const pills = [
    ['active', overview.summary.activeCount],
    ['archived', overview.summary.archivedCount],
    ['agent', overview.currentAgent || 'none'],
  ];
  Object.entries(overview.summary.byStatus || {}).forEach(([key, value]) => pills.push([key, value]));
  for (const [label, value] of pills) {
    const span = document.createElement('div');
    span.className = 'stat-pill';
    span.textContent = `${label}: ${value}`;
    summaryStats.appendChild(span);
  }

  const allTasks = getAllTasks();
  if (!state.selectedTaskId && allTasks.length) {
    state.selectedTaskId = (overview.currentTask && overview.currentTask.id) || allTasks[0].id;
  }

  renderStatusFilters(allTasks);
  renderAssigneeFilter(allTasks);
  const visibleTasks = getVisibleTasks();
  renderTaskList(visibleTasks);

  const current = overview.currentTask;
  currentPanel.innerHTML = current
    ? `<div class="kv compact-kv"><div>Current task</div><div><strong>${escapeHtml(current.title)}</strong></div><div>Status</div><div><span class="badge ${escapeHtml(current.status)}">${escapeHtml(current.status)}</span></div><div>Current agent</div><div>${escapeHtml(overview.currentAgent || 'unknown')}</div><div>Artifacts</div><div>${current.artifactProgress}/${current.artifactTotal} core artifacts, ${current.researchFileCount} research files</div><div>Session pointers</div><div>${overview.sessions.length}</div></div>`
    : '<div class="muted">No active Trellis task.</div>';

  eventList.innerHTML = '';
  for (const event of overview.events.slice(0, 50)) {
    const div = document.createElement('div');
    div.className = 'event-card';
    div.innerHTML = `<div><strong>${escapeHtml(event.event || 'event')}</strong></div><div class="task-meta">${escapeHtml(event.platform || 'unknown')} · ${escapeHtml(event.agent || event.tool || '')}</div><div class="task-meta">${escapeHtml(event.ts || '')}</div>`;
    eventList.appendChild(div);
  }
}

async function renderDetail() {
  if (!state.selectedTaskId) {
    detailBody.innerHTML = '<div class="muted">Select a task.</div>';
    return;
  }

  const res = await fetch(`/api/tasks/${encodeURIComponent(state.selectedTaskId)}`);
  if (!res.ok) {
    detailBody.textContent = 'Task detail not available';
    return;
  }

  const data = await res.json();
  const { summary, detail } = data;
  if (state.selectedTab === 'overview') {
    detailBody.innerHTML = `<div class="kv"><div>ID</div><div>${escapeHtml(summary.id)}</div><div>Title</div><div>${escapeHtml(summary.title)}</div><div>Status</div><div><span class="badge ${escapeHtml(summary.status)}">${escapeHtml(summary.status)}</span></div><div>Assignee</div><div>${escapeHtml(summary.assignee || '')}</div><div>Package</div><div>${escapeHtml(summary.package || '')}</div><div>Task dir</div><div class="code">${escapeHtml(summary.taskDir)}</div></div>`;
    return;
  }
  if (state.selectedTab === 'prd') {
    detailBody.innerHTML = `<div class="code">${escapeHtml(detail.prd || '(missing)')}</div>`;
    return;
  }
  if (state.selectedTab === 'info') {
    detailBody.innerHTML = `<div class="code">${escapeHtml(detail.info || '(missing)')}</div>`;
    return;
  }
  if (state.selectedTab === 'context') {
    detailBody.innerHTML = `<div class="code">${escapeHtml(JSON.stringify({ implement: detail.implementContext, check: detail.checkContext }, null, 2))}</div>`;
    return;
  }
  if (state.selectedTab === 'research') {
    detailBody.innerHTML = `<div class="code">${escapeHtml(JSON.stringify(detail.research, null, 2))}</div>`;
    return;
  }
  if (state.selectedTab === 'summary') {
    detailBody.innerHTML = `<div class="code">${escapeHtml(detail.summary || '(missing)')}</div>`;
    return;
  }
  detailBody.innerHTML = `<div class="code">${escapeHtml(JSON.stringify(detail.task, null, 2))}</div>`;
}

function renderSpecTree(nodes) {
  if (!nodes || !nodes.length) return '';
  return `<ul class="spec-tree">${nodes.map((node) => {
    if (node.type === 'dir') {
      return `<li><details open><summary>${escapeHtml(node.name)}</summary>${renderSpecTree(node.children || [])}</details></li>`;
    }
    const active = node.path === state.selectedSpecName ? ' active' : '';
    return `<li><button class="spec-tree-file${active}" data-spec-name="${escapeHtml(node.path)}" type="button">${escapeHtml(node.name)}</button></li>`;
  }).join('')}</ul>`;
}

async function renderSpecs() {
  const res = await fetch('/api/specs');
  if (!res.ok) {
    specsBody.textContent = 'Specs not available';
    return;
  }
  const data = await res.json();
  const files = data.files || [];
  if (!files.length) {
    specsBody.innerHTML = '<div class="muted">No project specs found under .trellis/spec.</div>';
    return;
  }
  if (!state.selectedSpecName || !files.some((file) => file.name === state.selectedSpecName)) {
    state.selectedSpecName = files[0].name;
  }
  const selected = files.find((file) => file.name === state.selectedSpecName) || files[0];
  specsBody.innerHTML = [
    '<div class="spec-layout">',
    `<aside class="spec-tree-panel"><div class="section-title">.trellis/spec</div>${renderSpecTree(data.tree || [])}</aside>`,
    '<section class="spec-edit-panel">',
    '<div class="spec-toolbar">',
    `<div class="spec-path">${escapeHtml(selected.name)}</div>`,
    '<button id="saveSpecBtn" class="page-btn" type="button">保存 Spec</button>',
    '<span id="specSaveState" class="muted small"></span>',
    '</div>',
    `<textarea id="specEditor" class="spec-editor" spellcheck="false">${escapeHtml(selected.content || '')}</textarea>`,
    '</section>',
    '</div>',
  ].join('');
  for (const button of specsBody.querySelectorAll('.spec-tree-file')) {
    button.addEventListener('click', () => {
      state.selectedSpecName = button.dataset.specName;
      renderSpecs();
    });
  }
  const saveSpecBtn = specsBody.querySelector('#saveSpecBtn');
  const specEditor = specsBody.querySelector('#specEditor');
  const specSaveState = specsBody.querySelector('#specSaveState');
  saveSpecBtn.addEventListener('click', async () => {
    specSaveState.textContent = '保存中...';
    const saveRes = await fetch('/api/specs', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: state.selectedSpecName, content: specEditor.value }),
    });
    if (!saveRes.ok) {
      const payload = await saveRes.json().catch(() => ({}));
      specSaveState.textContent = `保存失败：${payload.error || saveRes.statusText}`;
      return;
    }
    specSaveState.textContent = '已保存';
    await renderSpecs();
  });
}

async function renderTrellisSummary() {
  const res = await fetch('/api/trellis-summary');
  if (!res.ok) {
    summaryBody.textContent = 'Trellis summary not available';
    return;
  }
  const data = await res.json();
  const files = data.files || [];
  if (!files.length) {
    summaryBody.innerHTML = `<div class="muted">${escapeHtml(data.fallback || 'No Trellis summary found.')}</div>`;
    return;
  }
  summaryBody.innerHTML = files.map((file) => `<h3>${escapeHtml(file.name)}</h3><div class="code">${escapeHtml(file.content || '(empty)')}</div>`).join('');
}

async function refresh() {
  state.overview = await fetchOverview();
  renderOverview();
  await renderDetail();
}

const stream = new EventSource('/api/stream');
stream.addEventListener('update', (event) => {
  const payload = JSON.parse(event.data);
  state.overview = payload.state;
  renderOverview();
  renderDetail();
});

refresh();

