import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "./supabase";

export type AuthedUser = {
  id: string;
  email: string;
  isAdmin: boolean;
};

// API Route 用の認証ヘルパー
// 未認証なら 401 を返し、認証済みなら user 情報を返す
export async function requireAuth(): Promise<
  { user: AuthedUser } | { error: NextResponse }
> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    return {
      error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    };
  }

  const adminEmail = process.env.NEXT_PUBLIC_ADMIN_EMAIL;
  return {
    user: {
      id: user.id,
      email: user.email ?? "",
      isAdmin: user.email === adminEmail,
    },
  };
}

// 管理者専用エンドポイント用
export async function requireAdmin(): Promise<
  { user: AuthedUser } | { error: NextResponse }
> {
  const result = await requireAuth();
  if ("error" in result) return result;
  if (!result.user.isAdmin) {
    return {
      error: NextResponse.json({ error: "Forbidden" }, { status: 403 }),
    };
  }
  return result;
}
