import { cache } from "react";
import { createSupabaseServerClient, createSupabaseAdminClient } from "./supabase";
import { Member } from "@/types";

export type CurrentUser = {
  userId: string | null;
  userEmail: string | null;
  isAdmin: boolean;
  member: Member | null;
};

// 同一リクエスト内で getUser+member を一度だけ取得（layout と page の重複呼び出しを防ぐ）
export const getCurrentUser = cache(async (): Promise<CurrentUser> => {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { userId: null, userEmail: null, isAdmin: false, member: null };
  }

  const adminEmail = process.env.NEXT_PUBLIC_ADMIN_EMAIL;
  const isAdmin = !!adminEmail && user.email === adminEmail;

  const admin = createSupabaseAdminClient();
  const { data: member } = await admin
    .from("members")
    .select("*")
    .eq("user_id", user.id)
    .maybeSingle();

  return {
    userId: user.id,
    userEmail: user.email ?? null,
    isAdmin,
    member: (member as Member | null) ?? null,
  };
});
