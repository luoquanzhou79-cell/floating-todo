import { getCurrentWindow } from "@tauri-apps/api/window";
import { LogicalSize } from "@tauri-apps/api/dpi";

const appWindow = getCurrentWindow();

const titlebar = document.querySelector(".titlebar");
const dragBar = document.getElementById("dragBar");
const todoInput = document.getElementById("todoInput");
const addBtn = document.getElementById("addBtn");
const todoList = document.getElementById("todoList");
const clearDoneBtn = document.getElementById("clearDoneBtn");
const clearAllBtn = document.getElementById("clearAllBtn");
const minBtn = document.getElementById("minBtn");
const closeBtn = document.getElementById("closeBtn");
const fullPanel = document.getElementById("fullPanel");
const compactPanel = document.getElementById("compactPanel");
const prioritySelect = document.getElementById("prioritySelect");
const remindTimeInput = document.getElementById("remindTimeInput");

const timerText = document.getElementById("timerText");
const startTimerBtn = document.getElementById("startTimerBtn");
const pauseTimerBtn = document.getElementById("pauseTimerBtn");
const resetTimerBtn = document.getElementById("resetTimerBtn");
const timerMinuteInput = document.getElementById("timerMinuteInput");

const toastContainer = document.getElementById("toastContainer");

const STORAGE_KEY = "floating_todo_items";

let todos = loadTodos();
let timerSeconds = 25 * 60;
let timerId = null;
let compactMode = false;

function loadTodos() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveTodos() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(todos));
}

function showToast(title, message, type = "info", duration = 5000) {
  if (!toastContainer) return;

  const toast = document.createElement("div");
  toast.className = `toast ${type}`;

  const header = document.createElement("div");
  header.className = "toast-header";

  const titleEl = document.createElement("div");
  titleEl.className = "toast-title";
  titleEl.textContent = title;

  const closeToastBtn = document.createElement("button");
  closeToastBtn.className = "toast-close";
  closeToastBtn.type = "button";
  closeToastBtn.textContent = "×";

  const messageEl = document.createElement("div");
  messageEl.className = "toast-message";
  messageEl.textContent = message;

  closeToastBtn.addEventListener("click", () => {
    toast.remove();
  });

  header.append(titleEl, closeToastBtn);
  toast.append(header, messageEl);
  toastContainer.appendChild(toast);

  if (duration > 0) {
    setTimeout(() => {
      toast.remove();
    }, duration);
  }
}

function priorityLabel(priority) {
  if (priority === "high") return "高优先级";
  if (priority === "low") return "低优先级";
  return "中优先级";
}

function priorityClass(priority) {
  if (priority === "high") return "priority-high";
  if (priority === "low") return "priority-low";
  return "priority-medium";
}

