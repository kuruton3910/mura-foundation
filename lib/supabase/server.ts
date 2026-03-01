import { createClient } from "@supabase/supabase-js";

// サーバーサイド専用（API Routes内でのみ使用）
// service_role_key は RLS をバイパスするため、クライアントには絶対に公開しない
export function createServerClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
}
