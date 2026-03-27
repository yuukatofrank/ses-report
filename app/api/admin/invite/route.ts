import { NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase";

export async function POST(request: Request) {
  const { email, redirectTo } = await request.json();

  if (!email) {
    return NextResponse.json({ error: "メールアドレスは必須です" }, { status: 400 });
  }

  const supabaseAdmin = createSupabaseAdminClient();

  const { data, error } = await supabaseAdmin.auth.admin.inviteUserByEmail(email, {
    redirectTo: `${redirectTo}/auth/set-password`,
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ user: data.user });
}
