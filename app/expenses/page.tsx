"use client";

import { useState, useEffect, useCallback, Suspense } from "react";
import { useRouter } from "next/navigation";
import { ExpenseReport, ExpenseItem, Member } from "@/types";
import { createSupabaseBrowserClient } from "@/lib/supabase";
import ExpenseList from "@/components/expense/ExpenseList";
import ExpenseForm from "@/components/expense/ExpenseForm";
import ExpenseViewer from "@/components/expense/ExpenseViewer";

type ViewMode = "idle" | "form-new" | "form-edit" | "view";

function generateMonthOptions(): string[] {
  const months: string[] = [];
  const now = new Date();
  for (let i = 0; i < 12; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    months.push(
      `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`
    );
  }
  return months;
}

function fmtMonth(ym: string): string {
  const [y, m] = ym.split("-");
  return `${y}年${parseInt(m)}月`;
}

function ExpensesContent() {
  const router = useRouter();
  const supabase = createSupabaseBrowserClient();

  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [member, setMember] = useState<Member | null>(null);
  const [allMembers, setAllMembers] = useState<Member[]>([]);
  const [reports, setReports] = useState<ExpenseReport[]>([]);
  const [selectedReport, setSelectedReport] = useState<ExpenseReport | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>("idle");
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Filters
  const [selectedMonth, setSelectedMonth] = useState<string>(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  });
  const [filterMemberId, setFilterMemberId] = useState<string>("all");

  const adminEmail = process.env.NEXT_PUBLIC_ADMIN_EMAIL;
  const isSuperAdmin = userEmail === adminEmail;

  // Auth check
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) {
        router.push("/auth");
      } else {
        setUserId(data.user.id);
        setUserEmail(data.user.email ?? null);
      }
    });
  }, [router, supabase]);

  const fetchProfile = useCallback(async (uid: string) => {
    const res = await fetch(`/api/profile?user_id=${uid}`);
    if (res.ok) return (await res.json()) as Member | null;
    return null;
  }, []);

  const fetchReports = useCallback(
    async (memberId?: string, month?: string) => {
      const params = new URLSearchParams();
      if (memberId && memberId !== "all") params.set("member_id", memberId);
      if (month) params.set("month", month);
      const res = await fetch(`/api/expenses?${params.toString()}`);
      if (res.ok) setReports(await res.json());
    },
    []
  );

  // Fetch a single report with items (for viewing/editing)
  const fetchReportDetail = useCallback(async (reportId: string): Promise<ExpenseReport | null> => {
    const res = await fetch(`/api/expenses/${reportId}`);
    if (res.ok) return await res.json();
    return null;
  }, []);

  // Init
  useEffect(() => {
    if (!userId) return;
    const init = async () => {
      const profile = await fetchProfile(userId);
      setMember(profile);
      if (!profile) {
        router.push("/");
        return;
      }

      const isSA = userEmail === adminEmail;

      if (isSA) {
        const res = await fetch("/api/members");
        if (res.ok) {
          const members: Member[] = await res.json();
          setAllMembers(members);
        }
        await fetchReports("all", selectedMonth);
      } else {
        setFilterMemberId(profile.id);
        await fetchReports(profile.id, selectedMonth);
      }

      setLoading(false);
    };
    init();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  // Re-fetch on filter change
  const handleMonthChange = async (month: string) => {
    setSelectedMonth(month);
    setSelectedReport(null);
    setViewMode("idle");
    const mid = isSuperAdmin ? filterMemberId : member?.id;
    await fetchReports(mid, month);
  };

  const handleMemberFilterChange = async (memberId: string) => {
    setFilterMemberId(memberId);
    setSelectedReport(null);
    setViewMode("idle");
    await fetchReports(memberId, selectedMonth);
  };

  // Select a report -> fetch detail with items
  const handleSelectReport = async (report: ExpenseReport) => {
    const detail = await fetchReportDetail(report.id);
    if (detail) {
      setSelectedReport(detail);
      setViewMode("view");
    }
  };

  const handleNewReport = () => {
    setSelectedReport(null);
    setViewMode("form-new");
  };

  const handleNoExpense = async () => {
    if (!member) return;
    if (!confirm(`${fmtMonth(selectedMonth)}の経費を「申請なし」として報告しますか？`)) return;
    const res = await fetch("/api/expenses", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        member_id: member.id,
        member_name: member.name,
        month: selectedMonth,
        status: "no_expense",
        items: [],
      }),
    });
    if (res.ok) {
      const saved = await res.json();
      const mid = isSuperAdmin ? filterMemberId : member.id;
      await fetchReports(mid, selectedMonth);
      const detail = await fetchReportDetail(saved.id);
      if (detail) {
        setSelectedReport(detail);
        setViewMode("view");
      }
    } else {
      const err = await res.json();
      alert(err.error || "報告に失敗しました");
    }
  };

  const handleSaveReport = async (
    data: { month: string; items: ExpenseItem[] },
    status: "draft" | "submitted"
  ) => {
    if (viewMode === "form-new" && member) {
      const res = await fetch("/api/expenses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          member_id: member.id,
          member_name: member.name,
          month: data.month,
          status,
          items: data.items,
        }),
      });
      if (res.ok) {
        const saved = await res.json();
        const mid = isSuperAdmin ? filterMemberId : member.id;
        await fetchReports(mid, selectedMonth);
        const detail = await fetchReportDetail(saved.id);
        if (detail) {
          setSelectedReport(detail);
          setViewMode("view");
        }
        // Send notification email when submitted
        if (status === "submitted") {
          const totalAmount = data.items.reduce((sum, item) => sum + item.amount, 0);
          fetch("/api/expenses/notify-submitted", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              memberName: member.name,
              month: data.month,
              itemCount: data.items.length,
              totalAmount,
              expenseUrl: `${window.location.origin}/expenses`,
            }),
          }).catch(console.error);
        }
      } else {
        const err = await res.json();
        alert(err.error || "保存に失敗しました");
      }
    } else if (viewMode === "form-edit" && selectedReport) {
      const res = await fetch(`/api/expenses/${selectedReport.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          month: data.month,
          status,
          items: data.items,
        }),
      });
      if (res.ok) {
        const saved = await res.json();
        const mid = isSuperAdmin ? filterMemberId : member?.id;
        await fetchReports(mid, selectedMonth);
        const detail = await fetchReportDetail(saved.id);
        if (detail) {
          setSelectedReport(detail);
          setViewMode("view");
        }
        // Send notification email when submitted
        if (status === "submitted" && member) {
          const totalAmount = data.items.reduce((sum, item) => sum + item.amount, 0);
          fetch("/api/expenses/notify-submitted", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              memberName: member.name,
              month: data.month,
              itemCount: data.items.length,
              totalAmount,
              expenseUrl: `${window.location.origin}/expenses`,
            }),
          }).catch(console.error);
        }
      } else {
        alert("更新に失敗しました");
      }
    }
  };

  const handleEditReport = () => {
    setViewMode("form-edit");
  };

  const handleDeleteReport = async () => {
    if (!selectedReport) return;
    const res = await fetch(`/api/expenses/${selectedReport.id}`, {
      method: "DELETE",
    });
    if (res.ok) {
      const mid = isSuperAdmin ? filterMemberId : member?.id;
      await fetchReports(mid, selectedMonth);
      setSelectedReport(null);
      setViewMode("idle");
    } else {
      alert("削除に失敗しました");
    }
  };

  const handleApproveReport = async () => {
    if (!selectedReport) return;
    const res = await fetch(`/api/expenses/${selectedReport.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "approved" }),
    });
    if (res.ok) {
      await fetchReports(filterMemberId, selectedMonth);
      const detail = await fetchReportDetail(selectedReport.id);
      if (detail) setSelectedReport(detail);
    }
  };

  const handleReturnReport = async (comment: string) => {
    if (!selectedReport) return;
    const res = await fetch(`/api/expenses/${selectedReport.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        status: "returned",
        admin_comment: comment || null,
      }),
    });
    if (res.ok) {
      await fetchReports(filterMemberId, selectedMonth);
      const detail = await fetchReportDetail(selectedReport.id);
      if (detail) setSelectedReport(detail);
      // Send return notification email to the submitter
      fetch("/api/expenses/notify-returned", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          memberId: selectedReport.member_id,
          memberName: selectedReport.member_name,
          month: selectedReport.month,
          reason: comment || null,
          expenseUrl: `${window.location.origin}/expenses`,
        }),
      }).catch(console.error);
    }
  };

  // PDF download
  const handlePrintPdf = () => {
    const mid =
      filterMemberId !== "all" ? filterMemberId : member?.id;
    if (mid) {
      window.open(
        `/expenses/print?member_id=${mid}&month=${selectedMonth}`,
        "_blank"
      );
    }
  };

  // Permissions
  const isOwnReport = selectedReport
    ? selectedReport.member_id === member?.id
    : true;
  const canEdit =
    isOwnReport &&
    (selectedReport?.status === "draft" ||
      selectedReport?.status === "returned");

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen text-gray-500">
        読み込み中...
      </div>
    );
  }

  const monthOptions = generateMonthOptions();

  return (
    <div className="min-h-screen" style={{ backgroundColor: "#f7f7f5" }}>
      {/* Header */}
      <div
        className="fixed top-0 left-0 right-0 z-40 flex items-center justify-between px-4 md:px-6 gap-3"
        style={{ backgroundColor: "#1a1a2e", height: "56px" }}
      >
        <div className="flex items-center gap-3 min-w-0">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="md:hidden text-white p-1 rounded hover:bg-white/10 transition-colors"
            aria-label="メニュー"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          <h1 className="text-white font-bold text-base md:text-lg whitespace-nowrap">
            経費申請
          </h1>
          <button
            onClick={() => router.push("/")}
            className="text-white/70 hover:text-white text-xs md:text-sm border border-white/20 px-2 md:px-3 py-1 rounded-lg hover:bg-white/10 transition-colors whitespace-nowrap"
          >
            ← 月報に戻る
          </button>
        </div>

        <div className="flex items-center gap-1.5 md:gap-3 overflow-x-auto flex-shrink-0">
          {/* Month filter */}
          <select
            value={selectedMonth}
            onChange={(e) => handleMonthChange(e.target.value)}
            className="text-xs md:text-sm bg-white/10 text-white border border-white/20 rounded-lg px-1.5 md:px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-white/40 min-w-0"
          >
            {monthOptions.map((m) => (
              <option key={m} value={m} className="text-gray-800">
                {fmtMonth(m)}
              </option>
            ))}
          </select>

          {/* Member filter (admin only) */}
          {isSuperAdmin && (
            <select
              value={filterMemberId}
              onChange={(e) => handleMemberFilterChange(e.target.value)}
              className="text-xs md:text-sm bg-white/10 text-white border border-white/20 rounded-lg px-1.5 md:px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-white/40 min-w-0 max-w-[100px] md:max-w-none"
            >
              <option value="all" className="text-gray-800">
                全員
              </option>
              {allMembers.map((m) => (
                <option key={m.id} value={m.id} className="text-gray-800">
                  {m.name}
                </option>
              ))}
            </select>
          )}

          {/* PDF download button */}
          <button
            onClick={handlePrintPdf}
            title="PDF出力"
            className="text-white/70 hover:text-white border border-white/20 px-2 py-1.5 rounded-lg hover:bg-white/10 transition-colors flex-shrink-0"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-4 w-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"
              />
            </svg>
          </button>
        </div>
      </div>

      {/* Sidebar */}
      <ExpenseList
        reports={reports}
        selectedReport={selectedReport}
        onSelectReport={handleSelectReport}
        onNewReport={handleNewReport}
        onNoExpense={!isSuperAdmin ? handleNoExpense : undefined}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      {/* Main content */}
      <main className="pt-[56px] md:ml-[260px] min-h-screen">
        {viewMode === "idle" && (
          <div className="flex flex-col items-center justify-center h-[calc(100vh-56px)] text-gray-400 px-4 text-center">
            <div className="text-5xl mb-4">💰</div>
            <p className="text-base font-medium">
              経費を選択するか、新規申請してください
            </p>
            {!isSuperAdmin && (
              <div className="flex items-center gap-3 mt-4">
                <button
                  onClick={handleNewReport}
                  className="btn-primary text-sm"
                >
                  + 新規申請
                </button>
                <button
                  onClick={handleNoExpense}
                  className="btn-secondary text-sm"
                >
                  申請なし
                </button>
              </div>
            )}
          </div>
        )}

        {(viewMode === "form-new" || viewMode === "form-edit") && member && (
          <ExpenseForm
            memberId={member.id}
            memberName={member.name}
            report={
              viewMode === "form-edit" && selectedReport
                ? selectedReport
                : undefined
            }
            onSave={handleSaveReport}
            onCancel={() =>
              setViewMode(selectedReport ? "view" : "idle")
            }
            onDelete={
              viewMode === "form-edit" ? handleDeleteReport : undefined
            }
          />
        )}

        {viewMode === "view" && selectedReport && (
          <ExpenseViewer
            report={selectedReport}
            onEdit={canEdit ? handleEditReport : undefined}
            onDelete={canEdit || isSuperAdmin || (isOwnReport && selectedReport.status === "no_expense") ? handleDeleteReport : undefined}
            onApprove={
              isSuperAdmin && selectedReport.status === "submitted"
                ? handleApproveReport
                : undefined
            }
            onReturn={
              isSuperAdmin && selectedReport.status === "submitted"
                ? handleReturnReport
                : undefined
            }
            isSuperAdmin={isSuperAdmin}
            canEdit={canEdit}
          />
        )}
      </main>
    </div>
  );
}

export default function ExpensesPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-gray-500">読み込み中...</div>
        </div>
      }
    >
      <ExpensesContent />
    </Suspense>
  );
}
