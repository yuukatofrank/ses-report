import { NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase";
import { requireAuth } from "@/lib/auth";

export async function POST(request: Request) {
  const authResult = await requireAuth();
  if ("error" in authResult) return authResult.error;

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

  // Find max sequence number for this date to avoid collision
  const supabaseAdmin = createSupabaseAdminClient();
  const { data: existing } = await supabaseAdmin.storage
    .from("receipts")
    .list(memberId, { search: `${dateStr}_` });

  let maxSeq = 0;
  if (existing) {
    for (const f of existing) {
      const match = f.name.match(new RegExp(`^${dateStr}_(\\d+)\\.`));
      if (match) {
        const n = parseInt(match[1], 10);
        if (n > maxSeq) maxSeq = n;
      }
    }
  }
  const seqStr = String(maxSeq + 1).padStart(2, "0");

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
