import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const ym = searchParams.get("ym"); // e.g. "202603"
  if (!ym) return NextResponse.json({ error: "ym is required" }, { status: 400 });

  const { count } = await supabase
    .from("invoices")
    .select("*", { count: "exact", head: true })
    .like("invoice_number", `No.${ym}-%`);

  const next = String((count ?? 0) + 1).padStart(3, "0");
  return NextResponse.json({ nextNumber: `No.${ym}-${next}` });
}
