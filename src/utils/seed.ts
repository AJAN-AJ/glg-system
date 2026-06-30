import { db } from '../db/database'
import { hashPassword, generateId } from './auth'

// On very first run, the app has no admins at all, so no one could log in.
// We seed one default Chair account so the group has a way in. They should
// change this password immediately from the admin settings page.
export async function ensureSeedAdmin() {
  const count = await db.admins.count()
  if (count > 0) return

  const passwordHash = await hashPassword('GLG-Admin-2026')
  await db.admins.add({
    id: generateId(),
    fullName: 'Default Chair Account',
    role: 'chair',
    username: 'chair',
    passwordHash,
    createdAt: new Date().toISOString()
  })
}
