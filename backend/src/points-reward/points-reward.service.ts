import { Injectable, ForbiddenException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
  PointsReward,
  PointsRewardDocument,
  TrustBadge,
  TransactionType,
} from './schemas/points-reward.schema';
import { Doctor, DoctorDocument, SubscriptionPlan } from '../doctors/schemas/doctor.schema';
import { Post } from '../posts/schemas/post.schema';
import { BookedAppointment, BookedAppointmentDocument } from '../booked-appointment/schemas/booked-appointment.schema';

// ── Mentor Level ──────────────────────────────────────────────────────────────
export interface MentorLevelResult {
  level:      number;   // 1–5
  title:      string;
  score:      number;
  nextScore:  number | null;  // null at max level
}

const MENTOR_LEVELS = [
  { level: 1, title: 'Newcomer', min: 0   },
  { level: 2, title: 'Rising',   min: 25  },
  { level: 3, title: 'Trusted',  min: 60  },
  { level: 4, title: 'Expert',   min: 120 },
  { level: 5, title: 'Master',   min: 230 },
];

function computeMentorLevel(trustScore: number, completedCount: number, avgRating: number): MentorLevelResult {
  const score = (trustScore * 25) + completedCount + Math.round(avgRating * 10);
  let current = MENTOR_LEVELS[0];
  for (const lvl of MENTOR_LEVELS) {
    if (score >= lvl.min) current = lvl;
  }
  const nextLvl = MENTOR_LEVELS.find(l => l.level === current.level + 1);
  return {
    level:     current.level,
    title:     current.title,
    score,
    nextScore: nextLvl ? nextLvl.min : null,
  };
}

// ── Verification slot config per plan ────────────────────────────────────────
const SLOT_CONFIG: Record<SubscriptionPlan, { base: number; bonus: number }> = {
  free_trial:   { base: 0, bonus: 0 },
  basic:        { base: 3, bonus: 3 },
  professional: { base: 5, bonus: 5 },
  premium:      { base: 8, bonus: 8 },
};

// ── Like milestone definitions ───────────────────────────────────────────────
const LIKE_POINT_MILESTONES: { key: string; threshold: number; points: number }[] = [
  { key: '1k',  threshold: 1_000,  points: 500  },
  { key: '5k',  threshold: 5_000,  points: 1000 },
  { key: '10k', threshold: 10_000, points: 1000 },
];

// ── Trust badge milestones ────────────────────────────────────────────────────
const TRUST_MILESTONES: { key: string; threshold: number; badge: TrustBadge }[] = [
  { key: '1lac',  threshold: 100_000,   badge: 'bronze'   },
  { key: '2lac',  threshold: 200_000,   badge: 'silver'   },
  { key: '5lac',  threshold: 500_000,   badge: 'gold'     },
  { key: '10lac', threshold: 1_000_000, badge: 'platinum' },
];

const BADGE_RANK: Record<TrustBadge, number> = {
  none: 0, bronze: 1, silver: 2, gold: 3, platinum: 4,
};

@Injectable()
export class PointsRewardService {
  constructor(
    @InjectModel(PointsReward.name)
    private pointsRewardModel: Model<PointsRewardDocument>,
    @InjectModel(Post.name)
    private postModel: Model<any>,
    @InjectModel(BookedAppointment.name)
    private appointmentModel: Model<BookedAppointmentDocument>,
    @InjectModel(Doctor.name)
    private doctorModel: Model<DoctorDocument>,
  ) {}

  // ── Get or create wallet for a doctor ────────────────────────────────────
  async getOrCreateWallet(doctorId: string): Promise<PointsRewardDocument> {
    const existing = await this.pointsRewardModel
      .findOne({ doctorId: new Types.ObjectId(doctorId) })
      .exec();
    if (existing) return existing;

    const wallet = new this.pointsRewardModel({
      doctorId: new Types.ObjectId(doctorId),
    });
    return wallet.save();
  }

