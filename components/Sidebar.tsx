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
  member,
  reports,
  selectedReport,
  onSelectReport,
  onNewReport,
  isOpen,
  onClose,
}: SidebarProps) {
  const handleSelectReport = (report: Report) => {
    onSelectReport(report);
    onClose(); // モバイルでは選択後に閉じる
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
        {/* 月報一覧 */}
        <div className="flex flex-col flex-1 min-h-0">
          <div className="flex items-center justify-between px-4 py-2 border-b border-gray-100 bg-gray-50">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
              月報一覧
            </span>
            {member && (
              <button
                onClick={handleNewReport}
                className="text-[#0f6e56] text-xs font-medium hover:underline"
              >
                ＋ 新規
              </button>
            )}
          </div>

          <div className="flex-1 overflow-y-auto">
            {!member ? (
              <div className="px-4 py-4 text-xs text-gray-400 text-center">
                プロフィールを設定してください
              </div>
            ) : reports.length === 0 ? (
              <div className="px-4 py-4 text-xs text-gray-400 text-center">
                月報がありません
                <br />
                <button
                  onClick={handleNewReport}
                  className="mt-2 text-[#0f6e56] hover:underline"
                >
                  ＋ 新規作成
                </button>
              </div>
            ) : (
              <ul className="py-1">
                {[...reports]
                  .sort((a, b) => b.month.localeCompare(a.month))
                  .map((report) => (
                    <li key={report.id}>
                      <button
                        onClick={() => handleSelectReport(report)}
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
    </>
  );
}
