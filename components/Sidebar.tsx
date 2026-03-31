"use client";

import { Report, Member } from "@/types";

interface SidebarProps {
  member: Member | null;
  reports: Report[];
  selectedReport: Report | null;
  onSelectReport: (report: Report) => void;
  onNewReport: () => void;
  isOpen: boolean;
  onClose: () => void;
  // 管理者用
  allMembers?: Member[];
  viewingMember?: Member | null;
  onChangeMember?: (member: Member) => void;
  // 月別ビュー
  viewTab?: "member" | "month";
  onChangeViewTab?: (tab: "member" | "month") => void;
  selectedMonth?: string;
  onChangeMonth?: (month: string) => void;
  monthReports?: Report[];
}

function formatMonth(month: string): string {
  const [y, m] = month.split("-");
  return `${y}年${parseInt(m)}月`;
}

function statusBadge(status: string) {
  if (status === "reviewed") {
    return (
      <span className="text-[10px] bg-[#0f6e56] text-white px-1.5 py-0.5 rounded-full">
        確認済み
      </span>
    );
  }
  if (status === "submitted") {
    return (
      <span className="text-[10px] bg-blue-500 text-white px-1.5 py-0.5 rounded-full">
        提出済み
      </span>
    );
  }
  if (status === "returned") {
    return (
      <span className="text-[10px] bg-orange-500 text-white px-1.5 py-0.5 rounded-full">
        差し戻し
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
  member,
  reports,
  selectedReport,
  onSelectReport,
  onNewReport,
  isOpen,
  onClose,
  allMembers,
  viewingMember,
  onChangeMember,
  viewTab = "member",
  onChangeViewTab,
  selectedMonth,
  onChangeMonth,
  monthReports = [],
}: SidebarProps) {
  const isAdmin = member?.permission === "admin" && allMembers && allMembers.length > 0;
  const isViewingOwn = !viewingMember || viewingMember.id === member?.id;

  const handleSelectReport = (report: Report) => {
    onSelectReport(report);
    onClose();
  };

  const handleNewReport = () => {
    onNewReport();
    onClose();
  };

  return (
    <>
      {/* モバイル用オーバーレイ */}
      {isOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/40 md:hidden"
          onClick={onClose}
        />
      )}

      {/* サイドバー本体 */}
      <aside
        className={`
          fixed left-0 top-[56px] bottom-0 z-40 flex flex-col border-r border-gray-200 bg-white overflow-hidden
          transition-transform duration-300
          ${isOpen ? "translate-x-0" : "-translate-x-full"}
          md:translate-x-0
        `}
        style={{ width: "260px" }}
      >
        {/* 管理者用タブ */}
        {isAdmin && onChangeViewTab && (
          <div className="flex border-b border-gray-100">
            {(["member", "month"] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => onChangeViewTab(tab)}
                className={`flex-1 py-2 text-xs font-medium transition-colors ${
                  viewTab === tab
                    ? "text-[#0f6e56] border-b-2 border-[#0f6e56] bg-white"
                    : "text-gray-400 hover:text-gray-600 bg-gray-50"
                }`}
              >
                {tab === "member" ? "メンバー別" : "月別"}
              </button>
            ))}
          </div>
        )}

        {/* メンバー別ビュー */}
        {viewTab === "member" && (
          <>
            {isAdmin && onChangeMember && (
              <div className="px-3 py-2 border-b border-gray-100 bg-purple-50">
                <p className="text-[10px] text-purple-500 font-semibold uppercase tracking-wider mb-1">閲覧メンバー</p>
                <select
                  value={viewingMember?.id || member?.id || ""}
                  onChange={(e) => {
                    const selected = allMembers!.find((m) => m.id === e.target.value);
                    if (selected) onChangeMember(selected);
                  }}
                  className="w-full text-xs border border-purple-200 rounded-lg px-2 py-1.5 bg-white text-gray-700 focus:outline-none focus:border-purple-400"
                >
                  {allMembers!.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div className="flex flex-col flex-1 min-h-0">
              <div className="flex items-center justify-between px-4 py-2 border-b border-gray-100 bg-gray-50">
                <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">月報一覧</span>
                {member && isViewingOwn && (
                  <button onClick={handleNewReport} className="text-[#0f6e56] text-xs font-medium hover:underline">
                    ＋ 新規
                  </button>
                )}
              </div>

              <div className="flex-1 overflow-y-auto">
                {!member ? (
                  <div className="px-4 py-4 text-xs text-gray-400 text-center">プロフィールを設定してください</div>
                ) : reports.length === 0 ? (
                  <div className="px-4 py-4 text-xs text-gray-400 text-center">
                    月報がありません
                    {isViewingOwn && (
                      <>
                        <br />
                        <button onClick={handleNewReport} className="mt-2 text-[#0f6e56] hover:underline">＋ 新規作成</button>
                      </>
                    )}
                  </div>
                ) : (
                  <ul className="py-1">
                    {[...reports].sort((a, b) => b.month.localeCompare(a.month)).map((report) => (
                      <li key={report.id}>
                        <button
                          onClick={() => handleSelectReport(report)}
                          className={`w-full text-left px-4 py-2.5 hover:bg-gray-50 transition-colors border-b border-gray-50 last:border-0
                            ${selectedReport?.id === report.id ? "bg-[#f0faf7] border-l-2 border-l-[#0f6e56]" : ""}`}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-sm font-medium text-gray-800 truncate">{formatMonth(report.month)}</span>
                            {statusBadge(report.status)}
                          </div>
                          {report.project && (
                            <div className="text-xs text-gray-400 mt-0.5 truncate">{report.project}</div>
                          )}
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </>
        )}

        {/* 月別ビュー */}
        {viewTab === "month" && (
          <div className="flex flex-col flex-1 min-h-0">
            <div className="px-3 py-2 border-b border-gray-100 bg-purple-50">
              <p className="text-[10px] text-purple-500 font-semibold uppercase tracking-wider mb-1">対象月</p>
              <input
                type="month"
                value={selectedMonth ?? ""}
                onChange={(e) => onChangeMonth?.(e.target.value)}
                className="w-full text-xs border border-purple-200 rounded-lg px-2 py-1.5 bg-white text-gray-700 focus:outline-none focus:border-purple-400"
              />
            </div>

            <div className="flex items-center justify-between px-4 py-2 border-b border-gray-100 bg-gray-50">
              <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                {selectedMonth ? `${formatMonth(selectedMonth)}の月報` : "月報一覧"}
              </span>
              <span className="text-[10px] text-gray-400">{monthReports.length}件</span>
            </div>

            <div className="flex-1 overflow-y-auto">
              {monthReports.length === 0 ? (
                <div className="px-4 py-8 text-xs text-gray-400 text-center">月報がありません</div>
              ) : (
                <ul className="py-1">
                  {[...monthReports].sort((a, b) => a.member_name.localeCompare(b.member_name, "ja")).map((report) => (
                    <li key={report.id}>
                      <button
                        onClick={() => handleSelectReport(report)}
                        className={`w-full text-left px-4 py-2.5 hover:bg-gray-50 transition-colors border-b border-gray-50 last:border-0
                          ${selectedReport?.id === report.id ? "bg-[#f0faf7] border-l-2 border-l-[#0f6e56]" : ""}`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-sm font-medium text-gray-800 truncate">{report.member_name}</span>
                          {statusBadge(report.status)}
                        </div>
                        {report.project && (
                          <div className="text-xs text-gray-400 mt-0.5 truncate">{report.project}</div>
                        )}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        )}
      </aside>
    </>
  );
}
