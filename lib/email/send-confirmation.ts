import { Resend } from "resend";

type ConfirmationEmailParams = {
  guestEmail: string;
  guestName: string;
  reservationId: string;
  checkinDate: string;
  checkoutDate: string;
  vehicleCount: number;
  adults: number;
  children: number;
  pets: number;
  totalAmount: number;
  discountAmount?: number;
  couponCode?: string;
  rentalTent?: boolean;
  rentalTentCount?: number;
  rentalFirepit?: boolean;
  rentalFirepitCount?: number;
};

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

  const discount = params.discountAmount && params.discountAmount > 0;

  const html = `
<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: sans-serif; color: #333; background: #f8f9f4; margin: 0; padding: 0; }
    .container { max-width: 600px; margin: 0 auto; background: #fff; }
    .header { background: #2D4030; color: #fff; padding: 32px 24px; text-align: center; }
    .header h1 { margin: 0; font-size: 22px; letter-spacing: 2px; }
    .header p { margin: 8px 0 0; font-size: 13px; opacity: 0.8; }
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
    .alert { background: #fef2f2; border: 1px solid #fecaca; border-radius: 6px; padding: 16px; margin-bottom: 20px; }
    .alert h3 { margin: 0 0 8px; font-size: 13px; color: #b91c1c; }
    .alert ul { margin: 0; padding-left: 16px; font-size: 13px; color: #dc2626; line-height: 1.8; }
    .footer { background: #f3f4f6; padding: 20px 24px; text-align: center; font-size: 12px; color: #9ca3af; }
    .ref { font-size: 11px; color: #9ca3af; margin-top: 4px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>MURA CAMPING GROUND</h1>
      <p>予約確認メール</p>
    </div>

    <div class="body">
      <p class="greeting">
        ${params.guestName} 様<br><br>
        この度はMURA CAMPING GROUNDをご予約いただきありがとうございます。<br>
        以下の内容で予約が確定しました。
      </p>

      <div class="section">
        <h2>予約内容</h2>
        <div class="row"><span class="label">チェックイン</span><span class="value">${params.checkinDate}（11:00〜17:00）</span></div>
        <div class="row"><span class="label">チェックアウト</span><span class="value">${params.checkoutDate}（〜11:00）</span></div>
        <div class="row"><span class="label">区画数</span><span class="value">${params.vehicleCount}区画</span></div>
        <div class="row"><span class="label">人数</span><span class="value">大人${params.adults}名${params.children > 0 ? ` / 子供${params.children}名` : ""}${params.pets > 0 ? ` / ペット${params.pets}匹` : ""}</span></div>
        ${params.rentalTent && params.rentalTentCount ? `<div class="row"><span class="label">レンタルテント</span><span class="value">${params.rentalTentCount}張</span></div>` : ""}
        ${params.rentalFirepit && params.rentalFirepitCount ? `<div class="row"><span class="label">レンタル焚き火台</span><span class="value">${params.rentalFirepitCount}台</span></div>` : ""}
      </div>

      <div class="section">
        <h2>お支払い金額</h2>
        ${discount ? `<div class="discount-row"><span>クーポン割引（${params.couponCode}）</span><span>-¥${params.discountAmount!.toLocaleString()}</span></div>` : ""}
        <div class="total-row"><span>合計（税込）</span><span>¥${params.totalAmount.toLocaleString()}</span></div>
      </div>

      <div class="alert">
        <h3>重要なご案内</h3>
        <ul>
          <li><strong>チェックイン：11:00〜17:00 / チェックアウト：翌11:00まで</strong></li>
          <li><strong>20:00〜翌5:00はゲート内への車の出入り禁止</strong></li>
          <li>直火禁止。焚き火台ご持参または事前に申し込みください。</li>
          <li>ゴミは必ずお持ち帰りください。</li>
          <li>キャンセルポリシー：2日前まで無料、前日50%、当日100%</li>
        </ul>
      </div>

      <p style="font-size:13px;color:#6b7280;">
        ご不明な点は <strong>info@murafoundation.com</strong> までお問い合わせください。
      </p>
      <p class="ref">予約番号: ${params.reservationId}</p>
    </div>

    <div class="footer">
      &copy; 2026 MURA CAMPING GROUND &nbsp;|&nbsp; www.murafoundation.com
    </div>
  </div>
</body>
</html>
  `.trim();

  await resend.emails.send({
    from,
    to: params.guestEmail,
    subject: `【MURA CAMPING GROUND】ご予約確認 ${params.checkinDate}〜${params.checkoutDate}`,
    html,
  });
}
