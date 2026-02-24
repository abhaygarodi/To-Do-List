"use client";

import { useState, useEffect, useRef, useCallback } from "react";

/* ── Types ───────────────────────────────────────────────────────────────── */
interface Task {
  id: string;
  text: string;
  completed: boolean;
  createdAt: string;
}

type SyncStatus = "idle" | "syncing" | "success" | "error";

const STORAGE_KEY = "my-daily-tasks";
const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

/* ── Helpers ─────────────────────────────────────────────────────────────── */
function loadTasks(): Task[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveTasks(tasks: Task[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
}

/* ═══════════════════════════════════════════════════════════════════════════
   Main Page Component
   ═══════════════════════════════════════════════════════════════════════════ */
export default function Home() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [input, setInput] = useState("");
  const [syncStatus, setSyncStatus] = useState<SyncStatus>("idle");
  const [mounted, setMounted] = useState(false);
  const [deletingIds, setDeletingIds] = useState<Set<string>>(new Set());
  const inputRef = useRef<HTMLInputElement>(null);

  /* ── Load from localStorage on mount ──────────────────────────────────── */
  useEffect(() => {
    setTasks(loadTasks());
    setMounted(true);
  }, []);

  /* ── Persist to localStorage whenever tasks change ────────────────────── */
  useEffect(() => {
    if (mounted) saveTasks(tasks);
  }, [tasks, mounted]);

  /* ── Add Task ─────────────────────────────────────────────────────────── */
  const addTask = useCallback(() => {
    const trimmed = input.trim();
    if (!trimmed) return;

    const newTask: Task = {
      id: crypto.randomUUID(),
      text: trimmed,
      completed: false,
      createdAt: new Date().toISOString(),
    };

    setTasks((prev) => [...prev, newTask]);
    setInput("");
    inputRef.current?.focus();
  }, [input]);

  /* ── Toggle Completion ────────────────────────────────────────────────── */
  const toggleTask = useCallback((id: string) => {
    setTasks((prev) =>
      prev.map((t) => (t.id === id ? { ...t, completed: !t.completed } : t))
    );
  }, []);

  /* ── Delete Task ──────────────────────────────────────────────────────── */
  const deleteTask = useCallback((id: string) => {
    setDeletingIds((prev) => new Set(prev).add(id));
    setTimeout(() => {
      setTasks((prev) => prev.filter((t) => t.id !== id));
      setDeletingIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }, 300);
  }, []);

  /* ── Sync to Server ───────────────────────────────────────────────────── */
  const syncToServer = useCallback(async () => {
    setSyncStatus("syncing");
    try {
      const res = await fetch(`${API_URL}/api/tasks/sync`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tasks }),
      });

      if (!res.ok) throw new Error("Sync failed");
      setSyncStatus("success");
      setTimeout(() => setSyncStatus("idle"), 2500);
    } catch {
      setSyncStatus("error");
      setTimeout(() => setSyncStatus("idle"), 3000);
    }
  }, [tasks]);

  /* ── Keyboard shortcut ────────────────────────────────────────────────── */
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") addTask();
  };

  /* ── Stats ────────────────────────────────────────────────────────────── */
  const totalTasks = tasks.length;
  const completedTasks = tasks.filter((t) => t.completed).length;
  const progress = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;

  /* ── Render ───────────────────────────────────────────────────────────── */
  return (
    <main className="min-h-screen flex items-start justify-center px-4 py-12 sm:py-20"
      style={{ background: "radial-gradient(ellipse 80% 60% at 50% 0%, rgba(124,92,252,0.12), transparent)" }}>

      <div className="w-full max-w-xl animate-fade-in">

        {/* ── Header ──────────────────────────────────────────────────── */}
        <header className="text-center mb-10">
          <div className="inline-flex items-center gap-2.5 mb-3">
            <span className="text-3xl">✨</span>
            <h1 className="text-4xl sm:text-5xl font-bold tracking-tight
                           bg-gradient-to-r from-[var(--color-accent)] via-[#c084fc] to-[var(--color-accent-hover)]
                           bg-clip-text text-transparent">
              My Daily Tasks
            </h1>
          </div>
          <p className="text-[var(--color-text-secondary)] text-sm font-light">
            Stay focused · Stay productive · Stay organized
          </p>
        </header>

        {/* ── Card Container ──────────────────────────────────────────── */}
        <div className="rounded-2xl border border-[var(--color-border)]
                        bg-[var(--color-bg-card)] backdrop-blur-xl
                        shadow-[0_8px_40px_rgba(0,0,0,0.35)]
                        overflow-hidden">

          {/* ── Progress Bar ───────────────────────────────────────── */}
          {totalTasks > 0 && (
            <div className="px-6 pt-5 pb-2 animate-slide-up">
              <div className="flex justify-between text-xs text-[var(--color-text-secondary)] mb-2">
                <span>{completedTasks} of {totalTasks} done</span>
                <span>{Math.round(progress)}%</span>
              </div>
              <div className="h-1.5 rounded-full bg-[var(--color-bg-input)] overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-500 ease-out"
                  style={{
                    width: `${progress}%`,
                    background: progress === 100
                      ? "linear-gradient(90deg, #34d399, #4ade80)"
                      : "linear-gradient(90deg, var(--color-accent), #c084fc)",
                  }}
                />
              </div>
            </div>
          )}

          {/* ── Input Row ──────────────────────────────────────────── */}
          <div className="p-5">
            <div className="flex gap-3">
              <input
                id="task-input"
                ref={inputRef}
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="What needs to be done?"
                className="flex-1 bg-[var(--color-bg-input)] border border-[var(--color-border)]
                           rounded-xl px-4 py-3 text-sm text-[var(--color-text-primary)]
                           placeholder:text-[var(--color-text-muted)]
                           focus:outline-none focus:border-[var(--color-border-focus)]
                           focus:ring-2 focus:ring-[var(--color-accent-glow)]
                           transition-all duration-200"
              />
              <button
                id="add-task-btn"
                onClick={addTask}
                disabled={!input.trim()}
                className="w-12 h-12 rounded-xl flex items-center justify-center
                           bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)]
                           disabled:opacity-30 disabled:cursor-not-allowed
                           text-white text-xl font-bold
                           shadow-[0_4px_20px_var(--color-accent-glow)]
                           hover:shadow-[0_6px_30px_var(--color-accent-glow)]
                           active:scale-95 transition-all duration-200 cursor-pointer"
              >
                +
              </button>
            </div>
          </div>

          {/* ── Divider ────────────────────────────────────────────── */}
          <div className="mx-5 h-px bg-[var(--color-divider)]" />

          {/* ── Task List ──────────────────────────────────────────── */}
          <ul className="p-3 max-h-[420px] overflow-y-auto" id="task-list">
            {!mounted ? (
              <li className="text-center py-12 text-[var(--color-text-muted)] text-sm">
                Loading…
              </li>
            ) : tasks.length === 0 ? (
              <li className="text-center py-12 animate-fade-in">
                <span className="text-4xl block mb-3">📝</span>
                <p className="text-[var(--color-text-muted)] text-sm">No tasks yet. Add one above!</p>
              </li>
            ) : (
              tasks.map((task, index) => (
                <li
                  key={task.id}
                  className={`group flex items-center gap-3 px-4 py-3.5 rounded-xl
                              hover:bg-[var(--color-bg-hover)] transition-all duration-200
                              ${deletingIds.has(task.id) ? "opacity-0 translate-x-8 scale-95" : "animate-slide-up"}`}
                  style={{ animationDelay: `${index * 0.04}s` }}
                >
                  {/* Checkbox */}
                  <button
                    id={`toggle-${task.id}`}
                    onClick={() => toggleTask(task.id)}
                    className={`w-5 h-5 rounded-md border-2 flex items-center justify-center
                                transition-all duration-200 flex-shrink-0 cursor-pointer
                                ${task.completed
                        ? "bg-[var(--color-success)] border-[var(--color-success)] shadow-[0_0_10px_var(--color-success-glow)]"
                        : "border-[var(--color-text-muted)] hover:border-[var(--color-accent)]"
                      }`}
                  >
                    {task.completed && (
                      <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </button>

                  {/* Task text */}
                  <span
                    className={`flex-1 text-sm transition-all duration-300
                                ${task.completed
                        ? "line-through text-[var(--color-text-muted)]"
                        : "text-[var(--color-text-primary)]"
                      }`}
                  >
                    {task.text}
                  </span>

                  {/* Delete button */}
                  <button
                    id={`delete-${task.id}`}
                    onClick={() => deleteTask(task.id)}
                    className="opacity-0 group-hover:opacity-100 w-7 h-7 rounded-lg
                               flex items-center justify-center
                               text-[var(--color-text-muted)] hover:text-[var(--color-danger)]
                               hover:bg-red-500/10 transition-all duration-200 cursor-pointer"
                    aria-label={`Delete ${task.text}`}
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </li>
              ))
            )}
          </ul>

          {/* ── Footer / Sync ──────────────────────────────────────── */}
          <div className="mx-5 h-px bg-[var(--color-divider)]" />

          <div className="p-5 flex items-center justify-between">
            <span className="text-xs text-[var(--color-text-muted)]">
              {totalTasks > 0
                ? `${totalTasks} task${totalTasks > 1 ? "s" : ""} · saved locally`
                : "Your tasks persist in your browser"}
            </span>

            <button
              id="sync-btn"
              onClick={syncToServer}
              disabled={syncStatus === "syncing"}
              className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium
                          transition-all duration-300 cursor-pointer
                          ${syncStatus === "success"
                  ? "bg-[var(--color-success)]/15 text-[var(--color-success)] border border-[var(--color-success)]/30"
                  : syncStatus === "error"
                    ? "bg-red-500/15 text-[var(--color-danger)] border border-red-500/30"
                    : "bg-[var(--color-accent)]/15 text-[var(--color-accent)] border border-[var(--color-accent)]/20 hover:bg-[var(--color-accent)]/25 hover:border-[var(--color-accent)]/40"
                }
                          disabled:cursor-wait`}
            >
              {syncStatus === "syncing" ? (
                <>
                  <Spinner /> Syncing…
                </>
              ) : syncStatus === "success" ? (
                <>
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                  Synced!
                </>
              ) : syncStatus === "error" ? (
                <>
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                  Failed — retry?
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round"
                      d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  Sync to Server
                </>
              )}
            </button>
          </div>
        </div>

        {/* ── Bottom note ─────────────────────────────────────────── */}
        <p className="text-center text-xs text-[var(--color-text-muted)] mt-6 animate-fade-in"
          style={{ animationDelay: "0.5s" }}>
          Press <kbd className="px-1.5 py-0.5 rounded bg-[var(--color-bg-input)] border border-[var(--color-border)] text-[var(--color-text-secondary)] text-[10px]">Enter</kbd> to
          add · Click to toggle · Hover to delete
        </p>
      </div>
    </main>
  );
}

/* ── Spinner Component ─────────────────────────────────────────────────── */
function Spinner() {
  return (
    <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  );
}
