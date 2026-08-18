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

export interface QuotaReservation {
  userId: string;
  reservedAt: Date;
  periodDay: string; // e.g. "2026-8-18"
  periodMonth: string; // e.g. "2026-8"
  plan: string;
}

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
   * Atomically reserves 1 quota unit BEFORE any external translation API call.
   * Concurrency-safe: uses conditional atomic database update.
   */
  async reserveQuota(userId: string): Promise<QuotaReservation> {
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
    const periodDay = `${now.getUTCFullYear()}-${now.getUTCMonth()}-${now.getUTCDate()}`;
    const periodMonth = `${now.getUTCFullYear()}-${now.getUTCMonth()}`;

    // Check Daily Reset (UTC day boundary)
    const isNewDay =
      now.getUTCFullYear() !== user.lastDailyReset.getUTCFullYear() ||
      now.getUTCMonth() !== user.lastDailyReset.getUTCMonth() ||
      now.getUTCDate() !== user.lastDailyReset.getUTCDate();

    // Check Monthly Reset (UTC month boundary)
    const isNewMonth =
      now.getUTCFullYear() !== user.lastMonthlyReset.getUTCFullYear() ||
      now.getUTCMonth() !== user.lastMonthlyReset.getUTCMonth();

    // Conditional where clause for atomic increment
    const whereClause: any = {
      id: userId,
    };
    if (!isNewDay && config.dailyLimit !== null) {
      whereClause.dailyTranslationCount = { lt: config.dailyLimit };
    }
    if (!isNewMonth && config.monthlyLimit !== null) {
      whereClause.monthlyTranslationCount = { lt: config.monthlyLimit };
    }

    // Atomic conditional increment
    const updateResult = await prisma.user.updateMany({
      where: whereClause,
      data: {
        dailyTranslationCount: isNewDay ? 1 : { increment: 1 },
        monthlyTranslationCount: isNewMonth ? 1 : { increment: 1 },
        lastDailyReset: isNewDay ? now : undefined,
        lastMonthlyReset: isNewMonth ? now : undefined,
      },
    });

    if (updateResult.count === 0) {
      const err = new Error(
        `QUOTA_EXCEEDED: You have reached your translation limit on the ${config.name} plan. Upgrade to continue translating!`
      );
      (err as any).statusCode = 402;
      (err as any).code = 'QUOTA_EXCEEDED';
      throw err;
    }

    return {
      userId,
      reservedAt: now,
      periodDay,
      periodMonth,
      plan: planKey,
    };
  }

  /**
   * Safely releases a reserved quota unit when all translation attempts for a message fail.
   * Period-safe: does NOT decrement if a new day or month has rolled over since the reservation.
   */
  async releaseQuota(reservation: QuotaReservation): Promise<void> {
    try {
      const now = new Date();
      const currentPeriodDay = `${now.getUTCFullYear()}-${now.getUTCMonth()}-${now.getUTCDate()}`;
      const currentPeriodMonth = `${now.getUTCFullYear()}-${now.getUTCMonth()}`;

      const config = PLAN_CONFIG[reservation.plan] || PLAN_CONFIG.FREE;

      const shouldDecrementDaily =
        currentPeriodDay === reservation.periodDay && config.dailyLimit !== null;
      const shouldDecrementMonthly =
        currentPeriodMonth === reservation.periodMonth && config.monthlyLimit !== null;

      if (!shouldDecrementDaily && !shouldDecrementMonthly) {
        return; // Period rolled over; do not decrement a newer period's counters
      }

      await prisma.user.updateMany({
        where: {
          id: reservation.userId,
          ...(shouldDecrementDaily ? { dailyTranslationCount: { gt: 0 } } : {}),
          ...(shouldDecrementMonthly ? { monthlyTranslationCount: { gt: 0 } } : {}),
        },
        data: {
          ...(shouldDecrementDaily ? { dailyTranslationCount: { decrement: 1 } } : {}),
          ...(shouldDecrementMonthly ? { monthlyTranslationCount: { decrement: 1 } } : {}),
        },
      });
    } catch {
      // Non-blocking catch for background quota release
    }
  }

  /**
   * Legacy wrapper for atomic quota check and increment.
   */
  async checkAndIncrementQuota(userId: string): Promise<void> {
    await this.reserveQuota(userId);
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

    // Daily reset check & DB sync
    if (
      now.getUTCFullYear() !== user.lastDailyReset.getUTCFullYear() ||
      now.getUTCMonth() !== user.lastDailyReset.getUTCMonth() ||
      now.getUTCDate() !== user.lastDailyReset.getUTCDate()
    ) {
      dailyUsed = 0;
      await prisma.user.update({
        where: { id: userId },
        data: { dailyTranslationCount: 0, lastDailyReset: now },
      }).catch(() => {});
    }

    // Monthly reset check & DB sync
    if (
      now.getUTCFullYear() !== user.lastMonthlyReset.getUTCFullYear() ||
      now.getUTCMonth() !== user.lastMonthlyReset.getUTCMonth()
    ) {
      monthlyUsed = 0;
      await prisma.user.update({
        where: { id: userId },
        data: { monthlyTranslationCount: 0, lastMonthlyReset: now },
      }).catch(() => {});
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

