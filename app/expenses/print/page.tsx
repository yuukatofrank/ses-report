"use client";

import { useEffect, useState, useRef, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { ExpenseReport, EXPENSE_CATEGORIES } from "@/types";

function fmtMonth(ym: string): string {
  const [y, m] = ym.split("-");
  return `${y}年${parseInt(m)}月`;
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  return `${d.getFullYear()}/${d.getMonth() + 1}/${d.getDate()}`;
}

function statusLabel(status: ExpenseReport["status"]): string {
  const map = { draft: "下書き", submitted: "申請中", approved: "承認済", returned: "差し戻し" };
  return map[status];
}

function ExpensePage({
  report,
  innerRef,
}: {
  report: ExpenseReport;
  innerRef?: React.Ref<HTMLDivElement>;
}) {
  const items = [...(report.items ?? [])].sort((a, b) => a.sort_order - b.sort_order);
  const totalAmount = items.reduce((sum, item) => sum + item.amount, 0);

  return (
    <div
      ref={innerRef}
      style={{
        width: "210mm",
        minHeight: "297mm",
        padding: "20mm 18mm",
        boxSizing: "border-box",
        backgroundColor: "white",
        pageBreakAfter: "always",
        fontFamily: "'Hiragino Kaku Gothic Pro', 'Yu Gothic', 'Meiryo', sans-serif",
      }}
    >
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "8px" }}>
        <div>
          <h1 style={{ fontSize: "24px", fontWeight: "bold", color: "#1a1a2e", margin: "0 0 4px 0", letterSpacing: "0.3em" }}>
            経費精算書
          </h1>
          <p style={{ fontSize: "10px", color: "#999", margin: 0 }}>frankSQUARE管理システム</p>
        </div>
        <div style={{ textAlign: "right", fontSize: "11px", color: "#555" }}>
          <p style={{ margin: "0 0 2px 0" }}>出力日：{new Date().toLocaleDateString("ja-JP")}</p>
          <p style={{ margin: 0 }}>
            ステータス：
            <span style={{
              display: "inline-block",
              padding: "1px 8px",
              borderRadius: "10px",
              fontSize: "10px",
              fontWeight: "bold",
              backgroundColor: report.status === "approved" ? "#dcfce7" : report.status === "submitted" ? "#fef9c3" : "#f3f4f6",
              color: report.status === "approved" ? "#166534" : report.status === "submitted" ? "#854d0e" : "#374151",
            }}>
              {statusLabel(report.status)}
            </span>
          </p>
        </div>
      </div>

      <hr style={{ border: "none", borderTop: "2px solid #1a1a2e", margin: "12px 0 16px 0" }} />

      {/* Meta info */}
      <div style={{ display: "flex", gap: "40px", marginBottom: "20px", fontSize: "12px", color: "#333" }}>
        <div>
          <span style={{ color: "#888", marginRight: "8px" }}>申請者</span>
          <span style={{ fontWeight: "bold" }}>{report.member_name}</span>
        </div>
        <div>
          <span style={{ color: "#888", marginRight: "8px" }}>対象月</span>
          <span style={{ fontWeight: "bold" }}>{fmtMonth(report.month)}</span>
        </div>
        <div>
          <span style={{ color: "#888", marginRight: "8px" }}>明細件数</span>
          <span style={{ fontWeight: "bold" }}>{items.length}件</span>
        </div>
      </div>

      {/* Items table */}
      <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: "12px", fontSize: "11px" }}>
        <thead>
          <tr style={{ backgroundColor: "#1a1a2e", color: "white" }}>
            <th style={{ padding: "8px 10px", textAlign: "center", width: "5%" }}>No.</th>
            <th style={{ padding: "8px 10px", textAlign: "left", width: "14%" }}>日付</th>
            <th style={{ padding: "8px 10px", textAlign: "left", width: "28%" }}>件名</th>
            <th style={{ padding: "8px 10px", textAlign: "left", width: "15%" }}>カテゴリ</th>
            <th style={{ padding: "8px 10px", textAlign: "right", width: "15%" }}>金額</th>
            <th style={{ padding: "8px 10px", textAlign: "left", width: "23%" }}>備考</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item, i) => (
            <tr key={i} style={{ backgroundColor: i % 2 === 0 ? "#f8f9fa" : "white", height: "28px" }}>
              <td style={{ padding: "6px 10px", textAlign: "center", borderBottom: "1px solid #e5e7eb", color: "#888" }}>{i + 1}</td>
              <td style={{ padding: "6px 10px", borderBottom: "1px solid #e5e7eb" }}>{formatDate(item.date)}</td>
              <td style={{ padding: "6px 10px", borderBottom: "1px solid #e5e7eb", fontWeight: 500 }}>{item.title}</td>
              <td style={{ padding: "6px 10px", borderBottom: "1px solid #e5e7eb" }}>{EXPENSE_CATEGORIES[item.category]}</td>
              <td style={{ padding: "6px 10px", textAlign: "right", borderBottom: "1px solid #e5e7eb" }}>¥{item.amount.toLocaleString()}</td>
              <td style={{ padding: "6px 10px", borderBottom: "1px solid #e5e7eb", fontSize: "10px", color: "#666" }}>{item.description ?? ""}</td>
            </tr>
          ))}
          {/* Pad to minimum 10 rows for consistent layout */}
          {Array.from({ length: Math.max(0, 10 - items.length) }).map((_, i) => (
            <tr key={`pad-${i}`} style={{ backgroundColor: (items.length + i) % 2 === 0 ? "#f8f9fa" : "white", height: "28px" }}>
              <td style={{ padding: "6px 10px", borderBottom: "1px solid #e5e7eb" }}>&nbsp;</td>
              <td style={{ padding: "6px 10px", borderBottom: "1px solid #e5e7eb" }}></td>
              <td style={{ padding: "6px 10px", borderBottom: "1px solid #e5e7eb" }}></td>
              <td style={{ padding: "6px 10px", borderBottom: "1px solid #e5e7eb" }}></td>
              <td style={{ padding: "6px 10px", borderBottom: "1px solid #e5e7eb" }}></td>
              <td style={{ padding: "6px 10px", borderBottom: "1px solid #e5e7eb" }}></td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Total */}
      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: "24px" }}>
        <table style={{ fontSize: "12px", minWidth: "200px" }}>
          <tbody>
            <tr style={{ borderTop: "2px solid #1a1a2e" }}>
              <td style={{ padding: "8px 16px", fontWeight: "bold", textAlign: "right", color: "#333" }}>合計金額</td>
              <td style={{ padding: "8px 16px", fontWeight: "bold", textAlign: "right", fontSize: "16px", color: "#1a1a2e" }}>
                ¥{totalAmount.toLocaleString()}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Admin comment */}
      {report.admin_comment && (
        <div style={{ border: "1px solid #f97316", borderRadius: "6px", padding: "12px 16px", marginBottom: "20px", fontSize: "11px" }}>
          <p style={{ fontWeight: "bold", color: "#f97316", marginBottom: "4px", fontSize: "10px" }}>管理者コメント</p>
          <p style={{ color: "#333", margin: 0, whiteSpace: "pre-wrap" }}>{report.admin_comment}</p>
        </div>
      )}

      {/* Approval section */}
      <div style={{ marginTop: "auto", paddingTop: "24px" }}>
        <div style={{ display: "flex", justifyContent: "flex-end", gap: "24px" }}>
          <div style={{ textAlign: "center", width: "80px" }}>
            <div style={{ border: "1px solid #ccc", height: "60px", borderRadius: "4px", marginBottom: "4px" }}></div>
            <span style={{ fontSize: "10px", color: "#888" }}>承認</span>
          </div>
          <div style={{ textAlign: "center", width: "80px" }}>
            <div style={{ border: "1px solid #ccc", height: "60px", borderRadius: "4px", marginBottom: "4px" }}></div>
            <span style={{ fontSize: "10px", color: "#888" }}>申請者</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function ExpensePrintContent() {
  const searchParams = useSearchParams();
  const memberId = searchParams.get("member_id");
  const month = searchParams.get("month");

  const [reports, setReports] = useState<ExpenseReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);
  const [progress, setProgress] = useState(0);
  const pageRefs = useRef<(HTMLDivElement | null)[]>([]);

  useEffect(() => {
    const params = new URLSearchParams();
    if (memberId && memberId !== "all") params.set("member_id", memberId);
    if (month) params.set("month", month);
    // Fetch reports then fetch each with items
    fetch(`/api/expenses?${params.toString()}`)
      .then((r) => r.json())
      .then(async (list: ExpenseReport[]) => {
        const details = await Promise.all(
          list.map((r) => fetch(`/api/expenses/${r.id}`).then((res) => res.json()))
        );
        setReports(details);
        setLoading(false);
      });
  }, [memberId, month]);

  const handleDownloadAll = async () => {
    if (downloading || reports.length === 0) return;
    setDownloading(true);
    setProgress(0);

    const html2canvas = (await import("html2canvas")).default;
    const { jsPDF } = await import("jspdf");

    for (let i = 0; i < reports.length; i++) {
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

      const r = reports[i];
      const [y, m] = r.month.split("-");
      const filename = `経費精算書_${r.member_name}_${y}年${parseInt(m)}月`;
      pdf.save(`${filename}.pdf`);

      await new Promise((resolve) => setTimeout(resolve, 400));
    }

    setDownloading(false);
    setProgress(0);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen text-gray-400">
        読み込み中...
      </div>
    );
  }

  if (reports.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-screen text-gray-400">
        対象の経費申請がありません
      </div>
    );
  }

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

      <div className="no-print fixed top-4 right-4 z-40 flex gap-2 items-center">
        {downloading && (
          <span className="text-sm text-gray-600 bg-white px-3 py-2 rounded-lg shadow">
            処理中 {progress}/{reports.length}...
          </span>
        )}
        <button
          onClick={handleDownloadAll}
          disabled={downloading}
          className="bg-[#0f6e56] text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-[#138a6b] shadow disabled:opacity-50"
        >
          {downloading ? "生成中..." : `${reports.length}件をPDFダウンロード`}
        </button>
        <button
          onClick={() => window.print()}
          className="bg-white text-gray-600 border border-gray-300 px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-50 shadow"
        >
          印刷
        </button>
        <button
          onClick={() => window.close()}
          className="bg-white text-gray-600 border border-gray-300 px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-50 shadow"
        >
          閉じる
        </button>
      </div>

      {reports.map((report, i) => (
        <ExpensePage
          key={report.id}
          report={report}
          innerRef={(el) => {
            pageRefs.current[i] = el;
          }}
        />
      ))}
    </>
  );
}

export default function ExpensePrintPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center min-h-screen text-gray-400">
          読み込み中...
        </div>
      }
    >
      <ExpensePrintContent />
    </Suspense>
  );
}
