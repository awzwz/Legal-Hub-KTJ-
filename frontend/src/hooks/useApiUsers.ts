import type { User } from "@/data/mockData";

export type ApiUserRow = {
  id: string;
  name: string;
  role: User["role"];
  branch: string | null;
  email: string;
};

export function mapApiUserToUser(row: ApiUserRow): User {
  return {
    id: row.id,
    name: row.name,
    role: row.role,
    branch: row.branch,
    email: row.email,
  };
}
