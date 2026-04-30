import { NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase";
import { ContractItem, InvoiceItem } from "@/types";
import type { SupabaseClient } from "@supabase/supabase-js";

function expandName(template: string, targetMonth: string, workerName: string, projectName: string): string {
  const month = parseInt(targetMonth.split("-")[1]);
  return template
    .replace(/\{month\}/g, `${month}月度`)
    .replace(/\{worker\}/g, workerName)
    .replace(/\{project\}/g, projectName);
}

function calcDueDate(issueDate: string, offset: number, day: number): string {
  const d = new Date(issueDate + "T00:00:00");
  // 発行日の前月を基準に offset を適用
  const baseMonth = d.getMonth() - 1;
  if (day === 0) return new Date(d.getFullYear(), baseMonth + offset + 1, 0).toISOString().split("T")[0];
  return new Date(d.getFullYear(), baseMonth + offset, day).toISOString().split("T")[0];
}

async function getNextInvoiceNumber(supabase: SupabaseClient, issueDate: string): Promise<string> {
  const ym = issueDate.substring(0, 7).replace("-", "");
  const prefix = `No.${ym}-`;
  // Get the max existing number for this month
  const { data } = await supabase
    .from("invoices")
    .select("invoice_number")
    .like("invoice_number", `${prefix}%`)
    .order("invoice_number", { ascending: false })
    .limit(1);

  let maxNum = 0;
  if (data && data.length > 0) {
    const last = data[0].invoice_number as string;
    const numPart = last.replace(prefix, "");
    maxNum = parseInt(numPart) || 0;
  }
  return `${prefix}${String(maxNum + 1).padStart(3, "0")}`;
}

export async function GET() {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("invoices")
    .select(`*, contract:contracts(*, client:clients(id, name), member:members(id, name)), items:invoice_items(*)`)
    .order("issue_date", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function POST(request: Request) {
  const supabase = createSupabaseAdminClient();
  const body = await request.json();

  // 一括作成
  if (body.bulk) {
    const { contract_id, issue_date, target_months } = body;
    if (!contract_id || !issue_date || !target_months?.length) {
      return NextResponse.json({ error: "必須項目が不足しています" }, { status: 400 });
    }

    const { data: contract } = await supabase
      .from("contracts")
      .select("*, member:members(id, name), items:contract_items(*)")
      .eq("id", contract_id)
      .single();

    if (!contract) return NextResponse.json({ error: "契約が見つかりません" }, { status: 404 });

    const workerName = (contract.member as { name: string })?.name ?? "";
    const payment_due_date = calcDueDate(issue_date, contract.payment_month_offset, contract.payment_day);
    const created: unknown[] = [];

    for (const target_month of target_months) {
      const invoice_number = await getNextInvoiceNumber(supabase, issue_date);
      const { data: invoice, error: invErr } = await supabase
        .from("invoices")
        .insert({ contract_id, invoice_number, issue_date, target_month, payment_due_date, memo: null })
        .select()
        .single();

      if (invErr) return NextResponse.json({ error: invErr.message }, { status: 500 });

      const items = (contract.items as ContractItem[]).map((item, i) => ({
        invoice_id: invoice.id,
        name: expandName(item.name, target_month, workerName, contract.project_name),
        unit_price: item.unit_price,
        quantity: 1,
        tax_exempt: item.tax_exempt,
        is_additional: false,
        sort_order: i,
      }));
      if (items.length) await supabase.from("invoice_items").insert(items);
      created.push(invoice);
    }

    return NextResponse.json(created, { status: 201 });
  }

  // 単体作成（追加項目あり等の手動作成用）
  const { contract_id, invoice_number, issue_date, target_month, payment_due_date, memo, items } = body;
  if (!contract_id || !issue_date || !target_month || !payment_due_date) {
    return NextResponse.json({ error: "必須項目が不足しています" }, { status: 400 });
  }

  const finalNumber = invoice_number?.trim() || (await getNextInvoiceNumber(supabase, issue_date));
  const { data: invoice, error } = await supabase
    .from("invoices")
    .insert({ contract_id, invoice_number: finalNumber, issue_date, target_month, payment_due_date, memo: memo || null })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  if (items?.length) {
    const rows = items.map((item: InvoiceItem, i: number) => ({
      invoice_id: invoice.id,
      name: item.name,
      unit_price: item.unit_price,
      quantity: item.quantity,
      tax_exempt: item.tax_exempt,
      is_additional: item.is_additional ?? false,
      sort_order: i,
    }));
    await supabase.from("invoice_items").insert(rows);
  }

  const { data: full } = await supabase
    .from("invoices")
    .select(`*, contract:contracts(*, client:clients(id, name), member:members(id, name)), items:invoice_items(*)`)
    .eq("id", invoice.id)
    .single();

  return NextResponse.json(full, { status: 201 });
}
