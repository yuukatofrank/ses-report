"use client";

import { useState, useRef } from "react";
import { Expense, ExpenseCategory, EXPENSE_CATEGORIES } from "@/types";

interface ExpenseFormProps {
  memberId: string;
  memberName: string;
  expense?: Expense;
  onSave: (data: Partial<Expense>, status: "draft" | "submitted") => Promise<void>;
  onCancel: () => void;
  onDelete?: () => Promise<void>;
}

export default function ExpenseForm({
  memberId,
  memberName,
  expense,
  onSave,
  onCancel,
  onDelete,
}: ExpenseFormProps) {
  const today = new Date().toISOString().slice(0, 10);

  const [form, setForm] = useState({
    title: expense?.title ?? "",
    category: expense?.category ?? ("transportation" as ExpenseCategory),
    amount: expense?.amount ?? 0,
    date: expense?.date ?? today,
    description: expense?.description ?? "",
  });

  const [receiptPath, setReceiptPath] = useState<string | null>(expense?.receipt_path ?? null);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const update = (field: string, value: string | number) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  const handleUpload = async (file: File) => {
    setUploading(true);
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
        setReceiptPath(data.path);
      }
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async (status: "draft" | "submitted") => {
    setSaving(true);
    try {
      await onSave(
        {
          member_id: memberId,
          member_name: memberName,
          month: form.date.slice(0, 7),
          title: form.title,
          category: form.category,
          amount: form.amount,
          date: form.date,
          description: form.description || null,
          receipt_path: receiptPath,
        },
        status
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto py-6 px-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold text-gray-800">
            {expense ? "経費申請を編集" : "新しい経費申請"}
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
        {/* Basic info */}
        <div className="card p-5">
          <p className="section-header">申請内容</p>
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="label">件名 *</label>
              <input
                type="text"
                value={form.title}
                onChange={(e) => update("title", e.target.value)}
                className="input-field"
                placeholder="例: 客先訪問の交通費"
              />
            </div>
            <div>
              <label className="label">カテゴリ *</label>
              <select
                value={form.category}
                onChange={(e) => update("category", e.target.value)}
                className="input-field"
              >
                {(Object.entries(EXPENSE_CATEGORIES) as [ExpenseCategory, string][]).map(
                  ([key, label]) => (
                    <option key={key} value={key}>
                      {label}
                    </option>
                  )
                )}
              </select>
            </div>
            <div>
              <label className="label">金額（円） *</label>
              <input
                type="number"
                value={form.amount || ""}
                onChange={(e) => update("amount", parseInt(e.target.value) || 0)}
                className="input-field"
                placeholder="0"
                min={0}
              />
            </div>
            <div>
              <label className="label">日付 *</label>
              <input
                type="date"
                value={form.date}
                onChange={(e) => update("date", e.target.value)}
                className="input-field"
              />
            </div>
          </div>
        </div>

        {/* Description */}
        <div className="card p-5">
          <p className="section-header">詳細</p>
          <div>
            <label className="label">備考</label>
            <textarea
              value={form.description}
              onChange={(e) => update("description", e.target.value)}
              className="textarea-field"
              rows={3}
              placeholder="用途や詳細を記入してください"
            />
          </div>
        </div>

        {/* Receipt */}
        <div className="card p-5">
          <p className="section-header">領収書</p>
          <div>
            <input
              ref={fileRef}
              type="file"
              accept="image/*,.pdf"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleUpload(file);
              }}
            />
            {receiptPath ? (
              <div className="space-y-3">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={`/api/expenses/receipt/download?path=${encodeURIComponent(receiptPath)}`}
                  alt="領収書"
                  className="max-h-48 rounded-lg border border-gray-200 object-contain"
                />
                <div className="flex gap-2">
                  <button
                    onClick={() => fileRef.current?.click()}
                    className="btn-secondary text-xs"
                    disabled={uploading}
                  >
                    {uploading ? "アップロード中..." : "変更"}
                  </button>
                  <button
                    onClick={() => setReceiptPath(null)}
                    className="text-xs text-red-500 hover:text-red-700"
                  >
                    削除
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => fileRef.current?.click()}
                disabled={uploading}
                className="w-full border-2 border-dashed border-gray-200 rounded-lg py-8 text-center
                           text-sm text-gray-400 hover:border-[#0f6e56] hover:text-[#0f6e56] transition-colors"
              >
                {uploading ? "アップロード中..." : "クリックして領収書をアップロード"}
              </button>
            )}
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-3 pb-6">
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
              disabled={saving || !form.title}
              className="btn-secondary"
            >
              下書き保存
            </button>
            <button
              onClick={() => handleSave("submitted")}
              disabled={saving || !form.title || !form.amount}
              className="btn-primary"
            >
              {saving ? "保存中..." : "申請する"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
