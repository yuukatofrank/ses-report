import { NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase";

export async function DELETE(
  _request: Request,
  { params }: { params: { id: string } }
) {
  const adminClient = createSupabaseAdminClient();
  const { error } = await adminClient.auth.admin.deleteUser(params.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
