import Dexie, { type Table } from 'dexie'
import type {
  Member, ShareContribution, Loan, LoanRepayment,
  RegistrationFeePayment, Penalty, AuditLogEntry, GroupConfig
} from '../types'

export class GLGDatabase extends Dexie {
  members!: Table<Member, string>
  shareContributions!: Table<ShareContribution, string>
  loans!: Table<Loan, string>
  loanRepayments!: Table<LoanRepayment, string>
  registrationFees!: Table<RegistrationFeePayment, string>
  penalties!: Table<Penalty, string>
  auditLog!: Table<AuditLogEntry, string>
  groupConfig!: Table<GroupConfig, string>

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
    this.version(2).stores({ members: 'id, memberId, username, status, dateJoined' })
    this.version(3).stores({ loans: 'id, loanCode, memberId, status, requestedAt' })
    this.version(4).stores({
      admins: null,
      members: 'id, memberId, username, status, dateJoined, isAdmin'
    })
    this.version(5).stores({ groupConfig: 'id' })
  }
}

export const db = new GLGDatabase()
