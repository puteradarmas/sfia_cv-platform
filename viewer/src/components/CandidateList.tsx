import type { Candidate } from '../types/types'

interface Props {
  candidates: Candidate[]
  selected: Candidate | null
  selectedIds: Set<number>
  onSelect: (c: Candidate) => void
  onToggleId: (id: number) => void
  onToggleAll: () => void
  onBulkValidate: () => void
  onBulkReject: () => void
}

const statusConfig: Record<string, { label: string, cls: string }> = {
  pending:   { label: 'PENDING',   cls: 'badge-amber' },
  validated: { label: 'VALIDATED', cls: 'badge-green' },
  rejected:  { label: 'REJECTED',  cls: 'badge-red' },
}

export default function CandidateList({
  candidates, selected, selectedIds,
  onSelect, onToggleId, onToggleAll,
  onBulkValidate, onBulkReject
}: Props) {
  const allSelected = selectedIds.size === candidates.length && candidates.length > 0
  const someSelected = selectedIds.size > 0

  return (
    <aside className="candidate-list">
      {/* Bulk action bar */}
      <div className="list-toolbar">
        <div className="toolbar-left">
          <label className="checkbox-wrap">
            <input
              type="checkbox"
              checked={allSelected}
              onChange={onToggleAll}
            />
            <span className="checkbox-custom" />
          </label>
          <span className="toolbar-count">
            {someSelected ? `${selectedIds.size} selected` : `${candidates.length} candidates`}
          </span>
        </div>
        {someSelected && (
          <div className="bulk-actions">
            <button className="btn-bulk btn-validate" onClick={onBulkValidate}>
              ✓ Validate
            </button>
            <button className="btn-bulk btn-reject" onClick={onBulkReject}>
              ✕ Reject
            </button>
          </div>
        )}
      </div>

      {/* Candidate rows */}
      <div className="candidate-rows">
        {candidates.map(c => {
          const safeStatus = (c.status || 'pending').toLowerCase()

          const cfg = statusConfig[safeStatus] || statusConfig.pending
          const isActive = selected?.id === c.id
          const isChecked = selectedIds.has(Number(c.id))

          const safeSkills = c.skills || []
          const avgConf = safeSkills.length > 0 
            ? Math.round((safeSkills.reduce((s, sk) => s + sk.confidence, 0) / safeSkills.length) * 100)
            : 0

          return (
            <div
              key={c.id}
              className={`candidate-row ${isActive ? 'row-active' : ''} ${isChecked ? 'row-checked' : ''}`}
              onClick={() => onSelect(c)}
            >
              <label
                className="checkbox-wrap row-check"
                onClick={e => e.stopPropagation()}
              >
                <input
                  type="checkbox"
                  checked={isChecked}
                  onChange={() => onToggleId(c.id)}
                />
                <span className="checkbox-custom" />
              </label>

              <div className="row-body">
                <div className="row-top">
                  <span className="candidate-name">{c.name}</span>
                  <span className={`badge ${cfg.cls}`}>{cfg.label}</span>
                </div>
                <div className="row-meta">
                  <span className="meta-role">{c.role}</span>
                  <span className="meta-dot">·</span>
                  <span className="meta-skills">{safeSkills.length} skills</span>
                  <span className="meta-dot">·</span>
                  <span className="meta-conf">
                    <ConfBar value={avgConf} />
                    {avgConf}%
                  </span>
                </div>
                <div className="row-date">
                  {new Date(c.uploadedAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </aside>
  )
}

function ConfBar({ value }: { value: number }) {
  const color = value >= 80 ? '#22c55e' : value >= 60 ? '#f59e0b' : '#ef4444'
  return (
    <span className="conf-bar-wrap">
      <span className="conf-bar-track">
        <span className="conf-bar-fill" style={{ width: `${value}%`, background: color }} />
      </span>
    </span>
  )
}
