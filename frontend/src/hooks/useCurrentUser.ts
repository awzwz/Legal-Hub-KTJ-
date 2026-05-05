import { useState, useEffect, useCallback, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { USER_STORAGE_KEY, type User } from "@/data/mockData";
import { availableUsers } from "@/data/offlineUsers";
import { apiAuthHeaders } from "@/lib/api";
import { mapApiUserToUser, type ApiUserRow } from "@/hooks/useApiUsers";

const USER_CHANGE_EVENT = "userchange";
const ACCESS_TOKEN_KEY = "legalhub_access_token";

function hasAccessToken(): boolean {
  return typeof window !== "undefined" && !!localStorage.getItem("legalhub_access_token");
}

async function fetchUsersList(): Promise<ApiUserRow[]> {
  const res = await fetch("/api/v1/users", { headers: apiAuthHeaders() });
  if (!res.ok) return [];
  return res.json();
}

const getOfflineStoredUser = (): User => {
  if (typeof window !== "undefined") {
    const stored = localStorage.getItem(USER_STORAGE_KEY);
    if (stored) {
      try {
        const parsed = JSON.parse(stored) as User;
        const user = availableUsers.find((u) => u.id === parsed.id);
        if (user) return user;
      } catch {
        /* ignore */
      }
    }
  }
  return availableUsers[0];
};

export const useCurrentUser = () => {
  const forceMock = import.meta.env.VITE_FORCE_MOCK === "true";
  const tokenMode = !forceMock && hasAccessToken();
  const relaxSwitcher = !forceMock && !hasAccessToken();
  const queryClient = useQueryClient();

  const { data: meUser, isSuccess: meOk } = useQuery({
    queryKey: ["authMe", tokenMode ? "token" : "relax"],
    queryFn: async () => {
      const r = await fetch("/api/v1/auth/me", { headers: apiAuthHeaders() });
      if (r.status === 401) {
        if (typeof window !== "undefined") {
          localStorage.removeItem(ACCESS_TOKEN_KEY);
          window.location.replace("/login");
        }
        throw new Error("me");
      }
      if (!r.ok) throw new Error("me");
      return mapApiUserToUser((await r.json()) as ApiUserRow);
    },
    enabled: tokenMode,
    staleTime: 5 * 60 * 1000,
    retry: false,
  });

  const { data: apiUsers = [], isSuccess: usersOk } = useQuery({
    queryKey: ["users"],
    queryFn: fetchUsersList,
    enabled: relaxSwitcher,
    staleTime: 10 * 60 * 1000,
  });

  const resolvedList = useMemo(() => {
    if (forceMock) return availableUsers;
    if (tokenMode) {
      return meUser ? [meUser] : [];
    }
    if (apiUsers.length) return apiUsers.map(mapApiUserToUser);
    return [];
  }, [forceMock, tokenMode, meUser, apiUsers]);

  const [user, setUser] = useState<User>(() =>
    import.meta.env.SSR ? availableUsers[0] : forceMock ? getOfflineStoredUser() : availableUsers[0],
  );

  useEffect(() => {
    if (forceMock) {
      setUser(getOfflineStoredUser());
      return;
    }
    if (tokenMode) {
      if (meOk && meUser) {
        setUser(meUser);
        localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(meUser));
      }
      return;
    }
    if (!usersOk || resolvedList.length === 0) return;

    const raw = localStorage.getItem(USER_STORAGE_KEY);
    if (raw) {
      try {
        const parsed = JSON.parse(raw) as { id?: string; email?: string };
        const byId = parsed.id ? resolvedList.find((u) => u.id === parsed.id) : undefined;
        const byEmail = parsed.email ? resolvedList.find((u) => u.email === parsed.email) : undefined;
        if (byId) {
          setUser(byId);
          return;
        }
        if (byEmail) {
          setUser(byEmail);
          localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(byEmail));
          return;
        }
      } catch {
        /* ignore */
      }
    }
    const first = resolvedList[0];
    setUser(first);
    localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(first));
  }, [forceMock, tokenMode, meOk, meUser, usersOk, resolvedList]);

  const switchUser = useCallback(
    (userId: string) => {
      const list = forceMock ? availableUsers : resolvedList;
      const next = list.find((u) => u.id === userId);
      if (!next) return;
      setUser(next);
      if (typeof window !== "undefined") {
        localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(next));
        // Любая смена пользователя в dev-switcher = полный logout прежнего токена,
        // иначе бекенд продолжит идентифицировать запросы по Bearer'у предыдущего юзера.
        localStorage.removeItem(ACCESS_TOKEN_KEY);
        window.dispatchEvent(new CustomEvent(USER_CHANGE_EVENT, { detail: userId }));
      }
      // TanStack-кеш с предыдущими `["cases", oldUser]`, `["notifications", oldUser]` и т.п.
      // больше неактуален — иначе при переключении сначала видны 188 чужих дел до фоновой подкачки.
      queryClient.clear();
    },
    [forceMock, resolvedList, queryClient],
  );

  useEffect(() => {
    const handleStorage = () => {
      if (forceMock) setUser(getOfflineStoredUser());
    };
    const handleUserChange = () => {
      if (forceMock) setUser(getOfflineStoredUser());
    };
    window.addEventListener("storage", handleStorage);
    window.addEventListener(USER_CHANGE_EVENT, handleUserChange);
    return () => {
      window.removeEventListener("storage", handleStorage);
      window.removeEventListener(USER_CHANGE_EVENT, handleUserChange);
    };
  }, [forceMock]);

  const usersForSwitcher = forceMock ? availableUsers : tokenMode && meUser ? [meUser] : resolvedList;

  return { user, switchUser, usersForSwitcher };
};
