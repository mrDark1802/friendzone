export function renderSubscriptionFailedEmailHtml(payload: {
  displayName: string;
  planName: string;
  reason?: string;
}): string {
  const { displayName, planName, reason } = payload;
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Subscription Payment Action Required — FriendZone</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #07080d; color: #f3f4f6; margin: 0; padding: 0; }
    .container { max-width: 560px; margin: 40px auto; background-color: #0f111a; border: 1px solid rgba(255,255,255,0.1); border-radius: 24px; padding: 40px; box-shadow: 0 20px 40px rgba(0,0,0,0.5); }
    .logo { font-size: 24px; font-weight: 800; background: linear-gradient(135deg, #6366f1 0%, #a855f7 100%); -webkit-background-clip: text; -webkit-text-fill-color: transparent; margin-bottom: 24px; }
    .badge { display: inline-block; background-color: rgba(239, 68, 68, 0.15); border: 1px solid rgba(239, 68, 68, 0.4); color: #f87171; padding: 6px 14px; border-radius: 20px; font-size: 12px; font-weight: 700; text-transform: uppercase; margin-bottom: 16px; }
    h1 { font-size: 22px; font-weight: 800; color: #ffffff; margin-top: 0; }
    p { font-size: 14px; line-height: 1.6; color: #9ca3af; }
    .card { background-color: rgba(255, 255, 255, 0.04); border: 1px solid rgba(255, 255, 255, 0.1); border-radius: 16px; padding: 20px; margin: 24px 0; }
    .detail-row { display: flex; justify-content: space-between; margin-bottom: 12px; font-size: 14px; }
    .detail-row:last-child { margin-bottom: 0; }
    .label { color: #9ca3af; }
    .val { color: #ffffff; font-weight: 700; }
    .button-wrapper { text-align: center; margin: 32px 0 16px 0; }
    .button { display: inline-block; background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%); color: #ffffff; font-size: 14px; font-weight: 600; text-decoration: none; padding: 14px 32px; border-radius: 14px; box-shadow: 0 10px 20px rgba(239, 68, 68, 0.3); }
    .footer { margin-top: 32px; padding-top: 16px; border-top: 1px solid rgba(255,255,255,0.08); text-align: center; font-size: 12px; color: #6b7280; }
  </style>
</head>
<body>
  <div class="container">
    <div class="logo">✦ FriendZone</div>
    <div class="badge">Payment Declined</div>
    <h1>Subscription Payment Failure</h1>
    <p>Hi ${displayName || 'there'},</p>
    <p>We were unable to process your payment for the ${planName} Plan on FriendZone. Your subscription status has been updated to past due.</p>
    
    <div class="card">
      <div class="detail-row">
        <span class="label">Target Plan:</span>
        <span class="val">${planName} Plan</span>
      </div>
      <div class="detail-row">
        <span class="label">Status:</span>
        <span class="val" style="color: #f87171;">Payment Declined / Past Due</span>
      </div>
      ${reason ? `<div class="detail-row"><span class="label">Reason:</span><span class="val">${reason}</span></div>` : ''}
    </div>

    <p>Stripe will attempt to retry the charge. To ensure uninterrupted access to your AI translations, please update your payment method or try subscribing again.</p>

    <div class="button-wrapper">
      <a href="http://localhost:5173/dashboard" target="_blank" class="button">Update Payment Method</a>
    </div>

    <div class="footer">
      <p>© 2026 FriendZone Platform. All rights reserved.<br>Questions or need help? Contact us at <a href="mailto:friendzone_live@proton.me" style="color: #9ca3af;">friendzone_live@proton.me</a></p>
    </div>
  </div>
</body>
</html>`;
}
