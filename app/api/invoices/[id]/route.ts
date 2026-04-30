import { NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase";
import { requireAdmin } from "@/lib/auth";
import { InvoiceItem } from "@/types";

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const authResult = await requireAdmin();
  if ("error" in authResult) return authResult.error;

  const supabase = createSupabaseAdminClient();
  const { id } = await params;
  const { data, error } = await supabase
    .from("invoices")
    .select(`*, contract:contracts(*, client:clients(id, name), member:members(id, name)), items:invoice_items(*)`)
    .eq("id", id)
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 404 });
  return NextResponse.json(data);
}

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const authResult = await requireAdmin();
  if ("error" in authResult) return authResult.error;

  const supabase = createSupabaseAdminClient();
  const { id } = await params;
  const { invoice_number, issue_date, target_month, payment_due_date, memo, items } = await request.json();

  const { error } = await supabase
    .from("invoices")
    .update({ invoice_number, issue_date, target_month, payment_due_date, memo: memo || null, updated_at: new Date().toISOString() })
    .eq("id", id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await supabase.from("invoice_items").delete().eq("invoice_id", id);
  if (items?.length) {
    const rows = items.map((item: InvoiceItem, i: number) => ({
      invoice_id: id,
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
    .eq("id", id)
    .single();

  return NextResponse.json(full);
}

export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const authResult = await requireAdmin();
  if ("error" in authResult) return authResult.error;

  const supabase = createSupabaseAdminClient();
  const { id } = await params;
  const { error } = await supabase.from("invoices").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return new NextResponse(null, { status: 204 });
}