function formatReminder(remindAt) {
  if (!remindAt) return "";
  const date = new Date(remindAt);
  if (Number.isNaN(date.getTime())) return "";
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  const hh = String(date.getHours()).padStart(2, "0");
  const mi = String(date.getMinutes()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd} ${hh}:${mi}`;
}

function getRemindTimestamp(todo) {
  if (!todo.remindAt) return null;
  const ts = new Date(todo.remindAt).getTime();
  return Number.isNaN(ts) ? null : ts;
}

function isUrgentTodo(todo) {
  if (todo.done) return false;
  const ts = getRemindTimestamp(todo);
  if (!ts) return false;

  const now = Date.now();
  const oneDay = 24 * 60 * 60 * 1000;
  return ts > now && ts - now <= oneDay;
}

function sortTodosForDisplay(items) {
  return [...items].sort((a, b) => {
    const aUrgent = isUrgentTodo(a) ? 1 : 0;
    const bUrgent = isUrgentTodo(b) ? 1 : 0;

    if (aUrgent !== bUrgent) return bUrgent - aUrgent;
    if (a.done !== b.done) return Number(a.done) - Number(b.done);

    const priorityRank = { high: 3, medium: 2, low: 1 };
    const aPriority = priorityRank[a.priority] || 0;
    const bPriority = priorityRank[b.priority] || 0;
    if (aPriority !== bPriority) return bPriority - aPriority;

    return (b.createdAt || 0) - (a.createdAt || 0);
  });
}

function renderTodos() {
  todoList.innerHTML = "";

  const sortedTodos = sortTodosForDisplay(todos);

  if (!sortedTodos.length) {
    const empty = document.createElement("div");
    empty.className = "empty";
    empty.textContent = "现在没有待办，先加一条吧";
    todoList.appendChild(empty);
    return;
  }

  sortedTodos.forEach((todo) => {
    const realIndex = todos.indexOf(todo);

    const item = document.createElement("div");
    item.className = `todo-item ${todo.done ? "done" : ""} ${isUrgentTodo(todo) ? "urgent-todo" : ""}`;

    const checkBtn = document.createElement("button");
    checkBtn.className = "check-btn";
    checkBtn.textContent = todo.done ? "✓" : "○";
    checkBtn.addEventListener("click", () => {
      todos[realIndex].done = !todos[realIndex].done;
      saveTodos();
      renderTodos();
    });

    const main = document.createElement("div");
    main.className = "todo-main";

    const text = document.createElement("div");
    text.className = "todo-text";
    text.textContent = todo.text;

    const meta = document.createElement("div");
    meta.className = "todo-meta";

    if (isUrgentTodo(todo)) {
      const urgentBadge = document.createElement("span");
      urgentBadge.className = "urgent-badge";
      urgentBadge.textContent = "24小时内到期";
      meta.appendChild(urgentBadge);
    }

    const badge = document.createElement("span");
    badge.className = `priority-badge ${priorityClass(todo.priority)}`;
    badge.textContent = priorityLabel(todo.priority);
    meta.appendChild(badge);

    if (todo.remindAt) {
      const remindBadge = document.createElement("span");
      remindBadge.className = "remind-badge";
      remindBadge.textContent = `提醒：${formatReminder(todo.remindAt)}`;
      meta.appendChild(remindBadge);
    }

    main.append(text, meta);

    const deleteBtn = document.createElement("button");
    deleteBtn.className = "delete-btn";
    deleteBtn.textContent = "×";
    deleteBtn.addEventListener("click", () => {
      todos.splice(realIndex, 1);
      saveTodos();
      renderTodos();
    });

    item.append(checkBtn, main, deleteBtn);
    todoList.appendChild(item);
  });
}

function addTodo() {
  const text = todoInput.value.trim();
  if (!text) return;

  todos.unshift({
    text,
    done: false,
    priority: prioritySelect.value,
    remindAt: remindTimeInput.value || "",
    reminded: false,
    warnedOneDay: false,
    createdAt: Date.now(),
  });

  todoInput.value = "";
  prioritySelect.value = "medium";
  remindTimeInput.value = "";
  saveTodos();
  renderTodos();
}

function updateTimerText() {
  const mm = String(Math.floor(timerSeconds / 60)).padStart(2, "0");
  const ss = String(timerSeconds % 60).padStart(2, "0");
  timerText.textContent = `${mm}:${ss}`;
}

function startTimer() {
  if (timerId) return;

  if (timerSeconds <= 0) {
    const minutes = Math.max(1, Number(timerMinuteInput?.value || 25));
    timerSeconds = minutes * 60;
    updateTimerText();
  }

  timerId = setInterval(() => {
    if (timerSeconds > 0) {
      timerSeconds -= 1;
      updateTimerText();
    } else {
      clearInterval(timerId);
      timerId = null;
      showToast("番茄钟结束", "时间到了，休息一下。", "info", 5000);
    }
  }, 1000);
}

function pauseTimer() {
  if (timerId) {
    clearInterval(timerId);
    timerId = null;
  }
}

function resetTimer() {
  pauseTimer();
  const minutes = Math.max(1, Number(timerMinuteInput?.value || 25));
  timerSeconds = minutes * 60;
  updateTimerText();
}

function checkReminders() {
  const now = Date.now();
  const oneDay = 24 * 60 * 60 * 1000;
  let changed = false;

  todos.forEach((todo) => {
    if (todo.done || !todo.remindAt) return;

    const remindTime = getRemindTimestamp(todo);
    if (!remindTime) return;

    if (!todo.warnedOneDay) {
      const diff = remindTime - now;
      if (diff > 0 && diff <= oneDay) {
        todo.warnedOneDay = true;
        changed = true;
        showToast("待办即将到期", `${todo.text} 将在24小时内到期。`, "warn", 6000);
      }
    }

    if (!todo.reminded && now >= remindTime) {
      todo.reminded = true;
      changed = true;
      showToast("待办到期", `${todo.text} 已到提醒时间。`, "danger", 7000);
    }
  });

  if (changed) {
    saveTodos();
    renderTodos();
  }
}

async function enterCompactMode() {
  if (compactMode) return;
  compactMode = true;

  fullPanel.classList.add("hidden");
  compactPanel.classList.add("hidden");
  titlebar.classList.add("compact");

  await appWindow.setSize(new LogicalSize(240, 64));
}

async function exitCompactMode() {
  if (!compactMode) return;
  compactMode = false;

  titlebar.classList.remove("compact");
  fullPanel.classList.remove("hidden");
  compactPanel.classList.add("hidden");

  await appWindow.setSize(new LogicalSize(380, 640));
}

dragBar.addEventListener("mousedown", async (e) => {
  if (e.button !== 0) return;
  await appWindow.startDragging();
});

addBtn.addEventListener("click", addTodo);

todoInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter") addTodo();
});

clearDoneBtn.addEventListener("click", () => {
  todos = todos.filter((t) => !t.done);
  saveTodos();
  renderTodos();
});

clearAllBtn.addEventListener("click", () => {
  todos = [];
  saveTodos();
  renderTodos();
});

startTimerBtn.addEventListener("click", startTimer);
pauseTimerBtn.addEventListener("click", pauseTimer);
resetTimerBtn.addEventListener("click", resetTimer);

minBtn.addEventListener("click", async (e) => {
  e.stopPropagation();

  if (compactMode) {
    await exitCompactMode();
  } else {
    await enterCompactMode();
  }
});

closeBtn.addEventListener("click", async (e) => {
  e.stopPropagation();
  await appWindow.destroy();
});

setInterval(checkReminders, 15000);

timerSeconds = Math.max(1, Number(timerMinuteInput?.value || 25)) * 60;
updateTimerText();
renderTodos();