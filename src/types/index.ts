// Core domain types for Golden Ladder Group system
// These mirror the real logic found in the group's Excel workbook.

export type AdminRole = 'chair' | 'secretary' | 'treasurer'

export type MemberStatus =
  | 'invited'        // account created by admin, temp password issued, never logged in
  | 'pending_setup'  // logged in with temp password, must still change password
  | 'pending_approval' // changed password + submitted profile form, awaiting admin approval
  | 'active'         // approved, full dashboard access
  | 'suspended'      // admin has disabled the account

export interface AdminAccount {
  id: string
  fullName: string
  role: AdminRole
  username: string
  // NOTE: passwordHash is a placeholder hashing approach for the local-first phase.
  // When the backend is introduced, real password hashing (bcrypt/argon2) moves server-side.
  passwordHash: string
  createdAt: string
}

export interface Member {
  id: string
  memberId: string // e.g. GLG26001, assigned by admin at creation
  firstName: string
  surname: string
  username: string // used to log in, e.g. phone number or chosen username
  passwordHash: string
  mustChangePassword: boolean
  status: MemberStatus

  // Filled by the member during first-login profile form (mirrors GRegister sheet)
  phoneNumber?: string
  email?: string
  nextOfKinName?: string
  nextOfKinPhone?: string
  monthlyShareTarget?: number // MK they pledge to contribute per month
  agreedToConstitution?: boolean
  signature?: string // typed full name as signature, per the group's registration form

  registrationFeeStatus: 'unpaid' | 'paid' // flat MK 3000, goes to separate fund
  dateJoined: string // ISO date, set when account created
  dateApproved?: string

  createdByAdminId: string
  approvedByAdminId?: string
}

// One row per member per month, mirrors the "Shares" sheet grid.
export interface ShareContribution {
  id: string
  memberId: string // Member.id
  year: number
  month: number // 1-12
  amount: number // MK contributed for that month
  recordedByAdminId: string
  recordedAt: string
  depositSlipRef?: string // optional reference/number from the physical deposit slip
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
  loanCode: string // e.g. GLG-2026-L001
  memberId: string
  principal: number
  interestRate: number // e.g. 0.2 for 20%, 0 for soft loan
  durationMonths: number
  disbursementDate?: string
  dueDate?: string
  status: LoanStatus
  requestedAt: string
  approvedByAdminId?: string
  approvedAt?: string
  remarks?: string
}

// A repayment event against a loan. Interest portion is split 50/50 per group rules.
export interface LoanRepayment {
  id: string
  loanId: string
  amount: number
  principalPortion: number
  interestPortion: number
  memberInterestShare: number // 50% of interestPortion -> member's personal account
  groupInterestShare: number // 50% of interestPortion -> group account
  paidAt: string
  recordedByAdminId: string
}

export interface RegistrationFeePayment {
  id: string
  memberId: string
  amount: number // flat MK 3000
  paidAt: string
  recordedByAdminId: string
  // Goes into a separate fund per group decision, never mixed into Shares/Loans totals.
}

export interface Penalty {
  id: string
  memberId: string
  description: string
  amount: number
  monthApplied: string // e.g. "2026-02"
  status: 'flagged' | 'confirmed' | 'paid' | 'waived'
  flaggedAt: string
  confirmedByAdminId?: string
  confirmedAt?: string
}

export interface AuditLogEntry {
  id: string
  actorId: string
  actorType: 'admin' | 'member'
  action: string
  details: string
  timestamp: string
}
