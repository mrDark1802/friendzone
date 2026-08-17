import { prisma } from '../../config/database.js';
import { ForbiddenError } from '../../utils/errors.utils.js';

export interface PlanLimits {
  name: string;
  price: string;
  dailyLimit: number | null;
  monthlyLimit: number | null;
}

export const PLAN_CONFIG: Record<string, PlanLimits> = {
  FREE: {
    name: 'Free',
    price: '₹0 / $0',
    dailyLimit: 20,
    monthlyLimit: null,
  },
  PLUS: {
    name: 'Plus',
    price: '₹199/month ($2.99/month)',
    dailyLimit: null,
    monthlyLimit: 2000,
  },
  PRO: {
    name: 'Pro',
    price: '₹499/month ($5.99/month)',
    dailyLimit: null,
    monthlyLimit: 10000,
  },
};

export class QuotaService {
  /**
   * Resets quota counters to 0 exactly once when a plan transition occurs.
   */
  async resetQuotaForPlanChange(userId: string): Promise<void> {
    const now = new Date();
    await prisma.user.update({
      where: { id: userId },
      data: {
        dailyTranslationCount: 0,
        monthlyTranslationCount: 0,
        lastDailyReset: now,
        lastMonthlyReset: now,
      },
    });
  }

  /**
   * Checks and enforces translation quota for a user.
   * Resets counts automatically when a new day/month starts.
   * Throws Error if quota is exceeded.
   */
  async checkAndIncrementQuota(userId: string): Promise<void> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        plan: true,
        dailyTranslationCount: true,
        monthlyTranslationCount: true,
        lastDailyReset: true,
        lastMonthlyReset: true,
      },
    });

    if (!user) {
      throw new ForbiddenError('User not found');
    }

    const planKey = (user.plan || 'FREE').toUpperCase();
    const config = PLAN_CONFIG[planKey] || PLAN_CONFIG.FREE;

    const now = new Date();
    let { dailyTranslationCount, monthlyTranslationCount, lastDailyReset, lastMonthlyReset } = user;

    // Check Daily Reset (UTC day boundary)
    const isNewDay =
      now.getUTCFullYear() !== lastDailyReset.getUTCFullYear() ||
      now.getUTCMonth() !== lastDailyReset.getUTCMonth() ||
      now.getUTCDate() !== lastDailyReset.getUTCDate();

    if (isNewDay) {
      dailyTranslationCount = 0;
      lastDailyReset = now;
    }

    // Check Monthly Reset (UTC month boundary)
    const isNewMonth =
      now.getUTCFullYear() !== lastMonthlyReset.getUTCFullYear() ||
      now.getUTCMonth() !== lastMonthlyReset.getUTCMonth();

    if (isNewMonth) {
      monthlyTranslationCount = 0;
      lastMonthlyReset = now;
    }

    // Enforce Quota
    if (config.dailyLimit !== null && dailyTranslationCount >= config.dailyLimit) {
      if (isNewDay || isNewMonth) {
        await prisma.user.update({
          where: { id: userId },
          data: {
            dailyTranslationCount,
            monthlyTranslationCount,
            lastDailyReset,
            lastMonthlyReset,
          },
        });
      }
      const err = new Error(
        `QUOTA_EXCEEDED: You have reached your daily limit of ${config.dailyLimit} translations on the Free plan. Upgrade to Plus or Pro for higher limits!`
      );
      (err as any).statusCode = 402;
      (err as any).code = 'QUOTA_EXCEEDED';
      throw err;
    }

    if (config.monthlyLimit !== null && monthlyTranslationCount >= config.monthlyLimit) {
      if (isNewDay || isNewMonth) {
        await prisma.user.update({
          where: { id: userId },
          data: {
            dailyTranslationCount,
            monthlyTranslationCount,
            lastDailyReset,
            lastMonthlyReset,
          },
        });
      }
      const err = new Error(
        `QUOTA_EXCEEDED: You have reached your monthly limit of ${config.monthlyLimit.toLocaleString()} translations on the ${config.name} plan. Upgrade your plan to continue!`
      );
      (err as any).statusCode = 402;
      (err as any).code = 'QUOTA_EXCEEDED';
      throw err;
    }

    // Increment usage safely
    await prisma.user.update({
      where: { id: userId },
      data: {
        dailyTranslationCount: dailyTranslationCount + 1,
        monthlyTranslationCount: monthlyTranslationCount + 1,
        lastDailyReset,
        lastMonthlyReset,
      },
    });
  }

  /**
   * Retrieves current quota status & limits for dashboard display.
   */
  async getUserQuota(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        plan: true,
        dailyTranslationCount: true,
        monthlyTranslationCount: true,
        lastDailyReset: true,
        lastMonthlyReset: true,
        razorpaySubscriptionId: true,
        subscriptionStatus: true,
        currency: true,
      },
    });

    if (!user) {
      throw new ForbiddenError('User not found');
    }

    const planKey = (user.plan || 'FREE').toUpperCase();
    const config = PLAN_CONFIG[planKey] || PLAN_CONFIG.FREE;

    const now = new Date();
    let dailyUsed = user.dailyTranslationCount;
    let monthlyUsed = user.monthlyTranslationCount;

    // Daily reset check
    if (
      now.getUTCFullYear() !== user.lastDailyReset.getUTCFullYear() ||
      now.getUTCMonth() !== user.lastDailyReset.getUTCMonth() ||
      now.getUTCDate() !== user.lastDailyReset.getUTCDate()
    ) {
      dailyUsed = 0;
    }

    // Monthly reset check
    if (
      now.getUTCFullYear() !== user.lastMonthlyReset.getUTCFullYear() ||
      now.getUTCMonth() !== user.lastMonthlyReset.getUTCMonth()
    ) {
      monthlyUsed = 0;
    }

    const isDaily = config.dailyLimit !== null;
    const limit = isDaily ? config.dailyLimit! : config.monthlyLimit!;
    const used = isDaily ? dailyUsed : monthlyUsed;
    const remaining = Math.max(0, limit - used);
    const percentage = Math.min(100, Math.round((used / limit) * 100));

    return {
      plan: planKey,
      planName: config.name,
      price: config.price,
      isDailyLimit: isDaily,
      used,
      limit,
      remaining,
      percentage,
      dailyUsed,
      monthlyUsed,
      subscriptionStatus: user.subscriptionStatus || 'active',
      currency: user.currency || 'inr',
    };
  }

  /**
   * Upgrades/changes a user's plan securely and resets translation counters.
   */
  async upgradePlan(userId: string, targetPlan: string) {
    const validPlans = ['FREE', 'PLUS', 'PRO'];
    const cleanPlan = targetPlan.toUpperCase();

    if (!validPlans.includes(cleanPlan)) {
      throw new Error('Invalid subscription plan');
    }

    const now = new Date();
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        plan: cleanPlan,
        dailyTranslationCount: 0,
        monthlyTranslationCount: 0,
        lastDailyReset: now,
        lastMonthlyReset: now,
        subscriptionStatus: cleanPlan === 'FREE' ? 'canceled' : 'active',
      },
      select: {
        id: true,
        email: true,
        displayName: true,
        plan: true,
      },
    });

    return updatedUser;
  }

  /**
   * Updates billing state from Razorpay Webhook or Payment Verification events.
   */
  async updateSubscriptionBillingState(
    userId: string,
    data: {
      plan: string;
      razorpayCustomerId?: string;
      razorpaySubscriptionId?: string;
      razorpayPlanId?: string;
      razorpayPaymentId?: string;
      currency?: string;
      subscriptionStatus?: string;
      currentPeriodStart?: Date;
      currentPeriodEnd?: Date;
      cancelAtPeriodEnd?: boolean;
    }
  ) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { plan: true, email: true, displayName: true },
    });

    if (!user) throw new Error(`User not found: ${userId}`);

    const isPlanChange = user.plan !== data.plan.toUpperCase();
    const now = new Date();

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        plan: data.plan.toUpperCase(),
        razorpayCustomerId: data.razorpayCustomerId,
        razorpaySubscriptionId: data.razorpaySubscriptionId,
        razorpayPlanId: data.razorpayPlanId,
        razorpayPaymentId: data.razorpayPaymentId,
        currency: data.currency ? data.currency.toLowerCase() : 'inr',
        subscriptionStatus: data.subscriptionStatus || 'active',
        currentPeriodStart: data.currentPeriodStart,
        currentPeriodEnd: data.currentPeriodEnd,
        cancelAtPeriodEnd: data.cancelAtPeriodEnd ?? false,
        // Reset quota EXACTLY ONCE if plan transition occurred
        ...(isPlanChange
          ? {
              dailyTranslationCount: 0,
              monthlyTranslationCount: 0,
              lastDailyReset: now,
              lastMonthlyReset: now,
            }
          : {}),
      },
    });

    return { updatedUser, isPlanChange };
  }
}

