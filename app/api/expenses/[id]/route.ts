import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const { data: report, error } = await supabase
    .from("expense_reports")
    .select("*")
    .eq("id", id)
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 404 });
  }

  const { data: items, error: itemsError } = await supabase
    .from("expense_items")
    .select("*")
    .eq("report_id", id)
    .order("sort_order", { ascending: true });

  if (itemsError) {
    return NextResponse.json({ error: itemsError.message }, { status: 500 });
  }

  return NextResponse.json({ ...report, items: items || [] });
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await request.json();

  // Admin check for status changes to 'approved' or 'returned'
  if (body.status === "approved" || body.status === "returned") {
    const cookieStore = await cookies();
    const supabaseAuth = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
        },
      }
    );

    const {
      data: { user },
    } = await supabaseAuth.auth.getUser();

    if (!user || user.email !== process.env.NEXT_PUBLIC_ADMIN_EMAIL) {
      return NextResponse.json(
        { error: "管理者権限が必要です" },
        { status: 403 }
      );
    }
  }

  // Update the expense_report
  const updateData: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };
  if (body.status !== undefined) updateData.status = body.status;
  if (body.admin_comment !== undefined)
    updateData.admin_comment = body.admin_comment;

  const { data: report, error: reportError } = await supabase
    .from("expense_reports")
    .update(updateData)
    .eq("id", id)
    .select()
    .single();

  if (reportError) {
    return NextResponse.json(
      { error: reportError.message },
      { status: 500 }
    );
  }

  // Replace items if provided
  let items: Record<string, unknown>[] = [];
  if (body.items !== undefined) {
    // Delete existing items
    const { error: deleteError } = await supabase
      .from("expense_items")
      .delete()
      .eq("report_id", id);

    if (deleteError) {
      return NextResponse.json(
        { error: deleteError.message },
        { status: 500 }
      );
    }

    // Insert new items
    if (body.items.length > 0) {
      const itemsToInsert = body.items.map(
        (item: Record<string, unknown>, index: number) => ({
          report_id: id,
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
        return NextResponse.json(
          { error: itemsError.message },
          { status: 500 }
        );
      }

      items = insertedItems || [];
    }
  } else {
    // If items not provided in body, fetch existing items
    const { data: existingItems } = await supabase
      .from("expense_items")
      .select("*")
      .eq("report_id", id)
      .order("sort_order", { ascending: true });

    items = existingItems || [];
  }

  return NextResponse.json({ ...report, items });
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  // Cascade delete: items are deleted via FK cascade in DB,
  // but explicitly delete for safety
  await supabase.from("expense_items").delete().eq("report_id", id);

  const { error } = await supabase
    .from("expense_reports")
    .delete()
    .eq("id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ success: true });
}
