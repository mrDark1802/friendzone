export function renderSecurityAlertEmailHtml(payload: {
  displayName: string;
  action: string;
  timestamp: string;
}): string {
  const { displayName, action, timestamp } = payload;
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Security Alert — FriendZone</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #07080d; color: #f3f4f6; margin: 0; padding: 0; }
    .container { max-width: 560px; margin: 40px auto; background-color: #0f111a; border: 1px solid rgba(255,255,255,0.1); border-radius: 24px; padding: 40px; box-shadow: 0 20px 40px rgba(0,0,0,0.5); }
    .logo { font-size: 24px; font-weight: 800; background: linear-gradient(135deg, #6366f1 0%, #a855f7 100%); -webkit-background-clip: text; -webkit-text-fill-color: transparent; margin-bottom: 24px; }
    h1 { font-size: 20px; font-weight: 700; color: #f87171; margin-top: 0; }
    p { font-size: 14px; line-height: 1.6; color: #9ca3af; }
    .alert-box { background-color: rgba(239, 68, 68, 0.1); border: 1px solid rgba(239, 68, 68, 0.3); border-radius: 14px; padding: 16px; margin: 24px 0; color: #fca5a5; font-size: 13px; }
    .footer { margin-top: 32px; pt-4; border-top: 1px solid rgba(255,255,255,0.08); text-align: center; font-size: 12px; color: #6b7280; }
  </style>
</head>
<body>
  <div class="container">
    <div class="logo">✦ FriendZone</div>
    <h1>Security Alert</h1>
    <p>Hi ${displayName || 'there'},</p>
    
    <div class="alert-box">
      <strong>Action Detected:</strong> ${action}<br>
      <strong>Time:</strong> ${timestamp}
    </div>

    <p>If you authorized this change, no further action is required.</p>
    <p>If you did <strong>NOT</strong> initiate this action, please immediately contact support at <a href="mailto:friendzone_live@proton.me" style="color: #f87171;">friendzone_live@proton.me</a> to secure your account.</p>

    <div class="footer">
      <p>© 2026 FriendZone Platform. All rights reserved.</p>
    </div>
  </div>
</body>
</html>`;
}
