import { USER_STORAGE_KEY } from "@/data/mockData";

/**
 * Auth headers: предпочитаем Bearer (реальный логин), и только если токена нет —
 * fallback `X-Dev-User-Email` для RELAX_AUTH dev-режима.
 *
 * Слать оба заголовка одновременно нельзя: бекенд приоритетит Bearer, и любой dev-switcher
 * тогда «не работает» (запрос идёт под автором токена). Поэтому здесь они взаимоисключающие.
 */
export function apiAuthHeaders(): HeadersInit {
  const h: Record<string, string> = {};
  if (typeof window === "undefined") return h;

  const t = localStorage.getItem("legalhub_access_token");
  if (t) {
    h.Authorization = `Bearer ${t}`;
    return h;
  }

  const raw = localStorage.getItem(USER_STORAGE_KEY);
  if (raw) {
    try {
      const u = JSON.parse(raw) as { email?: string };
      if (u?.email) h["X-Dev-User-Email"] = u.email;
    } catch {
      /* ignore */
    }
  }
  return h;
}

/** Stable identity of the currently selected user, used for per-user query cache scoping. */
export function currentUserCacheKey(): string {
  if (typeof window === "undefined") return "anon";
  const t = localStorage.getItem("legalhub_access_token");
  if (t) {
    const dot = t.indexOf(".");
    return t.slice(0, dot > 0 ? dot : t.length).slice(0, 32) || "token";
  }
  const raw = localStorage.getItem(USER_STORAGE_KEY);
  if (!raw) return "anon";
  try {
    const u = JSON.parse(raw) as { id?: string; email?: string };
    return u?.id || u?.email || "anon";
  } catch {
    return "anon";
  }
}

export function apiJsonHeaders(): HeadersInit {
  return { ...apiAuthHeaders(), "Content-Type": "application/json" };
}
