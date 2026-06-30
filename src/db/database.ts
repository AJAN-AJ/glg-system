import Dexie, { type Table } from 'dexie'
import type {
  AdminAccount,
  Member,
  ShareContribution,
  Loan,
  LoanRepayment,
  RegistrationFeePayment,
  Penalty,
  AuditLogEntry
} from '../types'

// Local-first database. This is Phase 1's persistence layer: everything lives
// in the browser's IndexedDB via Dexie. When we add the real backend later,
// this same shape of data will move to PostgreSQL with minimal changes to
// the app's business logic (the functions in src/utils stay the same).
export class GLGDatabase extends Dexie {
  admins!: Table<AdminAccount, string>
  members!: Table<Member, string>
  shareContributions!: Table<ShareContribution, string>
  loans!: Table<Loan, string>
  loanRepayments!: Table<LoanRepayment, string>
  registrationFees!: Table<RegistrationFeePayment, string>
  penalties!: Table<Penalty, string>
  auditLog!: Table<AuditLogEntry, string>

  constructor() {
    super('glg-system-db')
    this.version(1).stores({
      admins: 'id, username',
      members: 'id, memberId, username, status',
      shareContributions: 'id, memberId, year, month, [memberId+year+month]',
      loans: 'id, loanCode, memberId, status',
      loanRepayments: 'id, loanId',
      registrationFees: 'id, memberId',
      penalties: 'id, memberId, status',
      auditLog: 'id, actorId, timestamp'
    })
    this.version(2).stores({
      members: 'id, memberId, username, status, dateJoined'
    })
    this.version(3).stores({
      loans: 'id, loanCode, memberId, status, requestedAt'
    })
  }
}

export const db = new GLGDatabase()
