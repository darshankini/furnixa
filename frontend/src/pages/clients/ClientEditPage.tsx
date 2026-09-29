import { ArrowLeft } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ApiError } from '../../api/client'
import { clientsApi, type ClientRecord } from '../../api/clients'
import { clientToFormValues, formValuesToInput, type ClientFormValues } from './client-form-values'
import { ClientForm } from './ClientForm'

export function ClientEditPage() {
  const { id } = useParams()
  // key: remount when the id in the URL changes, so the form never shows the previous client's data
  return <ClientEdit key={id} id={Number(id)} />
}

function ClientEdit({ id }: { id: number }) {
  const navigate = useNavigate()
  const [client, setClient] = useState<ClientRecord | null>(null)
  const [error, setError] = useState(Number.isInteger(id) && id > 0 ? '' : 'Client not found.')

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

  async function handleSubmit(values: ClientFormValues) {
    await clientsApi.update(id, formValuesToInput(values))
    navigate(`/clients/${id}`, { state: { message: 'Changes saved.' } })
  }

  return (
    <div className="entity-page">
      <Link to={`/clients/${id}`} className="back-link">
        <ArrowLeft size={16} aria-hidden="true" /> Back to client
      </Link>

      <div className="page-header">
        <h1>Edit client</h1>
        <p>{client ? `${client.firstName} ${client.lastName} · ${client.mobile}` : 'Update this client’s details.'}</p>
      </div>

      {error ? (
        <div className="panel state-box" role="alert">{error}</div>
      ) : !client ? (
        <div className="panel state-box">Loading…</div>
      ) : (
        <ClientForm
          mode="edit"
          initialValues={clientToFormValues(client)}
          cancelTo={`/clients/${id}`}
          onSubmit={handleSubmit}
        />
      )}
    </div>
  )
}
