import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get("user_id");

  if (!userId) {
    return NextResponse.json({ error: "user_id は必須です" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("members")
    .select("*")
    .eq("user_id", userId)
    .single();

  if (error && error.code === "PGRST116") {
    // 未登録
    return NextResponse.json(null);
  }
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json(data);
}

export async function POST(request: Request) {
  const body = await request.json();
  const { user_id, name, role } = body;

  if (!user_id || !name?.trim()) {
    return NextResponse.json({ error: "user_id と name は必須です" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("members")
    .insert({ user_id, name: name.trim(), role: role?.trim() || null })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json(data, { status: 201 });
}

export async function PUT(request: Request) {
  const body = await request.json();
  const { user_id, name, role } = body;

  if (!user_id || !name?.trim()) {
    return NextResponse.json({ error: "user_id と name は必須です" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("members")
    .update({ name: name.trim(), role: role?.trim() || null })
    .eq("user_id", user_id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json(data);
}
