export type SkillLevel = 1 | 2 | 3 | 4 | 5 | 6 | 7

export type ValidationStatus = 'pending' | 'validated' | 'rejected'

export interface SFIASkill {
  id: string
  code: string           // e.g. "DTAN"
  name: string           // e.g. "Data Analytics"
  category: string       // e.g. "Data and Analytics"
  subcategory: string
  level: SkillLevel
  confidence: number     // 0–1 from NLP model
  source: 'parsed' | 'manual'
  notes?: string
}

export interface Candidate {
  id: string
  name: string
  email: string
  role: string
  cvText: string
  uploadedAt: string
  status: ValidationStatus
  skills: SFIASkill[]
}

export interface SFIASkillDefinition {
  code: string
  name: string
  category: string
  subcategory: string
  description: string
  levels: { level: SkillLevel; description: string }[]
}