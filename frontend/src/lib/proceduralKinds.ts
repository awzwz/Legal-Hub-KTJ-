/** Виды процедурных действий (синхронно с backend/app/schemas/procedural.py). */

export type ProceduralKind = "response" | "appeal" | "cassation" | "petition" | "complaint" | "other";

export const proceduralKindLabels: Record<ProceduralKind, string> = {
  response: "Отзыв на иск",
  appeal: "Апелляционная жалоба",
  cassation: "Кассационная жалоба",
  petition: "Ходатайство",
  complaint: "Жалоба",
  other: "Иное",
};

export const PROCEDURAL_KINDS: ProceduralKind[] = [
  "response",
  "appeal",
  "cassation",
  "petition",
  "complaint",
  "other",
];

export interface ProceduralDeadline {
  id: string;
  caseId: string;
  caseNumber: string | null;
  kind: ProceduralKind;
  dueDate: string; // ISO YYYY-MM-DD
  completedAt: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  isOverdue: boolean;
}

export interface ProceduralDeadlineCreate {
  kind: ProceduralKind;
  dueDate: string;
  notes?: string | null;
  completedAt?: string | null;
}