  // ── Called after every like increment on an approved post ────────────────
  async handleLikeMilestone(
    postId: string,
    currentLikes: number,
    approvingDoctorId: string,
  ): Promise<void> {
    if (!approvingDoctorId) return; // post not yet approved by a doctor

    const wallet = await this.getOrCreateWallet(approvingDoctorId);
    const postObjId = new Types.ObjectId(postId);

    // Find or create the postMilestone entry
    let postEntry = wallet.postMilestones.find(
      (pm) => pm.postId.toString() === postId,
    );
    if (!postEntry) {
      wallet.postMilestones.push({ postId: postObjId, pointMilestones: [], trustMilestones: [] });
      postEntry = wallet.postMilestones[wallet.postMilestones.length - 1];
    }

    let changed = false;

    // ── Check point milestones (1k, 5k, 10k) ──
    for (const m of LIKE_POINT_MILESTONES) {
      if (
        currentLikes >= m.threshold &&
        !postEntry.pointMilestones.includes(m.key)
      ) {
        postEntry.pointMilestones.push(m.key);
        wallet.totalPoints += m.points;
        wallet.lifetimePointsEarned += m.points;
        wallet.transactions.push({
          type: `likes_${m.key}` as TransactionType,
          points: m.points,
          description: `Post crossed ${m.key} likes — +${m.points} pts`,
          postId: postObjId,
          createdAt: new Date(),
        });
        changed = true;
      }
    }

    // ── Check trust badge milestones (1lac, 2lac, 5lac, 10lac) ──
    for (const t of TRUST_MILESTONES) {
      if (
        currentLikes >= t.threshold &&
        !postEntry.trustMilestones.includes(t.key)
      ) {
        postEntry.trustMilestones.push(t.key);

        // Upgrade badge only if this badge is higher than current
        if (BADGE_RANK[t.badge] > BADGE_RANK[wallet.trustBadge]) {
          wallet.trustBadge = t.badge;
        }

        // Trust score = badge rank (1=Bronze, 2=Silver, 3=Gold, 4=Platinum)
        wallet.trustScore = BADGE_RANK[wallet.trustBadge];

        wallet.transactions.push({
          type: 'trust_badge',
          points: 0,
          description: `Post crossed ${t.key} likes — Trust badge upgraded to ${t.badge}`,
          postId: postObjId,
          createdAt: new Date(),
        });
        changed = true;
      }
    }

    if (changed) {
      wallet.markModified('postMilestones');
      wallet.markModified('transactions');
      await wallet.save();
    }
  }

  // ── Recalculate trust badge from remaining post milestones ───────────────
  private _recalcTrustBadge(wallet: PointsRewardDocument): TrustBadge {
    let highest: TrustBadge = 'none';
    for (const postEntry of wallet.postMilestones) {
      for (const t of TRUST_MILESTONES) {
        if (
          postEntry.trustMilestones.includes(t.key) &&
          BADGE_RANK[t.badge] > BADGE_RANK[highest]
        ) {
          highest = t.badge;
        }
      }
    }
    return highest;
  }

  // ── Called after every like decrement (unlike) ────────────────────────────
  async handleLikeDecrement(
    postId: string,
    currentLikes: number,
    approvingDoctorId: string,
  ): Promise<void> {
    if (!approvingDoctorId) return;

    const wallet = await this.getOrCreateWallet(approvingDoctorId);
    const postObjId = new Types.ObjectId(postId);

    const postEntry = wallet.postMilestones.find(
      (pm) => pm.postId.toString() === postId,
    );
    if (!postEntry) return; // no milestones earned for this post yet

    let changed = false;

    // ── Reverse point milestones that are now above current likes ──
    for (const m of LIKE_POINT_MILESTONES) {
      const idx = postEntry.pointMilestones.indexOf(m.key);
      if (currentLikes < m.threshold && idx !== -1) {
        postEntry.pointMilestones.splice(idx, 1);
        wallet.totalPoints = Math.max(0, wallet.totalPoints - m.points);
        wallet.transactions.push({
          type: `likes_${m.key}_reversed` as TransactionType,
          points: -m.points,
          description: `Post dropped below ${m.key} likes — −${m.points} pts reversed`,
          postId: postObjId,
          createdAt: new Date(),
        });
        changed = true;
      }
    }

    // ── Reverse trust milestones that are now above current likes ──
    for (const t of TRUST_MILESTONES) {
      const idx = postEntry.trustMilestones.indexOf(t.key);
      if (currentLikes < t.threshold && idx !== -1) {
        postEntry.trustMilestones.splice(idx, 1);
        wallet.transactions.push({
          type: 'trust_badge',
          points: 0,
          description: `Post dropped below ${t.key} likes — Trust badge milestone reversed`,
          postId: postObjId,
          createdAt: new Date(),
        });
        changed = true;
      }
    }

    if (changed) {
      wallet.trustBadge = this._recalcTrustBadge(wallet);
      // Trust score = badge rank (1=Bronze, 2=Silver, 3=Gold, 4=Platinum)
      wallet.trustScore = BADGE_RANK[wallet.trustBadge];
      wallet.markModified('postMilestones');
      wallet.markModified('transactions');
      await wallet.save();
    }
  }

