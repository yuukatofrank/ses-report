"use client";

import { Report, Member } from "@/types";

interface SidebarProps {
  members: Member[];
  reports: Report[];
  selectedMember: Member | null;
  selectedReport: Report | null;
  onSelectMember: (member: Member | null) => void;
  onSelectReport: (report: Report) => void;
  onNewReport: () => void;
  onDeleteMember: (id: string) => Promise<void>;
  onAddMember: () => void;
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
  members,
  reports,
  selectedMember,
  selectedReport,
  onSelectMember,
  onSelectReport,
  onNewReport,
  onDeleteMember,
  onAddMember,
}: SidebarProps) {
  const memberReports = selectedMember
    ? reports.filter((r) => r.member_id === selectedMember.id)
    : [];

  const reportCountFor = (memberId: string) =>
    reports.filter((r) => r.member_id === memberId).length;

  return (
    <aside
      className="fixed left-0 top-[56px] bottom-0 flex flex-col border-r border-gray-200 bg-white overflow-hidden"
      style={{ width: "260px" }}
    >
      {/* ── メンバー一覧 ── */}
      <div className="flex flex-col" style={{ maxHeight: "50%" }}>
        <div className="flex items-center justify-between px-4 py-2 border-b border-gray-100 bg-gray-50">
          <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
            メンバー
          </span>
          <button
            onClick={onAddMember}
            className="text-[#0f6e56] text-xs font-medium hover:underline"
          >
            ＋ 追加
          </button>
        </div>

        <ul className="overflow-y-auto">
          {members.length === 0 ? (
            <li className="px-4 py-3 text-xs text-gray-400 text-center">
              メンバーがいません
            </li>
          ) : (
            members.map((m) => (
              <li key={m.id}>
                <button
                  onClick={() =>
                    onSelectMember(selectedMember?.id === m.id ? null : m)
                  }
                  className={`w-full text-left px-4 py-2.5 flex items-center justify-between hover:bg-gray-50 transition-colors border-b border-gray-50 last:border-0
                    ${selectedMember?.id === m.id ? "bg-[#f0faf7] border-l-2 border-l-[#0f6e56]" : ""}`}
                >
                  <div className="min-w-0">
                    <div className="text-sm font-medium text-gray-800 truncate">
                      {m.name}
                    </div>
                    {m.role && (
                      <div className="text-xs text-gray-400 truncate">{m.role}</div>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5 ml-2 shrink-0">
                    <span className="text-xs text-gray-400">
                      {reportCountFor(m.id)}件
                    </span>
                    {selectedMember?.id === m.id && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          if (
                            confirm(
                              `「${m.name}」を削除しますか？\n関連する報告書もすべて削除されます。`
                            )
                          ) {
                            onDeleteMember(m.id);
                          }
                        }}
                        className="text-[10px] text-red-400 hover:text-red-600 px-1"
                      >
                        削除
                      </button>
                    )}
                  </div>
                </button>
              </li>
            ))
          )}
        </ul>
      </div>

      {/* ── 月報一覧 ── */}
      <div className="flex flex-col flex-1 min-h-0 border-t border-gray-200">
        <div className="flex items-center justify-between px-4 py-2 border-b border-gray-100 bg-gray-50">
          <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
            {selectedMember ? `${selectedMember.name}の月報` : "月報"}
          </span>
          {selectedMember && (
            <button
              onClick={onNewReport}
              className="text-[#0f6e56] text-xs font-medium hover:underline"
            >
              ＋ 新規
            </button>
          )}
        </div>

        <div className="flex-1 overflow-y-auto">
          {!selectedMember ? (
            <div className="px-4 py-4 text-xs text-gray-400 text-center">
              メンバーを選択してください
            </div>
          ) : memberReports.length === 0 ? (
            <div className="px-4 py-4 text-xs text-gray-400 text-center">
              月報がありません
              <br />
              <button
                onClick={onNewReport}
                className="mt-2 text-[#0f6e56] hover:underline"
              >
                ＋ 新規作成
              </button>
            </div>
          ) : (
            <ul className="py-1">
              {memberReports
                .sort((a, b) => b.month.localeCompare(a.month))
                .map((report) => (
                  <li key={report.id}>
                    <button
                      onClick={() => onSelectReport(report)}
                      className={`w-full text-left px-4 py-2.5 hover:bg-gray-50 transition-colors border-b border-gray-50 last:border-0
                        ${selectedReport?.id === report.id ? "bg-[#f0faf7] border-l-2 border-l-[#0f6e56]" : ""}`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-sm font-medium text-gray-800 truncate">
                          {formatMonth(report.month)}
                        </span>
                        {statusBadge(report.status)}
                      </div>
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
      </div>
    </aside>
  );
}
