import { NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase";
import { requireAuth } from "@/lib/auth";
import { ContractItem } from "@/types";

export async function GET() {
  const authResult = await requireAuth();
  if ("error" in authResult) return authResult.error;

  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("contracts")
    .select("*, client:clients(id, name), member:members(id, name), items:contract_items(*)")
    .order("created_at", { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function POST(request: Request) {
  const authResult = await requireAuth();
  if ("error" in authResult) return authResult.error;

  const supabase = createSupabaseAdminClient();
  const { client_id, member_id, project_name, order_number, task_description, payment_month_offset, payment_day, pdf_filename, items } = await request.json();

  if (!client_id || !member_id || !project_name?.trim()) {
    return NextResponse.json({ error: "必須項目が不足しています" }, { status: 400 });
  }

  const { data: contract, error } = await supabase
    .from("contracts")
    .insert({ client_id, member_id, project_name: project_name.trim(), order_number: order_number || null, task_description: task_description || null, payment_month_offset: payment_month_offset ?? 1, payment_day: payment_day ?? 10, pdf_filename: pdf_filename ?? "" })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  if (items?.length) {
    const rows = items.map((item: ContractItem, i: number) => ({
      contract_id: contract.id,
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
    .eq("id", contract.id)
    .single();

  return NextResponse.json(full, { status: 201 });
}
