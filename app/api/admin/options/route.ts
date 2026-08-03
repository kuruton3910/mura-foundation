import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";

// GET /api/admin/options — 全オプション一覧（管理者）
export async function GET() {
  try {
    // 認証は middleware.ts で実施済み
    const supabase = createServerClient();
    const { data, error } = await supabase
      .from("rental_options")
      .select("*")
      .order("sort_order");
    if (error) throw error;
    return NextResponse.json(data ?? []);
  } catch {
    return NextResponse.json([], { status: 500 });
  }
}

// POST /api/admin/options — 作成 or 更新（id あれば更新）
export async function POST(request: NextRequest) {
  try {
    // 認証は middleware.ts で実施済み
    const supabase = createServerClient();

    const body = await request.json();

    // 作成・更新で同じ値を使う（片方だけ項目が漏れる事故を防ぐ）
    const payload: Record<string, unknown> = {
      name: body.name,
      description: body.description ?? "",
      price_per_unit: body.price_per_unit,
      unit_label: body.unit_label ?? "個",
      max_count: body.max_count ?? 5,
      is_active: body.is_active ?? true,
      sort_order: body.sort_order ?? 0,
      is_exclusive_only: body.is_exclusive_only ?? false,
      image_url: (body.image_url ?? "").trim(),
    };

    const save = (data: Record<string, unknown>) =>
      body.id
        ? supabase
            .from("rental_options")
            .update(data)
            .eq("id", body.id)
            .select()
            .single()
        : supabase.from("rental_options").insert(data).select().single();

    let { data, error } = await save(payload);

    // image_url カラムが未追加のDBでも他項目は保存できるようフォールバックする
    if (error?.code === "PGRST204") {
      console.warn(
        "rental_options.image_url が存在しないため写真URLを除いて保存します（ALTER TABLE が必要）",
      );
      const { image_url: _omitted, ...withoutImage } = payload;
      ({ data, error } = await save(withoutImage));
      if (error) throw error;
      return NextResponse.json(
        {
          ...data,
          warning:
            "写真URLは保存されませんでした。データベースに image_url カラムを追加してください。",
        },
        { status: body.id ? 200 : 201 },
      );
    }

    if (error) throw error;
    return NextResponse.json(data, { status: body.id ? 200 : 201 });
  } catch (err) {
    console.error("options upsert error:", err);
    return NextResponse.json({ error: "保存に失敗しました" }, { status: 500 });
  }
}

// DELETE /api/admin/options — 削除 { id }
export async function DELETE(request: NextRequest) {
  try {
    // 認証は middleware.ts で実施済み
    const supabase = createServerClient();

    const { id } = await request.json();
    if (!id) {
      return NextResponse.json({ error: "id が必要です" }, { status: 400 });
    }
    const { error } = await supabase
      .from("rental_options")
      .delete()
      .eq("id", id);
    if (error) throw error;
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("options delete error:", err);
    return NextResponse.json({ error: "削除に失敗しました" }, { status: 500 });
  }
}
