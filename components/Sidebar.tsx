"use client";

import { Report, Member } from "@/types";

interface SidebarProps {
  reports: Report[];
  selectedReport: Report | null;
  selectedMember: Member | null;
  onSelectReport: (report: Report) => void;
  onNewReport: () => void;
}

function formatMonth(month: string): string {
  const [y, m] = month.split("-");
  return `${y}年${parseInt(m)}月`;
}

function statusBadge(status: string) {
  if (status === "final") {
    return (
      <span className="text-[10px] bg-[#0f6e56] text-white px-1.5 py-0.5 rounded-full">
        確定
      </span>
    );
  }
  return (
    <span className="text-[10px] bg-gray-200 text-gray-600 px-1.5 py-0.5 rounded-full">
      下書き
    </span>
  );
}

export default function Sidebar({
  reports,
  selectedReport,
  selectedMember,
  onSelectReport,
  onNewReport,
}: SidebarProps) {
  const filtered = selectedMember
    ? reports.filter((r) => r.member_id === selectedMember.id)
    : reports;

  return (
    <aside
      className="fixed left-0 top-[56px] bottom-0 flex flex-col border-r border-gray-200 bg-white overflow-hidden"
      style={{ width: "260px" }}
    >
      {/* 新規ボタン */}
      <div className="p-3 border-b border-gray-100">
        <button
          onClick={onNewReport}
          disabled={!selectedMember}
          className="btn-primary w-full"
          title={!selectedMember ? "メンバーを選択してください" : undefined}
        >
          ＋ 新しい報告書
        </button>
        {!selectedMember && (
          <p className="text-[11px] text-gray-400 text-center mt-1.5">
            上でメンバーを選択してください
          </p>
        )}
      </div>

      {/* 報告書一覧 */}
      <div className="flex-1 overflow-y-auto">
        {filtered.length === 0 ? (
          <div className="p-4 text-center text-sm text-gray-400">
            {selectedMember
              ? "報告書がありません"
              : "メンバーを選択してください"}
          </div>
        ) : (
          <ul className="py-2">
            {filtered.map((report) => (
              <li key={report.id}>
                <button
                  onClick={() => onSelectReport(report)}
                  className={`w-full text-left px-4 py-3 hover:bg-gray-50 transition-colors
                              border-b border-gray-50 last:border-0
                              ${selectedReport?.id === report.id ? "bg-[#f0faf7] border-l-2 border-l-[#0f6e56]" : ""}`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-medium text-gray-800 truncate">
                      {formatMonth(report.month)}
                    </span>
                    {statusBadge(report.status)}
                  </div>
                  {!selectedMember && (
                    <div className="text-xs text-gray-500 mt-0.5 truncate">
                      {report.member_name}
                    </div>
                  )}
                  {report.project && (
                    <div className="text-xs text-gray-400 mt-0.5 truncate">
                      {report.project}
                    </div>
                  )}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </aside>
  );
}
