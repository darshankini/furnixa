import { ArrowLeft, IndianRupee, Mail, Pencil, Phone, Trash2, UserPlus } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom'
import { ApiError } from '../../api/client'
import { leadsApi, type LeadDetail } from '../../api/leads'
import { ConfirmDialog } from '../../components/ConfirmDialog'
import { useAuth } from '../../context/auth-context'
import { LEAD_DELETE_ROLES, PAYMENT_ROLES, canEditLead, isClient } from '../../data/roles'
import { formatDateTime, formatMoney } from '../../utils/format'
import { LeadAssignPanel } from './LeadAssignPanel'
import { prefetchChat } from './chat-prefetch'
import { LeadChat } from './LeadChat'
import { LeadDocuments } from './LeadDocuments'
import { LeadHistory, LeadTeam } from './LeadHistory'
import { LeadProduction } from './LeadProduction'
import { LeadRequirement } from './LeadRequirement'
import { PhaseBadge } from './PhaseBadge'

export function LeadDetailPage() {
  const { id } = useParams()
  // key: remount when the id in the URL changes, so old data never shows for a new lead
  return <LeadDetailView key={id} id={Number(id)} />
}

function LeadDetailView({ id }: { id: number }) {
  const { user: me } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [flash, setFlash] = useState((location.state as { message?: string } | null)?.message ?? '')

  const [lead, setLead] = useState<LeadDetail | null>(null)
  const [error, setError] = useState(Number.isInteger(id) && id > 0 ? '' : 'Lead not found.')
  const [assigning, setAssigning] = useState(false)

  // Clients can only read the lead and chat; the backend blocks everything else for them too
  const client = isClient(me)
  const leadStatus = lead?.status;
  const canManage = !!me && !client && canEditLead(me.role, leadStatus);
  const canDelete = !!me && !client && LEAD_DELETE_ROLES.includes(me.role)
  // Payments are tracked once there is a quotation amount
  const canSeePayments = !!me && !client && PAYMENT_ROLES.includes(me.role) && lead?.quotationAmount != null

  const [confirmOpen, setConfirmOpen] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState('')

  const load = useCallback(() => {
    return leadsApi
      .get(id)
      .then((res) => setLead(res.lead))
      .catch((err) => setError(err instanceof ApiError ? err.message : 'Unable to load this lead.'))
  }, [id])

  useEffect(() => {
    if (!Number.isInteger(id) || id <= 0) return
    prefetchChat(id) // the chat's requests run alongside the lead's instead of after it
    void load()
  }, [id, load])

  async function handleDelete() {
    if (!lead) return
    setDeleting(true)
    setDeleteError('')
    try {
      await leadsApi.remove(lead.id)
      navigate('/leads', { replace: true, state: { message: `Lead #${lead.id} was deleted.` } })
    } catch (err) {
      setDeleteError(err instanceof ApiError ? err.message : 'Unable to reach the server. Please try again.')
      setDeleting(false)
    }
  }

  return (
    <div className="entity-page">
      <Link to="/leads" className="back-link">
        <ArrowLeft size={16} aria-hidden="true" /> Back to leads
      </Link>

      {error ? (
        <div className="panel state-box" role="alert">{error}</div>
      ) : !lead ? (
        <div className="panel state-box">Loading…</div>
      ) : (
        <>
          {flash && <div className="alert alert-success">{flash}</div>}

          <section className="panel profile-header">
            <div className="profile-main">
              <h1>{lead.projectName}</h1>
              <div className="profile-meta">
                <span className="text-muted">Lead #{lead.id}</span>
                <PhaseBadge status={lead.status} />
                {lead.quotationAmount !== null && (
                  <span className="quotation-amount">Quotation {formatMoney(lead.quotationAmount)}</span>
                )}
                <span className="text-muted">
                  Created {formatDateTime(lead.createdAt)}
                  {lead.createdBy && ` by ${lead.createdBy.firstName} ${lead.createdBy.lastName}`}
                </span>
              </div>
            </div>
            
            {(canManage || canDelete || canSeePayments) && (
              <div className="profile-actions">
                {canSeePayments && (
                  <Link to={`/payments/${lead.id}`} className="btn btn-outline">
                    <IndianRupee size={16} aria-hidden="true" />
                    Payments
                  </Link>
                )}
                {canManage && !assigning && (
                  <button type="button" className="btn btn-accent" onClick={() => setAssigning(true)}>
                    <UserPlus size={16} aria-hidden="true" />
                    Assign / move
                  </button>
                )}
                {canManage && (
                  <Link to={`/leads/${lead.id}/edit`} className="btn btn-outline">
                    <Pencil size={16} aria-hidden="true" />
                    Edit
                  </Link>
                )}
                {canDelete && (
                  <button
                    type="button"
                    className="btn btn-outline-danger"
                    onClick={() => {
                      setDeleteError('')
                      setConfirmOpen(true)
                    }}
                  >
                    <Trash2 size={16} aria-hidden="true" />
                    Delete
                  </button>
                )}
              </div>
            )}
          </section>

          {assigning && (
            <LeadAssignPanel
              lead={lead}
              onCancel={() => setAssigning(false)}
              onSaved={(updated) => {
                setLead(updated)
                setAssigning(false)
                setFlash('Lead updated.')
              }}
            />
          )}

          <div className="lead-grid">
            <div className="lead-col">
              <section className="panel">
                <h2 className="panel-title">Client</h2>
                <dl className="detail-list two-col">
                  <div>
                    <dt>Name</dt>
                    <dd>
                      {client ? (
                        `${lead.client.firstName} ${lead.client.lastName}`
                      ) : (
                        <Link to={`/clients/${lead.client.id}`} className="detail-link">
                          {lead.client.firstName} {lead.client.lastName}
                        </Link>
                      )}
                    </dd>
                  </div>
                  <div>
                    <dt>Mobile</dt>
                    <dd>
                      <a href={`tel:${lead.client.mobile}`} className="detail-link">
                        <Phone size={15} aria-hidden="true" />
                        {lead.client.mobile}
                      </a>
                    </dd>
                  </div>
                  <div className="detail-wide">
                    <dt>Email</dt>
                    <dd>
                      {lead.client.email ? (
                        <a href={`mailto:${lead.client.email}`} className="detail-link">
                          <Mail size={15} aria-hidden="true" />
                          {lead.client.email}
                        </a>
                      ) : (
                        <span className="text-muted">Not provided</span>
                      )}
                    </dd>
                  </div>
                </dl>
              </section>

              <LeadRequirement lead={lead} canEdit={canManage} onSaved={setLead} />
              <LeadProduction lead={lead} canManage={canManage} onSaved={setLead} />

              <LeadTeam assignments={lead.assignments} />
              {!client && <LeadDocuments lead={lead} />}
              <LeadHistory history={lead.history} />
            </div>

            <div className="lead-col lead-col-chat">
              <LeadChat lead={lead} onChatStatusChange={() => void load()} />
            </div>
          </div>

          <ConfirmDialog
            open={confirmOpen}
            title="Delete this lead?"
            confirmLabel="Delete lead"
            busyLabel="Deleting…"
            busy={deleting}
            danger
            error={deleteError}
            onCancel={() => setConfirmOpen(false)}
            onConfirm={handleDelete}
          >
            <p>
              <strong>{lead.projectName}</strong> will be permanently removed, together with its history, chat and all
              uploaded files. This cannot be undone.
            </p>
          </ConfirmDialog>
        </>
      )}
    </div>
  )
}
