import { useState } from 'react'
import CandidateList from './components/CandidateList'
import CandidateDetail from './components/CandidateDetail'
import type { Candidate } from './types/types'
import { mockCandidates } from './data/mockData'

export default function App() {
  const [candidates, setCandidates] = useState<Candidate[]>(mockCandidates)
  const [selected, setSelected] = useState<Candidate | null>(null)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())

  const updateCandidate = (updated: Candidate) => {
    setCandidates(prev => prev.map(c => c.id === updated.id ? updated : c))
    setSelected(updated)
  }

  const bulkValidate = () => {
    const next = candidates.map(c =>
      selectedIds.has(c.id) ? { ...c, status: 'validated' as const } : c
    )
    setCandidates(next)
    setSelectedIds(new Set())
  }

  const bulkReject = () => {
    const next = candidates.map(c =>
      selectedIds.has(c.id) ? { ...c, status: 'rejected' as const } : c
    )
    setCandidates(next)
    setSelectedIds(new Set())
  }

  return (
    <div className="app-shell">
      <header className="app-header">
        <div className="header-left">
          <div className="logo-mark">SFIA</div>
          <div className="header-title">
            <span className="title-main">Skills Intelligence Platform</span>
            <span className="title-sub">CV Parser · SFIA v9 Mapping · Human Review</span>
          </div>
        </div>
        <div className="header-stats">
          <Stat label="Total" value={candidates.length} />
          <Stat label="Validated" value={candidates.filter(c => c.status === 'validated').length} accent="green" />
          <Stat label="Pending" value={candidates.filter(c => c.status === 'pending').length} accent="amber" />
          <Stat label="Rejected" value={candidates.filter(c => c.status === 'rejected').length} accent="red" />
        </div>
      </header>

      <main className="app-main">
        <CandidateList
          candidates={candidates}
          selected={selected}
          selectedIds={selectedIds}
          onSelect={setSelected}
          onToggleId={(id) => setSelectedIds(prev => {
            const next = new Set(prev)
            next.has(id) ? next.delete(id) : next.add(id)
            return next
          })}
          onToggleAll={() => {
            if (selectedIds.size === candidates.length) setSelectedIds(new Set())
            else setSelectedIds(new Set(candidates.map(c => c.id)))
          }}
          onBulkValidate={bulkValidate}
          onBulkReject={bulkReject}
        />
        <CandidateDetail
          candidate={selected}
          onUpdate={updateCandidate}
        />
      </main>
    </div>
  )
}

function Stat({ label, value, accent }: { label: string; value: number; accent?: string }) {
  return (
    <div className={`stat-pill ${accent ? `stat-${accent}` : ''}`}>
      <span className="stat-value">{value}</span>
      <span className="stat-label">{label}</span>
    </div>
  )
}
