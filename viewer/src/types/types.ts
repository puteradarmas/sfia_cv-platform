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
  id: number
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

// Using Types based on Backend API
export interface APISkillRecord {
  id: number;
  profile_id: number;
  sfia_code: string;
  sfia_skill_name: string;
  sfia_category: string;
  estimated_level: number;
  validated_level: number | null;
  confidence_score: number;
  evidence_text: string; // Text like an Array, string inside Array
  validation_status: string;
  validator_note: string | null;
}

export interface APIProfile {
  id: number;
  candidate_id: number;
  status: string; // contoh: "PENDING"
  created_at: string;
  validated_at: string | null;
  validated_by: string | null;
  skill_records: APISkillRecord[];
}

export interface APICandidate {
  id: number;
  full_name: string;
  email: string;
  phone: string;
  source_filename: string;
  uploaded_at: string;
  role?: string; // Optional
  profiles: APIProfile[];
}

export type StatusOfValidation = 'CONFIRMED' | 'CORRECTED' | 'REJECTED'

export interface SkillRecordPatch {
  validated_level: number;
  validation_status: StatusOfValidation;
  validator_note?: string | null;
  actor?: string;
}

export interface DashboardStat {
  sfia_skill_name: string;
  sfia_code: string;
  count: number;
  avg_validated_level: number | null;
}