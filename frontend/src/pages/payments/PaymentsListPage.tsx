import { Search } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ApiError } from '../../api/client'
import { paymentsApi, type PaymentLead } from '../../api/payments'
import { formatDate, formatMoney, sumMoney } from '../../utils/format'
import { PhaseBadge } from '../leads/PhaseBadge'
import { MoneyTiles } from './MoneyTiles'

type Filter = 'due' | 'paid' | 'all'

const FILTERS: { value: Filter; label: string }[] = [
  { value: 'due', label: 'Balance due' },
  { value: 'paid', label: 'Fully paid' },
  { value: 'all', label: 'All' },
]

/** Every lead with a quotation amount: what was quoted, what came in, and what is still due */
export function PaymentsListPage() {
  const navigate = useNavigate()
  const [leads, setLeads] = useState<PaymentLead[] | null>(null)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<Filter>('due')

  useEffect(() => {
    let cancelled = false
    paymentsApi
      .list()
      .then((res) => !cancelled && setLeads(res.leads))
      .catch((err) => !cancelled && setError(err instanceof ApiError ? err.message : 'Unable to load payments.'))
    return () => {
      cancelled = true
    }
  }, [])

  const filtered = useMemo(() => {
    if (!leads) return []
    const q = search.trim().toLowerCase()
    return leads.filter((l) => {
      const due = Number(l.balanceAmount) > 0
      if (filter === 'due' && !due) return false
      if (filter === 'paid' && due) return false
      if (!q) return true
      return [l.projectName, `#${l.leadId}`, `${l.client.firstName} ${l.client.lastName}`, l.client.mobile].some((v) =>
        v.toLowerCase().includes(q),
      )
    })
  }, [leads, search, filter])

  return (
    <div className="entity-page">
      <div className="page-header">
        <h1>Payment Follow-up</h1>
        <p>Payments received against each lead’s quotation amount.</p>
      </div>

      {leads && (
        <MoneyTiles
          total={sumMoney(leads.map((l) => l.totalAmount))}
          paid={sumMoney(leads.map((l) => l.paidAmount))}
          balance={sumMoney(leads.map((l) => l.balanceAmount))}
          totalLabel="Total quoted"
        />
      )}

      <section className="panel">
        <div className="list-toolbar">
          <label className="search-box">
            <Search size={16} aria-hidden="true" />
            <input
              type="search"
              placeholder="Search by project, lead #, client or mobile"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              aria-label="Search payments"
            />
          </label>
          <div className="filter-tabs" role="group" aria-label="Show">
            {FILTERS.map((f) => (
              <button key={f.value} type="button" aria-pressed={filter === f.value} onClick={() => setFilter(f.value)}>
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {error ? (
          <div className="state-box" role="alert">{error}</div>
        ) : leads === null ? (
          <div className="state-box">Loading payments…</div>
        ) : filtered.length === 0 ? (
          <div className="state-box">
            {leads.length === 0
              ? 'No leads have a quotation amount yet. Leads appear here once they move to Quotation.'
              : 'No leads match this filter.'}
          </div>
        ) : (
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Lead</th>
                  <th>Client</th>
                  <th>Phase</th>
                  <th className="money">Total</th>
                  <th className="money">Paid</th>
                  <th className="money">Balance</th>
                  <th>Last payment</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((l) => {
                  const due = Number(l.balanceAmount) > 0
                  return (
                    <tr key={l.leadId} className="clickable" onClick={() => navigate(`/payments/${l.leadId}`)}>
                      <td>
                        <Link to={`/payments/${l.leadId}`} className="person-cell" onClick={(e) => e.stopPropagation()}>
                          <span className="person-text">
                            <span className="person-name">{l.projectName}</span>
                            <span className="person-sub">Lead #{l.leadId}</span>
                          </span>
                        </Link>
                      </td>
                      <td>
                        {l.client.firstName} {l.client.lastName}
                        <div className="text-muted">{l.client.mobile}</div>
                      </td>
                      <td><PhaseBadge status={l.status} /></td>
                      <td className="money">{formatMoney(l.totalAmount)}</td>
                      <td className="money">{formatMoney(l.paidAmount)}</td>
                      <td className={`money ${due ? 'due' : 'settled'}`}>{due ? formatMoney(l.balanceAmount) : 'Paid'}</td>
                      <td className="text-muted">{l.lastPaidOn ? formatDate(l.lastPaidOn) : '—'}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  )
}
