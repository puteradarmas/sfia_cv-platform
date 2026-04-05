/**
 * SFIA Platform — API Service Layer
 *
 * Centralised HTTP client for the Parser API backend.
 * All components talk to the backend through this module.
 *
 * Base URL is injected via VITE_API_URL env var (set in docker-compose).
 * Falls back to relative `/api` for nginx-proxied production builds.
 */

const BASE_URL = import.meta.env.VITE_API_URL ?? '/api'

// ── Generic fetch wrapper ────────────────────────────────────────

interface RequestOptions {
  method?: string
  body?: BodyInit | null
  headers?: Record<string, string>
  params?: Record<string, string | number | undefined>
}

async function request<T>(path: string, opts: RequestOptions = {}): Promise<T> {
  const { method = 'GET', body, headers = {}, params } = opts

  // Build query string
  let url = `${BASE_URL}${path}`
  if (params) {
    const qs = new URLSearchParams()
    for (const [k, v] of Object.entries(params)) {
      if (v !== undefined) qs.set(k, String(v))
    }
    const str = qs.toString()
    if (str) url += `?${str}`
  }

  const isFormData = body instanceof FormData

  const res = await fetch(url, {
    method,
    headers: {
      ...(!isFormData && { 'Content-Type': 'application/json' }),
      ...headers,
    },
    body,
  })

  if (!res.ok) {
    const errorBody = await res.json().catch(() => ({ detail: res.statusText }))
    throw new ApiError(res.status, errorBody.detail ?? 'Request failed')
  }

  return res.json() as Promise<T>
}

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message)
    this.name = 'ApiError'
  }
}


// ── Types (mirrors backend Pydantic schemas) ─────────────────────

export interface HealthResponse {
  status: string
  db: string
  models: string
}

export interface ParseResponse {
  candidate_id: number
  profile_id: number
  full_name: string | null
  email: string | null
  skills_count: number
  status: string
}

export interface SkillRecordOut {
  id: number
  profile_id: number
  sfia_code: string
  sfia_skill_name: string
  sfia_category: string | null
  estimated_level: number
  validated_level: number | null
  confidence_score: number
  evidence_text: string | null
  validation_status: string
  validator_note: string | null
}

export interface ProfileOut {
  id: number
  candidate_id: number
  status: string
  created_at: string
  validated_at: string | null
  validated_by: string | null
  skill_records: SkillRecordOut[]
}

export interface CandidateOut {
  id: number
  full_name: string | null
  email: string | null
  phone: string | null
  source_filename: string | null
  uploaded_at: string
  raw_cv_text?: string | null
  profiles: ProfileOut[]
}

export interface SkillRecordPatch {
  validated_level: number
  validation_status: string   // CONFIRMED | CORRECTED | REJECTED
  validator_note?: string | null
  actor?: string
}

export interface CandidatePatch {
  full_name?: string
  email?: string
  phone?: string
}

export interface OpportunityOut {
  id: number
  title: string
  description: string | null
  source_filename: string | null
  required_skills: OpportunitySkill[]
  created_at: string
}

export interface OpportunitySkill {
  sfia_code: string
  sfia_skill_name: string
  required_level: number
}

export interface DashboardSkill {
  sfia_skill_name: string
  sfia_code: string
  count: number
  avg_validated_level: number | null
}


// ── API Methods ──────────────────────────────────────────────────

/** System health check */
export const getHealth = () =>
  request<HealthResponse>('/health')

/** Upload and parse a CV file */
export const parseCV = (file: File) => {
  const form = new FormData()
  form.append('file', file)
  return request<ParseResponse>('/parse', { method: 'POST', body: form })
}

/** List all candidates, optionally filtered by profile status */
export const listCandidates = (status?: string, skip = 0, limit = 50) =>
  request<CandidateOut[]>('/candidates', {
    params: { status, skip, limit },
  })

/** Get a single candidate by ID */
export const getCandidate = (id: number) =>
  request<CandidateOut>(`/candidates/${id}`)

/** Update candidate personal info (PATCH) */
export const updateCandidate = (id: number, data: CandidatePatch) =>
  request<CandidateOut>(`/candidates/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  })

/** Get a skill profile with all records */
export const getProfile = (profileId: number) =>
  request<ProfileOut>(`/profiles/${profileId}`)

/** Validate / correct / reject a single skill record */
export const patchSkillRecord = (
  profileId: number,
  skillId: number,
  patch: SkillRecordPatch,
) =>
  request<SkillRecordOut>(`/profiles/${profileId}/skills/${skillId}`, {
    method: 'PATCH',
    body: JSON.stringify(patch),
  })

/** Approve entire profile (all skills must be reviewed) */
export const approveProfile = (profileId: number, actor = 'reviewer') =>
  request<{ profile_id: number; status: string }>(
    `/profiles/${profileId}/approve`,
    { method: 'POST', params: { actor } },
  )

/** Dashboard — aggregated skill stats */
export const getDashboardSkills = () =>
  request<DashboardSkill[]>('/dashboard/skills')


// ── Opportunities (future endpoints — graceful fallback) ─────────

/** Upload an opportunity (text or PDF) */
export const createOpportunity = (data: {
  title: string
  description?: string
  file?: File
}) => {
  const form = new FormData()
  form.append('title', data.title)
  if (data.description) form.append('description', data.description)
  if (data.file) form.append('file', data.file)
  return request<OpportunityOut>('/opportunities', {
    method: 'POST',
    body: form,
  })
}

/** List opportunities */
export const listOpportunities = (skip = 0, limit = 50) =>
  request<OpportunityOut[]>('/opportunities', {
    params: { skip, limit },
  })
