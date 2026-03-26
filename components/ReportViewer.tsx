"use client";

import { useState, useEffect } from "react";
import { Report, Comment } from "@/types";
import { createSupabaseBrowserClient } from "@/lib/supabase";

interface ReportViewerProps {
  report: Report;
  onEdit?: () => void;
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
  const defaultEmail = process.env.NEXT_PUBLIC_SUPERVISOR_EMAIL || "";

  // AI分析
  const [analysis, setAnalysis] = useState<string>(report.ai_analysis || "");
  const [analysisLoading, setAnalysisLoading] = useState(false);

  // コメント
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState("");
  const [commentLoading, setCommentLoading] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [currentUserEmail, setCurrentUserEmail] = useState<string | null>(null);

  const supabaseClient = createSupabaseBrowserClient();

  useEffect(() => {
    supabaseClient.auth.getUser().then(({ data }) => {
      setCurrentUserId(data.user?.id ?? null);
      setCurrentUserEmail(data.user?.email ?? null);
    });
    setAnalysis(report.ai_analysis || "");
    fetchComments();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [report.id]);

  const runAnalysis = async () => {
    setAnalysisLoading(true);
    try {
      const { data: prevReports } = await supabaseClient
        .from("reports")
        .select("month,issues,learnings,achievements,next_month")
        .eq("member_id", report.member_id)
        .lt("month", report.month)
        .order("month", { ascending: false })
        .limit(6);

      const res = await fetch("/api/ai-analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currentReport: report,
          previousReports: prevReports || [],
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setAnalysis(data.analysis);
      }
    } finally {
      setAnalysisLoading(false);
    }
  };

  const fetchComments = async () => {
    const { data } = await supabaseClient
      .from("comments")
      .select("*")
      .eq("report_id", report.id)
      .order("created_at", { ascending: true });
    if (data) setComments(data);
  };

  const handleAddComment = async () => {
    if (!newComment.trim() || !currentUserId || !currentUserEmail) return;
    setCommentLoading(true);
    try {
      const { error } = await supabaseClient.from("comments").insert({
        report_id: report.id,
        user_id: currentUserId,
        user_email: currentUserEmail,
        content: newComment.trim(),
      });
      if (!error) {
        setNewComment("");
        await fetchComments();
        // 報告書作成者へメール通知
        fetch("/api/notify-comment", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            reportId: report.id,
            commenterEmail: currentUserEmail,
            commentContent: newComment.trim(),
          }),
        });
      }
    } finally {
      setCommentLoading(false);
    }
  };

  const handleDeleteComment = async (id: string) => {
    await supabaseClient.from("comments").delete().eq("id", id);
    await fetchComments();
  };
  const [showNotifyModal, setShowNotifyModal] = useState(false);
  const [emails, setEmails] = useState<string[]>(
    defaultEmail ? [defaultEmail] : [""]
  );
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [sendError, setSendError] = useState("");

  const addEmail = () => setEmails((prev) => [...prev, ""]);
  const removeEmail = (i: number) =>
    setEmails((prev) => prev.filter((_, idx) => idx !== i));
  const updateEmail = (i: number, val: string) =>
    setEmails((prev) => prev.map((e, idx) => (idx === i ? val : e)));

  const handleNotify = async () => {
    const validEmails = emails.map((e) => e.trim()).filter(Boolean);
    if (validEmails.length === 0) return;
    setSending(true);
    setSendError("");
    try {
      const res = await fetch("/api/notify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          supervisorEmails: validEmails,
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
          reportUrl: `${window.location.origin}?report_id=${report.id}`,
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
                  setEmails(defaultEmail ? [defaultEmail] : [""]);
                  setShowNotifyModal(true);
                }}
                className="flex items-center gap-1.5 bg-blue-600 text-white px-3 py-1.5
                           rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
              >
                📧 報告する
              </button>
            )}

            {onEdit && (
              <button onClick={onEdit} className="btn-secondary">
                編集
              </button>
            )}
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
              <Section label="学んだこと・気づき・反省点" value={report.learnings} />
            </div>
            <div className="pt-4">
              <Section label="来月の課題・目標" value={report.next_month} />
            </div>
          </div>
        </div>

        <p className="text-xs text-gray-400 text-right mt-3">
          更新: {new Date(report.updated_at).toLocaleDateString("ja-JP")}
        </p>

        {/* AI 過去比較分析 */}
        <div className="mt-5 card p-5 border-l-4 border-l-purple-400">
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-semibold text-purple-600 uppercase tracking-wider">
              🔍 AI過去比較分析
            </p>
            <button
              onClick={runAnalysis}
              disabled={analysisLoading}
              className="flex items-center gap-1.5 bg-purple-600 text-white px-3 py-1.5
                         rounded-lg text-xs font-medium hover:bg-purple-700 transition-colors disabled:opacity-50"
            >
              {analysisLoading ? (
                <>
                  <svg className="animate-spin h-3 w-3" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
                  </svg>
                  分析中...
                </>
              ) : analysis ? "再分析" : "🔍 分析を実行"}
            </button>
          </div>
          {analysisLoading ? (
            <div className="flex items-center gap-2 text-sm text-gray-400">
              <svg className="animate-spin h-4 w-4 text-purple-400" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
              </svg>
              過去の報告書と比較分析中...
            </div>
          ) : analysis ? (
            <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">
              {analysis}
            </p>
          ) : (
            <p className="text-sm text-gray-400">「分析を実行」ボタンを押すと、過去の報告書と比較した分析結果が表示されます。</p>
          )}
        </div>

        {/* コメントセクション */}
        <div className="mt-6">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">💬 コメント</h3>

          {/* コメント一覧 */}
          {comments.length === 0 ? (
            <p className="text-xs text-gray-400 mb-4">まだコメントはありません</p>
          ) : (
            <div className="space-y-3 mb-4">
              {comments.map((c) => (
                <div key={c.id} className="bg-gray-50 rounded-lg px-4 py-3">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-medium text-gray-600">{c.user_email}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-400">
                        {new Date(c.created_at).toLocaleDateString("ja-JP", {
                          month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit",
                        })}
                      </span>
                      {currentUserId === c.user_id && (
                        <button
                          onClick={() => handleDeleteComment(c.id)}
                          className="text-xs text-gray-300 hover:text-red-400 transition-colors"
                        >
                          削除
                        </button>
                      )}
                    </div>
                  </div>
                  <p className="text-sm text-gray-700 whitespace-pre-wrap">{c.content}</p>
                </div>
              ))}
            </div>
          )}

          {/* コメント入力 */}
          {currentUserId ? (
            <div className="flex gap-2">
              <textarea
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                className="input-field flex-1 resize-none"
                rows={2}
                placeholder="コメントを入力..."
                onKeyDown={(e) => {
                  if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) handleAddComment();
                }}
              />
              <button
                onClick={handleAddComment}
                disabled={!newComment.trim() || commentLoading}
                className="bg-[#0f6e56] text-white px-4 py-2 rounded-lg text-sm font-medium
                           hover:bg-[#0d5f49] transition-colors disabled:opacity-50 self-end"
              >
                {commentLoading ? "送信中..." : "送信"}
              </button>
            </div>
          ) : (
            <p className="text-xs text-gray-400">コメントするにはログインが必要です</p>
          )}
        </div>
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
              <div className="space-y-2">
                {emails.map((email, i) => (
                  <div key={i} className="flex gap-2 items-center">
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => updateEmail(i, e.target.value)}
                      className="input-field flex-1"
                      placeholder="supervisor@example.com"
                      autoFocus={i === 0}
                      onKeyDown={(e) => e.key === "Enter" && handleNotify()}
                    />
                    {emails.length > 1 && (
                      <button
                        onClick={() => removeEmail(i)}
                        className="text-gray-400 hover:text-red-500 text-lg leading-none"
                        type="button"
                      >
                        ×
                      </button>
                    )}
                  </div>
                ))}
                <button
                  onClick={addEmail}
                  type="button"
                  className="text-xs text-[#0f6e56] hover:underline mt-1"
                >
                  ＋ 宛先を追加
                </button>
              </div>
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
                disabled={emails.every((e) => !e.trim()) || sending}
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
