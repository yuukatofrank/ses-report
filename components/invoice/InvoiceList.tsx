"use client";

import { useState } from "react";
import { Invoice, Client, Contract } from "@/types";

interface Props {
  invoices: Invoice[];
  selectedId: string | null;
  onSelect: (invoice: Invoice) => void;
  onBulkCreate: () => void;
  onOpenMaster: () => void;
  checkedIds: string[];
  onToggleCheck: (id: string) => void;
  onBulkPdf: () => void;
}

function calcTotal(invoice: Invoice): number {
  const items = invoice.items ?? [];
  const sub = items.reduce((s, i) => s + i.unit_price * i.quantity, 0);
  return sub + Math.floor(items.filter((i) => !i.tax_exempt).reduce((s, i) => s + i.unit_price * i.quantity, 0) * 0.1);
}

function fmtMonth(ym: string): string {
  const [y, m] = ym.split("-");
  return `${y}年${parseInt(m)}月`;
}

export default function InvoiceList({ invoices, selectedId, onSelect, onBulkCreate, onOpenMaster, checkedIds, onToggleCheck, onBulkPdf }: Props) {
  // target_month でグループ化（降順）
  const months = Array.from(new Set(invoices.map((inv) => inv.target_month))).sort((a, b) => b.localeCompare(a));
  const grouped = months.map((ym) => ({ ym, items: invoices.filter((inv) => inv.target_month === ym) }));

  // 最新月をデフォルトで開く
  const [openMonths, setOpenMonths] = useState<Set<string>>(() => new Set(months.slice(0, 1)));

  const toggleMonth = (ym: string) => {
    setOpenMonths((prev) => {
      const next = new Set(prev);
      next.has(ym) ? next.delete(ym) : next.add(ym);
      return next;
    });
  };

  const toggleMonthCheck = (ym: string, monthInvoices: Invoice[]) => {
    const allChecked = monthInvoices.every((inv) => checkedIds.includes(inv.id));
    monthInvoices.forEach((inv) => {
      if (allChecked) {
        if (checkedIds.includes(inv.id)) onToggleCheck(inv.id);
      } else {
        if (!checkedIds.includes(inv.id)) onToggleCheck(inv.id);
      }
    });
  };

  const visibleInvoices = grouped.flatMap((g) => openMonths.has(g.ym) ? g.items : []);

  return (
    <aside className="fixed left-0 bottom-0 w-[260px] bg-white border-r border-gray-200 flex-col z-30 hidden md:flex" style={{ top: "var(--header-total)" }}>
      <div className="p-3 border-b border-gray-100 space-y-2">
        <button onClick={onBulkCreate} className="btn-primary w-full text-sm">一括請求書作成</button>
        {checkedIds.length > 0 ? (
          <button onClick={onBulkPdf} className="w-full text-sm bg-[#1a1a2e] text-white px-4 py-2 rounded-lg font-medium hover:bg-[#2a2a3e] transition-colors">
            PDF一括作成（{checkedIds.length}件）
          </button>
        ) : (
          <button onClick={onOpenMaster}
            className="w-full text-xs text-gray-500 hover:text-[#0f6e56] py-1.5 rounded-lg hover:bg-gray-50 transition-colors text-center">
            マスタ管理（得意先・契約）
          </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto">
        {invoices.length === 0 ? (
          <p className="text-xs text-gray-400 text-center mt-10 px-4">請求書がまだありません</p>
        ) : (
          grouped.map(({ ym, items }) => {
            const open = openMonths.has(ym);
            const allChecked = items.every((inv) => checkedIds.includes(inv.id));
            const someChecked = items.some((inv) => checkedIds.includes(inv.id));
            const monthTotal = items.reduce((s, inv) => s + calcTotal(inv), 0);

            return (
              <div key={ym}>
                {/* 月ヘッダー */}
                <div className="flex items-center justify-between px-3 py-2 bg-gray-50 border-b border-gray-100 sticky top-0 z-10">
                  <div className="flex items-center gap-2 min-w-0">
                    <input
                      type="checkbox"
                      checked={allChecked}
                      ref={(el) => { if (el) el.indeterminate = someChecked && !allChecked; }}
                      onChange={() => toggleMonthCheck(ym, items)}
                      className="w-3.5 h-3.5 accent-[#0f6e56] cursor-pointer shrink-0"
                      onClick={(e) => e.stopPropagation()}
                    />
                    <button onClick={() => toggleMonth(ym)} className="flex items-center gap-1 min-w-0">
                      <span className="text-xs font-semibold text-gray-700 truncate">{fmtMonth(ym)}分</span>
                      <span className="text-[10px] text-gray-400 shrink-0">（{items.length}件）</span>
                      <span className="text-[10px] shrink-0 text-gray-400">{open ? "▲" : "▼"}</span>
                    </button>
                  </div>
                  <span className="text-[10px] text-[#0f6e56] font-medium shrink-0 ml-1">¥{monthTotal.toLocaleString()}</span>
                </div>

                {/* 請求書一覧 */}
                {open && (
                  <ul>
                    {items.map((inv) => {
                      const contract = inv.contract as Contract | undefined;
                      const client = contract?.client as Client | undefined;
                      const worker = contract?.member as { name: string } | undefined;
                      const checked = checkedIds.includes(inv.id);
                      return (
                        <li key={inv.id} className={`border-b border-gray-50 ${selectedId === inv.id ? "bg-[#f0faf7] border-l-2 border-l-[#0f6e56]" : ""}`}>
                          <div className="flex items-stretch">
                            <div className="flex items-center px-2 cursor-pointer" onClick={(e) => { e.stopPropagation(); onToggleCheck(inv.id); }}>
                              <input type="checkbox" checked={checked} onChange={() => onToggleCheck(inv.id)}
                                className="w-4 h-4 accent-[#0f6e56] cursor-pointer" onClick={(e) => e.stopPropagation()} />
                            </div>
                            <button onClick={() => onSelect(inv)} className="flex-1 text-left px-3 py-2.5 transition-colors hover:bg-gray-50">
                              <div className="flex items-center justify-between mb-0.5">
                                <span className="text-xs font-medium text-gray-700 truncate">{inv.invoice_number}</span>
                              </div>
                              <p className="text-xs text-gray-500 truncate">{client?.name} / {worker?.name}</p>
                              <p className="text-xs font-medium text-[#0f6e56] mt-0.5">¥{calcTotal(inv).toLocaleString()}</p>
                            </button>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* 全選択 */}
      {invoices.length > 0 && (
        <div className="p-3 border-t border-gray-100">
          <button
            onClick={() => invoices.forEach((inv) => { if (!checkedIds.includes(inv.id)) onToggleCheck(inv.id); })}
            className="text-xs text-gray-400 hover:text-[#0f6e56] transition-colors w-full text-center"
          >
            {checkedIds.length === invoices.length ? "すべて解除" : "すべて選択"}
          </button>
        </div>
      )}
    </aside>
  );
}
