"use client";

import { useState, useRef } from "react";
import { ExpenseReport, ExpenseItem, ExpenseCategory, EXPENSE_CATEGORIES } from "@/types";

interface ExpenseFormProps {
  memberId: string;
  memberName: string;
  report?: ExpenseReport;
  onSave: (data: { month: string; items: ExpenseItem[] }, status: "draft" | "submitted") => Promise<void>;
  onCancel: () => void;
  onDelete?: () => Promise<void>;
}

function emptyItem(sortOrder: number): ExpenseItem {
  return {
    title: "",
    category: "transportation",
    amount: 0,
    date: new Date().toISOString().slice(0, 10),
    description: null,
    receipt_path: null,
    sort_order: sortOrder,
  };
}

export default function ExpenseForm({
  memberId,
  memberName,
  report,
  onSave,
  onCancel,
  onDelete,
}: ExpenseFormProps) {
  const now = new Date();
  const defaultMonth = report?.month ?? `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

  const [month, setMonth] = useState(defaultMonth);
  const [items, setItems] = useState<ExpenseItem[]>(() => {
    if (report?.items && report.items.length > 0) {
      return [...report.items].sort((a, b) => a.sort_order - b.sort_order);
    }
    return [emptyItem(0)];
  });
  const [saving, setSaving] = useState(false);
  const [uploadingIdx, setUploadingIdx] = useState<number | null>(null);

  const fileRefs = useRef<(HTMLInputElement | null)[]>([]);

  const totalAmount = items.reduce((sum, item) => sum + item.amount, 0);
  const hasValidItem = items.some((item) => item.title && item.amount > 0);

  // Update a specific item field
  const updateItem = (index: number, field: keyof ExpenseItem, value: string | number | null) => {
    setItems((prev) =>
      prev.map((item, i) => (i === index ? { ...item, [field]: value } : item))
    );
  };

  // Add new blank item
  const addItem = () => {
    setItems((prev) => [...prev, emptyItem(prev.length)]);
  };

  // Remove item
  const removeItem = (index: number) => {
    if (items.length <= 1) return;
    setItems((prev) =>
      prev.filter((_, i) => i !== index).map((item, i) => ({ ...item, sort_order: i }))
    );
  };

  // Upload receipt for a specific item
  const handleUpload = async (index: number, file: File) => {
    setUploadingIdx(index);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("member_id", memberId);
      const res = await fetch("/api/expenses/receipt", {
        method: "POST",
        body: formData,
      });
      if (res.ok) {
        const data = await res.json();
        updateItem(index, "receipt_path", data.path);
      }
    } finally {
      setUploadingIdx(null);
    }
  };

  const handleSave = async (status: "draft" | "submitted") => {
    setSaving(true);
    try {
      const cleanItems = items.map((item, i) => ({
        ...item,
        sort_order: i,
        description: item.description || null,
      }));
      await onSave({ month, items: cleanItems }, status);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto py-6 px-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold text-gray-800">
            {report ? "経費申請を編集" : "新しい経費申請"}
          </h2>
          <p className="text-sm text-gray-500 mt-0.5">{memberName}</p>
        </div>
        <button
          onClick={onCancel}
          className="text-gray-500 hover:text-gray-700 text-sm"
        >
          ← 戻る
        </button>
      </div>

      <div className="space-y-5">
        {/* Month selector */}
        <div className="card p-5">
          <p className="section-header">対象月</p>
          <input
            type="month"
            value={month}
            onChange={(e) => setMonth(e.target.value)}
            className="input-field w-48"
          />
        </div>

        {/* Items section */}
        <div className="card p-5">
          <div className="flex items-center justify-between mb-4">
            <p className="section-header !mb-0">明細一覧</p>
            <span className="text-sm text-gray-500">{items.length}件</span>
          </div>

          {/* Items table */}
          <div className="space-y-3">
            {items.map((item, idx) => (
              <div
                key={idx}
                className="border border-gray-200 rounded-lg p-3 bg-gray-50/50 hover:bg-white transition-colors"
              >
                <div className="grid grid-cols-12 gap-2 items-start">
                  {/* Date */}
                  <div className="col-span-3 md:col-span-2">
                    <label className="label text-[10px]">日付</label>
                    <input
                      type="date"
                      value={item.date}
                      onChange={(e) => updateItem(idx, "date", e.target.value)}
                      className="input-field text-xs"
                    />
                  </div>

                  {/* Title */}
                  <div className="col-span-5 md:col-span-3">
                    <label className="label text-[10px]">件名</label>
                    <input
                      type="text"
                      value={item.title}
                      onChange={(e) => updateItem(idx, "title", e.target.value)}
                      className="input-field text-xs"
                      placeholder="例: 客先訪問交通費"
                    />
                  </div>

                  {/* Category */}
                  <div className="col-span-4 md:col-span-2">
                    <label className="label text-[10px]">カテゴリ</label>
                    <select
                      value={item.category}
                      onChange={(e) => updateItem(idx, "category", e.target.value)}
                      className="input-field text-xs"
                    >
                      {(Object.entries(EXPENSE_CATEGORIES) as [ExpenseCategory, string][]).map(
                        ([key, label]) => (
                          <option key={key} value={key}>{label}</option>
                        )
                      )}
                    </select>
                  </div>

                  {/* Amount */}
                  <div className="col-span-3 md:col-span-2">
                    <label className="label text-[10px]">金額(円)</label>
                    <input
                      type="number"
                      value={item.amount || ""}
                      onChange={(e) => updateItem(idx, "amount", parseInt(e.target.value) || 0)}
                      className="input-field text-xs"
                      placeholder="0"
                      min={0}
                    />
                  </div>

                  {/* Receipt */}
                  <div className="col-span-4 md:col-span-2">
                    <label className="label text-[10px]">領収書</label>
                    <input
                      ref={(el) => { fileRefs.current[idx] = el; }}
                      type="file"
                      accept="image/*,.pdf"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleUpload(idx, file);
                      }}
                    />
                    {item.receipt_path ? (
                      <div className="flex items-center gap-1">
                        <span className="text-[10px] text-green-600 truncate flex-1">
                          添付済
                        </span>
                        <button
                          onClick={() => updateItem(idx, "receipt_path", null)}
                          className="text-[10px] text-red-400 hover:text-red-600"
                        >
                          削除
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => fileRefs.current[idx]?.click()}
                        disabled={uploadingIdx === idx}
                        className="text-[10px] text-gray-500 hover:text-[#0f6e56] border border-dashed border-gray-300 rounded px-2 py-1.5 w-full text-center transition-colors"
                      >
                        {uploadingIdx === idx ? "..." : "アップロード"}
                      </button>
                    )}
                  </div>

                  {/* Delete button */}
                  <div className="col-span-1 flex items-end justify-center pb-1">
                    <button
                      onClick={() => removeItem(idx)}
                      disabled={items.length <= 1}
                      className="text-gray-400 hover:text-red-500 disabled:opacity-30 transition-colors p-1"
                      title="この明細を削除"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                </div>

                {/* Description row */}
                <div className="mt-2">
                  <input
                    type="text"
                    value={item.description ?? ""}
                    onChange={(e) => updateItem(idx, "description", e.target.value || null)}
                    className="input-field text-xs w-full"
                    placeholder="備考（任意）"
                  />
                </div>
              </div>
            ))}
          </div>

          {/* Add item button */}
          <button
            onClick={addItem}
            className="mt-3 w-full border-2 border-dashed border-gray-200 rounded-lg py-2.5 text-center
                       text-sm text-gray-400 hover:border-[#0f6e56] hover:text-[#0f6e56] transition-colors"
          >
            + 明細を追加
          </button>
        </div>

        {/* Total & Actions */}
        <div className="card p-5">
          <div className="flex items-center justify-between mb-4">
            <span className="text-sm font-semibold text-gray-700">合計金額</span>
            <span className="text-xl font-bold text-[#0f6e56]">
              ¥{totalAmount.toLocaleString()}
            </span>
          </div>

          <div className="flex items-center gap-3">
            {onDelete && (
              <button
                onClick={async () => {
                  if (confirm("この経費申請を削除しますか？")) {
                    await onDelete();
                  }
                }}
                className="btn-danger"
              >
                削除
              </button>
            )}
            <div className="flex gap-3 ml-auto">
              <button
                onClick={() => handleSave("draft")}
                disabled={saving}
                className="btn-secondary"
              >
                下書き保存
              </button>
              <button
                onClick={() => handleSave("submitted")}
                disabled={saving || !hasValidItem}
                className="btn-primary"
              >
                {saving ? "保存中..." : "申請する"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
