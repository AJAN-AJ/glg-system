import { db } from '../db/database'
import { hashPassword, generateId } from './auth'

// Ensure there is always at least one Chair admin in the system.
// We check for an admin member specifically — not just any member —
// so upgrading from a previous version (which had a separate admins table)
// doesn't leave the system with no way to log in.
export async function ensureSeedAdmin() {
  const adminCount = await db.members.where('isAdmin').equals(1).count()
  if (adminCount > 0) return

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
