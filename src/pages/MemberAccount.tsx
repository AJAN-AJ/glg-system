import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db/database'
import { useAuth } from '../context/AuthContext'
import { calculateGroupInterestDistribution } from '../utils/interestDistribution'

export default function MemberAccount() {
  const { session } = useAuth()
  const memberId = session?.account.id ?? ''

  const member = session?.account
  const contributions = useLiveQuery(() => db.shareContributions.where('memberId').equals(memberId).toArray(), [memberId]) ?? []
  const myLoans = useLiveQuery(() => db.loans.where('memberId').equals(memberId).toArray(), [memberId]) ?? []
  const allRepayments = useLiveQuery(() => db.loanRepayments.toArray(), []) ?? []
  const allMembers = useLiveQuery(() => db.members.toArray(), []) ?? []
  const allContributions = useLiveQuery(() => db.shareContributions.toArray(), []) ?? []
  const allLoans = useLiveQuery(() => db.loans.toArray(), []) ?? []
  const bankInterest = useLiveQuery(() => db.bankInterest.toArray(), []) ?? []
  const bankCharges = useLiveQuery(() => db.bankCharges.toArray(), []) ?? []

  if (!member) return null

  // My personal interest = sum of memberInterestShare from MY loan repayments
  const myLoanIds = new Set(myLoans.map(l => l.id))
  const myRepayments = allRepayments.filter(r => myLoanIds.has(r.loanId))
  const myPersonalInterest = myRepayments.reduce((sum, r) => sum + r.memberInterestShare, 0)

  // Total shares I've contributed
  const totalSharesHeld = contributions.reduce((sum, c) => sum + c.amount, 0)

  // Total aggregated individual interest = ALL members' personal interest combined
  const totalAggregatedIndividualInterest = allRepayments.reduce((sum, r) => sum + r.memberInterestShare, 0)

  // Total group interest pool
  const totalGroupInterest = allRepayments.reduce((sum, r) => sum + r.groupInterestShare, 0)

  // Bank interest and charges
  const totalBankInterest = bankInterest.reduce((sum, e) => sum + e.amount, 0)
  const totalBankCharges = bankCharges.reduce((sum, e) => sum + e.total, 0)

  // GLG Total Interest Generated = individual interest + group interest
  const glgTotalInterest = totalAggregatedIndividualInterest + totalGroupInterest

  // My current active loan
  const activeLoan = myLoans.find(l => l.status === 'in_progress' || l.status === 'disbursed')
  const myLoanRepayments = activeLoan ? allRepayments.filter(r => r.loanId === activeLoan.id) : []
  const amountRepaid = myLoanRepayments.reduce((sum, r) => sum + r.amount, 0)
  const loanBalance = activeLoan ? Math.max(0, (activeLoan.principal + activeLoan.principal * activeLoan.interestRate) - amountRepaid) : 0

  // My tentative group interest portion
  const dist = calculateGroupInterestDistribution(allMembers, allContributions, allRepayments, allLoans)
  const myDist = dist.memberShares.find(ms => ms.memberId === memberId)
  const myGroupInterestPortion = myDist?.interestShare ?? 0

  // Take home package = shares + personal interest + group portion
  const takeHomePackage = totalSharesHeld + myPersonalInterest + myGroupInterestPortion

  return (
    <div className="space-y-5 pb-8">
      {/* Header */}
      <div className="bg-glg-700 text-white rounded-xl p-4 flex items-center gap-3">
        <img src="/brand/logo.png" alt="GLG" className="w-10 h-10 rounded-md object-contain bg-white shrink-0" />
        <div>
          <p className="font-bold text-base">GOLDEN LADDER GROUP — MEMBER ACCOUNT</p>
          <p className="text-xs text-white/70 italic">Step by Step to Financial Freedom</p>
        </div>
      </div>

      {/* Personal Information */}
      <Section title="PERSONAL INFORMATION">
        <Row label="Full Name" value={`${member.firstName} ${member.surname}`} />
        <Row label="Member ID" value={member.memberId} mono />
        <Row label="Membership Status" value={member.status === 'active' ? 'Active' : member.status} />
        <Row label="Date Joined" value={new Date(member.dateJoined).toLocaleDateString()} />
        {member.phoneNumber && <Row label="Phone Number" value={member.phoneNumber} />}
        {member.email && <Row label="Email Address" value={member.email} />}
        <Row label="Registration Fee Status" value={member.registrationFeeStatus === 'paid' ? 'Paid' : 'Unpaid'} />
      </Section>

      {/* Account Summary */}
      <Section title="ACCOUNT SUMMARY">
        <Row label="Monthly Share Contribution (MK)" value={fmt(member.monthlyShareTarget ?? 0)} />
        <Row label="Total Shares Held (MK)" value={fmt(totalSharesHeld)} highlight />
        <Row label="My Personal Interest Earned (MK)" value={fmt(myPersonalInterest)} />
        <Row label="Total Share + Personal Interest (MK)" value={fmt(totalSharesHeld + myPersonalInterest)} bold />
        <RowDivider />
        <Row label="Total Aggregated Individual Interest (MK)" value={fmt(totalAggregatedIndividualInterest)} />
        <Row label="Total Group Interest Earned as a whole (MK)" value={fmt(totalGroupInterest)} />
        <Row label="Bank Interest Earned (MK)" value={fmt(totalBankInterest)} />
        <Row label="Bank Charges — VAT + Levy (MK)" value={fmt(totalBankCharges)} negative />
        <Row label="GLG Total Interest Generated to date (MK)" value={fmt(glgTotalInterest)} bold />
        <RowDivider />
        <Row label="Current Loan Balance (MK)" value={loanBalance > 0 ? fmt(loanBalance) : '—'} />
        <Row label="Loan Due Date" value={activeLoan?.dueDate ? new Date(activeLoan.dueDate).toLocaleDateString() : '—'} />
        <RowDivider />
        <Row
          label="My Tentative Portion From Group Interest (MK)"
          value={fmt(myGroupInterestPortion)}
          note={dist.distributable ? undefined : 'Pending — distributable once all group loans are repaid'}
        />
        <Row label="My Tentative Take Home Package As at Today (MK)" value={fmt(takeHomePackage)} highlight bold />
      </Section>

      {dist.distributable ? (
        <div className="bg-green-50 border border-green-200 rounded-xl p-3 text-sm text-green-700">
          ✅ All group loans are repaid. Your take home package and interest portion are final and distributable.
        </div>
      ) : (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-sm text-amber-700">
          ⏳ Personal and group interests are tentative only — they become valid once all group loans are fully repaid.
        </div>
      )}
    </div>
  )
}

