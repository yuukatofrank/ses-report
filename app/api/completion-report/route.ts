import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import ExcelJS from "exceljs";
import path from "path";

export async function POST(request: Request) {
  const { contract_id, target_month, report_date, total_hours } = await request.json();

  if (!contract_id || !target_month || !report_date || total_hours === undefined) {
    return NextResponse.json({ error: "必須項目が不足しています" }, { status: 400 });
  }

  const { data: contract } = await supabase
    .from("contracts")
    .select("*, client:clients(id, name), member:members(id, name)")
    .eq("id", contract_id)
    .single();

  if (!contract) return NextResponse.json({ error: "契約が見つかりません" }, { status: 404 });

  const clientName = (contract.client as { name: string })?.name ?? "";
  const workerName = (contract.member as { name: string })?.name ?? "";
  const [year, monthStr] = target_month.split("-");
  const month = parseInt(monthStr);
  const lastDay = new Date(parseInt(year), month, 0).getDate();

  // Load template
  const templatePath = path.join(process.cwd(), "templates", "completion_report_template.xlsx");
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(templatePath);
  const ws = workbook.getWorksheet("報告書");
  if (!ws) return NextResponse.json({ error: "テンプレートの読み込みに失敗しました" }, { status: 500 });

  // F4: Report date
  const reportDateObj = new Date(report_date + "T00:00:00");
  ws.getCell("F4").value = reportDateObj;

  // E5: Month
  ws.getCell("E5").value = `(${month}月)`;

  // A9: Client name
  ws.getCell("A9").value = `\u3000\u3000${clientName} 御中\u3000`;

  // B20: Order number
  ws.getCell("B20").value = contract.order_number ?? "";

  // B23: Task name (project_name)
  ws.getCell("B23").value = contract.task_description ?? contract.project_name;

  // A25: Work details
  const taskDesc = contract.task_description ?? contract.project_name;
  ws.getCell("A25").value =
    `(1)受託業務内容\n` +
    `\u3000    ${taskDesc}に準ずる業務\n` +
    `\n\n` +
    `(2)作業実績報告\n\n` +
    `\u3000\u3000\u3000総労働時間（${workerName}）：\u3000${total_hours}時間\n\n` +
    `(3)作業期間\n\u3000\n` +
    `\u3000\u3000\u3000${year}年${month}月1日\u3000～\u3000${year}年${month}月${lastDay}日`;

  // Generate buffer
  const buffer = await workbook.xlsx.writeBuffer();

  // Build filename
  const filename = `業務終了報告書_${workerName}_${year}年${month}月.xlsx`;
  const encodedFilename = encodeURIComponent(filename);

  return new NextResponse(buffer, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename*=UTF-8''${encodedFilename}`,
    },
  });
}