  // ── Called when a post is deleted (soft-delete) ───────────────────────────
  // currentLikes is used as a fallback when postMilestones entry is missing
  // (e.g. wallet pre-dates milestone tracking)
  async handlePostDeleted(
    postId: string,
    approvingDoctorId: string,
    currentLikes: number = 0,
  ): Promise<void> {
    if (!approvingDoctorId) return;

    const wallet = await this.getOrCreateWallet(approvingDoctorId);
    const postObjId = new Types.ObjectId(postId);

    const postIdx = wallet.postMilestones.findIndex(
      (pm) => pm.postId.toString() === postId,
    );

    let pointsToReverse = 0;
    let trustMilestonesCount = 0;

    if (postIdx !== -1) {
      // Use tracked milestones — the accurate path
      const postEntry = wallet.postMilestones[postIdx];
      for (const m of LIKE_POINT_MILESTONES) {
        if (postEntry.pointMilestones.includes(m.key)) {
          pointsToReverse += m.points;
        }
      }
      trustMilestonesCount = postEntry.trustMilestones.length;
      wallet.postMilestones.splice(postIdx, 1);
    } else {
      // Fallback: no tracking entry found — calculate from like count
      // (handles wallets created before postMilestones tracking was added)
      for (const m of LIKE_POINT_MILESTONES) {
        if (currentLikes >= m.threshold) {
          pointsToReverse += m.points;
        }
      }
      for (const t of TRUST_MILESTONES) {
        if (currentLikes >= t.threshold) {
          trustMilestonesCount++;
        }
      }
    }

    let changed = false;

    if (pointsToReverse > 0) {
      wallet.totalPoints = Math.max(0, wallet.totalPoints - pointsToReverse);
      wallet.transactions.push({
        type: 'post_deleted',
        points: -pointsToReverse,
        description: `Post deleted — −${pointsToReverse} pts reversed`,
        postId: postObjId,
        createdAt: new Date(),
      });
      changed = true;
    }

    if (trustMilestonesCount > 0) {
      changed = true;
    }

    if (changed) {
      wallet.trustBadge = this._recalcTrustBadge(wallet);
      // Trust score = badge rank (1=Bronze, 2=Silver, 3=Gold, 4=Platinum)
      wallet.trustScore = BADGE_RANK[wallet.trustBadge];
      wallet.markModified('postMilestones');
      wallet.markModified('transactions');
      await wallet.save();
    }
  }

