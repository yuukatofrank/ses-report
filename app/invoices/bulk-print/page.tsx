"use client";

import { useEffect, useState, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { Invoice, Client, Contract } from "@/types";

function resolveFilename(invoice: Invoice): string {
  const contract = invoice.contract as Contract | undefined;
  const template = contract?.pdf_filename?.trim();
  if (!template) return invoice.invoice_number;

  const month = parseInt(invoice.target_month.split("-")[1]);
  const worker = (contract?.member as { name: string } | undefined)?.name ?? "";
  const project = contract?.project_name ?? "";
  const client = (contract?.client as Client | undefined)?.name ?? "";

  return template
    .replace(/\{month\}/g, `${month}月度`)
    .replace(/\{worker\}/g, worker)
    .replace(/\{project\}/g, project)
    .replace(/\{client\}/g, client);
}

const COMPANY = {
  name: "株式会社frankSQUARE",
  rep: "代表取締役　加藤 悠",
  address1: "東京都葛飾区金町2-27-12",
  address2: "レイオーバー金町403",
  tel: "TEL　03-6821-7378",
  regNo: "T2010401109189",
  bank: "東京東信用金庫（1320）　東砂支店（150）　普通3857536　株式会社frankSQUARE",
  bankName: "口座名義人　：　カ)フランクスクエア",
};

function fmt(d: string): string {
  const date = new Date(d + "T00:00:00");
  return `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日`;
}

function InvoicePage({ invoice, innerRef }: { invoice: Invoice; innerRef?: React.Ref<HTMLDivElement> }) {
  const items = [...(invoice.items ?? [])].sort((a, b) => a.sort_order - b.sort_order);
  const subtotal = items.reduce((s, i) => s + i.unit_price * i.quantity, 0);
  const taxBase = items.filter((i) => !i.tax_exempt).reduce((s, i) => s + i.unit_price * i.quantity, 0);
  const tax = Math.floor(taxBase * 0.1);
  const total = subtotal + tax;
  const contract = invoice.contract as Contract | undefined;
  const clientName = (contract?.client as Client | undefined)?.name ?? "";

  const paddedItems = [...items];
  while (paddedItems.length < 6) paddedItems.push({ name: "", unit_price: 0, quantity: 0, tax_exempt: false, is_additional: false, sort_order: 99 });

  return (
    <div ref={innerRef} data-invoice-number={invoice.invoice_number} style={{ width: "210mm", minHeight: "297mm", padding: "20mm 18mm", boxSizing: "border-box", backgroundColor: "white", pageBreakAfter: "always" }}>
      <h1 style={{ textAlign: "center", fontSize: "28px", fontWeight: "bold", letterSpacing: "0.5em", color: "#29ABE2", marginBottom: "16px" }}>
        御　請　求　書
      </h1>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "20px" }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: "18px", fontWeight: "bold", borderBottom: "2px solid #29ABE2", paddingBottom: "4px", marginBottom: "16px", display: "inline-block", minWidth: "220px" }}>
            {clientName}　御中
          </div>
          <p style={{ fontSize: "11px", color: "#444", marginBottom: "2px" }}>平素よりご愛顧を賜り、厚く御礼申し上げます。</p>
          <p style={{ fontSize: "11px", color: "#444" }}>下記の通りご請求申し上げます。</p>
          <div style={{ marginTop: "20px" }}>
            <div style={{ display: "flex", alignItems: "baseline", gap: "12px", marginBottom: "8px" }}>
              <span style={{ fontSize: "12px", color: "#444", minWidth: "90px" }}>ご請求金額</span>
              <span style={{ fontSize: "22px", fontWeight: "bold", color: "#222" }}>¥{total.toLocaleString()}</span>
            </div>
            <div style={{ display: "flex", alignItems: "baseline", gap: "12px" }}>
              <span style={{ fontSize: "12px", color: "#444", minWidth: "90px" }}>お支払予定日</span>
              <span style={{ fontSize: "14px", fontWeight: "bold", color: "#222" }}>{fmt(invoice.payment_due_date)}</span>
            </div>
            <p style={{ fontSize: "10px", color: "#888", marginLeft: "102px", marginTop: "2px" }}>※金融機関休業日は翌営業日</p>
          </div>
        </div>
        <div style={{ position: "relative", textAlign: "right", fontSize: "11px", color: "#333", minWidth: "220px" }}>
          <p style={{ fontSize: "10px", marginBottom: "2px" }}>発行日　　{fmt(invoice.issue_date)}</p>
          <p style={{ fontSize: "10px", marginBottom: "2px" }}>請求番号　{invoice.invoice_number}</p>
          <p style={{ fontSize: "10px", marginBottom: "10px" }}>登録番号　{COMPANY.regNo}</p>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.png" alt="frank SQUARE" style={{ height: "36px", marginBottom: "6px", marginLeft: "auto" }} />
          <p style={{ fontWeight: "bold", marginBottom: "2px" }}>{COMPANY.name}</p>
          <p style={{ marginBottom: "2px" }}>{COMPANY.rep}</p>
          <p style={{ marginBottom: "2px" }}>{COMPANY.address1}</p>
          <p style={{ marginBottom: "2px" }}>{COMPANY.address2}</p>
          <p style={{ marginBottom: "0" }}>{COMPANY.tel}</p>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/seal.png" alt="社判" style={{ position: "absolute", bottom: "-10px", right: "-10px", width: "72px", height: "72px", opacity: 0.6 }} />
        </div>
      </div>

      <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: "8px", fontSize: "12px" }}>
        <thead>
          <tr style={{ backgroundColor: "#29ABE2", color: "white" }}>
            <th style={{ padding: "8px 10px", textAlign: "left", width: "45%" }}>品名</th>
            <th style={{ padding: "8px 10px", textAlign: "right", width: "18%" }}>単価</th>
            <th style={{ padding: "8px 10px", textAlign: "center", width: "10%" }}>数量</th>
            <th style={{ padding: "8px 10px", textAlign: "right", width: "18%" }}>金額</th>
            <th style={{ padding: "8px 10px", textAlign: "center", width: "9%" }}>摘要</th>
          </tr>
        </thead>
        <tbody>
          {paddedItems.map((item, i) => (
            <tr key={i} style={{ backgroundColor: i % 2 === 0 ? "#EAF6FF" : "white", height: "32px" }}>
              <td style={{ padding: "6px 10px", borderBottom: "1px solid #d0e8f5" }}>{item.name}</td>
              <td style={{ padding: "6px 10px", textAlign: "right", borderBottom: "1px solid #d0e8f5" }}>
                {item.unit_price ? `¥${item.unit_price.toLocaleString()}` : ""}
              </td>
              <td style={{ padding: "6px 10px", textAlign: "center", borderBottom: "1px solid #d0e8f5" }}>
                {item.quantity && item.name ? item.quantity : ""}
              </td>
              <td style={{ padding: "6px 10px", textAlign: "right", borderBottom: "1px solid #d0e8f5" }}>
                {item.name ? `¥${(item.unit_price * item.quantity).toLocaleString()}` : ""}
              </td>
              <td style={{ padding: "6px 10px", textAlign: "center", borderBottom: "1px solid #d0e8f5", fontSize: "11px" }}>
                {item.tax_exempt && item.name ? "非課税" : ""}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <div style={{ display: "flex", justifyContent: "flex-end" }}>
        <table style={{ fontSize: "12px", minWidth: "200px" }}>
          <tbody>
            <tr><td style={{ padding: "4px 16px", color: "#555", textAlign: "right" }}>小　計</td><td style={{ padding: "4px 16px", textAlign: "right" }}>¥{subtotal.toLocaleString()}</td></tr>
            <tr><td style={{ padding: "4px 16px", color: "#555", textAlign: "right" }}>消費税（10%）</td><td style={{ padding: "4px 16px", textAlign: "right" }}>¥{tax.toLocaleString()}</td></tr>
            <tr style={{ borderTop: "1px solid #ccc" }}>
              <td style={{ padding: "6px 16px", fontWeight: "bold", textAlign: "right" }}>合　計</td>
              <td style={{ padding: "6px 16px", fontWeight: "bold", textAlign: "right" }}>¥{total.toLocaleString()}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div style={{ marginTop: "24px", border: "1px solid #aaa", borderRadius: "4px", padding: "12px 16px", fontSize: "11px" }}>
        <p style={{ fontWeight: "bold", marginBottom: "6px", color: "#444" }}>お振込先</p>
        <p style={{ marginBottom: "4px" }}>{COMPANY.bank}</p>
        <p>{COMPANY.bankName}</p>
      </div>
    </div>
  );
}

function BulkPrintContent() {
  const searchParams = useSearchParams();
  const ids = searchParams.get("ids")?.split(",") ?? [];
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [filenames, setFilenames] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [showFilenameEditor, setShowFilenameEditor] = useState(false);
  const pageRefs = useRef<(HTMLDivElement | null)[]>([]);

  useEffect(() => {
    Promise.all(ids.map((id) => fetch(`/api/invoices/${id}`).then((r) => r.json())))
      .then((data) => {
        setInvoices(data);
        setFilenames(data.map((inv: Invoice) => resolveFilename(inv)));
        setLoading(false);
      });
  }, []);

  const handleDownloadAll = async () => {
    if (downloading) return;
    setDownloading(true);
    setProgress(0);

    const html2canvas = (await import("html2canvas")).default;
    const { jsPDF } = await import("jspdf");

    for (let i = 0; i < invoices.length; i++) {
      const el = pageRefs.current[i];
      if (!el) continue;

      setProgress(i + 1);

      const canvas = await html2canvas(el, {
        scale: 2,
        useCORS: true,
        backgroundColor: "#ffffff",
        logging: false,
      });

      const imgData = canvas.toDataURL("image/jpeg", 0.78);
      const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
      pdf.addImage(imgData, "JPEG", 0, 0, 210, 297);
      const name = (filenames[i] || invoices[i].invoice_number).replace(/\.pdf$/i, "");
      pdf.save(`${name}.pdf`);

      await new Promise((r) => setTimeout(r, 400));
    }

    setDownloading(false);
    setProgress(0);
  };

  if (loading) return <div className="flex items-center justify-center min-h-screen text-gray-400">読み込み中...</div>;

  return (
    <>
      <style>{`
        @page { size: A4; margin: 0; }
        @media print {
          .no-print { display: none !important; }
          body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        }
        body { margin: 0; font-family: "Hiragino Kaku Gothic Pro", "Yu Gothic", "Meiryo", sans-serif; background: #f0f0f0; }
      `}</style>

      {/* ファイル名編集パネル */}
      {showFilenameEditor && (
        <div className="no-print fixed inset-0 z-50 bg-black/40 flex items-center justify-center px-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-gray-800 text-sm">ファイル名を編集</h3>
              <button onClick={() => setShowFilenameEditor(false)} className="text-gray-400 hover:text-gray-600 text-xl leading-none">×</button>
            </div>
            <div className="space-y-2 max-h-[60vh] overflow-y-auto">
              {invoices.map((inv, i) => (
                <div key={inv.id} className="flex items-center gap-2">
                  <span className="text-xs text-gray-400 shrink-0 w-4">{i + 1}.</span>
                  <input
                    type="text"
                    value={filenames[i] ?? ""}
                    onChange={(e) => setFilenames((prev) => prev.map((f, idx) => idx === i ? e.target.value : f))}
                    className="flex-1 text-sm border border-gray-200 rounded-lg px-3 py-1.5 focus:outline-none focus:border-[#0f6e56]"
                  />
                  <span className="text-xs text-gray-400 shrink-0">.pdf</span>
                </div>
              ))}
            </div>
            <button onClick={() => setShowFilenameEditor(false)} className="w-full bg-[#0f6e56] text-white py-2 rounded-lg text-sm font-medium hover:bg-[#138a6b]">
              確定
            </button>
          </div>
        </div>
      )}

      <div className="no-print fixed top-4 right-4 z-40 flex gap-2 items-center">
        {downloading && (
          <span className="text-sm text-gray-600 bg-white px-3 py-2 rounded-lg shadow">
            処理中 {progress}/{invoices.length}...
          </span>
        )}
        <button
          onClick={() => setShowFilenameEditor(true)}
          disabled={downloading}
          className="bg-white text-gray-600 border border-gray-300 px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-50 shadow disabled:opacity-50"
        >
          ファイル名編集
        </button>
        <button
          onClick={handleDownloadAll}
          disabled={downloading}
          className="bg-[#0f6e56] text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-[#138a6b] shadow disabled:opacity-50"
        >
          {downloading ? "生成中..." : `${invoices.length}件をダウンロード`}
        </button>
        <button onClick={() => window.print()}
          className="bg-white text-gray-600 border border-gray-300 px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-50 shadow">
          まとめて印刷
        </button>
        <button onClick={() => window.close()}
          className="bg-white text-gray-600 border border-gray-300 px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-50 shadow">
          閉じる
        </button>
      </div>

      {invoices.map((inv, i) => (
        <InvoicePage
          key={inv.id}
          invoice={inv}
          innerRef={(el) => { pageRefs.current[i] = el; }}
        />
      ))}
    </>
  );
}

export default function BulkPrintPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-screen text-gray-400">読み込み中...</div>}>
      <BulkPrintContent />
    </Suspense>
  );
}
