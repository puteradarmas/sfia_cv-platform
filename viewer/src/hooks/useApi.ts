/**
 * SFIA Platform — Data Fetching Hooks
 *
 * Lightweight hooks wrapping the API service.
 * Uses a simple fetch-on-mount pattern with loading/error states.
 * Replace with TanStack Query or SWR when the app grows.
 */

import { useCallback, useEffect, useState } from 'react'
import type { CandidateOut } from '../services/api'
import { listCandidates, getCandidate, getHealth } from '../services/api'
import type { HealthResponse } from '../services/api'


// ── Generic async hook ───────────────────────────────────────────

interface AsyncState<T> {
  data: T | null
  loading: boolean
  error: string | null
  refetch: () => void
}

function useAsync<T>(fn: () => Promise<T>, deps: unknown[] = []): AsyncState<T> {
  const [data, setData] = useState<T | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const execute = useCallback(() => {
    setLoading(true)
    setError(null)
    fn()
      .then(setData)
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps)

  useEffect(() => { execute() }, [execute])

  return { data, loading, error, refetch: execute }
}


// ── Domain hooks ─────────────────────────────────────────────────

export function useCandidates(status?: string) {
  return useAsync(() => listCandidates(status), [status])
}

export function useCandidate(id: number | null) {
  return useAsync(
    () => id !== null ? getCandidate(id) : Promise.resolve(null as unknown as CandidateOut),
    [id],
  )
}

export function useHealth() {
  return useAsync<HealthResponse>(() => getHealth(), [])
}
