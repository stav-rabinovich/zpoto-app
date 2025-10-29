// monthly-payouts.job.ts - עיבוד תשלומים חודשיים אוטומטי
import { prisma } from '../lib/prisma';

/**
 * עיבוד תשלומים חודשיים - רץ ב-1 לכל חודש
 */
export async function processMonthlyPayouts() {
  console.log('💰 Starting monthly payouts processing...');

  const now = new Date();
  const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);

  console.log(
    `💰 Processing payouts for period: ${lastMonth.toISOString()} - ${endOfLastMonth.toISOString()}`
  );

  try {
    // קבלת כל העמלות מהחודש שעבר שעדיין לא עובדו
    const unpaidCommissions = await prisma.commission.findMany({
      where: {
        calculatedAt: {
          gte: lastMonth,
          lte: endOfLastMonth,
        },
        payoutProcessed: false,
      },
      include: {
        booking: {
          include: {
            parking: {
              select: {
                ownerId: true,
              },
            },
          },
        },
      },
    });

    console.log(`💰 Found ${unpaidCommissions.length} unpaid commissions`);

    if (unpaidCommissions.length === 0) {
      console.log('💰 No unpaid commissions found - nothing to process');
      return { success: true, message: 'No payouts to process', payoutsCreated: 0 };
    }

    // קיבוץ עמלות לפי בעל חניה
    const ownerCommissions = new Map<number, any[]>();

    for (const commission of unpaidCommissions) {
      const ownerId = commission.booking.parking.ownerId;
      if (!ownerCommissions.has(ownerId)) {
        ownerCommissions.set(ownerId, []);
      }
      ownerCommissions.get(ownerId)!.push(commission);
    }

    console.log(`💰 Processing payouts for ${ownerCommissions.size} owners`);

    const payoutsCreated = [];

    // יצירת תשלום לכל בעל חניה
    for (const [ownerId, commissions] of ownerCommissions) {
      try {
        const totalCommissionCents = commissions.reduce((sum, c) => sum + c.commissionCents, 0);
        const totalNetOwnerCents = commissions.reduce((sum, c) => sum + c.netOwnerCents, 0);

        console.log(
          `💰 Creating payout for owner ${ownerId}: ₪${(totalNetOwnerCents / 100).toFixed(2)}`
        );

        // יצירת רשומת תשלום
        const payout = await prisma.ownerPayout.create({
          data: {
            ownerId,
            periodStart: lastMonth,
            periodEnd: endOfLastMonth,
            totalCommissionCents,
            netPayoutCents: totalNetOwnerCents,
            status: 'PENDING',
            paymentMethod: 'bank_transfer',
            paymentReference: `AUTO_PAYOUT_${ownerId}_${lastMonth.getFullYear()}_${lastMonth.getMonth() + 1}`,
            notes: `תשלום אוטומטי עבור ${lastMonth.toLocaleDateString('he-IL', { month: 'long', year: 'numeric' })}`,
          },
        });

        // עדכון העמלות כמעובדות
        const commissionIds = commissions.map(c => c.id);
        await prisma.commission.updateMany({
          where: {
            id: { in: commissionIds },
          },
          data: {
            payoutProcessed: true,
            payoutId: payout.id,
          },
        });

        payoutsCreated.push({
          ownerId,
          payoutId: payout.id,
          amount: totalNetOwnerCents / 100,
          commissionsCount: commissions.length,
        });

        console.log(`✅ Payout created for owner ${ownerId}: ID ${payout.id}`);
      } catch (error) {
        console.error(`❌ Error creating payout for owner ${ownerId}:`, error);
        // ממשיכים עם בעלי חניות אחרים גם אם יש שגיאה
      }
    }

    console.log(
      `💰 Monthly payouts processing completed. Created ${payoutsCreated.length} payouts`
    );

    return {
      success: true,
      message: `Successfully processed ${payoutsCreated.length} payouts`,
      payoutsCreated,
      period: {
        start: lastMonth.toISOString(),
        end: endOfLastMonth.toISOString(),
      },
    };
  } catch (error: any) {
    console.error('❌ Error in monthly payouts processing:', error);
    return {
      success: false,
      error: error?.message || 'Unknown error',
      payoutsCreated: 0,
    };
  }
}

/**
 * בדיקה ידנית של עיבוד תשלומים (לבדיקות)
 */
export async function testMonthlyPayouts() {
  console.log('🧪 Testing monthly payouts processing...');
  return await processMonthlyPayouts();
}
