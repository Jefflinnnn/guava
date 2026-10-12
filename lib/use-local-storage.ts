"use client";

import { useCallback, useSyncExternalStore } from "react";

// A tiny localStorage-backed store for per-browser UI preferences.
// The server snapshot is always `fallback`, so hydration never mismatches;
// the stored value takes over right after hydration.

const listeners = new Set<() => void>();
const cache = new Map<string, { raw: string | null; value: unknown }>();
const memory = new Map<string, string>(); // used when storage is unavailable

function readRaw(key: string): string | null {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return memory.get(key) ?? null;
  }
}

function read<T>(
  key: string,
  fallback: T,
  validate?: (v: unknown) => v is T,
): T {
  const raw = readRaw(key);
  const hit = cache.get(key);
  if (hit && hit.raw === raw) return hit.value as T;
  let value = fallback;
  if (raw != null) {
    try {
      const parsed: unknown = JSON.parse(raw);
      if (!validate || validate(parsed)) value = parsed as T;
    } catch {}
  }
  cache.set(key, { raw, value });
  return value;
}

function write(key: string, value: unknown) {
  const raw = JSON.stringify(value);
  try {
    window.localStorage.setItem(key, raw);
  } catch {
    memory.set(key, raw);
  }
  cache.set(key, { raw, value });
  listeners.forEach((l) => l());
}

function subscribe(cb: () => void) {
  listeners.add(cb);
  window.addEventListener("storage", cb);
  return () => {
    listeners.delete(cb);
    window.removeEventListener("storage", cb);
  };
}

/**
 * `useState`, persisted to localStorage under `key`. `fallback` must be a
 * stable reference (a module constant), and `validate` guards stale shapes.
 */
export function useLocalStorage<T>(
  key: string,
  fallback: T,
  validate?: (v: unknown) => v is T,
): [T, (next: T | ((prev: T) => T)) => void] {
  const value = useSyncExternalStore(
    subscribe,
    () => read(key, fallback, validate),
    () => fallback,
  );
  const set = useCallback(
    (next: T | ((prev: T) => T)) => {
      const prev = read(key, fallback, validate);
      write(
        key,
        typeof next === "function" ? (next as (p: T) => T)(prev) : next,
      );
    },
    [key, fallback, validate],
  );
  return [value, set];
}