  // ── Called when an appointment is marked completed ────────────────────────
  async handleBookingCompleted(
    doctorId: string,
    yearMonth: string,
    plan: SubscriptionPlan = 'free_trial',
  ): Promise<void> {
    const wallet = await this.getOrCreateWallet(doctorId);

    let monthEntry = wallet.monthlyBookings.find(
      (mb) => mb.yearMonth === yearMonth,
    );
    if (!monthEntry) {
      wallet.monthlyBookings.push({ yearMonth, completedCount: 0, rewarded: false });
      monthEntry = wallet.monthlyBookings[wallet.monthlyBookings.length - 1];
    }

    monthEntry.completedCount += 1;

    // Award 200 pts when 30 bookings completed in the month (once only)
    if (monthEntry.completedCount >= 30 && !monthEntry.rewarded) {
      monthEntry.rewarded = true;
      wallet.totalPoints += 200;
      wallet.lifetimePointsEarned += 200;
      wallet.transactions.push({
        type: 'booking_monthly',
        points: 200,
        description: `30 appointments completed in ${yearMonth} — +200 pts`,
        createdAt: new Date(),
      });

      // Grant bonus verification slots reset
      await this._grantBonusVerificationSlots(wallet, yearMonth, plan);
    }

    wallet.markModified('monthlyBookings');
    wallet.markModified('transactions');
    await wallet.save();
  }

  // ── Internal: grant bonus verification slots on 30-appt milestone ─────────
  private async _grantBonusVerificationSlots(
    wallet: PointsRewardDocument,
    yearMonth: string,
    plan: SubscriptionPlan,
  ): Promise<void> {
    const config = SLOT_CONFIG[plan];
    if (config.bonus === 0) return; // free_trial — no slots

    let slotEntry = wallet.verificationSlots.find(
      (s) => s.yearMonth === yearMonth,
    );
    if (!slotEntry) {
      wallet.verificationSlots.push({
        yearMonth,
        baseSlots: config.base,
        usedSlots: 0,
        bonusGranted: false,
        bonusSlots: 0,
      });
      slotEntry = wallet.verificationSlots[wallet.verificationSlots.length - 1];
    }

    if (!slotEntry.bonusGranted) {
      slotEntry.bonusGranted = true;
      slotEntry.bonusSlots = config.bonus;
      wallet.markModified('verificationSlots');
    }
  }

  // ── Check available slots and consume one on approval ─────────────────────
  async checkAndConsumeVerificationSlot(
    doctorId: string,
    plan: SubscriptionPlan,
  ): Promise<void> {
    const config = SLOT_CONFIG[plan];

    // Free trial doctors can never verify posts
    if (config.base === 0) {
      throw new ForbiddenException(
        'Free trial doctors cannot verify posts. Please upgrade your subscription.',
      );
    }

    const wallet = await this.getOrCreateWallet(doctorId);
    const yearMonth = new Date().toISOString().slice(0, 7);

    let slotEntry = wallet.verificationSlots.find(
      (s) => s.yearMonth === yearMonth,
    );
    if (!slotEntry) {
      // First verification this month — initialise entry
      wallet.verificationSlots.push({
        yearMonth,
        baseSlots: config.base,
        usedSlots: 0,
        bonusGranted: false,
        bonusSlots: 0,
      });
      slotEntry = wallet.verificationSlots[wallet.verificationSlots.length - 1];
    } else if (slotEntry.baseSlots !== config.base) {
      // Plan changed mid-month — update baseSlots to reflect current plan
      slotEntry.baseSlots = config.base;
      wallet.markModified('verificationSlots');
    }

    // Always use config.base (current plan) for totalSlots, not stored baseSlots
    const totalSlots = config.base + (slotEntry.bonusGranted ? slotEntry.bonusSlots : 0);
    const remaining = totalSlots - slotEntry.usedSlots;

    if (remaining <= 0) {
      throw new ForbiddenException(
        `You have used all ${totalSlots} verification slots for ${yearMonth}. Complete 30 appointments this month to unlock ${config.bonus} more slots.`,
      );
    }

    slotEntry.usedSlots += 1;
    wallet.markModified('verificationSlots');
    await wallet.save();
  }

