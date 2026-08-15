import { Resend } from 'resend';
import nodemailer from 'nodemailer';
import { env } from '../../config/env.config.js';
import { logger } from '../../config/logger.js';
import { renderVerificationEmailHtml } from './templates/verification.js';
import { renderPasswordResetEmailHtml } from './templates/password-reset.js';
import { renderSecurityAlertEmailHtml } from './templates/security-alert.js';

class EmailService {
  private resendClient: Resend | null = null;
  private smtpTransporter: nodemailer.Transporter | null = null;
  private fromEmail: string;
  private replyToEmail: string;
  private frontendUrl: string;

  constructor() {
    // 1. Check for SMTP credentials
    const smtpHost = env.SMTP_HOST || process.env.SMTP_HOST;
    const smtpUser = env.SMTP_USER || process.env.SMTP_USER;
    const smtpPass = env.SMTP_PASS || process.env.SMTP_PASS;

    if (smtpHost && (smtpUser || smtpPass)) {
      const port = env.SMTP_PORT || Number(process.env.SMTP_PORT) || 587;
      const secure = env.SMTP_SECURE === 'true' || process.env.SMTP_SECURE === 'true' || port === 465;
      this.smtpTransporter = nodemailer.createTransport({
        host: smtpHost,
        port,
        secure,
        auth: {
          user: smtpUser,
          pass: smtpPass,
        },
      });
      logger.info({ host: smtpHost, port }, '📧 Initialized SMTP transporter for email delivery');
    }

    // 2. Fallback / Primary Resend API Client
    const apiKey = env.RESEND_API_KEY || process.env.RESEND_API_KEY;
    if (apiKey) {
      this.resendClient = new Resend(apiKey);
    } else if (!this.smtpTransporter) {
      logger.warn('⚠️ Neither RESEND_API_KEY nor SMTP credentials configured. Verification links will print to server console.');
    }

    const rawFrom = env.RESEND_FROM_EMAIL || process.env.RESEND_FROM_EMAIL || 'FriendZone <onboarding@resend.dev>';
    this.fromEmail = rawFrom.replace(/\/>$/, '>').replace(/\/$/, '').trim();
    this.replyToEmail = (env.RESEND_REPLY_TO || process.env.RESEND_REPLY_TO || 'friendzone_live@proton.me').trim();
    this.frontendUrl = (env.FRONTEND_URL || process.env.FRONTEND_URL || 'http://localhost:5173').replace(/\/$/, '');
  }

  /**
   * Sends an email verification link to user.
   */
  async sendVerificationEmail(payload: {
    to: string;
    displayName: string;
    rawToken: string;
    expiresInMinutes?: number;
  }): Promise<{ success: boolean; messageId?: string }> {
    const expiresInMinutes = payload.expiresInMinutes || 30; // 30 minutes
    const verificationUrl = `${this.frontendUrl}/verify-email?token=${encodeURIComponent(payload.rawToken)}`;

    // In development environment only, log link for convenience
    if (process.env.NODE_ENV === 'development') {
      logger.info({ to: payload.to }, '✉️ Verification email generated');
    }

    const html = renderVerificationEmailHtml({
      displayName: payload.displayName,
      verificationUrl,
      expiresInMinutes,
    });

    return await this.sendEmail({
      to: payload.to,
      subject: 'Verify your FriendZone email address',
      html,
    });
  }

  /**
   * Sends a password reset link to user.
   */
  async sendPasswordResetEmail(payload: {
    to: string;
    displayName: string;
    rawToken: string;
    expiresInMinutes?: number;
  }): Promise<{ success: boolean; messageId?: string }> {
    const expiresInMinutes = payload.expiresInMinutes || 60; // 60 minutes
    const resetUrl = `${this.frontendUrl}/reset-password?token=${encodeURIComponent(payload.rawToken)}`;

    if (process.env.NODE_ENV === 'development') {
      logger.info({ to: payload.to }, '🔑 Password reset email generated');
    }

    const html = renderPasswordResetEmailHtml({
      displayName: payload.displayName,
      resetUrl,
      expiresInMinutes,
    });

    return await this.sendEmail({
      to: payload.to,
      subject: 'Reset your FriendZone password',
      html,
    });
  }

  /**
   * Sends a security alert notification to user.
   */
  async sendSecurityAlertEmail(payload: {
    to: string;
    displayName: string;
    action: string;
  }): Promise<{ success: boolean; messageId?: string }> {
    const html = renderSecurityAlertEmailHtml({
      displayName: payload.displayName,
      action: payload.action,
      timestamp: new Date().toUTCString(),
    });

    return await this.sendEmail({
      to: payload.to,
      subject: 'Security Alert — FriendZone Account Update',
      html,
    });
  }

  /**
   * Internal generic email dispatcher (Supports SMTP Transporter & Resend API).
   */
  private async sendEmail(params: {
    to: string;
    subject: string;
    html: string;
  }): Promise<{ success: boolean; messageId?: string }> {
    try {
      // Option A: Use Nodemailer SMTP Transporter if configured
      if (this.smtpTransporter) {
        const info = await this.smtpTransporter.sendMail({
          from: this.fromEmail,
          to: params.to,
          replyTo: this.replyToEmail,
          subject: params.subject,
          html: params.html,
        });
        logger.info({ messageId: info.messageId, to: params.to }, '✅ Email sent successfully via SMTP Transporter');
        return { success: true, messageId: info.messageId };
      }

      // Option B: Use Resend API
      if (this.resendClient) {
        const response = await this.resendClient.emails.send({
          from: this.fromEmail || 'FriendZone <onboarding@resend.dev>',
          to: Array.isArray(params.to) ? params.to : [params.to],
          replyTo: this.replyToEmail || 'friendzone_live@proton.me',
          subject: params.subject,
          html: params.html,
        });

        if (response.error) {
          logger.error(
            { error: response.error, to: params.to },
            '❌ Resend API Error: Failed to deliver email'
          );
          console.warn(`\n⚠️  RESEND DELIVERY NOTICE: If using onboarding@resend.dev, Resend ONLY delivers to the account owner's email address. Add custom domain at resend.com/domains or configure SMTP credentials in .env.\n`);
          return { success: false };
        }

        logger.info({ messageId: response.data?.id, to: params.to }, '✅ Email sent successfully via Resend API');
        return { success: true, messageId: response.data?.id };
      }

      // Option C: Simulation / Dev Console Mode
      logger.info({ to: params.to, subject: params.subject }, '✉️ [DEV EMAIL SIMULATION] Email logged to console.');
      return { success: true, messageId: 'simulated_dev_msg_id' };
    } catch (error: any) {
      logger.error({ error: error?.message || error, to: params.to }, '❌ Exception sending email');
      return { success: false };
    }
  }
}

export const emailService = new EmailService();
