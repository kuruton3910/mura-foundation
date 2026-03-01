import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";

// GET /api/admin/options — 全オプション一覧（管理者）
export async function GET() {
  try {
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
    const body = await request.json();
    const supabase = createServerClient();

    if (body.id) {
      const { data, error } = await supabase
        .from("rental_options")
        .update({
          name: body.name,
          description: body.description ?? "",
          price_per_unit: body.price_per_unit,
          unit_label: body.unit_label ?? "個",
          max_count: body.max_count ?? 5,
          is_active: body.is_active ?? true,
          sort_order: body.sort_order ?? 0,
        })
        .eq("id", body.id)
        .select()
        .single();
      if (error) throw error;
      return NextResponse.json(data);
    }

    const { data, error } = await supabase
      .from("rental_options")
      .insert({
        name: body.name,
        description: body.description ?? "",
        price_per_unit: body.price_per_unit,
        unit_label: body.unit_label ?? "個",
        max_count: body.max_count ?? 5,
        is_active: body.is_active ?? true,
        sort_order: body.sort_order ?? 0,
      })
      .select()
      .single();
    if (error) throw error;
    return NextResponse.json(data, { status: 201 });
  } catch (err) {
    console.error("options upsert error:", err);
    return NextResponse.json({ error: "保存に失敗しました" }, { status: 500 });
  }
}

// DELETE /api/admin/options — 削除 { id }
export async function DELETE(request: NextRequest) {
  try {
    const { id } = await request.json();
    if (!id) {
      return NextResponse.json({ error: "id が必要です" }, { status: 400 });
    }
    const supabase = createServerClient();
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