function fmt(n: number) {
  return n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-xl shadow-sm overflow-hidden">
      <div className="bg-glg-700 text-white px-4 py-2">
        <p className="text-xs font-bold tracking-wider">{title}</p>
      </div>
      <div className="divide-y divide-gray-100">{children}</div>
    </div>
  )
}

function Row({ label, value, mono, bold, highlight, negative, note }: {
  label: string
  value: string
  mono?: boolean
  bold?: boolean
  highlight?: boolean
  negative?: boolean
  note?: string
}) {
  return (
    <div className={`flex justify-between items-start px-4 py-2.5 ${highlight ? 'bg-green-50' : ''}`}>
      <div className="flex-1 pr-3">
        <p className={`text-sm ${bold ? 'font-semibold text-gray-800' : 'text-gray-600'}`}>{label}</p>
        {note && <p className="text-xs text-amber-600 mt-0.5">{note}</p>}
      </div>
      <p className={`text-sm shrink-0 ${mono ? 'font-mono' : ''} ${bold ? 'font-semibold' : ''} ${highlight ? 'text-glg-700 font-bold' : ''} ${negative ? 'text-red-600' : 'text-gray-800'}`}>
        {value}
      </p>
    </div>
  )
}

function RowDivider() {
  return <div className="h-px bg-gray-200 mx-4 my-1" />
}
