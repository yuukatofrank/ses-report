"use client";

import { Report } from "@/types";

interface ReportViewerProps {
  report: Report;
  onEdit: () => void;
}

function formatMonth(month: string): string {
  const [y, m] = month.split("-");
  return `${y}年${parseInt(m)}月`;
}

function Section({
  label,
  value,
}: {
  label: string;
  value: string | null | undefined;
}) {
  if (!value) return null;
  return (
    <div>
      <p className="text-xs font-semibold text-[#0f6e56] uppercase tracking-wider mb-1">
        {label}
      </p>
      <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">
        {value}
      </p>
    </div>
  );
}

export default function ReportViewer({ report, onEdit }: ReportViewerProps) {
  const isFinal = report.status === "final";

  return (
    <div className="max-w-3xl mx-auto py-6 px-4">
      {/* ヘッダー */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h2 className="text-xl font-bold text-gray-800">
              {formatMonth(report.month)} 月次報告書
            </h2>
            <span
              className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                isFinal
                  ? "bg-[#0f6e56] text-white"
                  : "bg-gray-200 text-gray-600"
              }`}
            >
              {isFinal ? "確定" : "下書き"}
            </span>
          </div>
          <p className="text-sm text-gray-500">
            {report.member_name}
            {report.role ? ` · ${report.role}` : ""}
            {report.project ? ` · ${report.project}` : ""}
          </p>
        </div>
        <button onClick={onEdit} className="btn-secondary">
          編集
        </button>
      </div>

      {/* AI サマリー */}
      {report.ai_summary && (
        <div className="card p-5 mb-5 border-l-4 border-l-[#0f6e56]">
          <p className="text-xs font-semibold text-[#0f6e56] uppercase tracking-wider mb-2">
            ✨ AI整形サマリー
          </p>
          <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">
            {report.ai_summary}
          </p>
        </div>
      )}

      {/* 詳細 */}
      <div className="card p-5">
        <div className="space-y-5 divide-y divide-gray-100">
          <Section label="今月の業務・タスク" value={report.works} />
          <div className="pt-4">
            <Section label="成果・達成事項" value={report.achievements} />
          </div>
          <div className="pt-4">
            <Section label="発生した問題・トラブル" value={report.issues} />
          </div>
          <div className="pt-4">
            <Section label="学んだこと・気づき" value={report.learnings} />
          </div>
          <div className="pt-4">
            <Section label="来月の課題・目標" value={report.next_month} />
          </div>
        </div>
      </div>

      <p className="text-xs text-gray-400 text-right mt-3">
        更新: {new Date(report.updated_at).toLocaleDateString("ja-JP")}
      </p>
    </div>
  );
}
