import { NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase";

export async function GET(request: Request) {
  const supabase = createSupabaseAdminClient();
  const { searchParams } = new URL(request.url);
  const clientId = searchParams.get("client_id");

  let query = supabase
    .from("projects")
    .select("*, client:clients(id, name)")
    .order("created_at", { ascending: true });

  if (clientId) query = query.eq("client_id", clientId);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function POST(request: Request) {
  const supabase = createSupabaseAdminClient();
  const { client_id, name, payment_month_offset, payment_day } = await request.json();

  if (!client_id || !name?.trim()) {
    return NextResponse.json({ error: "得意先と案件名は必須です" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("projects")
    .insert({
      client_id,
      name: name.trim(),
      payment_month_offset: payment_month_offset ?? 1,
      payment_day: payment_day ?? 10,
    })
    .select("*, client:clients(id, name)")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}
