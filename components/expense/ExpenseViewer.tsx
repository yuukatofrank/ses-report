"use client";

import { useState } from "react";
import { Expense, EXPENSE_CATEGORIES } from "@/types";

interface ExpenseViewerProps {
  expense: Expense;
  onEdit?: () => void;
  onApprove?: () => Promise<void>;
  onReturn?: (comment: string) => Promise<void>;
  isSuperAdmin?: boolean;
  canEdit?: boolean;
}

function statusBadge(status: Expense["status"]) {
  const map = {
    draft: { bg: "bg-gray-200 text-gray-600", label: "下書き" },
    submitted: { bg: "bg-yellow-100 text-yellow-700", label: "申請中" },
    approved: { bg: "bg-green-100 text-green-700", label: "承認済み" },
    returned: { bg: "bg-red-100 text-red-700", label: "差し戻し" },
  } as const;
  const { bg, label } = map[status];
  return (
    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${bg}`}>
      {label}
    </span>
  );
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return `${d.getFullYear()}/${d.getMonth() + 1}/${d.getDate()}`;
}

export default function ExpenseViewer({
  expense,
  onEdit,
  onApprove,
  onReturn,
  isSuperAdmin,
  canEdit,
}: ExpenseViewerProps) {
  const [showReturnModal, setShowReturnModal] = useState(false);
  const [returnComment, setReturnComment] = useState("");
  const [returning, setReturning] = useState(false);
  const [approving, setApproving] = useState(false);

  const canOwnerEdit =
    canEdit && (expense.status === "draft" || expense.status === "returned");

  return (
    <>
      <div className="max-w-3xl mx-auto py-6 px-4">
        {/* Header */}
        <div className="flex items-start justify-between mb-6">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <h2 className="text-xl font-bold text-gray-800">
                {expense.title}
              </h2>
              {statusBadge(expense.status)}
            </div>
            <p className="text-sm text-gray-500">
              {expense.member_name} / {formatDate(expense.date)}
            </p>
          </div>

          <div className="flex items-center gap-2">
            {/* Admin: approve */}
            {isSuperAdmin && expense.status === "submitted" && onApprove && (
              <button
                onClick={async () => {
                  setApproving(true);
                  try {
                    await onApprove();
                  } finally {
                    setApproving(false);
                  }
                }}
                disabled={approving}
                className="flex items-center gap-1.5 bg-[#0f6e56] text-white px-3 py-1.5
                           rounded-lg text-sm font-medium hover:bg-[#0d5f49] transition-colors disabled:opacity-50"
              >
                {approving ? "処理中..." : "承認"}
              </button>
            )}

            {/* Admin: return */}
            {isSuperAdmin && expense.status === "submitted" && onReturn && (
              <button
                onClick={() => {
                  setReturnComment("");
                  setShowReturnModal(true);
                }}
                className="flex items-center gap-1.5 bg-red-500 text-white px-3 py-1.5
                           rounded-lg text-sm font-medium hover:bg-red-600 transition-colors"
              >
                差し戻し
              </button>
            )}

            {/* Owner: edit */}
            {canOwnerEdit && onEdit && (
              <button onClick={onEdit} className="btn-secondary">
                編集
              </button>
            )}
          </div>
        </div>

        {/* Admin comment (if present) */}
        {expense.admin_comment && (
          <div className="mb-5 card p-4 border-l-4 border-l-orange-400 bg-orange-50">
            <p className="text-xs font-semibold text-orange-600 mb-1">
              管理者コメント
            </p>
            <p className="text-sm text-gray-700 whitespace-pre-wrap">
              {expense.admin_comment}
            </p>
          </div>
        )}

        {/* Detail card */}
        <div className="card p-5">
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs font-semibold text-[#0f6e56] uppercase tracking-wider mb-1">
                  カテゴリ
                </p>
                <p className="text-sm text-gray-700">
                  {EXPENSE_CATEGORIES[expense.category]}
                </p>
              </div>
              <div>
                <p className="text-xs font-semibold text-[#0f6e56] uppercase tracking-wider mb-1">
                  金額
                </p>
                <p className="text-lg font-bold text-gray-800">
                  ¥{expense.amount.toLocaleString()}
                </p>
              </div>
              <div>
                <p className="text-xs font-semibold text-[#0f6e56] uppercase tracking-wider mb-1">
                  日付
                </p>
                <p className="text-sm text-gray-700">{formatDate(expense.date)}</p>
              </div>
              <div>
                <p className="text-xs font-semibold text-[#0f6e56] uppercase tracking-wider mb-1">
                  対象月
                </p>
                <p className="text-sm text-gray-700">
                  {expense.month.replace("-", "年") + "月"}
                </p>
              </div>
            </div>

            {expense.description && (
              <div className="pt-4 border-t border-gray-100">
                <p className="text-xs font-semibold text-[#0f6e56] uppercase tracking-wider mb-1">
                  備考
                </p>
                <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">
                  {expense.description}
                </p>
              </div>
            )}

            {/* Receipt image */}
            {expense.receipt_path && (
              <div className="pt-4 border-t border-gray-100">
                <p className="text-xs font-semibold text-[#0f6e56] uppercase tracking-wider mb-2">
                  領収書
                </p>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={`/api/expenses/receipt/download?path=${encodeURIComponent(expense.receipt_path)}`}
                  alt="領収書"
                  className="max-h-64 rounded-lg border border-gray-200 object-contain"
                />
              </div>
            )}
          </div>
        </div>

        <p className="text-xs text-gray-400 text-right mt-3">
          更新: {new Date(expense.updated_at).toLocaleDateString("ja-JP")}
        </p>
      </div>

      {/* Return modal */}
      {showReturnModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-sm mx-4">
            <h2 className="text-base font-bold text-gray-800 mb-1">
              差し戻し確認
            </h2>
            <p className="text-xs text-gray-500 mb-4">
              {expense.member_name}さんの経費申請「{expense.title}」を差し戻します
            </p>
            <div>
              <label className="label">差し戻し理由</label>
              <textarea
                value={returnComment}
                onChange={(e) => setReturnComment(e.target.value)}
                className="input-field w-full resize-y"
                rows={4}
                placeholder="修正してほしい点や理由を記入してください..."
                autoFocus
              />
            </div>
            <div className="flex gap-2 mt-5">
              <button
                onClick={() => setShowReturnModal(false)}
                className="btn-secondary flex-1"
                disabled={returning}
              >
                キャンセル
              </button>
              <button
                onClick={async () => {
                  if (!onReturn) return;
                  setReturning(true);
                  try {
                    await onReturn(returnComment.trim());
                    setShowReturnModal(false);
                  } finally {
                    setReturning(false);
                  }
                }}
                disabled={returning}
                className="flex-1 bg-red-500 text-white py-2 px-4 rounded-lg text-sm
                           font-medium hover:bg-red-600 transition-colors disabled:opacity-50"
              >
                {returning ? "処理中..." : "差し戻す"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
