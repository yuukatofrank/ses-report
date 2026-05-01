import { NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase";
import { requireAuth } from "@/lib/auth";

export async function GET(request: Request) {
  const authResult = await requireAuth();
  if ("error" in authResult) return authResult.error;

  const supabase = createSupabaseAdminClient();
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
  const authResult = await requireAuth();
  if ("error" in authResult) return authResult.error;

  const supabase = createSupabaseAdminClient();
  const body = await request.json();
  const { user_id, name, role, email } = body;

  if (!user_id || !name?.trim()) {
    return NextResponse.json({ error: "user_id と name は必須です" }, { status: 400 });
  }

  const adminEmail = process.env.NEXT_PUBLIC_ADMIN_EMAIL;
  const permission = email && email === adminEmail ? "admin" : "member";

  const { data, error } = await supabase
    .from("members")
    .insert({ user_id, name: name.trim(), role: role?.trim() || null, email: email || null, permission })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json(data, { status: 201 });
}

export async function PUT(request: Request) {
  const authResult = await requireAuth();
  if ("error" in authResult) return authResult.error;

  const supabase = createSupabaseAdminClient();
  const body = await request.json();
  const { user_id, name, role, email } = body;

  if (!user_id || !name?.trim()) {
    return NextResponse.json({ error: "user_id と name は必須です" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("members")
    .update({ name: name.trim(), role: role?.trim() || null, email: email || null })
    .eq("user_id", user_id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json(data);
}
