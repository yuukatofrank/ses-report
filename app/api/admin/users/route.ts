import { NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase";
import { requireAdmin } from "@/lib/auth";

export async function GET() {
  const authResult = await requireAdmin();
  if ("error" in authResult) return authResult.error;

  const supabase = createSupabaseAdminClient();

  // auth.users を全件取得
  const { data: authData, error: authError } = await supabase.auth.admin.listUsers();
  if (authError) {
    return NextResponse.json({ error: authError.message }, { status: 500 });
  }

  // members テーブルを全件取得
  const { data: members, error: membersError } = await supabase
    .from("members")
    .select("*");
  if (membersError) {
    return NextResponse.json({ error: membersError.message }, { status: 500 });
  }

  // user_id ベースの lookup（auth.users.id でマッチ、メール変更耐性あり）
  const membersByUserId = new Map(members.map((m) => [m.user_id, m]));

  const users = authData.users.map((u) => {
    const member = membersByUserId.get(u.id);
    return {
      auth_id: u.id,
      email: u.email ?? "",
      invited_at: u.invited_at ?? u.created_at,
      confirmed: !!u.email_confirmed_at,
      // membersテーブルに存在する場合はその情報を付加
      member_id: member?.id ?? null,
      name: member?.name ?? null,
      role: member?.role ?? null,
      permission: member?.permission ?? null,
      created_at: member?.created_at ?? u.created_at,
    };
  });

  return NextResponse.json(users);
}
