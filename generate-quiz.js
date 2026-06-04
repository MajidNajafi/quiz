#!/usr/bin/env node

import { readdir, readFile, writeFile, mkdir, unlink } from "node:fs/promises";
import { join, basename, extname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const QUESTIONS_DIR = join(__dirname, "questions");
const OUTPUT_DIR = join(__dirname, "docs");

function slugify(name) {
  const tr = { ı: "i", İ: "i", ş: "s", Ş: "s", ğ: "g", Ğ: "g", ü: "u", Ü: "u", ö: "o", Ö: "o", ç: "c", Ç: "c" };
  let s = name.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  for (const [from, to] of Object.entries(tr)) {
    s = s.split(from).join(to);
  }
  return s
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .toLowerCase() || "quiz";
}

function buildHtml(title, quizId, questions) {
  const data = JSON.stringify({ title, quizId, questions });
  return `<!DOCTYPE html>
<html lang="tr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
  <meta name="color-scheme" content="light dark">
  <title>${escapeHtml(title)}</title>
  <style>
    :root {
      --bg: #f4f6fb;
      --surface: #ffffff;
      --surface-2: #eef1f8;
      --text: #1a2233;
      --text-muted: #5c667a;
      --border: #d8deea;
      --primary: #3b6cf4;
      --primary-soft: #e8efff;
      --success: #0f9d6e;
      --success-soft: #e6f7f1;
      --danger: #e04545;
      --danger-soft: #fdecec;
      --warning: #d48806;
      --warning-soft: #fff7e6;
      --shadow: 0 10px 30px rgba(26, 34, 51, 0.08);
      --radius: 16px;
      --radius-sm: 12px;
      --tap: 48px;
      --font: "Segoe UI", system-ui, -apple-system, BlinkMacSystemFont, sans-serif;
    }

    @media (prefers-color-scheme: dark) {
      :root {
        --bg: #0f141f;
        --surface: #171d2b;
        --surface-2: #222a3d;
        --text: #eef2ff;
        --text-muted: #9aa6bf;
        --border: #2f3a52;
        --primary: #6b93ff;
        --primary-soft: #1a2747;
        --success: #34c996;
        --success-soft: #123328;
        --danger: #ff6b6b;
        --danger-soft: #3a1a1a;
        --warning: #f5b942;
        --warning-soft: #3a2e12;
        --shadow: 0 10px 30px rgba(0, 0, 0, 0.35);
      }
    }

    *, *::before, *::after { box-sizing: border-box; }

    html { scroll-behavior: smooth; }

    body {
      margin: 0;
      font-family: var(--font);
      background: var(--bg);
      color: var(--text);
      line-height: 1.5;
      -webkit-font-smoothing: antialiased;
      padding-bottom: 120px;
    }

    .app-header {
      position: sticky;
      top: 0;
      z-index: 20;
      backdrop-filter: blur(12px);
      background: color-mix(in srgb, var(--bg) 88%, transparent);
      border-bottom: 1px solid var(--border);
      padding: 16px 20px 12px;
    }

    .header-inner {
      max-width: 860px;
      margin: 0 auto;
    }

    h1 {
      margin: 0 0 4px;
      font-size: clamp(1.25rem, 4vw, 1.75rem);
      letter-spacing: -0.02em;
    }

    .subtitle {
      margin: 0;
      color: var(--text-muted);
      font-size: 0.95rem;
    }

    .toolbar {
      display: flex;
      flex-wrap: wrap;
      gap: 10px;
      margin-top: 16px;
      align-items: center;
    }

    .filter-group {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      flex: 1;
    }

    .chip {
      min-height: var(--tap);
      padding: 0 16px;
      border-radius: 999px;
      border: 1px solid var(--border);
      background: var(--surface);
      color: var(--text);
      font: inherit;
      font-size: 0.92rem;
      font-weight: 600;
      cursor: pointer;
      transition: transform 0.15s ease, background 0.15s ease, border-color 0.15s ease;
      touch-action: manipulation;
    }

    .chip:active { transform: scale(0.97); }

    .chip[aria-pressed="true"] {
      background: var(--primary-soft);
      border-color: var(--primary);
      color: var(--primary);
    }

    .btn {
      min-height: var(--tap);
      padding: 0 18px;
      border-radius: var(--radius-sm);
      border: none;
      background: var(--primary);
      color: #fff;
      font: inherit;
      font-size: 0.95rem;
      font-weight: 600;
      cursor: pointer;
      touch-action: manipulation;
      transition: transform 0.15s ease, opacity 0.15s ease;
    }

    .btn:active { transform: scale(0.98); }

    .btn-secondary {
      background: var(--surface);
      color: var(--text);
      border: 1px solid var(--border);
    }

    main {
      max-width: 860px;
      margin: 0 auto;
      padding: 20px;
    }

    .panel {
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: var(--radius);
      box-shadow: var(--shadow);
      margin-bottom: 20px;
      overflow: hidden;
    }

    .panel-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      padding: 16px 18px;
      border-bottom: 1px solid var(--border);
      background: var(--surface-2);
    }

    .panel-header h2 {
      margin: 0;
      font-size: 1rem;
    }

    .panel-body { padding: 12px 18px 18px; }

    .session-list {
      display: flex;
      flex-direction: column;
      gap: 10px;
    }

    .session-item {
      display: grid;
      grid-template-columns: 1fr auto;
      gap: 8px 12px;
      align-items: center;
      padding: 14px;
      border-radius: var(--radius-sm);
      border: 1px solid var(--border);
      background: var(--bg);
      cursor: pointer;
      text-align: left;
      font: inherit;
      color: inherit;
      touch-action: manipulation;
      transition: border-color 0.15s ease, background 0.15s ease;
    }

    .session-item:hover,
    .session-item:focus-visible {
      border-color: var(--primary);
      outline: none;
    }

    .session-item.active {
      border-color: var(--primary);
      background: var(--primary-soft);
    }

    .session-meta {
      font-size: 0.85rem;
      color: var(--text-muted);
    }

    .session-stats {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      font-size: 0.82rem;
      font-weight: 600;
    }

    .stat-pill {
      padding: 4px 10px;
      border-radius: 999px;
    }

    .stat-pill.ok { background: var(--success-soft); color: var(--success); }
    .stat-pill.bad { background: var(--danger-soft); color: var(--danger); }
    .stat-pill.empty { background: var(--surface-2); color: var(--text-muted); }

    .empty-state {
      text-align: center;
      color: var(--text-muted);
      padding: 24px 12px;
    }

    .question-card {
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: var(--radius);
      padding: 18px;
      margin-bottom: 16px;
      box-shadow: var(--shadow);
    }

    .question-card.hidden { display: none; }

    .question-top {
      display: flex;
      gap: 12px;
      align-items: flex-start;
      margin-bottom: 14px;
    }

    .q-number {
      flex-shrink: 0;
      width: 36px;
      height: 36px;
      border-radius: 10px;
      display: grid;
      place-items: center;
      font-weight: 700;
      font-size: 0.9rem;
      background: var(--surface-2);
      color: var(--text-muted);
    }

    .question-card.state-correct .q-number {
      background: var(--success-soft);
      color: var(--success);
    }

    .question-card.state-wrong .q-number {
      background: var(--danger-soft);
      color: var(--danger);
    }

    .question-card.state-empty .q-number {
      background: var(--surface-2);
      color: var(--text-muted);
    }

    .question-text {
      margin: 0;
      font-size: 1.02rem;
      font-weight: 600;
    }

    .options {
      display: grid;
      gap: 10px;
    }

    .option {
      min-height: var(--tap);
      width: 100%;
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 12px 14px;
      border-radius: var(--radius-sm);
      border: 2px solid var(--border);
      background: var(--bg);
      color: var(--text);
      font: inherit;
      text-align: left;
      cursor: pointer;
      touch-action: manipulation;
      transition: border-color 0.15s ease, background 0.15s ease, transform 0.12s ease;
    }

    .option:active:not(:disabled) { transform: scale(0.99); }

    .option:disabled { cursor: default; }

    .option-key {
      flex-shrink: 0;
      width: 32px;
      height: 32px;
      border-radius: 8px;
      display: grid;
      place-items: center;
      font-weight: 700;
      background: var(--surface);
      border: 1px solid var(--border);
    }

    .option.selected {
      border-color: var(--primary);
      background: var(--primary-soft);
    }

    .option.correct {
      border-color: var(--success);
      background: var(--success-soft);
    }

    .option.correct .option-key {
      background: var(--success);
      color: #fff;
      border-color: var(--success);
    }

    .option.wrong {
      border-color: var(--danger);
      background: var(--danger-soft);
    }

    .option.wrong .option-key {
      background: var(--danger);
      color: #fff;
      border-color: var(--danger);
    }

    .option.reveal:not(.selected):not(.correct) {
      opacity: 0.72;
    }

    .feedback {
      margin-top: 12px;
      padding: 10px 12px;
      border-radius: var(--radius-sm);
      font-size: 0.92rem;
      font-weight: 600;
    }

    .feedback.ok { background: var(--success-soft); color: var(--success); }
    .feedback.bad { background: var(--danger-soft); color: var(--danger); }

    .notes {
      margin: 0 0 14px;
      padding: 12px 14px;
      border-radius: var(--radius-sm);
      background: var(--warning-soft);
      border-left: 4px solid var(--warning);
      font-size: 0.92rem;
      white-space: pre-wrap;
    }

    .notes-label {
      display: block;
      font-size: 0.78rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.04em;
      color: var(--warning);
      margin-bottom: 6px;
    }

    .float-stats {
      position: fixed;
      right: max(16px, env(safe-area-inset-right));
      bottom: max(16px, env(safe-area-inset-bottom));
      z-index: 30;
      width: min(320px, calc(100vw - 32px));
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: var(--radius);
      box-shadow: var(--shadow);
      padding: 16px;
    }

    .float-stats h3 {
      margin: 0 0 10px;
      font-size: 0.9rem;
      color: var(--text-muted);
      font-weight: 600;
    }

    .progress-bar {
      height: 8px;
      border-radius: 999px;
      background: var(--surface-2);
      overflow: hidden;
      margin-bottom: 12px;
    }

    .progress-fill {
      height: 100%;
      width: 0%;
      border-radius: inherit;
      background: linear-gradient(90deg, var(--primary), var(--success));
      transition: width 0.25s ease;
    }

    .stats-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 8px;
    }

    .stat-box {
      text-align: center;
      padding: 8px 4px;
      border-radius: 10px;
      background: var(--bg);
    }

    .stat-box .value {
      display: block;
      font-size: 1.25rem;
      font-weight: 800;
      line-height: 1.1;
    }

    .stat-box .label {
      font-size: 0.72rem;
      color: var(--text-muted);
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.03em;
    }

    .stat-box.ok .value { color: var(--success); }
    .stat-box.bad .value { color: var(--danger); }
    .stat-box.empty .value { color: var(--text-muted); }

    .mode-banner {
      margin-top: 10px;
      padding: 8px 12px;
      border-radius: 10px;
      font-size: 0.85rem;
      font-weight: 600;
      background: var(--primary-soft);
      color: var(--primary);
    }

    .sr-only {
      position: absolute;
      width: 1px;
      height: 1px;
      padding: 0;
      margin: -1px;
      overflow: hidden;
      clip: rect(0, 0, 0, 0);
      white-space: nowrap;
      border: 0;
    }

    @media (prefers-reduced-motion: reduce) {
      *, *::before, *::after {
        animation: none !important;
        transition: none !important;
        scroll-behavior: auto !important;
      }
    }

    @media (max-width: 600px) {
      body { padding-bottom: 92px; }

      .app-header {
        padding: 8px 14px 10px;
      }

      .header-inner {
        display: grid;
        grid-template-columns: 1fr auto;
        align-items: baseline;
        column-gap: 8px;
        row-gap: 8px;
      }

      .app-header h1 {
        margin: 0;
        font-size: 1rem;
        line-height: 1.25;
        min-width: 0;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      .app-header .subtitle {
        font-size: 0.72rem;
        white-space: nowrap;
      }

      .toolbar {
        grid-column: 1 / -1;
        margin-top: 0;
        gap: 6px;
      }

      .filter-group {
        gap: 4px;
        min-width: 0;
        flex: 1;
        flex-wrap: nowrap;
        overflow-x: auto;
        -webkit-overflow-scrolling: touch;
        scrollbar-width: none;
      }

      .filter-group::-webkit-scrollbar { display: none; }

      .chip {
        min-height: 36px;
        padding: 0 10px;
        font-size: 0.78rem;
        flex-shrink: 0;
      }

      .toolbar .btn {
        min-height: 36px;
        padding: 0 10px;
        font-size: 0.78rem;
        flex-shrink: 0;
      }

      main { padding-left: 14px; padding-right: 14px; }
      .question-card { padding: 14px; }

      .float-stats {
        left: max(10px, env(safe-area-inset-left));
        right: max(10px, env(safe-area-inset-right));
        bottom: max(10px, env(safe-area-inset-bottom));
        width: auto;
        padding: 8px 10px;
        border-radius: 12px;
      }

      .float-stats h3 { display: none; }

      .progress-bar {
        height: 4px;
        margin-bottom: 6px;
      }

      .stats-grid {
        gap: 4px;
      }

      .stat-box {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 4px;
        padding: 2px 4px;
        border-radius: 8px;
      }

      .stat-box .value {
        font-size: 0.95rem;
      }

      .stat-box .label {
        font-size: 0.65rem;
        text-transform: none;
        letter-spacing: 0;
      }

      .mode-banner {
        margin-top: 6px;
        padding: 4px 8px;
        font-size: 0.7rem;
        line-height: 1.25;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
    }
  </style>
</head>
<body>
  <header class="app-header">
    <div class="header-inner">
      <h1 id="quiz-title"></h1>
      <p class="subtitle" id="quiz-subtitle"></p>
      <div class="toolbar">
        <div class="filter-group" role="group" aria-label="Soru filtresi">
          <button class="chip" data-filter="all" aria-pressed="true">Tümü</button>
          <button class="chip" data-filter="correct" aria-pressed="false">Doğru</button>
          <button class="chip" data-filter="wrong" aria-pressed="false">Yanlış</button>
          <button class="chip" data-filter="empty" aria-pressed="false">Boş</button>
        </div>
        <button class="btn" id="new-session-btn" type="button">Yeni Oturum</button>
      </div>
    </div>
  </header>

  <main>
    <section class="panel" aria-labelledby="sessions-heading">
      <div class="panel-header">
        <h2 id="sessions-heading">Oturum Geçmişi</h2>
        <button class="btn btn-secondary" id="toggle-sessions" type="button" aria-expanded="true">Gizle</button>
      </div>
      <div class="panel-body" id="sessions-panel">
        <div class="session-list" id="session-list"></div>
      </div>
    </section>

    <div id="questions-root"></div>
  </main>

  <aside class="float-stats" aria-live="polite" aria-atomic="true">
    <h3>İlerleme</h3>
    <div class="progress-bar" aria-hidden="true">
      <div class="progress-fill" id="progress-fill"></div>
    </div>
    <div class="stats-grid">
      <div class="stat-box ok">
        <span class="value" id="stat-correct">0</span>
        <span class="label">Doğru</span>
      </div>
      <div class="stat-box bad">
        <span class="value" id="stat-wrong">0</span>
        <span class="label">Yanlış</span>
      </div>
      <div class="stat-box empty">
        <span class="value" id="stat-empty">0</span>
        <span class="label">Boş</span>
      </div>
    </div>
    <div class="mode-banner" id="mode-banner">Aktif oturum yok — cevap vermeye başlayın</div>
  </aside>

  <script>
    const QUIZ = ${data};

    const STORAGE_KEY = "quiz-" + QUIZ.quizId + "-data";

    /** @type {"active" | "review"} */
    let mode = "active";
    let activeSessionId = null;
    let reviewSessionId = null;
    let currentFilter = "all";

    const els = {
      title: document.getElementById("quiz-title"),
      subtitle: document.getElementById("quiz-subtitle"),
      questionsRoot: document.getElementById("questions-root"),
      sessionList: document.getElementById("session-list"),
      sessionsPanel: document.getElementById("sessions-panel"),
      toggleSessions: document.getElementById("toggle-sessions"),
      newSessionBtn: document.getElementById("new-session-btn"),
      progressFill: document.getElementById("progress-fill"),
      statCorrect: document.getElementById("stat-correct"),
      statWrong: document.getElementById("stat-wrong"),
      statEmpty: document.getElementById("stat-empty"),
      modeBanner: document.getElementById("mode-banner"),
      filterChips: document.querySelectorAll("[data-filter]"),
    };

    function loadStore() {
      try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) return { sessions: [], activeSessionId: null };
        const parsed = JSON.parse(raw);
        return {
          sessions: Array.isArray(parsed.sessions) ? parsed.sessions : [],
          activeSessionId: parsed.activeSessionId || null,
        };
      } catch {
        return { sessions: [], activeSessionId: null };
      }
    }

    function saveStore(store) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
    }

    function createSessionId() {
      return "s-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 8);
    }

    function formatDate(iso) {
      try {
        return new Date(iso).toLocaleString("tr-TR", {
          dateStyle: "medium",
          timeStyle: "short",
        });
      } catch {
        return iso;
      }
    }

    function getQuestionIds() {
      return Object.keys(QUIZ.questions).sort((a, b) => Number(a) - Number(b));
    }

    function getCurrentAnswers() {
      const store = loadStore();
      const id = mode === "review" ? reviewSessionId : activeSessionId;
      if (!id) return {};
      const session = store.sessions.find((s) => s.id === id);
      return session?.answers || {};
    }

    function computeStats(answers) {
      const ids = getQuestionIds();
      let correct = 0;
      let wrong = 0;
      let empty = 0;

      for (const id of ids) {
        const selected = answers[id];
        if (!selected) {
          empty++;
          continue;
        }
        const q = QUIZ.questions[id];
        if (selected === q.answer) correct++;
        else wrong++;
      }

      return { correct, wrong, empty, total: ids.length };
    }

    function questionState(id, answers) {
      const selected = answers[id];
      if (!selected) return "empty";
      return selected === QUIZ.questions[id].answer ? "correct" : "wrong";
    }

    function ensureActiveSession() {
      const store = loadStore();
      if (activeSessionId) {
        const exists = store.sessions.some((s) => s.id === activeSessionId);
        if (exists) return store;
      }

      const session = {
        id: createSessionId(),
        startedAt: new Date().toISOString(),
        answers: {},
      };
      store.sessions.unshift(session);
      store.activeSessionId = session.id;
      activeSessionId = session.id;
      mode = "active";
      reviewSessionId = null;
      saveStore(store);
      return store;
    }

    function startNewSession() {
      const store = loadStore();
      const session = {
        id: createSessionId(),
        startedAt: new Date().toISOString(),
        answers: {},
      };
      store.sessions.unshift(session);
      store.activeSessionId = session.id;
      activeSessionId = session.id;
      reviewSessionId = null;
      mode = "active";
      saveStore(store);
      renderAll();
    }

    function loadSessionForReview(sessionId) {
      const store = loadStore();
      const session = store.sessions.find((s) => s.id === sessionId);
      if (!session) return;

      if (store.activeSessionId === sessionId) {
        mode = "active";
        activeSessionId = sessionId;
        reviewSessionId = null;
      } else {
        mode = "review";
        reviewSessionId = sessionId;
      }

      renderAll();
    }

    function recordAnswer(questionId, optionKey) {
      if (mode === "review") return;

      const store = ensureActiveSession();
      const session = store.sessions.find((s) => s.id === activeSessionId);
      if (!session) return;
      if (session.answers[questionId]) return;

      session.answers[questionId] = optionKey;
      session.updatedAt = new Date().toISOString();
      saveStore(store);
      renderAll();
    }

    function renderQuestions() {
      const answers = getCurrentAnswers();
      const ids = getQuestionIds();
      const fragment = document.createDocumentFragment();
      let visibleCount = 0;

      for (const id of ids) {
        const q = QUIZ.questions[id];
        const state = questionState(id, answers);
        const selected = answers[id];
        const answered = Boolean(selected);

        if (currentFilter !== "all" && state !== currentFilter) continue;

        const card = document.createElement("article");
        card.className = "question-card state-" + (state === "wrong" ? "wrong" : state);
        card.dataset.questionId = id;
        card.dataset.state = state;

        const top = document.createElement("div");
        top.className = "question-top";

        const num = document.createElement("div");
        num.className = "q-number";
        num.textContent = id;

        const text = document.createElement("p");
        text.className = "question-text";
        text.textContent = q.question;

        top.appendChild(num);
        top.appendChild(text);
        card.appendChild(top);

        if (q.notes) {
          const notes = document.createElement("div");
          notes.className = "notes";
          const label = document.createElement("span");
          label.className = "notes-label";
          label.textContent = "Notlar";
          notes.appendChild(label);
          notes.appendChild(document.createTextNode(q.notes));
          card.appendChild(notes);
        }

        const optionsEl = document.createElement("div");
        optionsEl.className = "options";
        optionsEl.setAttribute("role", "group");
        optionsEl.setAttribute("aria-label", "Soru " + id + " seçenekleri");

        const optionKeys = Object.keys(q.options).sort();
        for (const key of optionKeys) {
          const btn = document.createElement("button");
          btn.type = "button";
          btn.className = "option";
          btn.dataset.option = key;
          btn.disabled = mode === "review" || answered;

          const isSelected = selected === key;
          const isCorrect = key === q.answer;

          if (answered) {
            btn.classList.add("reveal");
            if (isCorrect) btn.classList.add("correct");
            if (isSelected && !isCorrect) btn.classList.add("wrong");
            if (isSelected) btn.classList.add("selected");
          } else if (isSelected) {
            btn.classList.add("selected");
          }

          const keyEl = document.createElement("span");
          keyEl.className = "option-key";
          keyEl.textContent = key;

          const label = document.createElement("span");
          label.textContent = q.options[key];

          btn.appendChild(keyEl);
          btn.appendChild(label);

          if (!answered && mode === "active") {
            btn.addEventListener("click", () => recordAnswer(id, key));
          }

          optionsEl.appendChild(btn);
        }

        card.appendChild(optionsEl);

        if (answered) {
          const fb = document.createElement("div");
          fb.className = "feedback " + (state === "correct" ? "ok" : "bad");
          fb.textContent =
            state === "correct"
              ? "Doğru cevap!"
              : "Yanlış. Doğru cevap: " + q.answer;
          card.appendChild(fb);
        }

        fragment.appendChild(card);
        visibleCount++;
      }

      els.questionsRoot.replaceChildren(fragment);

      if (!visibleCount) {
        const empty = document.createElement("p");
        empty.className = "empty-state";
        empty.textContent = "Bu filtreyle eşleşen soru yok.";
        els.questionsRoot.appendChild(empty);
      }
    }

    function renderSessionHistory() {
      const store = loadStore();
      els.sessionList.replaceChildren();

      if (!store.sessions.length) {
        const empty = document.createElement("p");
        empty.className = "empty-state";
        empty.textContent = "Henüz oturum yok. Bir soruya cevap verdiğinizde ilk oturum oluşturulur.";
        els.sessionList.appendChild(empty);
        return;
      }

      for (const session of store.sessions) {
        const stats = computeStats(session.answers || {});
        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = "session-item";

        const isActive = mode === "active" && session.id === activeSessionId;
        const isReview = mode === "review" && session.id === reviewSessionId;
        if (isActive || isReview) btn.classList.add("active");

        const title = document.createElement("div");
        title.innerHTML =
          "<strong>Oturum</strong> · " +
          formatDate(session.startedAt) +
          (store.activeSessionId === session.id ? ' <span class="session-meta">(aktif)</span>' : "");

        const meta = document.createElement("div");
        meta.className = "session-meta";
        meta.textContent =
          Object.keys(session.answers || {}).length +
          " / " +
          stats.total +
          " soru cevaplandı";

        const statsEl = document.createElement("div");
        statsEl.className = "session-stats";
        statsEl.innerHTML =
          '<span class="stat-pill ok">' + stats.correct + " doğru</span>" +
          '<span class="stat-pill bad">' + stats.wrong + " yanlış</span>" +
          '<span class="stat-pill empty">' + stats.empty + " boş</span>";

        btn.appendChild(title);
        btn.appendChild(statsEl);
        btn.appendChild(meta);

        btn.addEventListener("click", () => loadSessionForReview(session.id));
        els.sessionList.appendChild(btn);
      }
    }

    function renderStats() {
      const answers = getCurrentAnswers();
      const stats = computeStats(answers);

      els.statCorrect.textContent = String(stats.correct);
      els.statWrong.textContent = String(stats.wrong);
      els.statEmpty.textContent = String(stats.empty);

      const answered = stats.correct + stats.wrong;
      const pct = stats.total ? Math.round((answered / stats.total) * 100) : 0;
      els.progressFill.style.width = pct + "%";

      if (mode === "review" && reviewSessionId) {
        els.modeBanner.textContent = "Geçmiş oturum görüntüleniyor (salt okunur)";
      } else if (activeSessionId) {
        els.modeBanner.textContent = "Aktif oturum — cevaplar kaydediliyor";
      } else {
        els.modeBanner.textContent = "Aktif oturum yok — cevap vermeye başlayın";
      }
    }

    function renderAll() {
      renderQuestions();
      renderSessionHistory();
      renderStats();
    }

    function init() {
      els.title.textContent = QUIZ.title;
      els.subtitle.textContent = getQuestionIds().length + " soru";

      const store = loadStore();
      activeSessionId = store.activeSessionId;

      els.filterChips.forEach((chip) => {
        chip.addEventListener("click", () => {
          currentFilter = chip.dataset.filter;
          els.filterChips.forEach((c) => {
            c.setAttribute("aria-pressed", c === chip ? "true" : "false");
          });
          renderQuestions();
        });
      });

      els.newSessionBtn.addEventListener("click", startNewSession);

      els.toggleSessions.addEventListener("click", () => {
        const hidden = els.sessionsPanel.hidden;
        els.sessionsPanel.hidden = !hidden;
        els.toggleSessions.setAttribute("aria-expanded", String(hidden));
        els.toggleSessions.textContent = hidden ? "Gizle" : "Göster";
      });

      renderAll();
    }

    init();
  </script>
</body>
</html>`;
}

function escapeHtml(str) {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function buildIndex(quizzes) {
  const sorted = [...quizzes].sort((a, b) =>
    a.title.localeCompare(b.title, "tr")
  );
  const items = sorted
    .map(
      (q) => `      <li>
        <a class="quiz-link" href="${escapeHtml(q.filename)}">
          <span class="quiz-title">${escapeHtml(q.title)}</span>
          <span class="quiz-meta">${q.questionCount} soru</span>
        </a>
      </li>`
    )
    .join("\n");

  return `<!DOCTYPE html>
<html lang="tr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
  <meta name="color-scheme" content="light dark">
  <title>Quiz</title>
  <style>
    :root {
      --bg: #f4f6fb;
      --surface: #ffffff;
      --surface-2: #eef1f8;
      --text: #1a2233;
      --text-muted: #5c667a;
      --border: #d8deea;
      --primary: #3b6cf4;
      --primary-soft: #e8efff;
      --shadow: 0 10px 30px rgba(26, 34, 51, 0.08);
      --radius: 16px;
      --font: "Segoe UI", system-ui, -apple-system, BlinkMacSystemFont, sans-serif;
    }

    @media (prefers-color-scheme: dark) {
      :root {
        --bg: #0f141f;
        --surface: #171d2b;
        --surface-2: #222a3d;
        --text: #eef2ff;
        --text-muted: #9aa6bf;
        --border: #2f3a52;
        --primary: #6b93ff;
        --primary-soft: #1a2747;
        --shadow: 0 10px 30px rgba(0, 0, 0, 0.35);
      }
    }

    *, *::before, *::after { box-sizing: border-box; }

    body {
      margin: 0;
      min-height: 100dvh;
      font-family: var(--font);
      background: var(--bg);
      color: var(--text);
      line-height: 1.5;
      -webkit-font-smoothing: antialiased;
    }

    main {
      max-width: 640px;
      margin: 0 auto;
      padding: 48px 20px 64px;
    }

    h1 {
      margin: 0 0 8px;
      font-size: clamp(1.75rem, 5vw, 2.25rem);
      letter-spacing: -0.02em;
    }

    .subtitle {
      margin: 0 0 32px;
      color: var(--text-muted);
    }

    .quiz-list {
      list-style: none;
      margin: 0;
      padding: 0;
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    .quiz-link {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 16px;
      padding: 18px 20px;
      border-radius: var(--radius);
      border: 1px solid var(--border);
      background: var(--surface);
      box-shadow: var(--shadow);
      color: inherit;
      text-decoration: none;
      transition: border-color 0.15s ease, background 0.15s ease, transform 0.12s ease;
    }

    .quiz-link:hover,
    .quiz-link:focus-visible {
      border-color: var(--primary);
      background: var(--primary-soft);
      outline: none;
    }

    .quiz-link:active { transform: scale(0.99); }

    .quiz-title {
      font-weight: 700;
      font-size: 1.05rem;
    }

    .quiz-meta {
      flex-shrink: 0;
      font-size: 0.85rem;
      font-weight: 600;
      color: var(--primary);
      background: var(--primary-soft);
      padding: 6px 12px;
      border-radius: 999px;
    }
  </style>
</head>
<body>
  <main>
    <h1>Quiz</h1>
    <p class="subtitle">${sorted.length} quiz mevcut</p>
    <ul class="quiz-list">
${items}
    </ul>
  </main>
</body>
</html>`;
}

async function main() {
  await mkdir(OUTPUT_DIR, { recursive: true });

  for (const entry of await readdir(OUTPUT_DIR)) {
    if (entry.endsWith(".html")) {
      await unlink(join(OUTPUT_DIR, entry));
    }
  }

  const files = (await readdir(QUESTIONS_DIR)).filter(
    (f) => extname(f).toLowerCase() === ".json"
  );

  if (!files.length) {
    console.error("No JSON files found in questions/");
    process.exit(1);
  }

  const quizzes = [];

  for (const file of files) {
    const filePath = join(QUESTIONS_DIR, file);
    const raw = await readFile(filePath, "utf8");
    const questions = JSON.parse(raw);
    const title = basename(file, extname(file));
    const quizId = slugify(title);
    const filename = quizId + ".html";
    const html = buildHtml(title, quizId, questions);
    const outPath = join(OUTPUT_DIR, filename);
    await writeFile(outPath, html, "utf8");
    console.log("Generated:", outPath);
    quizzes.push({
      title,
      filename,
      questionCount: Object.keys(questions).length,
    });
  }

  await writeFile(join(OUTPUT_DIR, "index.html"), buildIndex(quizzes), "utf8");
  await writeFile(join(OUTPUT_DIR, ".nojekyll"), "", "utf8");
  console.log("Generated:", join(OUTPUT_DIR, "index.html"));

  console.log(`\nDone. ${quizzes.length} quiz app(s) written to docs/`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
