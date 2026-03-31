import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const memberId = searchParams.get("member_id");
  const month = searchParams.get("month");

  let query = supabase
    .from("expenses")
    .select("*")
    .order("date", { ascending: false });

  if (memberId) query = query.eq("member_id", memberId);
  if (month) query = query.eq("month", month);

  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json(data);
}

export async function POST(request: Request) {
  const body = await request.json();

  if (
    !body.member_id ||
    !body.member_name ||
    !body.month ||
    !body.title ||
    !body.category ||
    !body.amount ||
    !body.date
  ) {
    return NextResponse.json(
      {
        error:
          "member_id, member_name, month, title, category, amount, date は必須です",
      },
      { status: 400 }
    );
  }

  const { data, error } = await supabase
    .from("expenses")
    .insert({
      member_id: body.member_id,
      member_name: body.member_name,
      month: body.month,
      title: body.title,
      category: body.category,
      amount: body.amount,
      date: body.date,
      description: body.description || null,
      receipt_path: body.receipt_path || null,
      status: body.status || "draft",
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json(data, { status: 201 });
}
