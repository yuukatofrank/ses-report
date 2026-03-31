"use client";

import { ExpenseReport } from "@/types";

interface ExpenseListProps {
  reports: ExpenseReport[];
  selectedReport: ExpenseReport | null;
  onSelectReport: (report: ExpenseReport) => void;
  onNewReport: () => void;
  onNoExpense?: () => void;
  isOpen: boolean;
  onClose: () => void;
}

function statusBadge(status: ExpenseReport["status"]) {
  const map = {
    draft: { bg: "bg-gray-200 text-gray-600", label: "下書き" },
    submitted: { bg: "bg-yellow-100 text-yellow-700", label: "申請中" },
    approved: { bg: "bg-green-100 text-green-700", label: "承認済" },
    returned: { bg: "bg-red-100 text-red-700", label: "差し戻し" },
    no_expense: { bg: "bg-blue-100 text-blue-700", label: "申請なし" },
  } as const;
  const { bg, label } = map[status] ?? { bg: "bg-gray-200 text-gray-600", label: status };
  return (
    <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${bg}`}>
      {label}
    </span>
  );
}

function fmtMonth(ym: string): string {
  const [y, m] = ym.split("-");
  return `${y}年${parseInt(m)}月`;
}

function totalAmount(report: ExpenseReport): number {
  return (report.items ?? []).reduce((sum, item) => sum + item.amount, 0);
}

export default function ExpenseList({
  reports,
  selectedReport,
  onSelectReport,
  onNewReport,
  onNoExpense,
  isOpen,
  onClose,
}: ExpenseListProps) {
  const sorted = [...reports].sort(
    (a, b) => b.updated_at.localeCompare(a.updated_at)
  );

  const handleSelectReport = (report: ExpenseReport) => {
    onSelectReport(report);
    onClose();
  };

  const handleNewReport = () => {
    onNewReport();
    onClose();
  };

  const handleNoExpense = () => {
    onNoExpense?.();
    onClose();
  };

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/40 md:hidden"
          style={{ top: "var(--header-total)" }}
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
          fixed left-0 bottom-0 z-40 flex flex-col border-r border-gray-200 bg-white overflow-hidden
          transition-transform duration-300
          ${isOpen ? "translate-x-0" : "-translate-x-full"}
          md:translate-x-0
        `}
        style={{ width: "260px", top: "var(--header-total)" }}
      >
        {/* New report button */}
        <div className="p-3 border-b border-gray-100 space-y-2">
          <button onClick={handleNewReport} className="btn-primary w-full text-sm">
            + 新規申請
          </button>
          {onNoExpense && (
            <button onClick={handleNoExpense} className="btn-secondary w-full text-xs">
              申請なし報告
            </button>
          )}
        </div>

        {/* Report list */}
        <div className="flex-1 overflow-y-auto">
          {reports.length === 0 ? (
            <p className="text-xs text-gray-400 text-center mt-10 px-4">
              経費申請がまだありません
            </p>
          ) : (
            <ul className="py-1">
              {sorted.map((report) => {
                const itemCount = report.items?.length ?? 0;
                const total = totalAmount(report);

                return (
                  <li key={report.id}>
                    <button
                      onClick={() => handleSelectReport(report)}
                      className={`w-full text-left px-4 py-2.5 hover:bg-gray-50 transition-colors border-b border-gray-50 last:border-0
                        ${selectedReport?.id === report.id ? "bg-[#f0faf7] border-l-2 border-l-[#0f6e56]" : ""}`}
                    >
                      <div className="flex items-center justify-between gap-2 mb-0.5">
                        <span className="text-xs text-gray-500 font-medium">
                          {fmtMonth(report.month)}
                        </span>
                        {statusBadge(report.status)}
                      </div>
                      <p className="text-sm text-gray-700 truncate">
                        {report.member_name}
                      </p>
                      <div className="flex items-center justify-between mt-0.5">
                        <span className="text-[10px] text-gray-400">
                          {itemCount}件
                        </span>
                        <span className="text-xs font-medium text-[#0f6e56]">
                          ¥{total.toLocaleString()}
                        </span>
                      </div>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </aside>
    </>
  );
}
