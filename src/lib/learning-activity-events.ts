"use client";

export const LEARNING_ACTIVITY_EVENT = "wewin:learning-saved";
export const LEARNING_ACTIVITY_STORAGE_KEY = "wewin:learning-saved";

/** Signal only that server-saved progress changed; no user data or XP is trusted here. */
export function notifyLearningActivity() {
  window.dispatchEvent(new Event(LEARNING_ACTIVITY_EVENT));
  try { localStorage.setItem(LEARNING_ACTIVITY_STORAGE_KEY, `${Date.now()}:${Math.random()}`); }
  catch { /* Polling and focus refresh remain available if storage is disabled. */ }
}
