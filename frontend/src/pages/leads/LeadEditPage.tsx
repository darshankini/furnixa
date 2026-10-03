import { ArrowLeft } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ApiError } from '../../api/client'
import { leadsApi, type LeadDetail } from '../../api/leads'
import { LeadForm, type LeadFormValues } from './LeadForm'

export function LeadEditPage() {
  const { id } = useParams()
  // key: remount when the id in the URL changes, so the form never shows the previous lead's data
  return <LeadEdit key={id} id={Number(id)} />
}

function LeadEdit({ id }: { id: number }) {
  const navigate = useNavigate()
  const [lead, setLead] = useState<LeadDetail | null>(null)
  const [error, setError] = useState(Number.isInteger(id) && id > 0 ? '' : 'Lead not found.')

  useEffect(() => {
    if (!Number.isInteger(id) || id <= 0) return
    let cancelled = false
    leadsApi
      .get(id)
      .then((res) => !cancelled && setLead(res.lead))
      .catch((err) => !cancelled && setError(err instanceof ApiError ? err.message : 'Unable to load this lead.'))
    return () => {
      cancelled = true
    }
  }, [id])

  async function handleSubmit(values: LeadFormValues) {
    await leadsApi.update(id, { clientId: Number(values.clientId), projectName: values.projectName.trim() })
    navigate(`/leads/${id}`, { state: { message: 'Changes saved.' } })
  }

  return (
    <div className="entity-page">
      <Link to={`/leads/${id}`} className="back-link">
        <ArrowLeft size={16} aria-hidden="true" /> Back to lead
      </Link>

      <div className="page-header">
        <h1>Edit lead</h1>
        <p>{lead ? `Lead #${lead.id} · ${lead.projectName}` : 'Update this lead’s details.'}</p>
      </div>

      {error ? (
        <div className="panel state-box" role="alert">{error}</div>
      ) : !lead ? (
        <div className="panel state-box">Loading…</div>
      ) : (
        <LeadForm
          mode="edit"
          initialValues={{ clientId: String(lead.client.id), projectName: lead.projectName, assigneeIds: [] }}
          cancelTo={`/leads/${id}`}
          onSubmit={handleSubmit}
        />
      )}
    </div>
  )
}
