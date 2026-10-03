import { Search } from 'lucide-react'
import { useMemo, useState } from 'react'
import type { UserRef } from '../../api/leads'
import { ROLE_BY_VALUE, ROLES } from '../../data/roles'
import { initialsOf } from '../../utils/format'

interface Props {
  users: UserRef[]
  selected: number[]
  onChange: (ids: number[]) => void
  disabled?: boolean
  id?: string
}

/** Checkbox list of users grouped by role, so several designers (etc.) can be picked at once */
export function UserPicker({ users, selected, onChange, disabled, id }: Props) {
  const [search, setSearch] = useState('')

  const groups = useMemo(() => {
    const q = search.trim().toLowerCase()
    const match = (u: UserRef) => !q || `${u.firstName} ${u.lastName}`.toLowerCase().includes(q)
    return ROLES.map((role) => ({ role, users: users.filter((u) => u.role === role.value && match(u)) })).filter(
      (g) => g.users.length > 0,
    )
  }, [users, search])

  function toggle(userId: number) {
    onChange(selected.includes(userId) ? selected.filter((x) => x !== userId) : [...selected, userId])
  }

  const selectedUsers = users.filter((u) => selected.includes(u.id))

  return (
    <div className="user-picker" id={id}>
      {selectedUsers.length > 0 && (
        <div className="user-chips" aria-label="Selected users">
          {selectedUsers.map((u) => (
            <button
              key={u.id}
              type="button"
              className="user-chip"
              onClick={() => toggle(u.id)}
              disabled={disabled}
              title="Remove"
            >
              {u.firstName} {u.lastName}
              <span className="text-muted"> · {ROLE_BY_VALUE[u.role].label}</span>
              <span aria-hidden="true"> ×</span>
            </button>
          ))}
        </div>
      )}

      <label className="search-box user-picker-search">
        <Search size={16} aria-hidden="true" />
        <input
          type="search"
          placeholder="Search users"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          aria-label="Search users"
          disabled={disabled}
        />
      </label>

      <div className="user-picker-list">
        {groups.length === 0 ? (
          <p className="text-muted user-picker-empty">No users found.</p>
        ) : (
          groups.map(({ role, users: list }) => (
            <fieldset key={role.value} className="user-picker-group">
              <legend>{role.label}</legend>
              {list.map((u) => (
                <label key={u.id} className="user-picker-option">
                  <input
                    type="checkbox"
                    checked={selected.includes(u.id)}
                    onChange={() => toggle(u.id)}
                    disabled={disabled}
                  />
                  <span className="person-avatar small" aria-hidden="true">{initialsOf(u.firstName, u.lastName)}</span>
                  <span>{u.firstName} {u.lastName}</span>
                </label>
              ))}
            </fieldset>
          ))
        )}
      </div>
    </div>
  )
}
