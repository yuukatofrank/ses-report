"use client";

import { useState } from "react";
import { ExpenseReport, EXPENSE_CATEGORIES } from "@/types";

interface ExpenseViewerProps {
  report: ExpenseReport;
  onEdit?: () => void;
  onApprove?: () => Promise<void>;
  onReturn?: (comment: string) => Promise<void>;
  isSuperAdmin?: boolean;
  canEdit?: boolean;
}

function statusBadge(status: ExpenseReport["status"]) {
  const map = {
    draft: { bg: "bg-gray-200 text-gray-600", label: "下書き" },
    submitted: { bg: "bg-yellow-100 text-yellow-700", label: "申請中" },
    approved: { bg: "bg-green-100 text-green-700", label: "承認済" },
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

function fmtMonth(ym: string): string {
  const [y, m] = ym.split("-");
  return `${y}年${parseInt(m)}月`;
}

export default function ExpenseViewer({
  report,
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
    canEdit && (report.status === "draft" || report.status === "returned");

  const items = (report.items ?? []).sort((a, b) => a.sort_order - b.sort_order);
  const totalAmount = items.reduce((sum, item) => sum + item.amount, 0);

  return (
    <>
      <div className="max-w-4xl mx-auto py-6 px-4">
        {/* Header */}
        <div className="flex items-start justify-between mb-6">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <h2 className="text-xl font-bold text-gray-800">
                {fmtMonth(report.month)} 経費申請
              </h2>
              {statusBadge(report.status)}
            </div>
            <p className="text-sm text-gray-500">{report.member_name}</p>
          </div>

          <div className="flex items-center gap-2">
            {/* Admin: approve */}
            {isSuperAdmin && report.status === "submitted" && onApprove && (
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
            {isSuperAdmin && report.status === "submitted" && onReturn && (
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

        {/* Admin comment */}
        {report.admin_comment && (
          <div className="mb-5 card p-4 border-l-4 border-l-orange-400 bg-orange-50">
            <p className="text-xs font-semibold text-orange-600 mb-1">
              管理者コメント
            </p>
            <p className="text-sm text-gray-700 whitespace-pre-wrap">
              {report.admin_comment}
            </p>
          </div>
        )}

        {/* Items table */}
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    日付
                  </th>
                  <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    件名
                  </th>
                  <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    カテゴリ
                  </th>
                  <th className="text-right px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    金額
                  </th>
                  <th className="text-center px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    領収書
                  </th>
                </tr>
              </thead>
              <tbody>
                {items.map((item, idx) => (
                  <tr
                    key={item.id ?? idx}
                    className="border-b border-gray-100 last:border-0 hover:bg-gray-50/50"
                  >
                    <td className="px-4 py-2.5 text-gray-600 whitespace-nowrap">
                      {formatDate(item.date)}
                    </td>
                    <td className="px-4 py-2.5">
                      <p className="text-gray-800">{item.title}</p>
                      {item.description && (
                        <p className="text-xs text-gray-400 mt-0.5">{item.description}</p>
                      )}
                    </td>
                    <td className="px-4 py-2.5 text-gray-600">
                      {EXPENSE_CATEGORIES[item.category]}
                    </td>
                    <td className="px-4 py-2.5 text-right font-medium text-gray-800 whitespace-nowrap">
                      ¥{item.amount.toLocaleString()}
                    </td>
                    <td className="px-4 py-2.5 text-center">
                      {item.receipt_path ? (
                        <span className="flex items-center justify-center gap-2">
                          <a
                            href={`/api/expenses/receipt/download?path=${encodeURIComponent(item.receipt_path)}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-[#0f6e56] hover:underline"
                          >
                            表示
                          </a>
                          <a
                            href={`/api/expenses/receipt/download?path=${encodeURIComponent(item.receipt_path)}&mode=download`}
                            className="text-xs text-gray-400 hover:text-gray-600 hover:underline"
                          >
                            DL
                          </a>
                        </span>
                      ) : (
                        <span className="text-xs text-gray-300">-</span>
                      )}
                    </td>
                  </tr>
                ))}
                {items.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-4 py-6 text-center text-gray-400 text-sm">
                      明細がありません
                    </td>
                  </tr>
                )}
              </tbody>
              <tfoot>
                <tr className="bg-gray-50 border-t border-gray-200">
                  <td colSpan={3} className="px-4 py-3 text-sm font-semibold text-gray-700 text-right">
                    合計
                  </td>
                  <td className="px-4 py-3 text-right text-lg font-bold text-[#0f6e56]">
                    ¥{totalAmount.toLocaleString()}
                  </td>
                  <td />
                </tr>
              </tfoot>
            </table>
          </div>
        </div>

        <p className="text-xs text-gray-400 text-right mt-3">
          更新: {new Date(report.updated_at).toLocaleDateString("ja-JP")}
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
              {report.member_name}さんの{fmtMonth(report.month)}経費申請を差し戻します
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
