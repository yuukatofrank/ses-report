import { NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase";

export async function GET(request: Request) {
  const supabase = createSupabaseAdminClient();
  const { searchParams } = new URL(request.url);
  const memberId = searchParams.get("member_id");
  const month = searchParams.get("month");

  let query = supabase
    .from("reports")
    .select("*")
    .order("month", { ascending: false });

  if (memberId) query = query.eq("member_id", memberId);
  if (month) query = query.eq("month", month);

  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json(data);
}

export async function POST(request: Request) {
  const supabase = createSupabaseAdminClient();
  const body = await request.json();

  if (!body.member_id || !body.month || !body.member_name) {
    return NextResponse.json(
      { error: "member_id, month, member_name は必須です" },
      { status: 400 }
    );
  }

  const { data, error } = await supabase
    .from("reports")
    .insert({
      member_id: body.member_id,
      month: body.month,
      member_name: body.member_name,
      project: body.project || null,
      role: body.role || null,
      works: body.works || null,
      achievements: body.achievements || null,
      issues: body.issues || null,
      learnings: body.learnings || null,
      next_month: body.next_month || null,
      status: body.status || "draft",
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json(data, { status: 201 });
}
