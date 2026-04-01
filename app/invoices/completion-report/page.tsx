"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Contract, Client } from "@/types";

const COMPANY = {
  name: "株式会社frankSQUARE",
  rep: "代表取締役　加藤 悠",
  address1: "東京都葛飾区金町2-27-12",
  address2: "レイオーバー金町403",
};

function expandVars(template: string, vars: Record<string, string>): string {
  return template
    .replace(/\{project\}/g, vars.project ?? "")
    .replace(/\{worker\}/g, vars.worker ?? "")
    .replace(/\{month\}/g, vars.month ?? "")
    .replace(/\{client\}/g, vars.client ?? "");
}

export default function CompletionReportPage() {
  return <Suspense fallback={<div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh", color: "#999" }}>読み込み中...</div>}><CompletionReportContent /></Suspense>;
}

function CompletionReportContent() {
  const sp = useSearchParams();
  const contractId = sp.get("contract_id") ?? "";
  const targetMonth = sp.get("target_month") ?? "";
  const reportDate = sp.get("report_date") ?? "";
  const totalHours = sp.get("total_hours") ?? "";

  const [contract, setContract] = useState<Contract | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!contractId) { setLoading(false); return; }
    fetch("/api/contracts")
      .then((r) => r.json())
      .then((list: Contract[]) => {
        setContract(list.find((c) => c.id === contractId) ?? null);
        setLoading(false);
      });
  }, [contractId]);

  useEffect(() => {
    if (!loading && contract) {
      setTimeout(() => window.print(), 500);
    }
  }, [loading, contract]);

  if (loading) return <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh", color: "#999" }}>読み込み中...</div>;
  if (!contract) return <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh", color: "#999" }}>契約データが見つかりません</div>;

  const clientName = (contract.client as Client | undefined)?.name ?? "";
  const workerName = (contract.member as { name: string } | undefined)?.name ?? "";
  const [year, monthStr] = targetMonth.split("-");
  const month = parseInt(monthStr);
  const lastDay = new Date(parseInt(year), month, 0).getDate();

  const vars = { project: contract.project_name, worker: workerName, month: `${month}月`, client: clientName };

  // 受託業務名 = 案件名（project_name）
  const projectName = contract.project_name;
  // 受託業務内容 = task_description（変数展開）or 案件名
  const taskDetail = contract.task_description
    ? expandVars(contract.task_description, vars)
    : projectName;

  const orderNumber = contract.order_number ?? "";

  const rDate = new Date(reportDate + "T00:00:00");
  const formattedReportDate = `${rDate.getFullYear()}年${rDate.getMonth() + 1}月${rDate.getDate()}日`;

  return (
    <>
      <style>{`
        @page { size: A4; margin: 0; }
        @media print {
          body { margin: 0; padding: 0; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          .no-print { display: none !important; }
        }
        body { margin: 0; padding: 0; font-family: "MS Mincho", "ＭＳ 明朝", "Yu Mincho", serif; color: #000; }
      `}</style>

      <div className="no-print" style={{ position: "fixed", top: 16, right: 16, zIndex: 100, display: "flex", gap: 8 }}>
        <button onClick={() => window.print()} style={{ padding: "8px 20px", backgroundColor: "#0f6e56", color: "#fff", border: "none", borderRadius: 8, cursor: "pointer", fontSize: 14 }}>
          印刷 / PDF
        </button>
        <button onClick={() => window.close()} style={{ padding: "8px 20px", backgroundColor: "#fff", color: "#333", border: "1px solid #ddd", borderRadius: 8, cursor: "pointer", fontSize: 14 }}>
          閉じる
        </button>
      </div>

      <div style={{ width: "210mm", minHeight: "297mm", margin: "0 auto", padding: "15mm 20mm 15mm 20mm", boxSizing: "border-box", position: "relative" }}>

        {/* Report date - top right */}
        <div style={{ textAlign: "right", fontSize: 11, marginBottom: 8 }}>
          {formattedReportDate}
        </div>

        {/* Title */}
        <div style={{ textAlign: "center", marginBottom: 6 }}>
          <span style={{ fontSize: 20, fontWeight: "bold" }}>業務終了報告書（frankSQUARE）</span>
          <span style={{ fontSize: 20, fontWeight: "bold", marginLeft: 12 }}>({month}月)</span>
        </div>

        {/* Company info - right aligned block */}
        <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 20 }}>
          <div style={{ display: "flex", alignItems: "flex-start", gap: 16 }}>
            <div style={{ textAlign: "left", fontSize: 10, lineHeight: 1.7 }}>
              <div>{COMPANY.address1}</div>
              <div>{COMPANY.address2}</div>
              <div style={{ fontWeight: "bold", marginTop: 2 }}>{COMPANY.name}</div>
              <div>{COMPANY.rep}</div>
            </div>
            {/* Company stamp */}
            <div style={{ width: 56, height: 56, border: "2px solid #c00", borderRadius: 4, display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", marginTop: 2, flexShrink: 0 }}>
              <span style={{ color: "#c00", fontSize: 10, fontWeight: "bold", lineHeight: 1.2 }}>株式会社</span>
              <span style={{ color: "#c00", fontSize: 9, fontWeight: "bold", lineHeight: 1.2 }}>frank</span>
              <span style={{ color: "#c00", fontSize: 9, fontWeight: "bold", lineHeight: 1.2 }}>SQUARE</span>
            </div>
            {/* Personal stamp */}
            <div style={{ width: 36, height: 36, border: "2px solid #c00", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", marginTop: 12, flexShrink: 0 }}>
              <span style={{ color: "#c00", fontSize: 11, fontWeight: "bold", lineHeight: 1.1 }}>加</span>
              <span style={{ color: "#c00", fontSize: 11, fontWeight: "bold", lineHeight: 1.1 }}>藤</span>
            </div>
          </div>
        </div>

        {/* Client name */}
        <div style={{ fontSize: 16, marginBottom: 30 }}>
          　　{clientName} 御中
        </div>

        {/* Order number section */}
        <div style={{ fontSize: 9, marginBottom: 4, lineHeight: 1.6 }}>
          <span style={{ fontWeight: "bold" }}>注文番号</span>
          <span style={{ fontWeight: "bold", marginLeft: 8 }}>{orderNumber}</span>
          <span style={{ marginLeft: 8 }}>の以下の案件の作業が完了(納入)致しましたので</span>
        </div>
        <div style={{ fontSize: 9, marginBottom: 16 }}>
          通知申し上げます。ご検収をお願い申し上げます。
        </div>

        {/* Table */}
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 10 }}>
          <tbody>
            {/* Task name */}
            <tr>
              <td style={{ border: "1px solid #000", padding: "6px 10px", fontWeight: "bold", width: "18%", backgroundColor: "#f0f0f0", verticalAlign: "middle" }}>
                受託業務名
              </td>
              <td style={{ border: "1px solid #000", padding: "6px 10px", fontWeight: "bold", verticalAlign: "middle" }}>
                {projectName}
              </td>
            </tr>

            {/* 1. 作業報告明細 */}
            <tr>
              <td colSpan={2} style={{ border: "1px solid #000", padding: "6px 10px", fontWeight: "bold", backgroundColor: "#f0f0f0" }}>
                1. 作業報告明細
              </td>
            </tr>

            {/* Work details */}
            <tr>
              <td colSpan={2} style={{ border: "1px solid #000", padding: "12px 10px", lineHeight: 1.8, verticalAlign: "top", whiteSpace: "pre-wrap", minHeight: 200 }}>
                <div style={{ marginBottom: 12 }}>
                  <div>(1)受託業務内容</div>
                  <div style={{ paddingLeft: 24 }}>{taskDetail}に準ずる業務</div>
                </div>
                <div style={{ marginBottom: 12 }}>
                  <div>(2)作業実績報告</div>
                  <div style={{ paddingLeft: 24 }}>総労働時間（{workerName}）：　{totalHours}時間</div>
                </div>
                <div>
                  <div>(3)作業期間</div>
                  <div style={{ paddingLeft: 24 }}>{year}年{month}月1日　～　{year}年{month}月{lastDay}日</div>
                </div>
              </td>
            </tr>

            {/* 2. その他 */}
            <tr>
              <td colSpan={2} style={{ border: "1px solid #000", padding: "6px 10px", fontWeight: "bold", backgroundColor: "#f0f0f0" }}>
                2. その他
              </td>
            </tr>
            <tr>
              <td colSpan={2} style={{ border: "1px solid #000", padding: "10px", lineHeight: 2.0, minHeight: 80 }}>
                <div>（　　　　　　　　　　　　　　　　　　　　　　　　）</div>
                <div>（　　　　　　　　　　　　　　　　　　　　　　　　）</div>
                <div>（　　　　　　　　　　　　　　　　　　　　　　　　）</div>
              </td>
            </tr>
          </tbody>
        </table>

      </div>
    </>
  );
}
