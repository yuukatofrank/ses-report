import { NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase";

export async function GET() {
  const supabase = createSupabaseAdminClient();
  const adminClient = supabase;

  // auth.users を全件取得
  const { data: authData, error: authError } = await adminClient.auth.admin.listUsers();
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

  const membersByEmail = new Map(members.map((m) => [m.email, m]));

  const users = authData.users.map((u) => {
    const member = membersByEmail.get(u.email ?? "");
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
