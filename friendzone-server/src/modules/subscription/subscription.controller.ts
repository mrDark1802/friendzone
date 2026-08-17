import { Request, Response, NextFunction } from 'express';
import { razorpayService, PLAN_RAZORPAY_MAP } from './razorpay.service.js';
import { QuotaService, PLAN_CONFIG } from '../users/quota.service.js';
import { emailService } from '../../services/email/resend.js';
import { prisma } from '../../config/database.js';
import { logger } from '../../config/logger.js';
import { AuthenticatedRequest } from '../../middleware/auth.middleware.js';
import { BadRequestError } from '../../utils/errors.utils.js';

const quotaService = new QuotaService();

/**
 * Creates a Razorpay Subscription for specified plan (PLUS or PRO).
 */
export async function createCheckoutSessionHandler(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) {
  try {
    const { plan } = req.body;
    if (!plan || !['PLUS', 'PRO'].includes(plan.toUpperCase())) {
      throw new BadRequestError('Plan must be PLUS or PRO');
    }

    const userId = req.user!.userId;
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { email: true },
    });

    if (!user) throw new BadRequestError('User not found');

    const subscriptionData = await razorpayService.createSubscription(userId, user.email, plan.toUpperCase() as 'PLUS' | 'PRO');

    res.status(200).json({
      success: true,
      data: subscriptionData,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Verifies Razorpay payment signature returned by frontend checkout popup.
 */
export async function verifyPaymentHandler(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) {
  try {
    const { razorpay_payment_id, razorpay_subscription_id, razorpay_signature, plan } = req.body;

    if (!razorpay_payment_id || !razorpay_subscription_id || !razorpay_signature) {
      throw new BadRequestError('Missing Razorpay payment parameters');
    }

    const isValid = razorpayService.verifyPaymentSignature({
      razorpay_payment_id,
      razorpay_subscription_id,
      razorpay_signature,
    });

    if (!isValid) {
      throw new BadRequestError('Invalid payment signature verification failed');
    }

    const userId = req.user!.userId;
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { email: true, displayName: true, razorpaySubscriptionId: true, razorpayPlanId: true },
    });

    if (!user) throw new BadRequestError('User not found');

    // Security Check 1: Ensure subscription ID matches the initiated subscription session
    if (user.razorpaySubscriptionId && user.razorpaySubscriptionId !== razorpay_subscription_id) {
      logger.warn({ userId, expected: user.razorpaySubscriptionId, received: razorpay_subscription_id }, '⚠️ Security Warning: Razorpay subscription ID mismatch');
      throw new BadRequestError('Subscription session mismatch. Please restart subscription checkout.');
    }

    // Security Check 2: Derive plan strictly from verified Razorpay Plan ID to prevent client tampering
    let cleanPlan = (plan || 'PLUS').toUpperCase();
    if (user.razorpayPlanId) {
      if (user.razorpayPlanId === PLAN_RAZORPAY_MAP.PRO) {
        cleanPlan = 'PRO';
      } else if (user.razorpayPlanId === PLAN_RAZORPAY_MAP.PLUS) {
        cleanPlan = 'PLUS';
      }
    }

    // Activate subscription & reset translation quota to 0 used
    const { updatedUser } = await quotaService.updateSubscriptionBillingState(userId, {
      plan: cleanPlan,
      razorpaySubscriptionId: razorpay_subscription_id,
      razorpayPaymentId: razorpay_payment_id,
      subscriptionStatus: 'active',
      currency: 'inr',
    });

    const quota = await quotaService.getUserQuota(userId);
    const config = PLAN_CONFIG[cleanPlan] || PLAN_CONFIG.PLUS;

    // Send subscription success email
    emailService.sendSubscriptionSuccessEmail({
      to: updatedUser.email,
      displayName: updatedUser.displayName,
      planName: config.name,
      price: cleanPlan === 'PRO' ? '₹499/month ($5.99/month)' : '₹199/month ($2.99/month)',
      limitText: config.monthlyLimit ? `${config.monthlyLimit.toLocaleString()} translations / month` : 'Unlimited',
    }).catch((err) => logger.error({ err }, 'Failed to send subscription success email'));

    res.status(200).json({
      success: true,
      message: `🎉 Successfully subscribed to ${config.name} Plan! Translation quota reset to 0 used.`,
      data: { user: updatedUser, quota },
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Handles switching to FREE plan or updating plan manually.
 */
export async function changePlanHandler(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) {
  try {
    const { plan } = req.body;
    const cleanPlan = (plan || 'FREE').toUpperCase();
    const userId = req.user!.userId;

    const currentUser = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        displayName: true,
        plan: true,
        razorpaySubscriptionId: true,
      },
    });

    if (!currentUser) throw new BadRequestError('User not found');

    if (cleanPlan === 'FREE') {
      // Cancel active Razorpay subscription if exists
      if (currentUser.razorpaySubscriptionId) {
        await razorpayService.cancelSubscription(currentUser.razorpaySubscriptionId);
      }

      const updatedUser = await quotaService.upgradePlan(userId, 'FREE');
      const quota = await quotaService.getUserQuota(userId);

      // Send plan cancellation/downgrade notification email
      emailService.sendSubscriptionCanceledEmail({
        to: currentUser.email,
        displayName: currentUser.displayName,
        planName: currentUser.plan,
      }).catch((err) => logger.error({ err }, 'Failed to send cancellation email'));

      return res.status(200).json({
        success: true,
        message: 'Plan successfully updated to Free. Quota reset to 20/day.',
        data: { user: updatedUser, quota },
      });
    }

    // For paid plans, create checkout subscription
    const subscriptionData = await razorpayService.createSubscription(userId, currentUser.email, cleanPlan as 'PLUS' | 'PRO');
    res.status(200).json({
      success: true,
      data: subscriptionData,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Authoritative Razorpay Webhook Handler with Idempotency.
 */
export async function handleWebhookHandler(req: Request, res: Response) {
  const sig = req.headers['x-razorpay-signature'] as string;

  if (!sig) {
    logger.warn('Razorpay webhook missing signature header');
    return res.status(400).send('Webhook Error: Missing x-razorpay-signature header');
  }

  try {
    const isValid = razorpayService.verifyWebhookSignature(req.body, sig);
    if (!isValid) {
      logger.error('⚠️ Razorpay webhook signature verification failed');
      return res.status(400).send('Webhook Error: Signature verification failed');
    }
  } catch (err: any) {
    logger.error({ error: err.message }, '⚠️ Error validating Razorpay webhook signature');
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  const eventPayload = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
  const eventId = eventPayload.event_id || eventPayload.id || `evt_${Date.now()}`;
  const eventType = eventPayload.event;

  // Webhook Idempotency Check against razorpay_webhook_events
  try {
    const existing = await prisma.razorpayWebhookEvent.findUnique({
      where: { razorpayEventId: eventId },
    });

    if (existing) {
      logger.info({ eventId, eventType }, 'ℹ️ Razorpay webhook event already processed (Idempotent bypass)');
      return res.status(200).json({ status: 'ok', duplicate: true });
    }

    // Log new webhook event before processing
    await prisma.razorpayWebhookEvent.create({
      data: {
        razorpayEventId: eventId,
        eventType: eventType || 'subscription.unknown',
        processed: true,
      },
    });
  } catch (dbErr: any) {
    logger.error({ error: dbErr.message, eventId }, 'Error logging Razorpay webhook idempotency event');
  }

  logger.info({ eventId, eventType }, '⚡ Processing Razorpay Webhook Event');

  try {
    const entity = eventPayload.payload?.subscription?.entity || eventPayload.payload?.payment?.entity;
    const subscriptionId = entity?.subscription_id || entity?.id;
    const notes = entity?.notes || {};
    const userId = notes.userId;

    switch (eventType) {
      case 'subscription.charged':
      case 'subscription.activated':
      case 'subscription.authenticated': {
        let planKey = (notes.plan || 'PLUS').toUpperCase();
        const planIdFromEntity = entity?.plan_id;
        if (planIdFromEntity === PLAN_RAZORPAY_MAP.PRO) {
          planKey = 'PRO';
        } else if (planIdFromEntity === PLAN_RAZORPAY_MAP.PLUS) {
          planKey = 'PLUS';
        }
        let targetUserId = userId;

        if (!targetUserId && subscriptionId) {
          const u = await prisma.user.findFirst({
            where: { razorpaySubscriptionId: subscriptionId },
            select: { id: true },
          });
          if (u) targetUserId = u.id;
        }

        if (targetUserId) {
          const { isPlanChange } = await quotaService.updateSubscriptionBillingState(targetUserId, {
            plan: planKey,
            razorpaySubscriptionId: subscriptionId,
            razorpayPaymentId: entity?.payment_id || entity?.id,
            subscriptionStatus: 'active',
            currency: 'inr',
          });

          const user = await prisma.user.findUnique({
            where: { id: targetUserId },
            select: { email: true, displayName: true },
          });

          if (user && isPlanChange) {
            const config = PLAN_CONFIG[planKey] || PLAN_CONFIG.PLUS;
            const priceText = planKey === 'PRO' ? '₹499/month ($5.99/month)' : '₹199/month ($2.99/month)';
            const limitText = config.monthlyLimit ? `${config.monthlyLimit.toLocaleString()} translations / month` : 'Unlimited';

            await emailService.sendSubscriptionSuccessEmail({
              to: user.email,
              displayName: user.displayName,
              planName: config.name,
              price: priceText,
              limitText,
            });
          }
        }
        break;
      }

      case 'subscription.halted':
      case 'subscription.pending': {
        if (subscriptionId) {
          const user = await prisma.user.findFirst({
            where: { razorpaySubscriptionId: subscriptionId },
            select: { id: true, email: true, displayName: true, plan: true },
          });

          if (user) {
            await quotaService.updateSubscriptionBillingState(user.id, {
              plan: user.plan,
              subscriptionStatus: 'past_due',
            });

            await emailService.sendSubscriptionFailedEmail({
              to: user.email,
              displayName: user.displayName,
              planName: user.plan,
              reason: 'Subscription charge halted by bank or card issuer.',
            });
          }
        }
        break;
      }

      case 'subscription.cancelled':
      case 'subscription.completed': {
        if (subscriptionId) {
          const user = await prisma.user.findFirst({
            where: { razorpaySubscriptionId: subscriptionId },
            select: { id: true, email: true, displayName: true, plan: true },
          });

          if (user) {
            await quotaService.updateSubscriptionBillingState(user.id, {
              plan: 'FREE',
              subscriptionStatus: 'canceled',
            });

            await emailService.sendSubscriptionCanceledEmail({
              to: user.email,
              displayName: user.displayName,
              planName: user.plan,
            });
          }
        }
        break;
      }

      default:
        logger.info({ eventType }, 'Unhandled Razorpay webhook event type');
    }

    return res.status(200).json({ status: 'ok' });
  } catch (error: any) {
    logger.error({ error: error?.message || error, eventId }, 'Error executing Razorpay webhook handler');
    return res.status(500).json({ error: 'Webhook processing error' });
  }
}
