import { NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase";

export async function POST(request: Request) {
  const { email, redirectTo } = await request.json();

  if (!email) {
    return NextResponse.json({ error: "メールアドレスは必須です" }, { status: 400 });
  }

  const supabaseAdmin = createSupabaseAdminClient();

  // 未確認ユーザーが既に存在する場合は削除してから再招待
  const { data: { users } } = await supabaseAdmin.auth.admin.listUsers();
  const existing = users.find((u) => u.email === email && !u.email_confirmed_at);
  if (existing) {
    await supabaseAdmin.auth.admin.deleteUser(existing.id);
  }

  const { data, error } = await supabaseAdmin.auth.admin.inviteUserByEmail(email, {
    redirectTo: `${redirectTo}/auth/set-password`,
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ user: data.user });
}
