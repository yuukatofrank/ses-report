"use client";

import { useState } from "react";

interface Props {
  contractId: string;
  targetMonth: string;
  clientName: string;
  workerName: string;
  projectName: string;
  onClose: () => void;
}

function fmtMonth(ym: string): string {
  const [y, m] = ym.split("-");
  return `${y}年${parseInt(m)}月`;
}

export default function CompletionReportModal({
  contractId,
  targetMonth,
  clientName,
  workerName,
  projectName,
  onClose,
}: Props) {
  const [reportDate, setReportDate] = useState(new Date().toISOString().split("T")[0]);
  const [totalHours, setTotalHours] = useState("");
  const [generating, setGenerating] = useState(false);

  const handleGenerate = async () => {
    if (!totalHours) {
      alert("総労働時間を入力してください");
      return;
    }
    setGenerating(true);
    try {
      const res = await fetch("/api/completion-report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contract_id: contractId,
          target_month: targetMonth,
          report_date: reportDate,
          total_hours: parseFloat(totalHours),
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        alert(err.error || "生成に失敗しました");
        return;
      }

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const disposition = res.headers.get("Content-Disposition");
      const filenameMatch = disposition?.match(/filename\*=UTF-8''(.+)/);
      a.download = filenameMatch ? decodeURIComponent(filenameMatch[1]) : `業務終了報告書_${workerName}.xlsx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      onClose();
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 pt-8 px-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
        <div className="flex items-center justify-between px-5 py-4 border-b">
          <h2 className="font-bold text-gray-800">業務終了報告書</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl">×</button>
        </div>

        <div className="p-5 space-y-4">
          <div className="bg-gray-50 rounded-lg p-3 text-sm space-y-1">
            <p><span className="text-gray-500">得意先：</span><span className="font-medium text-gray-800">{clientName}</span></p>
            <p><span className="text-gray-500">作業者：</span><span className="font-medium text-gray-800">{workerName}</span></p>
            <p><span className="text-gray-500">案件：</span><span className="font-medium text-gray-800">{projectName}</span></p>
            <p><span className="text-gray-500">対象月：</span><span className="font-medium text-gray-800">{fmtMonth(targetMonth)}</span></p>
          </div>

          <div>
            <label className="label">報告日 *</label>
            <input
              type="date"
              value={reportDate}
              onChange={(e) => setReportDate(e.target.value)}
              className="input-field"
            />
          </div>

          <div>
            <label className="label">総労働時間 *</label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                step="0.25"
                value={totalHours}
                onChange={(e) => setTotalHours(e.target.value)}
                placeholder="例：159.25"
                className="input-field flex-1"
              />
              <span className="text-sm text-gray-500">時間</span>
            </div>
          </div>
        </div>

        <div className="px-5 py-4 border-t flex gap-2 justify-end">
          <button onClick={onClose} className="btn-secondary">キャンセル</button>
          <button
            onClick={handleGenerate}
            disabled={!totalHours || generating}
            className="btn-primary"
          >
            {generating ? "生成中..." : "Excelダウンロード"}
          </button>
        </div>
      </div>
    </div>
  );
}
