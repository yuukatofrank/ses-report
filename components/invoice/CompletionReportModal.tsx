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

  const handleGenerate = () => {
    if (!totalHours) {
      alert("総労働時間を入力してください");
      return;
    }
    const params = new URLSearchParams({
      contract_id: contractId,
      target_month: targetMonth,
      report_date: reportDate,
      total_hours: totalHours,
    });
    window.open(`/invoices/completion-report?${params.toString()}`, "_blank");
    onClose();
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
            disabled={!totalHours}
            className="btn-primary"
          >
            PDF表示
          </button>
        </div>
      </div>
    </div>
  );
}
