export interface Member {
  id: string;
  name: string;
  role: string | null;
  created_at: string;
}

export interface Report {
  id: string;
  member_id: string;
  month: string;
  member_name: string;
  project: string | null;
  role: string | null;
  works: string | null;
  achievements: string | null;
  issues: string | null;
  learnings: string | null;
  next_month: string | null;
  ai_summary: string | null;
  status: "draft" | "final";
  created_at: string;
  updated_at: string;
}

export type ReportInput = Omit<Report, "id" | "created_at" | "updated_at">;
