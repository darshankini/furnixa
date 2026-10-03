import { Download, FileText, Trash2, Upload } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { ApiError } from '../../api/client'
import { leadsApi, type Department, type LeadDetail, type LeadDocument } from '../../api/leads'
import { ConfirmDialog } from '../../components/ConfirmDialog'
import { useAuth } from '../../context/auth-context'
import { DEPARTMENT_BY_ROLE, DEPARTMENTS, PHASE_BY_STATUS } from '../../data/phases'
import { PICK_DEPARTMENT_ROLES } from '../../data/roles'
import { formatDateTime } from '../../utils/format'

/** Same limit as MAX_UPLOAD_BYTES in the backend */
const MAX_BYTES = 25 * 1024 * 1024

function formatSize(bytes: number | null): string {
  if (bytes === null) return ''
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

/** Files by department folder. Users currently assigned upload into their own department's folder. */
export function LeadDocuments({ lead }: { lead: LeadDetail }) {
  const { user: me } = useAuth()
  const [docs, setDocs] = useState<LeadDocument[] | null>(null)
  const [error, setError] = useState('')
  const [folder, setFolder] = useState<Department | ''>('')

  const pickFolder = !!me && PICK_DEPARTMENT_ROLES.includes(me.role)
  const ownFolder = me ? DEPARTMENT_BY_ROLE[me.role] : undefined
  const [uploadFolder, setUploadFolder] = useState<Department>(ownFolder ?? 'ADMIN')
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState('')
  const fileInput = useRef<HTMLInputElement>(null)

  const [toDelete, setToDelete] = useState<LeadDocument | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState('')

  const isAssigned = !!me && lead.assignees.some((a) => a.id === me.id)
  const canUpload = !!me && (me.role === 'ADMIN' || isAssigned) && (pickFolder || !!ownFolder)

  useEffect(() => {
    let cancelled = false
    leadsApi
      .documents(lead.id)
      .then((res) => !cancelled && setDocs(res.documents))
      .catch((err) => !cancelled && setError(err instanceof ApiError ? err.message : 'Unable to load files.'))
    return () => {
      cancelled = true
    }
  }, [lead.id])

  const counts = useMemo(() => {
    const c: Partial<Record<Department, number>> = {}
    for (const d of docs ?? []) c[d.department] = (c[d.department] ?? 0) + 1
    return c
  }, [docs])

  const shown = (docs ?? []).filter((d) => !folder || d.department === folder)

  async function handleFile(file: File | undefined) {
    if (!file) return
    setUploadError('')
    if (file.size > MAX_BYTES) {
      setUploadError('Files can be at most 25 MB.')
      return
    }
    setUploading(true)
    try {
      const { document } = await leadsApi.uploadDocument(lead.id, file, pickFolder ? uploadFolder : undefined)
      setDocs((prev) => [document, ...(prev ?? [])])
    } catch (err) {
      setUploadError(err instanceof ApiError ? err.message : 'Upload failed. Please try again.')
    } finally {
      setUploading(false)
      if (fileInput.current) fileInput.current.value = ''
    }
  }

  async function handleDelete() {
    if (!toDelete) return
    setDeleting(true)
    setDeleteError('')
    try {
      await leadsApi.removeDocument(lead.id, toDelete.id)
      setDocs((prev) => (prev ?? []).filter((d) => d.id !== toDelete.id))
      setToDelete(null)
    } catch (err) {
      setDeleteError(err instanceof ApiError ? err.message : 'Unable to delete the file.')
    } finally {
      setDeleting(false)
    }
  }

  const folderLabel = (dep: Department) => DEPARTMENTS.find((d) => d.value === dep)?.label ?? dep

  return (
    <section className="panel">
      <div className="panel-title-row">
        <h2 className="panel-title">Files</h2>
        {canUpload && (
          <div className="upload-controls">
            {pickFolder ? (
              <select
                className="filter-select"
                value={uploadFolder}
                onChange={(e) => setUploadFolder(e.target.value as Department)}
                aria-label="Upload into folder"
                disabled={uploading}
              >
                {DEPARTMENTS.map((d) => (
                  <option key={d.value} value={d.value}>{d.label} folder</option>
                ))}
              </select>
            ) : (
              <span className="text-muted upload-folder-hint">Uploads go to {folderLabel(ownFolder!)}/</span>
            )}
            <input ref={fileInput} type="file" hidden onChange={(e) => handleFile(e.target.files?.[0])} />
            <button type="button" className="btn btn-accent" onClick={() => fileInput.current?.click()} disabled={uploading}>
              <Upload size={16} aria-hidden="true" />
              {uploading ? 'Uploading…' : 'Upload file'}
            </button>
          </div>
        )}
      </div>

      {uploadError && <div className="alert alert-error" role="alert">{uploadError}</div>}

      <div className="folder-tabs" role="tablist" aria-label="Folders">
        <button type="button" role="tab" aria-selected={folder === ''} className={`folder-tab${folder === '' ? ' active' : ''}`} onClick={() => setFolder('')}>
          All <span className="count-pill">{docs?.length ?? 0}</span>
        </button>
        {DEPARTMENTS.filter((d) => counts[d.value]).map((d) => (
          <button
            key={d.value}
            type="button"
            role="tab"
            aria-selected={folder === d.value}
            className={`folder-tab${folder === d.value ? ' active' : ''}`}
            onClick={() => setFolder(d.value)}
          >
            {d.label} <span className="count-pill">{counts[d.value]}</span>
          </button>
        ))}
      </div>

      {error ? (
        <div className="state-box" role="alert">{error}</div>
      ) : docs === null ? (
        <div className="state-box">Loading files…</div>
      ) : shown.length === 0 ? (
        <div className="state-box">
          No files yet.{canUpload && ' Upload your work once it is finished.'}
        </div>
      ) : (
        <ul className="file-list">
          {shown.map((d) => (
            <li key={d.id} className="file-item">
              <FileText size={20} className="file-icon" aria-hidden="true" />
              <div className="file-main">
                <a href={leadsApi.documentUrl(lead.id, d.id)} className="file-name" download>
                  {d.originalName}
                </a>
                <span className="person-sub">
                  {folderLabel(d.department)}/ · {PHASE_BY_STATUS[d.status].label} phase · {formatSize(d.fileSize)} ·{' '}
                  {d.uploadedBy.firstName} {d.uploadedBy.lastName} · {formatDateTime(d.createdAt)}
                </span>
              </div>
              <a href={leadsApi.documentUrl(lead.id, d.id)} className="icon-button" download aria-label={`Download ${d.originalName}`} title="Download">
                <Download size={16} aria-hidden="true" />
              </a>
              {me && (me.role === 'ADMIN' || d.uploadedBy.id === me.id) && (
                <button
                  type="button"
                  className="icon-button danger"
                  onClick={() => {
                    setDeleteError('')
                    setToDelete(d)
                  }}
                  aria-label={`Delete ${d.originalName}`}
                  title="Delete"
                >
                  <Trash2 size={16} aria-hidden="true" />
                </button>
              )}
            </li>
          ))}
        </ul>
      )}

      <ConfirmDialog
        open={toDelete !== null}
        title="Delete this file?"
        confirmLabel="Delete file"
        busyLabel="Deleting…"
        busy={deleting}
        danger
        error={deleteError}
        onCancel={() => setToDelete(null)}
        onConfirm={handleDelete}
      >
        <p>
          <strong>{toDelete?.originalName}</strong> will be permanently removed. This cannot be undone.
        </p>
      </ConfirmDialog>
    </section>
  )
}
