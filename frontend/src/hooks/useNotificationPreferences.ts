import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiAuthHeaders, apiJsonHeaders } from "@/lib/api";

export interface NotificationTypeInfo {
  type: string;
  label: string;
  enabled: boolean;
}

interface PreferencesResponse {
  types: NotificationTypeInfo[];
}

export function useNotificationPreferences() {
  return useQuery({
    queryKey: ["notification-preferences"],
    queryFn: async (): Promise<NotificationTypeInfo[]> => {
      const r = await fetch("/api/v1/notifications/preferences", { headers: apiAuthHeaders() });
      if (!r.ok) return [];
      const data = (await r.json()) as PreferencesResponse;
      return data.types ?? [];
    },
    staleTime: 60_000,
  });
}

export function useSetNotificationPreferences() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (preferences: Record<string, boolean>): Promise<void> => {
      const r = await fetch("/api/v1/notifications/preferences", {
        method: "PUT",
        headers: { ...apiAuthHeaders(), ...apiJsonHeaders() },
        body: JSON.stringify({ preferences }),
      });
      if (!r.ok) throw new Error((await r.json()).detail || "Не удалось сохранить настройки");
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["notification-preferences"] });
      qc.invalidateQueries({ queryKey: ["notifications"] });
    },
  });
}
