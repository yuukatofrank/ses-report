"use client";

import { useState, useEffect } from "react";
import { Contract, Client, Invoice } from "@/types";

interface Props {
  onCreated: (invoices: Invoice[]) => void;
  onClose: () => void;
}

function fmtMonth(ym: string): string {
  const [y, m] = ym.split("-");
  return `${y}年${parseInt(m)}月`;
}

function calcDueDate(issueDate: string, offset: number, day: number): string {
  const d = new Date(issueDate + "T00:00:00");
  // day=0 は月末
  if (day === 0) return new Date(d.getFullYear(), d.getMonth() + offset + 1, 0).toISOString().split("T")[0];
  return new Date(d.getFullYear(), d.getMonth() + offset, day).toISOString().split("T")[0];
}

function generateMonthOptions(): string[] {
  const months: string[] = [];
  const now = new Date();
  for (let i = -11; i <= 1; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
    months.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
  }
  return months.reverse();
}

function calcTotal(contract: Contract): number {
  const items = contract.items ?? [];
  const sub = items.reduce((s, i) => s + i.unit_price, 0);
  return sub + Math.floor(items.filter((i) => !i.tax_exempt).reduce((s, i) => s + i.unit_price, 0) * 0.1);
}

export default function BulkInvoiceCreator({ onCreated, onClose }: Props) {
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [issueDate, setIssueDate] = useState(new Date().toISOString().split("T")[0]);
  const [targetMonth, setTargetMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  });
  const [selectedContractIds, setSelectedContractIds] = useState<string[]>([]);
  const [creating, setCreating] = useState(false);
  const monthOptions = generateMonthOptions();

  useEffect(() => {
    fetch("/api/contracts").then((r) => r.json()).then(setContracts);
  }, []);

  const toggleContract = (id: string) =>
    setSelectedContractIds((prev) =>
      prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id]
    );

  const toggleAll = () => {
    if (selectedContractIds.length === contracts.length) {
      setSelectedContractIds([]);
    } else {
      setSelectedContractIds(contracts.map((c) => c.id));
    }
  };

  const selectedContracts = contracts.filter((c) => selectedContractIds.includes(c.id));

  const handleCreate = async () => {
    if (!issueDate || !targetMonth || selectedContractIds.length === 0) {
      alert("発行日・対象月・契約を選択してください");
      return;
    }
    setCreating(true);
    try {
      const results: Invoice[] = [];
      for (const contractId of selectedContractIds) {
        const res = await fetch("/api/invoices", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            bulk: true,
            contract_id: contractId,
            issue_date: issueDate,
            target_months: [targetMonth],
          }),
        });
        if (res.ok) {
          const created = await res.json();
          results.push(...created);
        } else {
          const err = await res.json();
          alert(err.error || "作成に失敗しました");
          setCreating(false);
          return;
        }
      }
      onCreated(results);
    } finally {
      setCreating(false);
    }
  };

  const grandTotal = selectedContracts.reduce((s, c) => s + calcTotal(c), 0);

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 pt-8 px-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[88vh] flex flex-col">
        <div className="flex items-center justify-between px-5 py-4 border-b">
          <h2 className="font-bold text-gray-800">一括請求書作成</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl">×</button>
        </div>

        <div className="overflow-y-auto flex-1 p-5 space-y-5">
          {/* 発行日・対象月 */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">発行日 *</label>
              <input type="date" value={issueDate} onChange={(e) => setIssueDate(e.target.value)} className="input-field" />
            </div>
            <div>
              <label className="label">対象月 *</label>
              <select value={targetMonth} onChange={(e) => setTargetMonth(e.target.value)} className="input-field">
                {monthOptions.map((ym) => (
                  <option key={ym} value={ym}>{fmtMonth(ym)}</option>
                ))}
              </select>
            </div>
          </div>

          {/* 契約（作業者）選択 */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="label mb-0">作業者を選択 *</label>
              <button onClick={toggleAll} className="text-xs text-[#0f6e56] hover:underline">
                {selectedContractIds.length === contracts.length ? "すべて解除" : "すべて選択"}
              </button>
            </div>
            {contracts.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-4">契約が登録されていません</p>
            ) : (
              <div className="space-y-2">
                {contracts.map((c) => {
                  const client = c.client as Client | undefined;
                  const worker = c.member as { name: string } | undefined;
                  const checked = selectedContractIds.includes(c.id);
                  return (
                    <label key={c.id}
                      className={`flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-colors ${
                        checked ? "border-[#0f6e56] bg-[#f0faf7]" : "border-gray-200 hover:border-gray-300"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <input type="checkbox" checked={checked} onChange={() => toggleContract(c.id)}
                          className="w-4 h-4 accent-[#0f6e56]" />
                        <div>
                          <p className="text-sm font-medium text-gray-800">{worker?.name}</p>
                          <p className="text-xs text-gray-400">{client?.name} ／ {c.project_name}</p>
                        </div>
                      </div>
                      <span className="text-sm font-medium text-[#0f6e56]">¥{calcTotal(c).toLocaleString()}</span>
                    </label>
                  );
                })}
              </div>
            )}
          </div>

          {/* プレビュー */}
          {selectedContracts.length > 0 && (
            <div className="bg-gray-50 rounded-lg p-4">
              <p className="text-xs font-medium text-gray-600 mb-3">作成プレビュー（{selectedContracts.length}件）</p>
              <div className="space-y-2">
                {selectedContracts.map((c) => {
                  const due = calcDueDate(issueDate, c.payment_month_offset, c.payment_day);
                  return (
                    <div key={c.id} className="flex items-center justify-between text-sm">
                      <div>
                        <span className="text-gray-800 font-medium">{(c.member as { name: string } | undefined)?.name}</span>
                        <span className="text-gray-400 text-xs ml-2">支払: {new Date(due + "T00:00:00").toLocaleDateString("ja-JP")}</span>
                      </div>
                      <span className="text-[#0f6e56] font-medium">¥{calcTotal(c).toLocaleString()}</span>
                    </div>
                  );
                })}
              </div>
              <div className="border-t border-gray-200 mt-3 pt-3 flex justify-between text-sm font-bold text-gray-800">
                <span>合計</span>
                <span>¥{grandTotal.toLocaleString()}</span>
              </div>
            </div>
          )}
        </div>

        <div className="px-5 py-4 border-t flex gap-2 justify-end">
          <button onClick={onClose} className="btn-secondary">キャンセル</button>
          <button
            onClick={handleCreate}
            disabled={!issueDate || !targetMonth || selectedContractIds.length === 0 || creating}
            className="btn-primary"
          >
            {creating ? "作成中..." : `${selectedContractIds.length}件を一括作成`}
          </button>
        </div>
      </div>
    </div>
  );
}
