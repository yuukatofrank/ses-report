import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { PDFDocument } from "pdf-lib";

export async function POST(request: Request) {
  const authResult = await requireAuth();
  if ("error" in authResult) return authResult.error;

  try {
    const formData = await request.formData();
    const files = formData.getAll("files") as File[];

    if (files.length < 2) {
      return NextResponse.json({ error: "2つ以上のPDFファイルを選択してください" }, { status: 400 });
    }

    const merged = await PDFDocument.create();

    for (const file of files) {
      if (!file.name.toLowerCase().endsWith(".pdf")) {
        return NextResponse.json({ error: `${file.name} はPDFファイルではありません` }, { status: 400 });
      }
      const bytes = await file.arrayBuffer();
      const doc = await PDFDocument.load(bytes);
      const pages = await merged.copyPages(doc, doc.getPageIndices());
      pages.forEach((p) => merged.addPage(p));
    }

    const pdfBytes = await merged.save();

    return new NextResponse(Buffer.from(pdfBytes), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename*=UTF-8''merged.pdf`,
      },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "PDF結合に失敗しました";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
