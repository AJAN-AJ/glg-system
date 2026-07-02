// Core domain types for Golden Ladder Group system

export type AdminRole = 'chair' | 'secretary' | 'treasurer'
export type AdminPermission = 'read' | 'read_write'

export type MemberStatus =
  | 'invited'
  | 'pending_setup'
  | 'pending_approval'
  | 'active'
  | 'suspended'

// Unified account: every user (admin or not) is a Member.
// If isAdmin is true, they get admin UI access governed by adminPermission.
// Only the Chair (adminRole === 'chair') can manage other admins.
export interface Member {
  id: string
  memberId: string // e.g. GLG26001
  firstName: string
  surname: string
  username: string
  passwordHash: string
  mustChangePassword: boolean
  status: MemberStatus

  // Admin fields — only set if isAdmin is true
  isAdmin: boolean
  adminRole?: AdminRole
  adminPermission?: AdminPermission // 'read' | 'read_write'

  // Profile (filled by member on first login)
  phoneNumber?: string
  email?: string
  nextOfKinName?: string
  nextOfKinPhone?: string
  monthlyShareTarget?: number
  agreedToConstitution?: boolean
  signature?: string

  registrationFeeStatus: 'unpaid' | 'paid'
  dateJoined: string
  dateApproved?: string
  createdByAdminId: string
  approvedByAdminId?: string
}

export interface ShareContribution {
  id: string
  memberId: string
  year: number
  month: number
  amount: number
  recordedByAdminId: string
  recordedAt: string
  depositSlipRef?: string
}

export type LoanType = 'normal' | 'soft' | 'investment' | 'emergency'

export interface LoanTypeConfig {
  interestRate: number
  durationMonths: number
}

export interface GroupConfig {
  id: 'main'
  penaltyDeadlineDay: number
  penaltyFlatFee: number
  penaltyExtraFee: number
  penaltyExtraDaysThreshold: number
  loanDefaults: Record<LoanType, LoanTypeConfig>
}

export interface LoanTypeConfig {
  interestRate: number   // e.g. 0.2 for 20%
  durationMonths: number
}

export interface GroupConfig {
  id: 'main'
  penaltyDeadlineDay: number        // day of month after which member is late (1–28)
  penaltyFlatFee: number            // MK charged on first flag
  penaltyExtraFee: number           // extra MK if still unpaid past extraDaysThreshold
  penaltyExtraDaysThreshold: number // days after deadline before extra fee applies
  loanDefaults: Record<LoanType, LoanTypeConfig>
}

export type LoanStatus =
  | 'requested'
  | 'approved'
  | 'disbursed'
  | 'in_progress'
  | 'completed'
  | 'rejected'

export interface Loan {
  id: string
  loanCode: string
  memberId: string
  loanType: LoanType
  principal: number
  interestRate: number
  durationMonths: number
  disbursementDate?: string
  dueDate?: string
  status: LoanStatus
  requestedAt: string
  approvedByAdminId?: string
  approvedAt?: string
  remarks?: string
}

export interface LoanRepayment {
  id: string
  loanId: string
  amount: number
  principalPortion: number
  interestPortion: number
  memberInterestShare: number
  groupInterestShare: number
  paidAt: string
  recordedByAdminId: string
}

export interface RegistrationFeePayment {
  id: string
  memberId: string
  amount: number // flat MK 3000
  paidAt: string
  recordedByAdminId: string
  // Kept in a separate fund — never mixed with Shares or Loans totals.
}

export interface Penalty {
  id: string
  memberId: string
  description: string
  amount: number
  monthApplied: string
  status: 'flagged' | 'confirmed' | 'paid' | 'waived'
  flaggedAt: string
  confirmedByAdminId?: string
  confirmedAt?: string
}

export interface BankInterestEntry {
  id: string
  year: number
  month: number
  amount: number
  recordedByAdminId: string
  recordedAt: string
}

export interface BankChargeEntry {
  id: string
  year: number
  month: number
  vatAmount: number
  levyAmount: number
  total: number // vatAmount + levyAmount
  recordedByAdminId: string
  recordedAt: string
}

export interface AuditLogEntry {
  id: string
  actorId: string
  actorType: 'admin' | 'member'
  action: string
  details: string
  timestamp: string
}
