import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { CASES_CHANGE_EVENT, type LegalCase } from "@/data/mockData";
import { toast } from "@/hooks/use-toast";
import { apiAuthHeaders, currentUserCacheKey } from "@/lib/api";

export const fetchCases = async (): Promise<LegalCase[]> => {
  const forceMock = import.meta.env.VITE_FORCE_MOCK === "true";

  if (forceMock) {
    const { mockCases } = await import("@/data/offlineMockData");
    return mockCases;
  }

  try {
    const res = await fetch("/api/v1/cases", { headers: apiAuthHeaders() });
    if (!res.ok) {
      throw new Error("Server response not ok");
    }
    const data = await res.json();
    return data as LegalCase[];
  } catch {
    toast({
      variant: "destructive",
      title: "Внимание: сервер недоступен",
      description: "Включите API или задайте VITE_FORCE_MOCK=true для офлайн-данных.",
    });
    return [];
  }
};

export const useCases = () => {
  const cacheKey = currentUserCacheKey();
  const { data: cases = [], refetch } = useQuery({
    queryKey: ["cases", cacheKey],
    queryFn: fetchCases,
    staleTime: 60 * 1000,
  });

  useEffect(() => {
    const handler = () => refetch();
    window.addEventListener(CASES_CHANGE_EVENT, handler);
    return () => window.removeEventListener(CASES_CHANGE_EVENT, handler);
  }, [refetch]);

  return cases;
};
