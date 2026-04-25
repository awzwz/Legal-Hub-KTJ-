import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { CASES_CHANGE_EVENT, mockCases, LegalCase } from "@/data/mockData";
import { toast } from "@/hooks/use-toast";

export const fetchCases = async (): Promise<LegalCase[]> => {
  const forceMock = import.meta.env.VITE_FORCE_MOCK === 'true';

  if (forceMock) {
    return mockCases;
  }

  try {
    const res = await fetch("/api/v1/cases");
    if (!res.ok) {
      throw new Error("Server response not ok");
    }
    const data = await res.json();
    return data as LegalCase[];
  } catch (error) {
    toast({
      variant: "destructive",
      title: "Внимание: Сервер недоступен",
      description: "Активирован автономный Демо-режим с тестовыми данными.",
    });
    return mockCases;
  }
};

export const useCases = () => {
  const { data: cases = mockCases, refetch } = useQuery({
    queryKey: ["cases"],
    queryFn: fetchCases,
    staleTime: 5 * 60 * 1000,
  });

  useEffect(() => {
    // В случае локального добавления/изменения моков, обновляем интерфейс
    const handler = () => refetch();
    window.addEventListener(CASES_CHANGE_EVENT, handler);
    return () => window.removeEventListener(CASES_CHANGE_EVENT, handler);
  }, [refetch]);

  return cases;
};