  // ── Reset verification slots when a doctor changes subscription plan ────────
  async resetSlotsOnPlanChange(
    doctorId: string,
    plan: SubscriptionPlan,
  ): Promise<void> {
    const config = SLOT_CONFIG[plan];
    const wallet = await this.getOrCreateWallet(doctorId);
    const yearMonth = new Date().toISOString().slice(0, 7);

    const slotIdx = wallet.verificationSlots.findIndex(
      (s) => s.yearMonth === yearMonth,
    );

    if (slotIdx !== -1) {
      // Reset existing entry for this month to the new plan's limits
      wallet.verificationSlots[slotIdx].baseSlots = config.base;
      wallet.verificationSlots[slotIdx].usedSlots = 0;
      wallet.verificationSlots[slotIdx].bonusGranted = false;
      wallet.verificationSlots[slotIdx].bonusSlots = 0;
    } else {
      wallet.verificationSlots.push({
        yearMonth,
        baseSlots: config.base,
        usedSlots: 0,
        bonusGranted: false,
        bonusSlots: 0,
      });
    }

    wallet.markModified('verificationSlots');
    await wallet.save();
  }

  // ── Get current verification slot info for a doctor ───────────────────────
  async getVerificationSlotsInfo(
    doctorId: string,
    plan: SubscriptionPlan,
  ): Promise<{
    yearMonth: string;
    baseSlots: number;
    bonusGranted: boolean;
    bonusSlots: number;
    totalSlots: number;
    usedSlots: number;
    remainingSlots: number;
  }> {
    const config = SLOT_CONFIG[plan];
    const wallet = await this.getOrCreateWallet(doctorId);
    const yearMonth = new Date().toISOString().slice(0, 7);

    const slotEntry = wallet.verificationSlots.find(
      (s) => s.yearMonth === yearMonth,
    );

    // Always use current plan's config.base (handles mid-month plan upgrades/downgrades)
    const baseSlots    = config.base;
    const bonusGranted = slotEntry?.bonusGranted ?? false;
    const bonusSlots   = slotEntry?.bonusSlots   ?? 0;
    const usedSlots    = slotEntry?.usedSlots    ?? 0;
    const totalSlots   = baseSlots + (bonusGranted ? bonusSlots : 0);

    return {
      yearMonth,
      baseSlots,
      bonusGranted,
      bonusSlots,
      totalSlots,
      usedSlots,
      remainingSlots: Math.max(0, totalSlots - usedSlots),
    };
  }

  // ── Sync current month's completed count from real appointment records ─────
  // Ensures monthlyBookings reflects actual DB state — fixes missed event-hook counts.
  private async _syncCurrentMonthBookings(
    wallet: PointsRewardDocument,
    doctorId: string,
  ): Promise<boolean> {
    const yearMonth = new Date().toISOString().slice(0, 7); // 'YYYY-MM'
    const monthStart = new Date(`${yearMonth}-01T00:00:00.000Z`);
    const monthEnd   = new Date(monthStart);
    monthEnd.setMonth(monthEnd.getMonth() + 1);

    // Count actual completed appointments this month from DB
    const realCount = await this.appointmentModel.countDocuments({
      doctorId: new Types.ObjectId(doctorId),
      status: 'completed',
      completedAt: { $gte: monthStart, $lt: monthEnd },
    });

    let entry = wallet.monthlyBookings.find(m => m.yearMonth === yearMonth);
    if (!entry) {
      wallet.monthlyBookings.push({ yearMonth, completedCount: 0, rewarded: false });
      entry = wallet.monthlyBookings[wallet.monthlyBookings.length - 1];
    }

    if (entry.completedCount !== realCount) {
      entry.completedCount = realCount;
      wallet.markModified('monthlyBookings');
      return true; // changed
    }
    return false;
  }

  // ── Get doctor's full wallet summary ─────────────────────────────────────
  async getWallet(doctorId: string): Promise<any> {
    const wallet = await this.getOrCreateWallet(doctorId);

    // Always sync current month's count from real appointment records
    const changed = await this._syncCurrentMonthBookings(wallet, doctorId);
    if (changed) await wallet.save();

    return {
      doctorId: wallet.doctorId,
      totalPoints: wallet.totalPoints,
      cashValue: +(wallet.totalPoints * 0.1).toFixed(2), // 1 pt = PKR 0.10
      lifetimePointsEarned: wallet.lifetimePointsEarned,
      trustBadge: wallet.trustBadge,
      trustScore: wallet.trustScore,
      monthlyBookings: wallet.monthlyBookings,
      recentTransactions: wallet.transactions
        .slice()
        .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
        .slice(0, 20),
    };
  }

