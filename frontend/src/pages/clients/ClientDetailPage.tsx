import { ArrowLeft, Mail, MapPin, Pencil, Phone, Plus, Trash2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom'
import { ApiError } from '../../api/client'
import { clientsApi, type ClientRecord } from '../../api/clients'
import { ConfirmDialog } from '../../components/ConfirmDialog'
import { useAuth } from '../../context/auth-context'
import { CLIENT_DELETE_ROLES, CLIENT_MANAGE_ROLES, LEAD_CREATE_ROLES } from '../../data/roles'
import { formatDateTime, initialsOf } from '../../utils/format'

export function ClientDetailPage() {
  const { id } = useParams()
  // key: remount when the id in the URL changes, so old data never shows for a new client
  return <ClientDetail key={id} id={Number(id)} />
}

function PhoneLink({ value }: { value: string | null }) {
  if (!value) return <span className="text-muted">Not provided</span>
  return (
    <a href={`tel:${value}`} className="detail-link">
      <Phone size={15} aria-hidden="true" />
      {value}
    </a>
  )
}

function ClientDetail({ id }: { id: number }) {
  const { user: me } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const flash = (location.state as { message?: string } | null)?.message

  const canManage = !!me && CLIENT_MANAGE_ROLES.includes(me.role)
  const canDelete = !!me && CLIENT_DELETE_ROLES.includes(me.role)
  const canCreateLead = !!me && LEAD_CREATE_ROLES.includes(me.role)

  const [client, setClient] = useState<ClientRecord | null>(null)
  const [error, setError] = useState(Number.isInteger(id) && id > 0 ? '' : 'Client not found.')

  const [confirmOpen, setConfirmOpen] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState('')

  useEffect(() => {
    if (!Number.isInteger(id) || id <= 0) return
    let cancelled = false
    clientsApi
      .get(id)
      .then((res) => !cancelled && setClient(res.client))
      .catch((err) => !cancelled && setError(err instanceof ApiError ? err.message : 'Unable to load this client.'))
    return () => {
      cancelled = true
    }
  }, [id])

  async function handleDelete() {
    if (!client) return
    setDeleting(true)
    setDeleteError('')
    try {
      await clientsApi.remove(client.id)
      navigate('/clients', { replace: true, state: { message: `${client.firstName} ${client.lastName} was deleted.` } })
    } catch (err) {
      setDeleteError(err instanceof ApiError ? err.message : 'Unable to reach the server. Please try again.')
      setDeleting(false)
    }
  }

  const hasLeads = (client?.leadCount ?? 0) > 0

  return (
    <div className="entity-page">
      <Link to="/clients" className="back-link">
        <ArrowLeft size={16} aria-hidden="true" /> Back to clients
      </Link>

      {error ? (
        <div className="panel state-box" role="alert">{error}</div>
      ) : !client ? (
        <div className="panel state-box">Loading…</div>
      ) : (
        <>
          {flash && <div className="alert alert-success">{flash}</div>}

          <section className="panel profile-header">
            <div className="profile-avatar" aria-hidden="true">{initialsOf(client.firstName, client.lastName)}</div>
            <div className="profile-main">
              <h1>{client.firstName} {client.lastName}</h1>
              <div className="profile-meta">
                <span className="text-muted">Client #{client.id}</span>
                <span className={`count-pill${hasLeads ? '' : ' zero'}`}>
                  {client.leadCount} lead{client.leadCount === 1 ? '' : 's'}
                </span>
              </div>
            </div>
            {(canManage || canDelete || canCreateLead) && (
              <div className="profile-actions">
                {canCreateLead && (
                  <Link to={`/leads/new?clientId=${client.id}`} className="btn btn-accent">
                    <Plus size={16} aria-hidden="true" />
                    New lead
                  </Link>
                )}
                {canManage && (
                  <Link to={`/clients/${client.id}/edit`} className="btn btn-outline">
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

          <section className="panel">
            <h2 className="panel-title">Contact details</h2>
            <dl className="detail-list">
              <div>
                <dt>First name</dt>
                <dd>{client.firstName}</dd>
              </div>
              <div>
                <dt>Last name</dt>
                <dd>{client.lastName}</dd>
              </div>
              <div>
                <dt>Email</dt>
                <dd>
                  {client.email ? (
                    <a href={`mailto:${client.email}`} className="detail-link">
                      <Mail size={15} aria-hidden="true" />
                      {client.email}
                    </a>
                  ) : (
                    <span className="text-muted">Not provided</span>
                  )}
                </dd>
              </div>
              <div>
                <dt>Mobile</dt>
                <dd><PhoneLink value={client.mobile} /></dd>
              </div>
              <div>
                <dt>Alternate mobile</dt>
                <dd><PhoneLink value={client.alternateMobile} /></dd>
              </div>
              <div>
                <dt>Added</dt>
                <dd>{formatDateTime(client.createdAt)}</dd>
              </div>
              <div className="detail-wide">
                <dt>Address</dt>
                <dd>
                  {client.address ? (
                    <span className="detail-address">
                      <MapPin size={15} aria-hidden="true" />
                      <span>{client.address}</span>
                    </span>
                  ) : (
                    <span className="text-muted">Not provided</span>
                  )}
                </dd>
              </div>
              <div>
                <dt>Last updated</dt>
                <dd>{formatDateTime(client.updatedAt)}</dd>
              </div>
            </dl>
          </section>

          <ConfirmDialog
            open={confirmOpen}
            title={hasLeads ? 'This client can’t be deleted yet' : 'Delete this client?'}
            confirmLabel={hasLeads ? 'OK' : 'Delete client'}
            busyLabel="Deleting…"
            busy={deleting}
            danger={!hasLeads}
            showCancel={!hasLeads}
            error={deleteError}
            onCancel={() => setConfirmOpen(false)}
            onConfirm={hasLeads ? () => setConfirmOpen(false) : handleDelete}
          >
            {hasLeads ? (
              <p>
                <strong>{client.firstName} {client.lastName}</strong> has {client.leadCount} lead
                {client.leadCount === 1 ? '' : 's'}. Delete or move those leads first.
              </p>
            ) : (
              <p>
                <strong>{client.firstName} {client.lastName}</strong> will be permanently removed. This cannot be undone.
              </p>
            )}
          </ConfirmDialog>
        </>
      )}
    </div>
  )
}
