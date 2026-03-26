"use client";

import { useState } from "react";
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
  const [showNotifyModal, setShowNotifyModal] = useState(false);
  const [supervisorEmail, setSupervisorEmail] = useState(
    process.env.NEXT_PUBLIC_SUPERVISOR_EMAIL || ""
  );
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [sendError, setSendError] = useState("");

  const handleNotify = async () => {
    if (!supervisorEmail.trim()) return;
    setSending(true);
    setSendError("");
    try {
      const res = await fetch("/api/notify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          supervisorEmail: supervisorEmail.trim(),
          memberName: report.member_name,
          month: report.month,
          project: report.project,
          role: report.role,
          works: report.works,
          achievements: report.achievements,
          issues: report.issues,
          learnings: report.learnings,
          nextMonth: report.next_month,
          aiSummary: report.ai_summary,
        }),
      });
      if (res.ok) {
        setSent(true);
        setShowNotifyModal(false);
      } else {
        const err = await res.json();
        setSendError(err.error || "送信に失敗しました");
      }
    } finally {
      setSending(false);
    }
  };

  return (
    <>
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

          <div className="flex items-center gap-2">
            {/* 報告済みバッジ */}
            {sent && (
              <span className="text-xs bg-blue-100 text-blue-700 px-2.5 py-1 rounded-full font-medium">
                ✓ 報告済み
              </span>
            )}

            {/* 報告するボタン（確定済みのみ） */}
            {isFinal && (
              <button
                onClick={() => {
                  setSent(false);
                  setSendError("");
                  setShowNotifyModal(true);
                }}
                className="flex items-center gap-1.5 bg-blue-600 text-white px-3 py-1.5
                           rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
              >
                📧 報告する
              </button>
            )}

            <button onClick={onEdit} className="btn-secondary">
              編集
            </button>
          </div>
        </div>

        {/* 下書きの場合の注意 */}
        {!isFinal && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg px-4 py-3 mb-5 text-sm text-yellow-700">
            ⚠️ 下書き状態です。「確定保存」にしてから上司へ報告できます。
          </div>
        )}

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

      {/* 報告モーダル */}
      {showNotifyModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-sm mx-4">
            <h2 className="text-base font-bold text-gray-800 mb-1">
              上司へ報告する
            </h2>
            <p className="text-xs text-gray-500 mb-4">
              {report.member_name}さんの{formatMonth(report.month)}分の月報を送信します
            </p>

            <div>
              <label className="label">送信先メールアドレス</label>
              <input
                type="email"
                value={supervisorEmail}
                onChange={(e) => setSupervisorEmail(e.target.value)}
                className="input-field"
                placeholder="supervisor@example.com"
                autoFocus
                onKeyDown={(e) => e.key === "Enter" && handleNotify()}
              />
            </div>

            {sendError && (
              <p className="text-xs text-red-500 mt-2">{sendError}</p>
            )}

            <div className="flex gap-2 mt-5">
              <button
                onClick={() => setShowNotifyModal(false)}
                className="btn-secondary flex-1"
                disabled={sending}
              >
                キャンセル
              </button>
              <button
                onClick={handleNotify}
                disabled={!supervisorEmail.trim() || sending}
                className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-lg text-sm
                           font-medium hover:bg-blue-700 transition-colors disabled:opacity-50"
              >
                {sending ? "送信中..." : "📧 送信する"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
