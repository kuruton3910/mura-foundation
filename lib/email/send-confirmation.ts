import { Resend } from "resend";

type SelectedOption = {
  id: string;
  name: string;
  count: number;
  unit_label: string;
  price_per_unit: number;
  subtotal: number;
};

type ConfirmationEmailParams = {
  guestEmail: string;
  guestName: string;
  reservationId: string;
  checkinDate: string;
  checkoutDate: string;
  vehicleCount: number;
  vehiclePlate?: string;
  postalCode?: string;
  prefecture?: string;
  city?: string;
  addressLine?: string;
  adults: number;
  children: number;
  pets: number;
  totalAmount: number;
  discountAmount?: number;
  couponCode?: string;
  selectedOptions?: SelectedOption[];
};

/**
 * メール本文に差し込む値をHTMLエスケープする。
 * ゲストが入力した氏名・住所・備考などがそのまま埋め込まれると、
 * 認証済みドメインから任意のHTML（偽の案内文やリンク）を送れてしまうため必須。
 */
function esc(value: unknown): string {
  return String(value ?? "").replace(
    /[&<>"']/g,
    (c) =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;",
      })[c] as string,
  );
}

export async function sendConfirmationEmail(
  params: ConfirmationEmailParams,
): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.warn("RESEND_API_KEY not set — confirmation email skipped");
    return;
  }

  const resend = new Resend(apiKey);
  const from = process.env.RESEND_FROM_EMAIL || "noreply@murafoundation.com";
  // メール本文の問い合わせ先・サイト名（環境変数で差し替え可能）
  // 既定値はクライアントから指定された運営アドレス
  const contactEmail = process.env.MAIL_CONTACT_EMAIL || "mura.npo@gmail.com";
  const siteName = process.env.MAIL_SITE_NAME || "MURA CAMPING GROUND";
  const siteUrl = process.env.MAIL_SITE_URL || "www.murafoundation.com";
  // メール内のロゴは絶対URLが必要（相対パスはメールクライアントで表示されない）
  const logoUrl = `${
    process.env.NEXT_PUBLIC_SITE_URL || "https://mura-foundation.netlify.app"
  }/logo.png`;

  const discount = params.discountAmount && params.discountAmount > 0;

  const html = `
<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: sans-serif; color: #333; background: #f8f9f4; margin: 0; padding: 0; }
    .container { max-width: 600px; margin: 0 auto; background: #fff; }
    .header { background: #fff; color: #2D4030; padding: 28px 24px 20px; text-align: center; border-bottom: 2px solid #2D4030; }
    .header h1 { margin: 0; font-size: 22px; letter-spacing: 2px; }
    .header p { margin: 8px 0 0; font-size: 13px; color: #6b7280; }
    .body { padding: 32px 24px; }
    .greeting { font-size: 16px; margin-bottom: 24px; }
    .section { border: 1px solid #e5e7eb; border-radius: 8px; padding: 20px; margin-bottom: 20px; }
    .section h2 { margin: 0 0 16px; font-size: 14px; color: #2D4030; border-bottom: 2px solid #2D4030; padding-bottom: 8px; }
    .row { display: flex; justify-content: space-between; padding: 6px 0; font-size: 14px; border-bottom: 1px solid #f3f4f6; }
    .row:last-child { border-bottom: none; }
    .label { color: #6b7280; }
    .value { font-weight: 600; }
    .total-row { display: flex; justify-content: space-between; padding: 12px 0; font-size: 18px; font-weight: bold; color: #2D4030; }
    .discount-row { display: flex; justify-content: space-between; padding: 6px 0; font-size: 14px; color: #059669; }
    .notice { background: #f8f9f4; border: 1px solid #d6d3d1; border-radius: 6px; padding: 16px; margin-bottom: 20px; }
    .notice p { margin: 0; font-size: 13px; color: #44403c; line-height: 1.9; }
    .footer { background: #f3f4f6; padding: 20px 24px; text-align: center; font-size: 12px; color: #9ca3af; }
    .ref { font-size: 11px; color: #9ca3af; margin-top: 4px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <img src="${logoUrl}" alt="${siteName}" width="240" style="display:block;margin:0 auto 12px;max-width:100%;height:auto;">
      <p>予約確認メール</p>
    </div>

    <div class="body">
      <p class="greeting">
        ${esc(params.guestName)} 様<br><br>
        この度はMURA CAMPING GROUNDをご予約いただきありがとうございます。<br>
        以下の内容で予約が確定しました。
      </p>

      <div class="section">
        <h2>予約内容</h2>
        <div class="row"><span class="label">チェックイン</span><span class="value">${esc(params.checkinDate)}（11:00〜）</span></div>
        <div class="row"><span class="label">チェックアウト</span><span class="value">${esc(params.checkoutDate)}（〜11:00）</span></div>
        <div class="row"><span class="label">区画数</span><span class="value">${Number(params.vehicleCount)}区画</span></div>
        ${params.vehiclePlate ? `<div class="row"><span class="label">車のナンバー</span><span class="value">${esc(params.vehiclePlate)}</span></div>` : ""}
        ${(params.postalCode || params.prefecture) ? `<div class="row"><span class="label">ご住所</span><span class="value">${params.postalCode ? `〒${esc(params.postalCode)}<br>` : ""}${esc(params.prefecture)}${esc(params.city)}${esc(params.addressLine)}</span></div>` : ""}
        <div class="row"><span class="label">人数</span><span class="value">大人${Number(params.adults)}名${params.children > 0 ? ` / 子供${Number(params.children)}名` : ""}${params.pets > 0 ? ` / ペット${Number(params.pets)}匹` : ""}</span></div>
        ${params.selectedOptions && params.selectedOptions.length > 0
          ? params.selectedOptions.map(opt =>
              `<div class="row"><span class="label">${esc(opt.name)}</span><span class="value">${Number(opt.count)}${esc(opt.unit_label)}（¥${Number(opt.subtotal).toLocaleString()}）</span></div>`
            ).join("")
          : ""}
      </div>

      <div class="section">
        <h2>お支払い金額</h2>
        ${discount ? `<div class="discount-row"><span>クーポン割引（${esc(params.couponCode)}）</span><span>-¥${Number(params.discountAmount).toLocaleString()}</span></div>` : ""}
        <div class="total-row"><span>合計（税込）</span><span>¥${params.totalAmount.toLocaleString()}</span></div>
      </div>

      <div class="notice">
        <p>
          このメールは決済を完了されたゲストに自動送信されています。<br>
          後ほどマネージメントから重要なご案内をお送りしますので、
          <strong>必ずご確認の上ご来場ください。</strong>
        </p>
      </div>

      <p style="font-size:13px;color:#6b7280;">
        ご不明な点は <strong>${contactEmail}</strong> までお問い合わせください。
      </p>
      <p class="ref">予約番号: ${esc(params.reservationId)}</p>
    </div>

    <div class="footer">
      &copy; 2026 ${siteName} &nbsp;|&nbsp; ${siteUrl}
    </div>
  </div>
</body>
</html>
  `.trim();

  // カンマ区切りで複数指定可: "a@x.com,b@y.com"
  const parseAddresses = (raw: string) =>
    raw
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);

  // 運営宛は CC（ゲストにも見える。クライアント要望により必須）
  const ccList = parseAddresses(
    process.env.MAIL_CC_EMAIL || "mura.npo@gmail.com",
  );
  // BCC は既定では送らない。デバッグ時のみ ADMIN_NOTIFY_EMAIL を設定して使う
  const bccList = parseAddresses(process.env.ADMIN_NOTIFY_EMAIL ?? "");

  await resend.emails.send({
    from,
    to: params.guestEmail,
    cc: ccList,
    // 空配列を渡すとAPIエラーになる可能性があるため、指定がなければキーごと省略する
    ...(bccList.length > 0 ? { bcc: bccList } : {}),
    subject: `【MURA CAMPING GROUND】ご予約確認 ${params.checkinDate}〜${params.checkoutDate}`,
    html,
  });
}
