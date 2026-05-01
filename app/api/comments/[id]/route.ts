import { NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase";
import { requireAuth } from "@/lib/auth";

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireAuth();
  if ("error" in authResult) return authResult.error;
  const { user } = authResult;

  const supabase = createSupabaseAdminClient();
  const { id } = await params;

  // 対象コメントを取得して、本人 or admin のみ削除可
  const { data: comment, error: fetchError } = await supabase
    .from("comments")
    .select("user_id")
    .eq("id", id)
    .single();

  if (fetchError || !comment) {
    return NextResponse.json({ error: "コメントが見つかりません" }, { status: 404 });
  }

  if (comment.user_id !== user.id && !user.isAdmin) {
    return NextResponse.json({ error: "他のユーザーのコメントは削除できません" }, { status: 403 });
  }

  const { error } = await supabase
    .from("comments")
    .delete()
    .eq("id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ success: true });
}
