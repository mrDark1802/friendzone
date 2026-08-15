export function renderPasswordResetEmailHtml(payload: {
  displayName: string;
  resetUrl: string;
  expiresInMinutes: number;
}): string {
  const { displayName, resetUrl, expiresInMinutes } = payload;
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Reset your FriendZone password</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #07080d; color: #f3f4f6; margin: 0; padding: 0; }
    .container { max-width: 560px; margin: 40px auto; background-color: #0f111a; border: 1px solid rgba(255,255,255,0.1); border-radius: 24px; padding: 40px; box-shadow: 0 20px 40px rgba(0,0,0,0.5); }
    .logo { font-size: 24px; font-weight: 800; background: linear-gradient(135deg, #6366f1 0%, #a855f7 100%); -webkit-background-clip: text; -webkit-text-fill-color: transparent; margin-bottom: 24px; }
    h1 { font-size: 20px; font-weight: 700; color: #ffffff; margin-top: 0; }
    p { font-size: 14px; line-height: 1.6; color: #9ca3af; }
    .button-wrapper { text-align: center; margin: 32px 0; }
    .button { display: inline-block; background: linear-gradient(135deg, #ef4444 0%, #ec4899 100%); color: #ffffff; font-size: 14px; font-weight: 600; text-decoration: none; padding: 14px 32px; border-radius: 14px; box-shadow: 0 10px 20px rgba(239, 68, 68, 0.3); }
    .footer { margin-top: 32px; pt-4; border-top: 1px solid rgba(255,255,255,0.08); text-align: center; font-size: 12px; color: #6b7280; }
    .link-fallback { word-break: break-all; font-size: 12px; color: #f472b6; margin-top: 16px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="logo">✦ FriendZone</div>
    <h1>Reset your password</h1>
    <p>Hi ${displayName || 'there'},</p>
    <p>We received a request to reset your FriendZone account password. Click the button below to choose a new password:</p>
    
    <div class="button-wrapper">
      <a href="${resetUrl}" target="_blank" class="button">Reset Password</a>
    </div>

    <p>This password reset link will expire in <strong>${expiresInMinutes} minutes</strong>.</p>
    <p>If you did not request a password reset, you can safely ignore this email — your account remains secure.</p>

    <p class="link-fallback">Button not working? Copy and paste this URL into your browser:<br><a href="${resetUrl}" style="color: #f472b6;">${resetUrl}</a></p>

    <div class="footer">
      <p>© 2026 FriendZone Platform. All rights reserved.<br>Contact: <a href="mailto:friendzone_live@proton.me" style="color: #9ca3af;">friendzone_live@proton.me</a></p>
    </div>
  </div>
</body>
</html>`;
}
