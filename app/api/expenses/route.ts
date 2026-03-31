import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const memberId = searchParams.get("member_id");
  const month = searchParams.get("month");

  let query = supabase
    .from("expense_reports")
    .select("*")
    .order("month", { ascending: false })
    .order("created_at", { ascending: false });

  if (memberId) query = query.eq("member_id", memberId);
  if (month) query = query.eq("month", month);

  const { data: reports, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!reports || reports.length === 0) {
    return NextResponse.json([]);
  }

  // Fetch items for all reports
  const reportIds = reports.map((r) => r.id);
  const { data: items, error: itemsError } = await supabase
    .from("expense_items")
    .select("*")
    .in("report_id", reportIds)
    .order("sort_order", { ascending: true });

  if (itemsError) {
    return NextResponse.json({ error: itemsError.message }, { status: 500 });
  }

  // Group items by report_id
  const itemsByReport = (items || []).reduce(
    (acc: Record<string, typeof items>, item) => {
      if (!acc[item.report_id]) acc[item.report_id] = [];
      acc[item.report_id].push(item);
      return acc;
    },
    {}
  );

  const reportsWithItems = reports.map((report) => ({
    ...report,
    items: itemsByReport[report.id] || [],
  }));

  return NextResponse.json(reportsWithItems);
}

export async function POST(request: Request) {
  const body = await request.json();

  if (!body.member_id || !body.member_name || !body.month) {
    return NextResponse.json(
      { error: "member_id, member_name, month は必須です" },
      { status: 400 }
    );
  }

  // Insert expense_report
  const { data: report, error: reportError } = await supabase
    .from("expense_reports")
    .insert({
      member_id: body.member_id,
      member_name: body.member_name,
      month: body.month,
      status: body.status || "draft",
    })
    .select()
    .single();

  if (reportError) {
    return NextResponse.json(
      { error: reportError.message },
      { status: 500 }
    );
  }

  // Insert expense_items if provided
  let items: Record<string, unknown>[] = [];
  if (body.items && body.items.length > 0) {
    const itemsToInsert = body.items.map(
      (item: Record<string, unknown>, index: number) => ({
        report_id: report.id,
        title: item.title,
        category: item.category,
        amount: item.amount,
        date: item.date,
        description: item.description || null,
        receipt_path: item.receipt_path || null,
        sort_order: item.sort_order ?? index,
      })
    );

    const { data: insertedItems, error: itemsError } = await supabase
      .from("expense_items")
      .insert(itemsToInsert)
      .select();

    if (itemsError) {
      // Clean up the report if items insertion fails
      await supabase.from("expense_reports").delete().eq("id", report.id);
      return NextResponse.json(
        { error: itemsError.message },
        { status: 500 }
      );
    }

    items = insertedItems || [];
  }

  return NextResponse.json({ ...report, items }, { status: 201 });
}
