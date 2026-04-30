import { NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase";
import { requireAuth } from "@/lib/auth";
import { PDFDocument } from "pdf-lib";

export async function GET(request: Request) {
  const authResult = await requireAuth();
  if ("error" in authResult) return authResult.error;

  const { searchParams } = new URL(request.url);
  const path = searchParams.get("path");
  const mode = searchParams.get("mode"); // "download" | "pdf" | default(inline)

  if (!path) {
    return NextResponse.json(
      { error: "path は必須です" },
      { status: 400 }
    );
  }

  const supabaseAdmin = createSupabaseAdminClient();

  if (mode === "download" || mode === "pdf") {
    // Download the file from storage
    const { data, error } = await supabaseAdmin.storage
      .from("receipts")
      .download(path);

    if (error || !data) {
      return NextResponse.json({ error: error?.message ?? "ファイルが見つかりません" }, { status: 500 });
    }

    const customName = searchParams.get("filename");
    const storageName = path.split("/").pop() ?? "receipt";
    const fileBytes = Buffer.from(await data.arrayBuffer());
    const mimeType = data.type || "application/octet-stream";

    // PDF mode: convert image to PDF, or pass through if already PDF
    if (mode === "pdf") {
      const filename = (customName ?? storageName.replace(/\.[^.]+$/, "")) + ".pdf";
      let pdfBytes: Uint8Array;

      if (mimeType === "application/pdf") {
        // Already PDF, pass through
        pdfBytes = fileBytes;
      } else if (mimeType.startsWith("image/")) {
        // Convert image to PDF
        const pdfDoc = await PDFDocument.create();
        let image;
        if (mimeType === "image/png") {
          image = await pdfDoc.embedPng(fileBytes);
        } else {
          // JPEG, WebP etc. - try as JPEG
          image = await pdfDoc.embedJpg(fileBytes);
        }
        // Fit image on A4 page with margin
        const a4Width = 595.28;
        const a4Height = 841.89;
        const margin = 40;
        const maxW = a4Width - margin * 2;
        const maxH = a4Height - margin * 2;
        const scale = Math.min(maxW / image.width, maxH / image.height, 1);
        const w = image.width * scale;
        const h = image.height * scale;
        const page = pdfDoc.addPage([a4Width, a4Height]);
        page.drawImage(image, {
          x: (a4Width - w) / 2,
          y: a4Height - margin - h,
          width: w,
          height: h,
        });
        pdfBytes = await pdfDoc.save();
      } else {
        return NextResponse.json({ error: "PDFに変換できないファイル形式です" }, { status: 400 });
      }

      const encodedFilename = encodeURIComponent(filename).replace(/['()]/g, escape);
      return new NextResponse(Buffer.from(pdfBytes), {
        headers: {
          "Content-Type": "application/pdf",
          "Content-Disposition": `attachment; filename="receipt.pdf"; filename*=UTF-8''${encodedFilename}`,
        },
      });
    }

    // Normal download (original format)
    const ext = storageName.includes(".") ? "." + storageName.split(".").pop() : "";
    const filename = customName ? customName + ext : storageName;
    const encodedFilename = encodeURIComponent(filename).replace(/['()]/g, escape);
    return new NextResponse(fileBytes, {
      headers: {
        "Content-Type": mimeType,
        "Content-Disposition": `attachment; filename="receipt${ext}"; filename*=UTF-8''${encodedFilename}`,
      },
    });
  }

  // Default: redirect to signed URL (inline view, no download)
  const { data: urlData, error } = await supabaseAdmin.storage
    .from("receipts")
    .createSignedUrl(path, 60);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.redirect(urlData.signedUrl);
}
