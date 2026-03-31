"use client";

import { useState } from "react";
import { Invoice, InvoiceItem } from "@/types";

interface Props {
  invoice: Invoice;
  onSave: (invoice: Invoice) => void;
  onDelete: () => void;
  onCancel: () => void;
}

function fmtMonth(ym: string): string {
  const [y, m] = ym.split("-");
  return `${y}年${parseInt(m)}月`;
}

const EMPTY_EXTRA = (): InvoiceItem => ({
  name: "", unit_price: 0, quantity: 1, tax_exempt: false, is_additional: true, sort_order: 99,
});

export default function InvoiceForm({ invoice, onSave, onDelete, onCancel }: Props) {
  const [issueDate, setIssueDate] = useState(invoice.issue_date);
  const [paymentDueDate, setPaymentDueDate] = useState(invoice.payment_due_date);
  const [invoiceNumber, setInvoiceNumber] = useState(invoice.invoice_number);
  const [memo, setMemo] = useState(invoice.memo ?? "");
  const [items, setItems] = useState<InvoiceItem[]>(
    [...(invoice.items ?? [])].sort((a, b) => a.sort_order - b.sort_order)
  );
  const [saving, setSaving] = useState(false);

  const baseItems = items.filter((i) => !i.is_additional);
  const extraItems = items.filter((i) => i.is_additional);

  const updateExtra = (idx: number, field: keyof InvoiceItem, value: string | number | boolean) => {
    const extraIdx = items.findIndex((i) => i.is_additional && items.filter((x) => x.is_additional).indexOf(i) === idx);
    // 追加項目のみ更新
    let count = 0;
    setItems((prev) => prev.map((item) => {
      if (!item.is_additional) return item;
      if (count++ === idx) return { ...item, [field]: value };
      return item;
    }));
  };

  const addExtra = () => setItems((prev) => [...prev, EMPTY_EXTRA()]);

  const removeExtra = (idx: number) => {
    let count = 0;
    setItems((prev) => prev.filter((item) => {
      if (!item.is_additional) return true;
      return count++ !== idx;
    }));
  };

  const subtotal = items.reduce((s, i) => s + i.unit_price * i.quantity, 0);
  const tax = Math.floor(items.filter((i) => !i.tax_exempt).reduce((s, i) => s + i.unit_price * i.quantity, 0) * 0.1);
  const total = subtotal + tax;

  const handleSave = async () => {
    setSaving(true);
    const res = await fetch(`/api/invoices/${invoice.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ invoice_number: invoiceNumber, issue_date: issueDate, target_month: invoice.target_month, payment_due_date: paymentDueDate, memo, items }),
    });
    if (res.ok) {
      onSave(await res.json());
    } else {
      alert("保存に失敗しました");
    }
    setSaving(false);
  };

  const handleDelete = () => {
    if (!confirm("この請求書を削除しますか？")) return;
    onDelete();
  };

  return (
    <div className="max-w-3xl mx-auto px-4 py-6 space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-bold text-gray-800">{fmtMonth(invoice.target_month)}分 請求書を編集</h2>
          <p className="text-xs text-gray-400 mt-0.5">
            {(invoice.contract?.client as { name: string } | undefined)?.name} × {invoice.contract?.project_name} × {(invoice.contract?.member as { name: string } | undefined)?.name}
          </p>
        </div>
      </div>

      {/* 基本情報 */}
      <div className="card p-5 space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label">発行日</label>
            <input type="date" value={issueDate} onChange={(e) => setIssueDate(e.target.value)} className="input-field" />
          </div>
          <div>
            <label className="label">請求番号</label>
            <input type="text" value={invoiceNumber} onChange={(e) => setInvoiceNumber(e.target.value)} className="input-field" />
          </div>
        </div>
        <div>
          <label className="label">支払予定日</label>
          <input type="date" value={paymentDueDate} onChange={(e) => setPaymentDueDate(e.target.value)} className="input-field max-w-[200px]" />
        </div>
      </div>

      {/* 基本明細（契約テンプレートから展開済み） */}
      <div className="card overflow-hidden">
        <div className="px-5 py-3 border-b bg-gray-50 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-gray-700">基本明細</h3>
          <span className="text-xs text-gray-400">契約テンプレートから自動生成</span>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-xs text-gray-500 border-b">
              <th className="text-left px-4 py-2 font-medium">品名</th>
              <th className="text-right px-4 py-2 font-medium">単価</th>
              <th className="text-center px-4 py-2 font-medium">数量</th>
              <th className="text-right px-4 py-2 font-medium">金額</th>
              <th className="text-center px-4 py-2 font-medium">摘要</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {baseItems.map((item, i) => (
              <tr key={i} className="hover:bg-gray-50">
                <td className="px-4 py-2.5 text-gray-800">{item.name}</td>
                <td className="px-4 py-2.5 text-right text-gray-600">¥{item.unit_price.toLocaleString()}</td>
                <td className="px-4 py-2.5 text-center text-gray-600">{item.quantity}</td>
                <td className="px-4 py-2.5 text-right text-gray-800">¥{(item.unit_price * item.quantity).toLocaleString()}</td>
                <td className="px-4 py-2.5 text-center text-xs text-gray-400">{item.tax_exempt ? "非課税" : ""}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* 追加明細 */}
      <div className="card overflow-hidden">
        <div className="px-5 py-3 border-b bg-gray-50">
          <h3 className="text-sm font-semibold text-gray-700">追加項目</h3>
        </div>
        <div className="p-5 space-y-2">
          {extraItems.length === 0 && (
            <p className="text-xs text-gray-400">追加項目はありません</p>
          )}
          <div className="grid text-xs text-gray-500 font-medium mb-1" style={{ gridTemplateColumns: "1fr 120px 60px 100px 80px 32px" }}>
              <span>品名</span>
              <span className="text-right">単価</span>
              <span className="text-center">数量</span>
              <span className="text-right">金額</span>
              <span className="text-center">非課税</span>
              <span />
            </div>
          {extraItems.map((item, i) => (
            <div key={i} className="grid gap-2 items-center" style={{ gridTemplateColumns: "1fr 120px 60px 100px 80px 32px" }}>
              <input type="text" value={item.name} onChange={(e) => updateExtra(i, "name", e.target.value)}
                placeholder="品名" className="input-field text-sm" />
              <input type="number" value={item.unit_price || ""} onChange={(e) => updateExtra(i, "unit_price", Number(e.target.value))}
                className="input-field text-sm text-right" placeholder="0" />
              <input type="number" value={item.quantity} onChange={(e) => updateExtra(i, "quantity", Math.max(1, Number(e.target.value)))}
                min={1} className="input-field text-sm text-center" />
              <span className="text-sm text-right text-gray-700 pr-1">¥{(item.unit_price * item.quantity).toLocaleString()}</span>
              <div className="flex justify-center">
                <input type="checkbox" checked={item.tax_exempt} onChange={(e) => updateExtra(i, "tax_exempt", e.target.checked)} className="w-4 h-4 accent-[#0f6e56]" />
              </div>
              <button onClick={() => removeExtra(i)} className="text-gray-300 hover:text-red-400 text-lg">×</button>
            </div>
          ))}
          <button onClick={addExtra} className="text-sm text-[#0f6e56] hover:underline mt-1">＋ 追加項目を追加</button>
        </div>

        {/* 合計 */}
        <div className="border-t px-5 py-4 bg-gray-50">
          <div className="space-y-1 text-sm max-w-xs ml-auto">
            <div className="flex justify-between text-gray-600"><span>小計</span><span>¥{subtotal.toLocaleString()}</span></div>
            <div className="flex justify-between text-gray-600"><span>消費税（10%）</span><span>¥{tax.toLocaleString()}</span></div>
            <div className="flex justify-between font-bold text-gray-800 text-base pt-1 border-t border-gray-200">
              <span>合計</span><span>¥{total.toLocaleString()}</span>
            </div>
          </div>
        </div>
      </div>

      {/* メモ */}
      <div className="card p-5">
        <label className="label">メモ（社内用）</label>
        <textarea value={memo} onChange={(e) => setMemo(e.target.value)} className="textarea-field" rows={2} />
      </div>

      <div className="flex items-center justify-between">
        <button onClick={handleDelete} className="btn-danger">削除</button>
        <div className="flex gap-2">
          <button onClick={onCancel} className="btn-secondary">キャンセル</button>
          <button onClick={handleSave} disabled={saving} className="btn-primary">{saving ? "保存中..." : "保存"}</button>
        </div>
      </div>
    </div>
  );
}
