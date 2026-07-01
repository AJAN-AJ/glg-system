import { db } from '../db/database'
import { hashPassword, generateId } from './auth'

export async function ensureSeedAdmin() {
  const adminCount = await db.members.where('isAdmin').equals(1).count()
  if (adminCount === 0) {
    const passwordHash = await hashPassword('GLG-Admin-2026')
    await db.members.add({
      id: generateId(),
      memberId: 'GLG26000',
      firstName: 'Default',
      surname: 'Chair',
      username: 'chair',
      passwordHash,
      mustChangePassword: false,
      status: 'active',
      isAdmin: true,
      adminRole: 'chair',
      adminPermission: 'read_write',
      registrationFeeStatus: 'paid',
      dateJoined: new Date().toISOString(),
      createdByAdminId: 'system'
    })
  }

  // Seed default group configuration if not yet present
  const config = await db.groupConfig.get('main')
  if (!config) {
    await db.groupConfig.add({
      id: 'main',
      penaltyDeadlineDay: 15,
      penaltyFlatFee: 500,
      penaltyExtraFee: 200,
      penaltyExtraDaysThreshold: 15,
      loanDefaults: {
        normal:     { interestRate: 0.20, durationMonths: 3 },
        soft:       { interestRate: 0.00, durationMonths: 3 },
        investment: { interestRate: 0.20, durationMonths: 6 },
        emergency:  { interestRate: 0.10, durationMonths: 2 }
      }
    })
  }
}
