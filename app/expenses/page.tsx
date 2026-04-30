"use client";

import { useState, useEffect, useCallback, Suspense } from "react";
import { useRouter } from "next/navigation";
import { ExpenseReport, ExpenseItem, Member } from "@/types";
import ExpenseList from "@/components/expense/ExpenseList";
import ExpenseForm from "@/components/expense/ExpenseForm";
import ExpenseViewer from "@/components/expense/ExpenseViewer";
import { useUser } from "@/app/UserProvider";

type ViewMode = "idle" | "form-new" | "form-edit" | "view";

function fmtMonth(ym: string): string {
  const [y, m] = ym.split("-");
  return `${y}年${parseInt(m)}月`;
}

function ExpensesContent() {
  const router = useRouter();
  const { isAdmin: isSuperAdmin, member } = useUser();

  const [loading, setLoading] = useState(true);
  const [allMembers, setAllMembers] = useState<Member[]>([]);
  const [reports, setReports] = useState<ExpenseReport[]>([]);
  const [selectedReport, setSelectedReport] = useState<ExpenseReport | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>("idle");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [processing, setProcessing] = useState<string | null>(null);

  // Filters
  const [selectedMonth, setSelectedMonth] = useState<string>(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  });
  const [filterMemberId, setFilterMemberId] = useState<string>("all");

  const fetchReports = useCallback(
    async (memberId?: string, month?: string): Promise<ExpenseReport[]> => {
      const params = new URLSearchParams();
      if (memberId && memberId !== "all") params.set("member_id", memberId);
      if (month) params.set("month", month);
      const res = await fetch(`/api/expenses?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setReports(data);
        return data;
      }
      return [];
    },
    []
  );

  // Init
  useEffect(() => {
    const init = async () => {
      if (!member) {
        router.push("/");
        return;
      }

      if (isSuperAdmin) {
        // Parallel fetch: members + reports
        const [membersRes] = await Promise.all([
          fetch("/api/members"),
          fetchReports("all", selectedMonth),
        ]);
        if (membersRes.ok) {
          setAllMembers(await membersRes.json());
        }
      } else {
        setFilterMemberId(member.id);
        await fetchReports(member.id, selectedMonth);
      }

      setLoading(false);
    };
    init();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [member, isSuperAdmin]);

  // Re-fetch on filter change
  const handleMonthChange = async (month: string) => {
    setSelectedMonth(month);
    setSelectedReport(null);
    setViewMode("idle");
    setProcessing("読み込み中...");
    const mid = isSuperAdmin ? filterMemberId : member?.id;
    await fetchReports(mid, month);
    setProcessing(null);
  };

  const handleMemberFilterChange = async (memberId: string) => {
    setFilterMemberId(memberId);
    setSelectedReport(null);
    setViewMode("idle");
    setProcessing("読み込み中...");
    await fetchReports(memberId, selectedMonth);
    setProcessing(null);
  };

  // Select a report - use data already fetched in the list (includes items)
  const handleSelectReport = (report: ExpenseReport) => {
    setSelectedReport(report);
    setViewMode("view");
  };

  const handleNewReport = () => {
    setSelectedReport(null);
    setViewMode("form-new");
  };

  const handleNoExpense = async () => {
    if (!member) return;
    if (!confirm(`${fmtMonth(selectedMonth)}の経費を「申請なし」として報告しますか？`)) return;
    setProcessing("報告中...");
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
      const updated = await fetchReports(mid, selectedMonth);
      const found = updated.find((r: ExpenseReport) => r.id === saved.id);
      setSelectedReport(found ?? { ...saved, items: [] });
      setViewMode("view");
      // Notify admin
      fetch("/api/expenses/notify-submitted", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          memberName: member.name,
          month: selectedMonth,
          itemCount: 0,
          totalAmount: 0,
          noExpense: true,
          expenseUrl: `${window.location.origin}/expenses`,
        }),
      }).catch(console.error);
    } else {
      const err = await res.json();
      alert(err.error || "報告に失敗しました");
    }
    setProcessing(null);
  };

  const handleSaveReport = async (
    data: { month: string; items: ExpenseItem[] },
    status: "draft" | "submitted"
  ) => {
    setProcessing(status === "submitted" ? "申請中..." : "保存中...");
    try {
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
        const updated = await fetchReports(mid, selectedMonth);
        const found = updated.find((r: ExpenseReport) => r.id === saved.id);
        setSelectedReport(found ?? saved);
        setViewMode("view");
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
        const updated = await fetchReports(mid, selectedMonth);
        const found = updated.find((r: ExpenseReport) => r.id === saved.id);
        setSelectedReport(found ?? saved);
        setViewMode("view");
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
    } finally {
      setProcessing(null);
    }
  };

  const handleEditReport = () => {
    setViewMode("form-edit");
  };

  const handleDeleteReport = async () => {
    if (!selectedReport) return;
    setProcessing("削除中...");
    try {
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
    } finally {
      setProcessing(null);
    }
  };

  const handleChangeReportMonth = async (newMonth: string) => {
    if (!selectedReport) return;
    setProcessing("月変更中...");
    try {
      const res = await fetch(`/api/expenses/${selectedReport.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ month: newMonth }),
      });
      if (res.ok) {
        // Refresh the list for the NEW month and switch to it
        setSelectedMonth(newMonth);
        const mid = isSuperAdmin ? filterMemberId : member?.id;
        const updated = await fetchReports(mid, newMonth);
        const found = updated.find((r: ExpenseReport) => r.id === selectedReport.id);
        if (found) setSelectedReport(found);
      } else {
        alert("月の変更に失敗しました");
      }
    } finally {
      setProcessing(null);
    }
  };

  const handleApproveReport = async () => {
    if (!selectedReport) return;
    setProcessing("承認中...");
    try {
      const res = await fetch(`/api/expenses/${selectedReport.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "approved" }),
      });
      if (res.ok) {
        const updated = await fetchReports(filterMemberId, selectedMonth);
        const found = updated.find((r: ExpenseReport) => r.id === selectedReport.id);
        if (found) setSelectedReport(found);
      }
    } finally {
      setProcessing(null);
    }
  };

  const handleReturnReport = async (comment: string) => {
    if (!selectedReport) return;
    setProcessing("差し戻し中...");
    const res = await fetch(`/api/expenses/${selectedReport.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        status: "returned",
        admin_comment: comment || null,
      }),
    });
    if (res.ok) {
      const updated = await fetchReports(filterMemberId, selectedMonth);
      const found = updated.find((r: ExpenseReport) => r.id === selectedReport.id);
      if (found) setSelectedReport(found);
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
    setProcessing(null);
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

  return (
    <div className="min-h-screen" style={{ backgroundColor: "#f7f7f5" }}>
      {/* Header */}
      <div
        className="fixed top-0 left-0 right-0 z-40"
        style={{ backgroundColor: "#1a1a2e", paddingTop: "var(--sat)" }}
      >
        <div className="flex items-center justify-between px-3 md:px-6 gap-2" style={{ height: "var(--header-h)" }}>
          <div className="flex items-center gap-2 min-w-0">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="md:hidden text-white p-1 rounded hover:bg-white/10 transition-colors flex-shrink-0"
              aria-label="メニュー"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
            <h1 className="text-white font-bold text-sm md:text-lg whitespace-nowrap">
              経費申請
            </h1>
            <button
              onClick={() => router.push("/")}
              className="hidden md:inline-flex text-white/70 hover:text-white text-sm border border-white/20 px-3 py-1 rounded-lg hover:bg-white/10 transition-colors whitespace-nowrap"
            >
              ← ホーム
            </button>
          </div>

          <div className="flex items-center gap-1.5 md:gap-3 flex-shrink-0">
            {/* Month filter */}
            <input
              type="month"
              value={selectedMonth}
              onChange={(e) => handleMonthChange(e.target.value)}
              className="text-xs md:text-sm bg-white/10 text-white border border-white/20 rounded-lg px-1.5 md:px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-white/40 min-w-0 [color-scheme:dark]"
            />

            {/* Member filter (admin only) */}
            {isSuperAdmin && (
              <select
                value={filterMemberId}
                onChange={(e) => handleMemberFilterChange(e.target.value)}
                className="text-xs md:text-sm bg-white/10 text-white border border-white/20 rounded-lg px-1.5 md:px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-white/40 min-w-0 max-w-[80px] md:max-w-none"
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

            {/* Back button (mobile) */}
            <button
              onClick={() => router.push("/")}
              title="ホームに戻る"
              className="md:hidden text-white/70 hover:text-white border border-white/20 p-1.5 rounded-lg hover:bg-white/10 transition-colors flex-shrink-0"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
            </button>

            {/* PDF download button */}
            <button
              onClick={handlePrintPdf}
              title="PDF出力"
              className="text-white/70 hover:text-white border border-white/20 p-1.5 rounded-lg hover:bg-white/10 transition-colors flex-shrink-0"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Sidebar */}
      <ExpenseList
        reports={reports}
        selectedReport={selectedReport}
        onSelectReport={handleSelectReport}
        onNewReport={handleNewReport}
        onNoExpense={handleNoExpense}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      {/* Processing overlay */}
      {processing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
          <div className="bg-white rounded-xl shadow-lg px-6 py-4 flex items-center gap-3">
            <div className="w-5 h-5 border-2 border-[#0f6e56] border-t-transparent rounded-full animate-spin" />
            <span className="text-sm font-medium text-gray-700">{processing}</span>
          </div>
        </div>
      )}

      {/* Main content */}
      <main className="md:ml-[260px] min-h-screen" style={{ paddingTop: "var(--header-total)" }}>
        {viewMode === "idle" && (
          <div className="flex flex-col items-center justify-center text-gray-400 px-4 text-center" style={{ minHeight: "calc(100vh - var(--header-total))" }}>
            <div className="text-5xl mb-4">💰</div>
            <p className="text-base font-medium">
              経費を選択するか、新規申請してください
            </p>
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
            onChangeMonth={
              canEdit || (isSuperAdmin && (selectedReport.status === "draft" || selectedReport.status === "returned"))
                ? handleChangeReportMonth
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
