import { ArrowLeft } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import { clientsApi } from '../../api/clients'
import { EMPTY_CLIENT_FORM, formValuesToInput, type ClientFormValues } from './client-form-values'
import { ClientForm } from './ClientForm'

export function ClientCreatePage() {
  const navigate = useNavigate()

  async function handleSubmit(values: ClientFormValues) {
    const { client } = await clientsApi.create(formValuesToInput(values))
    navigate(`/clients/${client.id}`, {
      state: { message: `${client.firstName} ${client.lastName} was added.` },
    })
  }

  return (
    <div className="entity-page">
      <Link to="/clients" className="back-link">
        <ArrowLeft size={16} aria-hidden="true" /> Back to clients
      </Link>

      <div className="page-header">
        <h1>Add client</h1>
        <p>Save a client's contact details so you can create leads for them.</p>
      </div>

      <ClientForm mode="create" initialValues={EMPTY_CLIENT_FORM} cancelTo="/clients" onSubmit={handleSubmit} />
    </div>
  )
}
