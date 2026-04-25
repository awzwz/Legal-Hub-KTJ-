import { useEffect, useState } from "react";
import { CASES_CHANGE_EVENT, mockCases } from "@/data/mockData";

export const useCases = () => {
  const [, setVersion] = useState(0);

  useEffect(() => {
    const handler = () => setVersion((v) => v + 1);
    window.addEventListener(CASES_CHANGE_EVENT, handler);
    return () => window.removeEventListener(CASES_CHANGE_EVENT, handler);
  }, []);

  return mockCases;
};
