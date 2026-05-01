import { NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase";
import { requireAdmin } from "@/lib/auth";
import { getNextInvoiceNumberByYm } from "@/lib/invoice-number";

export async function GET(request: Request) {
  const authResult = await requireAdmin();
  if ("error" in authResult) return authResult.error;

  const supabase = createSupabaseAdminClient();
  const { searchParams } = new URL(request.url);
  const ym = searchParams.get("ym");
  if (!ym) return NextResponse.json({ error: "ym is required" }, { status: 400 });

  const nextNumber = await getNextInvoiceNumberByYm(supabase, ym);
  return NextResponse.json({ nextNumber });
}
