import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db/database'
import { generateId } from '../utils/auth'
import { useAuth } from '../context/AuthContext'
import AdminLayout from '../components/AdminLayout'

const MONTH_NAMES = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']

export default function AdminBank() {
  const { session, canWrite } = useAuth()
  const [year, setYear] = useState(new Date().getFullYear())
  const bankInterest = useLiveQuery(() => db.bankInterest.where('year').equals(year).toArray(), [year]) ?? []
  const bankCharges = useLiveQuery(() => db.bankCharges.where('year').equals(year).toArray(), [year]) ?? []
  const [editInterest, setEditInterest] = useState<{ month: number } | null>(null)
  const [editCharges, setEditCharges] = useState<{ month: number } | null>(null)
  const [interestAmount, setInterestAmount] = useState('')
  const [vatAmount, setVatAmount] = useState('')
  const [levyAmount, setLevyAmount] = useState('')

  function getInterest(month: number) { return bankInterest.find(e => e.month === month) }
  function getCharges(month: number) { return bankCharges.find(e => e.month === month) }

  function openInterest(month: number) {
    const existing = getInterest(month)
    setInterestAmount(existing ? String(existing.amount) : '')
    setEditInterest({ month })
  }

  function openCharges(month: number) {
    const existing = getCharges(month)
    setVatAmount(existing ? String(existing.vatAmount) : '')
    setLevyAmount(existing ? String(existing.levyAmount) : '')
    setEditCharges({ month })
  }

  async function saveInterest() {
    if (!editInterest || !session || !canWrite) return
    const amount = Number(interestAmount) || 0
    const existing = getInterest(editInterest.month)
    if (existing) {
      await db.bankInterest.update(existing.id, { amount, recordedAt: new Date().toISOString() })
    } else {
      await db.bankInterest.add({
        id: generateId(), year, month: editInterest.month, amount,
        recordedByAdminId: session.account.id, recordedAt: new Date().toISOString()
      })
    }
    setEditInterest(null)
  }

  async function saveCharges() {
    if (!editCharges || !session || !canWrite) return
    const vat = Number(vatAmount) || 0
    const levy = Number(levyAmount) || 0
    const total = Math.round((vat + levy) * 100) / 100
    const existing = getCharges(editCharges.month)
    if (existing) {
      await db.bankCharges.update(existing.id, { vatAmount: vat, levyAmount: levy, total, recordedAt: new Date().toISOString() })
    } else {
      await db.bankCharges.add({
        id: generateId(), year, month: editCharges.month,
        vatAmount: vat, levyAmount: levy, total,
        recordedByAdminId: session.account.id, recordedAt: new Date().toISOString()
      })
    }
    setEditCharges(null)
  }

  const totalInterest = bankInterest.reduce((sum, e) => sum + e.amount, 0)
  const totalVat = bankCharges.reduce((sum, e) => sum + e.vatAmount, 0)
  const totalLevy = bankCharges.reduce((sum, e) => sum + e.levyAmount, 0)
  const totalCharges = bankCharges.reduce((sum, e) => sum + e.total, 0)

  return (
    <AdminLayout title="Bank Entries">
      <div className="flex items-center gap-2 mb-4">
        <label className="text-sm text-gray-600">Year:</label>
        <select value={year} onChange={(e) => setYear(Number(e.target.value))}
          className="border border-gray-300 rounded-lg px-2 py-1 text-sm">
          {[year - 1, year, year + 1].map(y => <option key={y} value={y}>{y}</option>)}
        </select>
        {canWrite && <p className="text-xs text-gray-400 ml-auto">Click a cell to record/update an entry.</p>}
      </div>

      {/* Bank Interest */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden mb-6">
        <div className="px-4 py-3 border-b border-gray-100 flex justify-between items-center">
          <h3 className="font-medium text-gray-800">Bank Interest Earned (MK)</h3>
          <span className="text-sm font-semibold text-glg-700">Total: MK {totalInterest.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-500">
              <tr>
                {MONTH_NAMES.map(m => <th key={m} className="px-3 py-2 text-center">{m}</th>)}
              </tr>
            </thead>
            <tbody>
              <tr>
                {MONTH_NAMES.map((_, idx) => {
                  const month = idx + 1
                  const entry = getInterest(month)
                  return (
                    <td key={month} className="px-1 py-1 text-center">
                      <button onClick={() => canWrite && openInterest(month)}
                        className={`w-full py-1.5 rounded text-xs ${entry ? 'bg-glg-50 text-glg-700' : 'bg-gray-50 text-gray-300 hover:bg-gray-100'}`}>
                        {entry ? entry.amount.toFixed(2) : '—'}
                      </button>
                    </td>
                  )
                })}
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Bank Charges */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-100 flex justify-between items-center">
          <h3 className="font-medium text-gray-800">Bank Charges — VAT + Levy (MK)</h3>
          <span className="text-sm font-semibold text-red-600">Total: MK {totalCharges.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-500">
              <tr>
                <th className="px-3 py-2 text-left">Row</th>
                {MONTH_NAMES.map(m => <th key={m} className="px-3 py-2 text-center">{m}</th>)}
                <th className="px-3 py-2 text-right">G-Total</th>
              </tr>
            </thead>
            <tbody>
              {(['VAT', 'Levy', 'Total'] as const).map((row) => (
                <tr key={row} className={`border-t border-gray-100 ${row === 'Total' ? 'font-medium' : ''}`}>
                  <td className="px-3 py-2 text-gray-600">{row}</td>
                  {MONTH_NAMES.map((_, idx) => {
                    const month = idx + 1
                    const entry = getCharges(month)
                    const value = row === 'VAT' ? entry?.vatAmount : row === 'Levy' ? entry?.levyAmount : entry?.total
                    return (
                      <td key={month} className="px-1 py-1 text-center">
                        {row !== 'Total' ? (
                          <button onClick={() => canWrite && openCharges(month)}
                            className={`w-full py-1.5 rounded text-xs ${entry && value ? 'bg-red-50 text-red-700' : 'bg-gray-50 text-gray-300 hover:bg-gray-100'}`}>
                            {value ? value.toFixed(2) : '—'}
                          </button>
                        ) : (
                          <span className={`block py-1.5 text-xs ${value ? 'text-gray-700' : 'text-gray-300'}`}>
                            {value ? value.toFixed(2) : '—'}
                          </span>
                        )}
                      </td>
                    )
                  })}
                  <td className="px-3 py-2 text-right text-xs font-medium text-gray-700">
                    {row === 'VAT' ? totalVat.toFixed(2) : row === 'Levy' ? totalLevy.toFixed(2) : totalCharges.toFixed(2)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Interest modal */}
      {editInterest && (
        <Modal onClose={() => setEditInterest(null)}>
          <h3 className="font-semibold text-gray-800 mb-3">Bank Interest — {MONTH_NAMES[editInterest.month - 1]} {year}</h3>
          <label className="block text-sm font-medium text-gray-700 mb-1">Amount (MK)</label>
          <input type="number" value={interestAmount} onChange={e => setInterestAmount(e.target.value)} autoFocus
            className="w-full border border-gray-300 rounded-lg px-3 py-2 mb-4" />
          <div className="flex justify-end gap-2">
            <button onClick={() => setEditInterest(null)} className="text-sm px-4 py-2 rounded-lg text-gray-500">Cancel</button>
            <button onClick={saveInterest} className="bg-glg-600 hover:bg-glg-700 text-white text-sm font-medium px-4 py-2 rounded-lg">Save</button>
          </div>
        </Modal>
      )}

      {/* Charges modal */}
      {editCharges && (
        <Modal onClose={() => setEditCharges(null)}>
          <h3 className="font-semibold text-gray-800 mb-3">Bank Charges — {MONTH_NAMES[editCharges.month - 1]} {year}</h3>
          <div className="space-y-3 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">VAT Amount (MK)</label>
              <input type="number" value={vatAmount} onChange={e => setVatAmount(e.target.value)} autoFocus
                className="w-full border border-gray-300 rounded-lg px-3 py-2" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Levy Amount (MK)</label>
              <input type="number" value={levyAmount} onChange={e => setLevyAmount(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2" />
            </div>
            <div className="bg-gray-50 rounded-lg px-3 py-2 text-sm">
              Total: <strong>MK {((Number(vatAmount) || 0) + (Number(levyAmount) || 0)).toFixed(2)}</strong>
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <button onClick={() => setEditCharges(null)} className="text-sm px-4 py-2 rounded-lg text-gray-500">Cancel</button>
            <button onClick={saveCharges} className="bg-glg-600 hover:bg-glg-700 text-white text-sm font-medium px-4 py-2 rounded-lg">Save</button>
          </div>
        </Modal>
      )}
    </AdminLayout>
  )
}

function Modal({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50" onClick={onClose}>
      <div onClick={e => e.stopPropagation()} className="bg-white rounded-2xl shadow-lg p-6 w-full max-w-sm">
        {children}
      </div>
    </div>
  )
}
