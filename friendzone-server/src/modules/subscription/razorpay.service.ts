import Razorpay from 'razorpay';
import crypto from 'crypto';
import { env } from '../../config/env.config.js';
import { prisma } from '../../config/database.js';
import { logger } from '../../config/logger.js';
import { BadRequestError } from '../../utils/errors.utils.js';

export const PLAN_RAZORPAY_MAP: Record<string, string> = {
  PLUS: env.RAZORPAY_PLAN_PLUS || 'plan_TQpJ1jvGJn7a1j',
  PRO: env.RAZORPAY_PLAN_PRO || 'plan_TQpJOSd29bC6QH',
};

export class RazorpayService {
  private razorpay: Razorpay | null = null;

  constructor() {
    if (env.RAZORPAY_KEY_ID && env.RAZORPAY_KEY_SECRET) {
      this.razorpay = new Razorpay({
        key_id: env.RAZORPAY_KEY_ID,
        key_secret: env.RAZORPAY_KEY_SECRET,
      });
      logger.info('💳 Initialized Razorpay SDK service');
    } else {
      logger.warn('⚠️ RAZORPAY_KEY_ID or RAZORPAY_KEY_SECRET not set in environment. Razorpay operations will run in fallback mode.');
    }
  }

  private getClient(): Razorpay {
    if (!this.razorpay) {
      if (env.RAZORPAY_KEY_ID && env.RAZORPAY_KEY_SECRET) {
        this.razorpay = new Razorpay({
          key_id: env.RAZORPAY_KEY_ID,
          key_secret: env.RAZORPAY_KEY_SECRET,
        });
        return this.razorpay;
      }
      throw new BadRequestError('Razorpay API keys are not configured on the server.');
    }
    return this.razorpay;
  }

  /**
   * Creates a Razorpay Subscription for specified plan (Plus or Pro).
   */
  async createSubscription(userId: string, email: string, plan: 'PLUS' | 'PRO'): Promise<any> {
    const razorpay = this.getClient();
    const planId = PLAN_RAZORPAY_MAP[plan.toUpperCase()];

    if (!planId) {
      throw new BadRequestError(`Invalid subscription plan: ${plan}`);
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        displayName: true,
        razorpaySubscriptionId: true,
        subscriptionStatus: true,
        plan: true,
      },
    });

    if (!user) throw new BadRequestError('User not found');

    // 1. Cancel previous subscription if upgrading or changing plan
    if (
      user.razorpaySubscriptionId &&
      (user.subscriptionStatus === 'active' || user.subscriptionStatus === 'authenticated')
    ) {
      try {
        await razorpay.subscriptions.cancel(user.razorpaySubscriptionId, false);
      } catch (err: any) {
        logger.warn({ error: err.message }, 'Failed to cancel existing Razorpay subscription before creating new one.');
      }
    }

    // 2. Create new Razorpay Subscription
    const subscriptionOptions: any = {
      plan_id: planId,
      total_count: 12,
      quantity: 1,
      customer_notify: 1,
      notes: {
        userId,
        plan: plan.toUpperCase(),
        email: user.email || email,
      },
    };

    const subscription = await razorpay.subscriptions.create(subscriptionOptions);

    // Save temporary subscription ID to DB
    await prisma.user.update({
      where: { id: userId },
      data: {
        razorpaySubscriptionId: subscription.id,
        razorpayPlanId: planId,
        subscriptionStatus: 'created',
      },
    });

    return {
      subscriptionId: subscription.id,
      shortUrl: subscription.short_url,
      keyId: env.RAZORPAY_KEY_ID || '',
      plan: plan.toUpperCase(),
      user: {
        displayName: user.displayName,
        email: user.email,
      },
    };
  }

  /**
   * Verifies payment signature returned by Razorpay Checkout modal.
   */
  verifyPaymentSignature(data: {
    razorpay_payment_id: string;
    razorpay_subscription_id: string;
    razorpay_signature: string;
  }): boolean {
    const keySecret = env.RAZORPAY_KEY_SECRET;
    if (!keySecret) throw new BadRequestError('RAZORPAY_KEY_SECRET is missing');

    const body = `${data.razorpay_payment_id}|${data.razorpay_subscription_id}`;
    const expectedSignature = crypto
      .createHmac('sha256', keySecret)
      .update(body)
      .digest('hex');

    return expectedSignature === data.razorpay_signature;
  }

  /**
   * Validates Razorpay webhook event signature using raw request body.
   */
  verifyWebhookSignature(rawBody: string | Buffer, signature: string): boolean {
    const webhookSecret = env.RAZORPAY_WEBHOOK_SECRET;
    if (!webhookSecret) {
      throw new Error('RAZORPAY_WEBHOOK_SECRET is not configured.');
    }

    return Razorpay.validateWebhookSignature(
      typeof rawBody === 'string' ? rawBody : rawBody.toString('utf8'),
      signature,
      webhookSecret
    );
  }

  /**
   * Cancels an active Razorpay subscription when user switches to FREE.
   */
  async cancelSubscription(subscriptionId: string): Promise<any> {
    const razorpay = this.getClient();
    try {
      return await razorpay.subscriptions.cancel(subscriptionId, false);
    } catch (error: any) {
      logger.error({ error: error?.message || error, subscriptionId }, 'Error canceling Razorpay subscription');
      return null;
    }
  }
}

export const razorpayService = new RazorpayService();
