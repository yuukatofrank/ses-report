import { NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase";
import { randomUUID } from "crypto";

export async function POST(request: Request) {
  const formData = await request.formData();
  const file = formData.get("file") as File | null;
  const memberId = formData.get("member_id") as string | null;

  if (!file || !memberId) {
    return NextResponse.json(
      { error: "file と member_id は必須です" },
      { status: 400 }
    );
  }

  const ext = file.name.split(".").pop() || "png";
  const filePath = `${memberId}/${randomUUID()}.${ext}`;

  const supabaseAdmin = createSupabaseAdminClient();
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
