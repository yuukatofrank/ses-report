import type { SupabaseClient } from "@supabase/supabase-js";

// 請求書番号の採番（max方式：削除されても重複しない）
// ym: "YYYYMM" 形式（例 "202603"）
export async function getNextInvoiceNumberByYm(
  supabase: SupabaseClient,
  ym: string
): Promise<string> {
  const prefix = `No.${ym}-`;
  const { data } = await supabase
    .from("invoices")
    .select("invoice_number")
    .like("invoice_number", `${prefix}%`)
    .order("invoice_number", { ascending: false })
    .limit(1);

  let maxNum = 0;
  if (data && data.length > 0) {
    const last = data[0].invoice_number as string;
    const numPart = last.replace(prefix, "");
    maxNum = parseInt(numPart) || 0;
  }
  return `${prefix}${String(maxNum + 1).padStart(3, "0")}`;
}

// issueDate (YYYY-MM-DD) から ym (YYYYMM) を抽出して採番
export async function getNextInvoiceNumber(
  supabase: SupabaseClient,
  issueDate: string
): Promise<string> {
  const ym = issueDate.substring(0, 7).replace("-", "");
  return getNextInvoiceNumberByYm(supabase, ym);
}
