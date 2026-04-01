"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase";
import { Invoice, Client, Contract } from "@/types";
import InvoiceList from "@/components/invoice/InvoiceList";
import InvoiceForm from "@/components/invoice/InvoiceForm";
import BulkInvoiceCreator from "@/components/invoice/BulkInvoiceCreator";
import ContractManager from "@/components/invoice/ContractManager";

import CompletionReportModal from "@/components/invoice/CompletionReportModal";

type ViewMode = "idle" | "edit" | "view";

function calcTotal(invoice: Invoice): number {
  const items = invoice.items ?? [];
  const sub = items.reduce((s, i) => s + i.unit_price * i.quantity, 0);
  return sub + Math.floor(items.filter((i) => !i.tax_exempt).reduce((s, i) => s + i.unit_price * i.quantity, 0) * 0.1);
}

function fmtMonth(ym: string): string {
  const [y, m] = ym.split("-");
  return `${y}年${parseInt(m)}月`;
}

export default function InvoicesPage() {
  const router = useRouter();
  const supabase = createSupabaseBrowserClient();
  const [loading, setLoading] = useState(true);
  const [unauthorized, setUnauthorized] = useState(false);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [selected, setSelected] = useState<Invoice | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>("idle");
  const [showBulk, setShowBulk] = useState(false);
  const [showMaster, setShowMaster] = useState(false);
  const [checkedIds, setCheckedIds] = useState<string[]>([]);
  const [showCompletion, setShowCompletion] = useState(false);

  const adminEmail = process.env.NEXT_PUBLIC_ADMIN_EMAIL;

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) { router.push("/auth"); return; }
      if (adminEmail && data.user.email !== adminEmail) { setUnauthorized(true); setLoading(false); return; }
      fetchInvoices();
    });
  }, []);

  const fetchInvoices = async () => {
    const res = await fetch("/api/invoices");
    if (res.ok) setInvoices(await res.json());
    setLoading(false);
  };

  const handleBulkCreated = async (created: Invoice[]) => {
    const res = await fetch("/api/invoices");
    const all: Invoice[] = res.ok ? await res.json() : [];
    setInvoices(all);
    setShowBulk(false);
    if (created.length === 1) {
      const full = all.find((i) => i.id === created[0].id);
      setSelected(full ?? created[0]);
      setViewMode("view");
    } else { setSelected(null); setViewMode("idle"); }
  };

  const handleSelect = (invoice: Invoice) => { setSelected(invoice); setViewMode("view"); };

  const handleSave = async (saved: Invoice) => { await fetchInvoices(); setSelected(saved); setViewMode("view"); };

  const handleToggleCheck = (id: string) => {
    setCheckedIds((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);
  };

  const handleBulkPdf = () => {
    if (checkedIds.length === 0) return;
    window.open(`/invoices/bulk-print?ids=${checkedIds.join(",")}`, "_blank");
  };

  const handleDelete = async () => {
    if (!selected) return;
    const res = await fetch(`/api/invoices/${selected.id}`, { method: "DELETE" });
    if (res.ok) { await fetchInvoices(); setSelected(null); setViewMode("idle"); }
    else alert("削除に失敗しました");
  };

  if (loading) return <div className="flex items-center justify-center min-h-screen text-gray-500">読み込み中...</div>;
  if (unauthorized) return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <div className="text-4xl mb-4">🚫</div>
        <p className="text-gray-600 font-medium">アクセス権限がありません</p>
        <button onClick={() => router.push("/")} className="mt-4 text-[#0f6e56] hover:underline text-sm">← トップへ戻る</button>
      </div>
    </div>
  );

  const subtotal = selected ? (selected.items ?? []).reduce((s, i) => s + i.unit_price * i.quantity, 0) : 0;
  const tax = selected ? Math.floor((selected.items ?? []).filter((i) => !i.tax_exempt).reduce((s, i) => s + i.unit_price * i.quantity, 0) * 0.1) : 0;
  const total = subtotal + tax;

  return (
    <div className="min-h-screen" style={{ backgroundColor: "#f7f7f5" }}>
      <div className="fixed top-0 left-0 right-0 z-40" style={{ backgroundColor: "#1a1a2e", paddingTop: "var(--sat)" }}>
        <div className="flex items-center justify-between px-3 md:px-6" style={{ height: "var(--header-h)" }}>
          <h1 className="text-white font-bold text-sm md:text-lg truncate">請求書管理</h1>
          <button onClick={() => router.push("/")} className="text-white/70 hover:text-white text-xs md:text-sm border border-white/20 px-2 md:px-3 py-1.5 rounded-lg hover:bg-white/10 transition-colors whitespace-nowrap">
            ← 月報へ
          </button>
        </div>
      </div>

      <InvoiceList
        invoices={invoices}
        selectedId={selected?.id ?? null}
        onSelect={handleSelect}
        onBulkCreate={() => setShowBulk(true)}
        onOpenMaster={() => setShowMaster(true)}
        checkedIds={checkedIds}
        onToggleCheck={handleToggleCheck}
        onBulkPdf={handleBulkPdf}
      />

      <main className="md:ml-[260px] min-h-screen" style={{ paddingTop: "var(--header-total)" }}>
        {viewMode === "idle" && (
          <div className="flex flex-col items-center justify-center text-gray-400 px-4 text-center" style={{ minHeight: "calc(100vh - var(--header-total))" }}>
            <div className="text-5xl mb-4">🧾</div>
            <p className="text-base font-medium">請求書を選択するか、一括作成してください</p>
            <button onClick={() => setShowBulk(true)} className="mt-4 btn-primary text-sm">一括請求書作成</button>
          </div>
        )}

        {viewMode === "edit" && selected && (
          <InvoiceForm
            invoice={selected}
            onSave={handleSave}
            onDelete={handleDelete}
            onCancel={() => setViewMode("view")}
          />
        )}

        {viewMode === "view" && selected && (
          <div className="max-w-3xl mx-auto px-4 py-6 space-y-5">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-gray-800">{selected.invoice_number}</h2>
                <p className="text-xs text-gray-400 mt-0.5">
                  {fmtMonth(selected.target_month)}分 ／ {(selected.contract?.client as Client | undefined)?.name} ／ {(selected.contract?.member as { name: string } | undefined)?.name}
                </p>
              </div>
              <div className="flex gap-2">
                <button onClick={() => setShowCompletion(true)} className="btn-secondary text-sm">業務終了報告書</button>
                <button onClick={() => window.open(`/invoices/${selected.id}/print`, "_blank")} className="btn-secondary text-sm">印刷 / PDF</button>
                <button onClick={() => setViewMode("edit")} className="btn-primary text-sm">編集</button>
              </div>
            </div>

            <div className="card p-5">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div><p className="text-xs text-gray-500">発行日</p><p>{new Date(selected.issue_date).toLocaleDateString("ja-JP")}</p></div>
                <div><p className="text-xs text-gray-500">支払予定日</p><p>{new Date(selected.payment_due_date).toLocaleDateString("ja-JP")}</p></div>
                <div><p className="text-xs text-gray-500">案件</p><p>{(selected.contract as Contract | undefined)?.project_name}</p></div>
                <div><p className="text-xs text-gray-500">合計</p><p className="font-bold text-[#0f6e56]">¥{total.toLocaleString()}</p></div>
              </div>
            </div>

            <div className="card overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 text-xs text-gray-500 border-b">
                    <th className="text-left px-4 py-2 font-medium">品名</th>
                    <th className="text-right px-4 py-2 font-medium">単価</th>
                    <th className="text-center px-4 py-2 font-medium">数量</th>
                    <th className="text-right px-4 py-2 font-medium">金額</th>
                    <th className="text-center px-4 py-2 font-medium">摘要</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {(selected.items ?? []).map((item, i) => (
                    <tr key={i} className={`hover:bg-gray-50 ${item.is_additional ? "bg-yellow-50/50" : ""}`}>
                      <td className="px-4 py-3 text-gray-800">{item.name}{item.is_additional && <span className="ml-1 text-xs text-yellow-600 bg-yellow-100 px-1 rounded">追加</span>}</td>
                      <td className="px-4 py-3 text-right text-gray-600">¥{item.unit_price.toLocaleString()}</td>
                      <td className="px-4 py-3 text-center text-gray-600">{item.quantity}</td>
                      <td className="px-4 py-3 text-right text-gray-800">¥{(item.unit_price * item.quantity).toLocaleString()}</td>
                      <td className="px-4 py-3 text-center text-xs text-gray-400">{item.tax_exempt ? "非課税" : ""}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="border-t px-5 py-4 bg-gray-50">
                <div className="space-y-1 text-sm max-w-xs ml-auto">
                  <div className="flex justify-between text-gray-600"><span>小計</span><span>¥{subtotal.toLocaleString()}</span></div>
                  <div className="flex justify-between text-gray-600"><span>消費税（10%）</span><span>¥{tax.toLocaleString()}</span></div>
                  <div className="flex justify-between font-bold text-gray-800 text-base pt-1 border-t border-gray-200"><span>合計</span><span>¥{total.toLocaleString()}</span></div>
                </div>
              </div>
            </div>

            {selected.memo && (
              <div className="card p-4"><p className="text-xs text-gray-500 mb-1">メモ</p><p className="text-sm text-gray-700">{selected.memo}</p></div>
            )}
          </div>
        )}
      </main>

      {showBulk && <BulkInvoiceCreator onCreated={handleBulkCreated} onClose={() => setShowBulk(false)} />}
      {showMaster && <ContractManager onClose={() => setShowMaster(false)} />}
      {showCompletion && selected && (
        <CompletionReportModal
          contractId={selected.contract?.id ?? selected.contract_id}
          targetMonth={selected.target_month}
          clientName={(selected.contract?.client as Client | undefined)?.name ?? ""}
          workerName={(selected.contract?.member as { name: string } | undefined)?.name ?? ""}
          projectName={selected.contract?.project_name ?? ""}
          onClose={() => setShowCompletion(false)}
        />
      )}
    </div>
  );
}
