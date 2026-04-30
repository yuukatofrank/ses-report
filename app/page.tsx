import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/get-user";
import { createSupabaseAdminClient } from "@/lib/supabase";
import DashboardClient from "./DashboardClient";

type DashboardStats = {
  thisMonthReportStatus: "未作成" | "下書き" | "提出済" | "確認済" | "差戻し";
  thisMonthLabel: string;
  myExpenseSubmittedCount: number;
  pendingReportsCount: number;
  pendingExpensesCount: number;
  latestInvoiceMonth: string | null;
};

function getThisMonth(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

function formatMonthLabel(ym: string): string {
  const [y, m] = ym.split("-");
  return `${y}年${parseInt(m)}月`;
}

const STATUS_LABEL: Record<string, DashboardStats["thisMonthReportStatus"]> = {
  draft: "下書き",
  submitted: "提出済",
  reviewed: "確認済",
  returned: "差戻し",
};

async function getDashboardStats(
  memberId: string,
  isAdmin: boolean
): Promise<DashboardStats> {
  const supabase = createSupabaseAdminClient();
  const thisMonth = getThisMonth();
  const thisMonthLabel = formatMonthLabel(thisMonth);

  const [thisReport, mySubmittedExpenses, pendingReports, pendingExpenses, latestInvoice] =
    await Promise.all([
      supabase
        .from("reports")
        .select("status")
        .eq("member_id", memberId)
        .eq("month", thisMonth)
        .maybeSingle()
        .then((r) => r as { data: { status: string } | null }),
      supabase
        .from("expense_reports")
        .select("id", { count: "exact", head: true })
        .eq("member_id", memberId)
        .eq("status", "submitted")
        .then((r) => ({ count: r.count })),
      isAdmin
        ? supabase
            .from("reports")
            .select("id", { count: "exact", head: true })
            .eq("status", "submitted")
            .then((r) => ({ count: r.count }))
        : Promise.resolve({ count: 0 as number | null }),
      isAdmin
        ? supabase
            .from("expense_reports")
            .select("id", { count: "exact", head: true })
            .eq("status", "submitted")
            .then((r) => ({ count: r.count }))
        : Promise.resolve({ count: 0 as number | null }),
      isAdmin
        ? supabase
            .from("invoices")
            .select("issue_date")
            .order("issue_date", { ascending: false })
            .limit(1)
            .maybeSingle()
            .then((r) => ({ data: r.data as { issue_date: string } | null }))
        : Promise.resolve({ data: null as { issue_date: string } | null }),
    ]);

  return {
    thisMonthReportStatus: thisReport.data
      ? STATUS_LABEL[thisReport.data.status] ?? "下書き"
      : "未作成",
    thisMonthLabel,
    myExpenseSubmittedCount: mySubmittedExpenses.count ?? 0,
    pendingReportsCount: pendingReports.count ?? 0,
    pendingExpensesCount: pendingExpenses.count ?? 0,
    latestInvoiceMonth: latestInvoice.data?.issue_date ?? null,
  };
}

export default async function DashboardPage() {
  const { member, isAdmin } = await getCurrentUser();

  // member 未登録 → /reports に飛ばしてプロフィール設定モーダルを表示
  if (!member) {
    redirect("/reports");
  }

  const stats = await getDashboardStats(member.id, isAdmin);

  return <DashboardClient stats={stats} member={member} isAdmin={isAdmin} />;
}

export const metadata = {
  title: "ダッシュボード | frankSQUARE管理システム",
};