  // ── Get transaction history ───────────────────────────────────────────────
  async getTransactions(doctorId: string): Promise<any[]> {
    const wallet = await this.getOrCreateWallet(doctorId);
    return wallet.transactions
      .slice()
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  // ── Get points summary (lightweight, for profile display) ─────────────────
  async getPointsSummary(doctorId: string): Promise<{
    totalPoints: number;
    cashValue: number;
    trustBadge: TrustBadge;
    trustScore: number;
  }> {
    const wallet = await this.getOrCreateWallet(doctorId);
    return {
      totalPoints: wallet.totalPoints,
      cashValue: +(wallet.totalPoints * 0.1).toFixed(2),
      trustBadge: wallet.trustBadge,
      trustScore: wallet.trustScore,
    };
  }

  // ── Mentor Level ─────────────────────────────────────────────────────────────
  async getMentorLevel(doctorId: string): Promise<MentorLevelResult> {
    const [wallet, doctor] = await Promise.all([
      this.getOrCreateWallet(doctorId),
      this.doctorModel.findById(doctorId).select('completedCount avgRating').lean(),
    ]);
    const completedCount = (doctor as any)?.completedCount ?? 0;
    const avgRating      = (doctor as any)?.avgRating      ?? 0;
    return computeMentorLevel(wallet.trustScore, completedCount, avgRating);
  }

  // ── Recalculate wallet from scratch based on current active approved posts ─
  // Use this to fix any wallet inconsistencies (stale test data, missed hooks)
  async recalculateWallet(doctorId: string): Promise<any> {
    // Fetch all active approved posts where this doctor is the approver
    const posts = await this.postModel
      .find({
        approvedBy: new Types.ObjectId(doctorId),
        status: 'approved',
        isActive: true,
      })
      .select('_id likes')
      .exec();

    const wallet = await this.getOrCreateWallet(doctorId);

    // Reset spendable balance and milestone tracking
    let calculatedEarnings = 0; // Track total lifetime earnings
    wallet.trustScore = 0;
    wallet.trustBadge = 'none';
    wallet.postMilestones = [] as any;

    // Rebuild from each post's current like count
    for (const post of posts) {
      const postObjId = post._id as Types.ObjectId;
      const likes: number = post.likes ?? 0;
      const pointMilestones: string[] = [];
      const trustMilestones: string[] = [];

      for (const m of LIKE_POINT_MILESTONES) {
        if (likes >= m.threshold) {
          pointMilestones.push(m.key);
          calculatedEarnings += m.points;
        }
      }

      for (const t of TRUST_MILESTONES) {
        if (likes >= t.threshold) {
          trustMilestones.push(t.key);
          if (BADGE_RANK[t.badge] > BADGE_RANK[wallet.trustBadge]) {
            wallet.trustBadge = t.badge;
          }
        }
      }

      wallet.postMilestones.push({ postId: postObjId, pointMilestones, trustMilestones } as any);
    }

    // Trust score = badge rank derived from highest badge earned
    wallet.trustScore = BADGE_RANK[wallet.trustBadge];

    // Set lifetimePointsEarned to the calculated total
    wallet.lifetimePointsEarned = calculatedEarnings;

    // Subtract points already converted to cash to get current available balance
    wallet.totalPoints = Math.max(0, calculatedEarnings - (wallet.pointsSpent ?? 0));

    wallet.transactions.push({
      type: 'wallet_recalculated',
      points: 0,
      description: `Wallet recalculated from ${posts.length} active approved post(s) — lifetime: ${calculatedEarnings} pts, available: ${wallet.totalPoints} pts`,
      createdAt: new Date(),
    });

    wallet.markModified('postMilestones');
    wallet.markModified('transactions');
    await wallet.save();

    return {
      doctorId,
      postsProcessed: posts.length,
      lifetimePointsEarned: wallet.lifetimePointsEarned,
      currentAvailablePoints: wallet.totalPoints,
      trustBadge: wallet.trustBadge,
      trustScore: wallet.trustScore,
    };
  }
}
