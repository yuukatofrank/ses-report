import { NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase";

export async function POST(request: Request) {
  const formData = await request.formData();
  const file = formData.get("file") as File | null;
  const memberId = formData.get("member_id") as string | null;
  const expenseDate = formData.get("expense_date") as string | null;

  if (!file || !memberId) {
    return NextResponse.json(
      { error: "file と member_id は必須です" },
      { status: 400 }
    );
  }

  const ext = file.name.split(".").pop() || "png";
  const dateStr = (expenseDate || new Date().toISOString().slice(0, 10)).replace(/-/g, "");

  // Count existing files with same date prefix to determine sequence number
  const supabaseAdmin = createSupabaseAdminClient();
  const prefix = `${memberId}/${dateStr}_`;
  const { data: existing } = await supabaseAdmin.storage
    .from("receipts")
    .list(memberId, { search: `${dateStr}_` });
  const seq = (existing?.length ?? 0) + 1;
  const seqStr = String(seq).padStart(2, "0");

  const filePath = `${memberId}/${dateStr}_${seqStr}.${ext}`;

  const buffer = Buffer.from(await file.arrayBuffer());

  const { error } = await supabaseAdmin.storage
    .from("receipts")
    .upload(filePath, buffer, {
      contentType: file.type,
      upsert: false,
    });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ path: filePath }, { status: 201 });
}
