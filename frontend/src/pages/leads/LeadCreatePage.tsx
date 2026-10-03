import { ArrowLeft } from 'lucide-react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { leadsApi } from '../../api/leads'
import { LeadForm, type LeadFormValues } from './LeadForm'

export function LeadCreatePage() {
  const navigate = useNavigate()
  // /leads/new?clientId=3 preselects the client (used by the client page)
  const [params] = useSearchParams()

  async function handleSubmit(values: LeadFormValues) {
    const { lead } = await leadsApi.create({
      clientId: Number(values.clientId),
      projectName: values.projectName.trim(),
      assigneeIds: values.assigneeIds,
    })
    navigate(`/leads/${lead.id}`, { state: { message: `Lead #${lead.id} was created.` } })
  }

  return (
    <div className="entity-page">
      <Link to="/leads" className="back-link">
        <ArrowLeft size={16} aria-hidden="true" /> Back to leads
      </Link>

      <div className="page-header">
        <h1>New lead</h1>
        <p>Pick the client, name the project and choose who works on it. It starts in the Enquiry phase.</p>
      </div>

      <LeadForm
        mode="create"
        initialValues={{ clientId: params.get('clientId') ?? '', projectName: '', assigneeIds: [] }}
        cancelTo="/leads"
        onSubmit={handleSubmit}
      />
    </div>
  )
}
