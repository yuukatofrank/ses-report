import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { ContractItem } from "@/types";

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { client_id, member_id, project_name, order_number, task_description, payment_month_offset, payment_day, active, pdf_filename, items } = await request.json();

  const { error } = await supabase
    .from("contracts")
    .update({ client_id, member_id, project_name: project_name?.trim(), order_number: order_number ?? null, task_description: task_description ?? null, payment_month_offset, payment_day, active, pdf_filename: pdf_filename ?? "", updated_at: new Date().toISOString() })
    .eq("id", id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // 明細テンプレートを全削除→再挿入
  await supabase.from("contract_items").delete().eq("contract_id", id);
  if (items?.length) {
    const rows = items.map((item: ContractItem, i: number) => ({
      contract_id: id,
      name: item.name,
      unit_price: item.unit_price,
      tax_exempt: item.tax_exempt,
      sort_order: i,
    }));
    await supabase.from("contract_items").insert(rows);
  }

  const { data: full } = await supabase
    .from("contracts")
    .select("*, client:clients(id, name), member:members(id, name), items:contract_items(*)")
    .eq("id", id)
    .single();

  return NextResponse.json(full);
}

export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { error } = await supabase.from("contracts").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return new NextResponse(null, { status: 204 });
}
