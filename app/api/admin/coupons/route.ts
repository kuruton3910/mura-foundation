import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";

// POST — create coupon
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    if (!body.code?.trim()) {
      return NextResponse.json(
        { error: "クーポンコードは必須です" },
        { status: 400 },
      );
    }

    const supabase = createServerClient();
    const { data: coupon, error } = await supabase
      .from("coupons")
      .insert({
        code: body.code.trim().toUpperCase(),
        discount_percent: body.discount_percent,
        discount_type: "percentage",        // 既存NOT NULL列との互換性
        discount_value: body.discount_percent, // 既存NOT NULL列との互換性
        is_member_only: body.is_member_only ?? false,
        valid_from: body.valid_from ?? null,
        valid_until: body.valid_until ?? null,
        max_uses: body.max_uses ?? null,
        is_active: body.is_active ?? true,
      })
      .select()
      .single();

    if (error) {
      console.error("[coupons] insert error:", error);
      if (error.code === "23505") {
        return NextResponse.json(
          { error: "そのクーポンコードはすでに使用されています" },
          { status: 409 },
        );
      }
      return NextResponse.json(
        { error: `DB エラー: ${error.message}` },
        { status: 500 },
      );
    }

    return NextResponse.json({ coupon });
  } catch (err) {
    console.error("coupon create error:", err);
    return NextResponse.json({ error: "作成に失敗しました" }, { status: 500 });
  }
}

// PATCH — toggle is_active
export async function PATCH(request: NextRequest) {
  try {
    const { id, is_active } = await request.json();

    if (!id) {
      return NextResponse.json({ error: "id が必要です" }, { status: 400 });
    }

    const supabase = createServerClient();
    const { error } = await supabase
      .from("coupons")
      .update({ is_active })
      .eq("id", id);

    if (error) throw error;

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("coupon update error:", err);
    return NextResponse.json({ error: "更新に失敗しました" }, { status: 500 });
  }
}

// DELETE — delete coupon
export async function DELETE(request: NextRequest) {
  try {
    const { id } = await request.json();

    if (!id) {
      return NextResponse.json({ error: "id が必要です" }, { status: 400 });
    }

    const supabase = createServerClient();
    const { error } = await supabase.from("coupons").delete().eq("id", id);

    if (error) throw error;

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("coupon delete error:", err);
    return NextResponse.json({ error: "削除に失敗しました" }, { status: 500 });
  }
}
