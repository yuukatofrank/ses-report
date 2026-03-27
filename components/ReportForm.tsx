"use client";

import { useState } from "react";
import { Report, Member } from "@/types";

interface ReportFormProps {
  member: Member;
  report?: Report;
  onSave: (data: Partial<Report>, status: "draft" | "submitted") => Promise<void>;
  onDelete?: () => Promise<void>;
  onCancel: () => void;
}

export default function ReportForm({
  member,
  report,
  onSave,
  onDelete,
  onCancel,
}: ReportFormProps) {
  const today = new Date();
  const defaultMonth = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}`;

  const [form, setForm] = useState({
    month: report?.month ?? defaultMonth,
    member_name: report?.member_name ?? member.name,
    project: report?.project ?? "",
    works: report?.works ?? "",
    achievements: report?.achievements ?? "",
    issues: report?.issues ?? "",
    learnings: report?.learnings ?? "",
    next_month: report?.next_month ?? "",
    ai_summary: report?.ai_summary ?? "",
  });

  const [aiLoading, setAiLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const update = (field: string, value: string) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  const handleAiFormat = async () => {
    setAiLoading(true);
    try {
      const res = await fetch("/api/ai-format", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          works: form.works,
          achievements: form.achievements,
          issues: form.issues,
          learnings: form.learnings,
          nextMonth: form.next_month,
        }),
      });
      const data = await res.json();
      if (data.summary) {
        update("ai_summary", data.summary);
      }
    } catch (e) {
      alert("AI整形に失敗しました");
    } finally {
      setAiLoading(false);
    }
  };

  const handleSave = async (status: "draft" | "submitted") => {
    setSaving(true);
    try {
      await onSave(
        {
          member_id: member.id,
          month: form.month,
          member_name: form.member_name,
          project: form.project || null,
          works: form.works || null,
          achievements: form.achievements || null,
          issues: form.issues || null,
          learnings: form.learnings || null,
          next_month: form.next_month || null,
          ai_summary: form.ai_summary || null,
        },
        status
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto py-6 px-4">
      {/* ヘッダー */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold text-gray-800">
            {report ? "報告書を編集" : "新しい報告書"}
          </h2>
          <p className="text-sm text-gray-500 mt-0.5">{member.name}</p>
        </div>
        <button
          onClick={onCancel}
          className="text-gray-500 hover:text-gray-700 text-sm"
        >
          ← 戻る
        </button>
      </div>

      <div className="space-y-5">
        {/* 基本情報 */}
        <div className="card p-5">
          <p className="section-header">基本情報</p>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">報告月 *</label>
              <input
                type="month"
                value={form.month}
                onChange={(e) => update("month", e.target.value)}
                className="input-field"
              />
            </div>
            <div>
              <label className="label">氏名</label>
              <input
                type="text"
                value={form.member_name}
                onChange={(e) => update("member_name", e.target.value)}
                className="input-field"
                readOnly
              />
            </div>
            <div>
              <label className="label">担当プロジェクト</label>
              <input
                type="text"
                value={form.project}
                onChange={(e) => update("project", e.target.value)}
                className="input-field"
                placeholder="〇〇システム開発"
              />
            </div>
          </div>
        </div>

        {/* 業務内容 */}
        <div className="card p-5">
          <p className="section-header">業務内容</p>
          <div className="space-y-4">
            <div>
              <label className="label">今月の業務・タスク</label>
              <textarea
                value={form.works}
                onChange={(e) => update("works", e.target.value)}
                className="textarea-field"
                rows={4}
                placeholder="・〇〇機能の実装&#10;・コードレビュー&#10;・テスト作成"
              />
            </div>
            <div>
              <label className="label">成果・達成事項</label>
              <textarea
                value={form.achievements}
                onChange={(e) => update("achievements", e.target.value)}
                className="textarea-field"
                rows={3}
                placeholder="・〇〇機能のリリースを完了&#10;・バグ修正により処理速度が20%向上"
              />
            </div>
            <div>
              <label className="label">発生した問題・トラブル</label>
              <textarea
                value={form.issues}
                onChange={(e) => update("issues", e.target.value)}
                className="textarea-field"
                rows={3}
                placeholder="・〇〇の仕様変更により工数が増加&#10;・環境依存のバグが発生"
              />
            </div>
            <div>
              <label className="label">学んだこと・気づき・反省点</label>
              <textarea
                value={form.learnings}
                onChange={(e) => update("learnings", e.target.value)}
                className="textarea-field"
                rows={3}
                placeholder="・〇〇の設計手法を習得&#10;・チームコミュニケーションの重要性を再認識"
              />
            </div>
            <div>
              <label className="label">来月の課題・目標</label>
              <textarea
                value={form.next_month}
                onChange={(e) => update("next_month", e.target.value)}
                className="textarea-field"
                rows={3}
                placeholder="・〇〇機能の開発着手&#10;・コードレビュースキルの向上"
              />
            </div>
          </div>
        </div>

        {/* AI整形 */}
        <div className="card p-5">
          <div className="flex items-center justify-between mb-2">
            <p className="section-header mb-0">AI整形サマリー</p>
            <button
              onClick={handleAiFormat}
              disabled={aiLoading}
              className="btn-secondary text-xs px-3 py-1.5"
            >
              {aiLoading ? "整形中..." : "✨ AIで整形"}
            </button>
          </div>
          <textarea
            value={form.ai_summary}
            onChange={(e) => update("ai_summary", e.target.value)}
            className="textarea-field"
            rows={6}
            placeholder="「AIで整形」ボタンを押すと、業務内容から自動でサマリーを生成します"
          />
        </div>

        {/* アクションボタン */}
        <div className="flex items-center gap-3 pb-6">
          {onDelete && (
            <button
              onClick={async () => {
                if (confirm("この報告書を削除しますか？")) {
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
              disabled={saving}
              className="btn-primary"
            >
              {saving ? "提出中..." : "提出する"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
