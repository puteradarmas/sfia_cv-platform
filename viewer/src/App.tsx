import { useEffect, useState } from 'react'
import CandidateList from './components/CandidateList'
import CandidateDetail from './components/CandidateDetail'
import type { APICandidate, Candidate, ValidationStatus } from './types/types'
import { sfia_service } from './data/serviceData'
import { transformCandidate } from './helper/candidateshelper'
// import { mockCandidates } from './data/mockData'

export default function App() {
  const [candidates, setCandidates] = useState<Candidate[]>([])
  const [selected, setSelected] = useState<Candidate | null>(null)
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set())
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchCandidates = async () => {
      try {
        const rawData: APICandidate[] = await sfia_service.getCandidates()
        if (Array.isArray(rawData)) {
          const formattedCandidates = rawData.map(data => transformCandidate(data))
          setCandidates(formattedCandidates)
        }
      } catch (error) {
        console.error("Failed to fetch the Candidates: ", error)
      } finally {
        setLoading(false)
      }
    }

    fetchCandidates()
  }, [])

  const updateCandidate = async (updated: Candidate) => {
    const ListOfCandidate: Candidate[] = await sfia_service.getCandidates()
    setCandidates(ListOfCandidate.map(
      prev => prev.id === updated.id ? updated : prev
    ))
    setSelected(updated)
  }

  const selectCandidatebyID = async (basicCandidate: Candidate) => {
    try {
      const GetCandidateByID = await sfia_service.getCandidatesByID(basicCandidate.id)
      const detailedCand = transformCandidate(GetCandidateByID)

      setSelected(detailedCand)
    } catch (error) {
      console.error("Error: ", error)
      setSelected(basicCandidate)
    }
  }

  const bulkValidate = async () => {
    const candidatesToApprove = candidates.filter(c => selectedIds.has(Number(c.id)))

    for (const c of candidatesToApprove) {
      if (c.profileId) {
        try {
          await sfia_service.approveProfile(c.profileId, "Reviewer")
          setCandidates(prev => prev.map(cand =>
            cand.id === c.id ? { ...cand, status: 'validated' as ValidationStatus } : cand
          ))
        } catch (error) {
          alert("Failed to Bulk Validate")
          console.error("Failed to Validate the Candidates: ", error)
        }
      }
    }

    setSelectedIds(new Set())
  }

  const bulkReject = () => {
    const next = candidates.map((c: Candidate) =>
      selectedIds.has(Number(c.id) as number) ? { ...c, status: 'rejected' as const } : c
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
          <Stat label="Validated" value={candidates.filter((c: { status: string }) => c.status === 'validated').length} accent="green" />
          <Stat label="Pending" value={candidates.filter((c: { status: string }) => c.status === 'pending').length} accent="amber" />
          <Stat label="Rejected" value={candidates.filter((c: { status: string }) => c.status === 'rejected').length} accent="red" />
        </div>
      </header>

      {loading ? (
        <div style={{ padding: '2rem', textAlign: 'center' }}>
          Loading Candidates ...
        </div>
      ) : (
      <main className="app-main">
        <CandidateList
          candidates={candidates}
          selected={selected}
          selectedIds={selectedIds}
          onSelect={selectCandidatebyID}
          onToggleId={(id: number) => setSelectedIds((prev: Set<number>) => {
            const next = new Set(prev)
            if (next.has(id)) {
              next.delete(id)
            } else {
              next.add(id)
            }
            return next
          })}
          onToggleAll={() => {
            if (selectedIds.size === candidates.length) setSelectedIds(new Set())
            else setSelectedIds(new Set(candidates.map((c: Candidate) => c.id)))
          }}
          onBulkValidate={bulkValidate}
          onBulkReject={bulkReject}
        />
        <CandidateDetail
          candidate={selected}
          onUpdate={updateCandidate}
        />
      </main>
      )}
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
