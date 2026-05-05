import type { User } from "./mockData";

/** Offline / demo-only users when `VITE_FORCE_MOCK=true` (ids are not DB UUIDs). */
export const availableUsers: User[] = [
  { id: "u1", name: "Директор", role: "director", branch: null, email: "director@company.kz" },
  { id: "u6", name: "Главный юрист", role: "chief_lawyer", branch: null, email: "chief@company.kz" },
  { id: "u2", name: "Касымов А.Б.", role: "branch_lawyer", branch: "Северный", email: "kasymov@company.kz" },
  { id: "u3", name: "Нурланова Г.С.", role: "branch_lawyer", branch: "Южный", email: "nurlanova@company.kz" },
  { id: "u4", name: "Ахметов Д.К.", role: "branch_lawyer", branch: "Центральный", email: "akhmetov@company.kz" },
  { id: "u7", name: "Бекмуратов Е.Н.", role: "branch_lawyer", branch: "Западный", email: "bekmuratov@company.kz" },
  { id: "u8", name: "Сагитов Р.М.", role: "branch_lawyer", branch: "Экспресс", email: "sagitov@company.kz" },
  { id: "u5", name: "Бухгалтер Иванова", role: "accountant", branch: null, email: "accountant@company.kz" },
];
