export interface Member {
  id: string;
  name: string;
  role: string | null;
  email: string | null;
  permission: "admin" | "member";
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
  ai_analysis: string | null;
  ai_insight: { issues: string[]; improvements: string[]; growth: string[] } | null;
  status: "draft" | "submitted" | "reviewed" | "returned";
  created_at: string;
  updated_at: string;
}

export type ReportInput = Omit<Report, "id" | "created_at" | "updated_at">;

export interface Comment {
  id: string;
  report_id: string;
  user_id: string;
  user_email: string;
  content: string;
  created_at: string;
}

export interface Client {
  id: string;
  name: string;
  created_at: string;
}

export interface ContractItem {
  id?: string;
  contract_id?: string;
  name: string; // {month} / {worker} プレースホルダー対応
  unit_price: number;
  tax_exempt: boolean;
  sort_order: number;
}

export interface Contract {
  id: string;
  client_id: string;
  member_id: string;
  project_name: string;
  payment_month_offset: number;
  payment_day: number;
  active: boolean;
  pdf_filename: string; // {month} {worker} {project} {client} プレースホルダー対応
  created_at: string;
  client?: Client;
  member?: { id: string; name: string };
  items?: ContractItem[];
}

export interface InvoiceItem {
  id?: string;
  invoice_id?: string;
  name: string;
  unit_price: number;
  quantity: number;
  tax_exempt: boolean;
  is_additional: boolean;
  sort_order: number;
}

// 経費申請
export type ExpenseCategory = "transportation" | "supplies" | "communication" | "entertainment" | "education" | "other";

export const EXPENSE_CATEGORIES: Record<ExpenseCategory, string> = {
  transportation: "交通費",
  supplies: "備品・消耗品",
  communication: "通信費",
  entertainment: "接待交際費",
  education: "書籍・研修費",
  other: "その他",
};

export interface Expense {
  id: string;
  member_id: string;
  member_name: string;
  month: string;
  title: string;
  category: ExpenseCategory;
  amount: number;
  date: string;
  description: string | null;
  receipt_path: string | null;
  status: "draft" | "submitted" | "approved" | "returned";
  admin_comment: string | null;
  created_at: string;
  updated_at: string;
}

export interface Invoice {
  id: string;
  contract_id: string;
  invoice_number: string;
  issue_date: string;
  target_month: string; // "YYYY-MM"
  payment_due_date: string;
  memo: string | null;
  created_at: string;
  updated_at: string;
  contract?: Contract;
  items?: InvoiceItem[];
}
