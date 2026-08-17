export function renderSubscriptionCanceledEmailHtml(payload: {
  displayName: string;
  planName: string;
}): string {
  const { displayName, planName } = payload;
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Plan Updated to Free — FriendZone</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #07080d; color: #f3f4f6; margin: 0; padding: 0; }
    .container { max-width: 560px; margin: 40px auto; background-color: #0f111a; border: 1px solid rgba(255,255,255,0.1); border-radius: 24px; padding: 40px; box-shadow: 0 20px 40px rgba(0,0,0,0.5); }
    .logo { font-size: 24px; font-weight: 800; background: linear-gradient(135deg, #6366f1 0%, #a855f7 100%); -webkit-background-clip: text; -webkit-text-fill-color: transparent; margin-bottom: 24px; }
    .badge { display: inline-block; background-color: rgba(245, 158, 11, 0.15); border: 1px solid rgba(245, 158, 11, 0.4); color: #fbbf24; padding: 6px 14px; border-radius: 20px; font-size: 12px; font-weight: 700; text-transform: uppercase; margin-bottom: 16px; }
    h1 { font-size: 22px; font-weight: 800; color: #ffffff; margin-top: 0; }
    p { font-size: 14px; line-height: 1.6; color: #9ca3af; }
    .card { background-color: rgba(255, 255, 255, 0.04); border: 1px solid rgba(255, 255, 255, 0.1); border-radius: 16px; padding: 20px; margin: 24px 0; }
    .detail-row { display: flex; justify-content: space-between; margin-bottom: 12px; font-size: 14px; }
    .detail-row:last-child { margin-bottom: 0; }
    .label { color: #9ca3af; }
    .val { color: #ffffff; font-weight: 700; }
    .button-wrapper { text-align: center; margin: 32px 0 16px 0; }
    .button { display: inline-block; background: linear-gradient(135deg, #6366f1 0%, #a855f7 100%); color: #ffffff; font-size: 14px; font-weight: 600; text-decoration: none; padding: 14px 32px; border-radius: 14px; box-shadow: 0 10px 20px rgba(99, 102, 241, 0.3); }
    .footer { margin-top: 32px; padding-top: 16px; border-top: 1px solid rgba(255,255,255,0.08); text-align: center; font-size: 12px; color: #6b7280; }
  </style>
</head>
<body>
  <div class="container">
    <div class="logo">✦ FriendZone</div>
    <div class="badge">Plan Changed</div>
    <h1>Subscription Switched to Free Plan</h1>
    <p>Hi ${displayName || 'there'},</p>
    <p>Your previous ${planName} Plan subscription has been canceled or changed. Your account is now active on the Free Plan with 20 translations per day.</p>
    
    <div class="card">
      <div class="detail-row">
        <span class="label">Current Plan:</span>
        <span class="val">Free Plan</span>
      </div>
      <div class="detail-row">
        <span class="label">Daily Limit:</span>
        <span class="val">20 Translations / Day</span>
      </div>
      <div class="detail-row">
        <span class="label">Translation Quota:</span>
        <span class="val" style="color: #fbbf24;">Reset to 0 Used</span>
      </div>
    </div>

    <p>You can upgrade back to Plus or Pro anytime for higher limits and priority neural AI translation.</p>

    <div class="button-wrapper">
      <a href="http://localhost:5173/pricing" target="_blank" class="button">View Upgrade Options</a>
    </div>

    <div class="footer">
      <p>© 2026 FriendZone Platform. All rights reserved.<br>Questions? Contact us at <a href="mailto:friendzone_live@proton.me" style="color: #9ca3af;">friendzone_live@proton.me</a></p>
    </div>
  </div>
</body>
</html>`;
}
