import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";

// レンタル品の写真アップロード先（公開バケット）
const BUCKET = "rental-photos";
const MAX_BYTES = 5 * 1024 * 1024; // 5MB
const ALLOWED = ["image/jpeg", "image/png", "image/webp", "image/gif"];

// POST /api/admin/options/upload
// multipart/form-data の "file" を受け取り、公開URLを返す
// 認証は middleware.ts で実施済み
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json(
        { error: "ファイルが選択されていません" },
        { status: 400 },
      );
    }

    if (!ALLOWED.includes(file.type)) {
      return NextResponse.json(
        { error: "JPEG / PNG / WebP / GIF の画像を選択してください" },
        { status: 400 },
      );
    }

    if (file.size > MAX_BYTES) {
      return NextResponse.json(
        { error: "画像サイズは5MBまでです" },
        { status: 400 },
      );
    }

    // ファイル名は衝突しないよう時刻＋乱数で生成（元のファイル名は使わない）
    const ext = file.type.split("/")[1].replace("jpeg", "jpg");
    const objectPath = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}.${ext}`;

    const supabase = createServerClient();
    const { error: uploadError } = await supabase.storage
      .from(BUCKET)
      .upload(objectPath, file, {
        contentType: file.type,
        cacheControl: "31536000", // 1年（ファイル名が毎回変わるので長期キャッシュで問題ない）
        upsert: false,
      });

    if (uploadError) {
      console.error("option image upload error:", uploadError);
      return NextResponse.json(
        { error: "アップロードに失敗しました" },
        { status: 500 },
      );
    }

    const {
      data: { publicUrl },
    } = supabase.storage.from(BUCKET).getPublicUrl(objectPath);

    return NextResponse.json({ url: publicUrl });
  } catch (err) {
    console.error("option image upload error:", err);
    return NextResponse.json(
      { error: "アップロードに失敗しました" },
      { status: 500 },
    );
  }
}
