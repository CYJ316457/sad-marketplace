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
  specEditMode: false,
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
const pageViews = [...document.querySelectorAll('.page-view')];
const pageTabs = [...document.querySelectorAll('.page-tab')];
const tabs = [...document.querySelectorAll('.tab')];
const modalBackdrop = document.getElementById('modalBackdrop');
const modalTitle = document.getElementById('modalTitle');
const modalMessage = document.getElementById('modalMessage');
const modalCancel = document.getElementById('modalCancel');
const modalConfirm = document.getElementById('modalConfirm');

tabs.forEach((tab) => tab.addEventListener('click', () => {
  state.selectedTab = tab.dataset.tab;
  tabs.forEach((item) => item.classList.toggle('active', item === tab));
  renderDetail();
}));

pageTabs.forEach((tab) => tab.addEventListener('click', async () => {
  state.selectedPage = tab.dataset.page;
  pageTabs.forEach((item) => item.classList.toggle('active', item === tab));
  pageViews.forEach((view) => view.classList.toggle('active', view.id === `${state.selectedPage}Page`));
  if (state.selectedPage === 'specs') await renderSpecs();
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
  const confirmed = await showModal({
    title: '\u5220\u9664 Task\uff1f',
    message: `\u786e\u8ba4\u5220\u9664 ${label}\uff1f\n\u8be5\u64cd\u4f5c\u4f1a\u5220\u9664 task \u76ee\u5f55\uff0c\u65e0\u6cd5\u4ece Dashboard \u64a4\u9500\u3002`,
    confirmText: '\u5220\u9664',
    danger: true,
  });
  if (!confirmed) return;

  const res = await fetch(`/api/tasks/${encodeURIComponent(taskId)}`, { method: 'DELETE' });
  const payload = await res.json().catch(() => ({}));
  if (!res.ok || payload.existsAfterDelete) {
    await showModal({
      title: '\u5220\u9664\u5931\u8d25',
      message: `${payload.error || res.statusText}${payload.taskDir ? `\n${payload.taskDir}` : ''}`,
      confirmText: '\u77e5\u9053\u4e86',
      showCancel: false,
    });
    await refresh();
    return;
  }
  const removedFromOverview = await waitForTaskRemoval(taskId);
  if (!removedFromOverview) {
    renderOverview();
    await renderDetail();
    await showModal({
      title: '\u5220\u9664\u672a\u5b8c\u6210',
      message: `\u540e\u7aef\u8fd4\u56de\u5220\u9664\u6210\u529f\uff0c\u4f46\u5237\u65b0\u540e\u4efb\u52a1\u4ecd\u5728\u5217\u8868\u91cc\uff1a${payload.deleted || label}\n${payload.taskDir || ''}`,
      confirmText: '\u77e5\u9053\u4e86',
      showCancel: false,
    });
    return;
  }
  state.selectedTaskId = null;
  state.selectedSpecName = '';
  renderOverview();
  await renderDetail();
  await showModal({
    title: '\u5220\u9664\u6210\u529f',
    message: `${payload.deleted || label} \u5df2\u5220\u9664\uff0c\u5e76\u4e14\u5237\u65b0\u540e\u4e0d\u518d\u51fa\u73b0\u5728\u4efb\u52a1\u5217\u8868\u3002`,
    confirmText: '\u5b8c\u6210',
    showCancel: false,
  });
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

function showModal({ title, message, confirmText = '\u786e\u8ba4', cancelText = '\u53d6\u6d88', showCancel = true, danger = false }) {
  modalTitle.textContent = title;
  modalMessage.textContent = message;
  modalConfirm.textContent = confirmText;
  modalCancel.textContent = cancelText;
  modalCancel.hidden = !showCancel;
  modalConfirm.className = danger ? 'danger-btn' : 'page-btn primary-btn';
  modalBackdrop.hidden = false;
  modalConfirm.focus();

  return new Promise((resolve) => {
    const cleanup = (result) => {
      modalBackdrop.hidden = true;
      modalConfirm.removeEventListener('click', onConfirm);
      modalCancel.removeEventListener('click', onCancel);
      modalBackdrop.removeEventListener('click', onBackdrop);
      document.removeEventListener('keydown', onKeyDown);
      resolve(result);
    };
    const onConfirm = () => cleanup(true);
    const onCancel = () => cleanup(false);
    const onBackdrop = (event) => {
      if (event.target === modalBackdrop) cleanup(false);
    };
    const onKeyDown = (event) => {
      if (event.key === 'Escape') cleanup(false);
    };
    modalConfirm.addEventListener('click', onConfirm);
    modalCancel.addEventListener('click', onCancel);
    modalBackdrop.addEventListener('click', onBackdrop);
    document.addEventListener('keydown', onKeyDown);
  });
}

function renderMarkdown(value) {
  const source = String(value || '').replace(/\r\n/g, '\n');
  const lines = source.split('\n');
  const out = [];
  let listOpen = false;
  let codeOpen = false;
  const closeList = () => {
    if (listOpen) {
      out.push('</ul>');
      listOpen = false;
    }
  };
  const inline = (text) => escapeHtml(text)
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, '<a href="$2" target="_blank" rel="noreferrer">$1</a>');

  for (const line of lines) {
    if (/^```/.test(line)) {
      closeList();
      out.push(codeOpen ? '</code></pre>' : '<pre><code>');
      codeOpen = !codeOpen;
      continue;
    }
    if (codeOpen) {
      out.push(`${escapeHtml(line)}\n`);
      continue;
    }
    const heading = line.match(/^(#{1,6})\s+(.*)$/);
    if (heading) {
      closeList();
      const level = heading[1].length;
      out.push(`<h${level}>${inline(heading[2])}</h${level}>`);
      continue;
    }
    const bullet = line.match(/^\s*[-*]\s+(.*)$/);
    if (bullet) {
      if (!listOpen) {
        out.push('<ul>');
        listOpen = true;
      }
      out.push(`<li>${inline(bullet[1])}</li>`);
      continue;
    }
    closeList();
    if (!line.trim()) {
      out.push('');
      continue;
    }
    out.push(`<p>${inline(line)}</p>`);
  }
  closeList();
  if (codeOpen) out.push('</code></pre>');
  return out.join('\n') || '<p class="muted">(empty)</p>';
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
    state.specEditMode = false;
  }
  const selected = files.find((file) => file.name === state.selectedSpecName) || files[0];
  specsBody.innerHTML = [
    '<div class="spec-layout">',
    `<aside class="spec-tree-panel"><div class="section-title">.trellis/spec</div>${renderSpecTree(data.tree || [])}</aside>`,
    '<section class="spec-edit-panel">',
    '<div class="spec-toolbar">',
    `<div class="spec-path">${escapeHtml(selected.name)}</div>`,
    state.specEditMode
      ? '<button id="saveSpecBtn" class="page-btn primary-btn" type="button">\u4fdd\u5b58</button>'
      : '<button id="editSpecBtn" class="page-btn" type="button">\u7f16\u8f91</button>',
    '<span id="specSaveState" class="muted small"></span>',
    '</div>',
    state.specEditMode
      ? `<textarea id="specEditor" class="spec-editor" spellcheck="false">${escapeHtml(selected.content || '')}</textarea>`
      : `<article class="markdown-preview">${renderMarkdown(selected.content || '')}</article>`,
    '</section>',
    '</div>',
  ].join('');
  for (const button of specsBody.querySelectorAll('.spec-tree-file')) {
    button.addEventListener('click', () => {
      state.selectedSpecName = button.dataset.specName;
      state.specEditMode = false;
      renderSpecs();
    });
  }
  const editSpecBtn = specsBody.querySelector('#editSpecBtn');
  if (editSpecBtn) {
    editSpecBtn.addEventListener('click', () => {
      state.specEditMode = true;
      renderSpecs();
    });
  }
  const saveSpecBtn = specsBody.querySelector('#saveSpecBtn');
  if (saveSpecBtn) {
    const specEditor = specsBody.querySelector('#specEditor');
    const specSaveState = specsBody.querySelector('#specSaveState');
    saveSpecBtn.addEventListener('click', async () => {
      specSaveState.textContent = '\u4fdd\u5b58\u4e2d...';
      const saveRes = await fetch('/api/specs', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: state.selectedSpecName, content: specEditor.value }),
      });
      if (!saveRes.ok) {
        const payload = await saveRes.json().catch(() => ({}));
        specSaveState.textContent = `\u4fdd\u5b58\u5931\u8d25\uff1a${payload.error || saveRes.statusText}`;
        return;
      }
      specSaveState.textContent = '\u5df2\u4fdd\u5b58';
      state.specEditMode = false;
      await renderSpecs();
    });
  }
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

