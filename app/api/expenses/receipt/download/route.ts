import { NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const path = searchParams.get("path");
  const mode = searchParams.get("mode"); // "download" for attachment, default is inline

  if (!path) {
    return NextResponse.json(
      { error: "path は必須です" },
      { status: 400 }
    );
  }

  const supabaseAdmin = createSupabaseAdminClient();

  if (mode === "download") {
    // Download the file and return with Content-Disposition: attachment
    const { data, error } = await supabaseAdmin.storage
      .from("receipts")
      .download(path);

    if (error || !data) {
      return NextResponse.json({ error: error?.message ?? "ファイルが見つかりません" }, { status: 500 });
    }

    // Use custom filename from query param, or fallback to storage filename
    const customName = searchParams.get("filename");
    const storageName = path.split("/").pop() ?? "receipt";
    const ext = storageName.includes(".") ? "." + storageName.split(".").pop() : "";
    const filename = customName ? customName + ext : storageName;
    const buffer = Buffer.from(await data.arrayBuffer());

    return new NextResponse(buffer, {
      headers: {
        "Content-Type": data.type || "application/octet-stream",
        "Content-Disposition": `attachment; filename="${encodeURIComponent(filename)}"`,
      },
    });
  }

  // Default: redirect to signed URL (inline view)
  const downloadName = searchParams.get("filename");
  let download: string | undefined;
  if (downloadName) {
    const sExt = path.includes(".") ? "." + path.split(".").pop() : "";
    download = downloadName + sExt;
  }
  const { data: urlData, error } = await supabaseAdmin.storage
    .from("receipts")
    .createSignedUrl(path, 60, download ? { download } : undefined);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.redirect(urlData.signedUrl);
}
