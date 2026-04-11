import type { APICandidate, APISkillRecord, Candidate, SFIASkill, ValidationStatus } from "../types/types";

// Helper for make sure is not Undefined
export const transformCandidate = (data: APICandidate): Candidate => {
    const profile = data.profiles && data.profiles.length > 0 ? data.profiles[0] : null
    const rawSkills = profile && profile.skill_records ? profile.skill_records : []

    const MappedSkills: SFIASkill[] = rawSkills.map((sr: APISkillRecord) => ({
        id: String(sr.id),
        code: sr.sfia_code,
        name: sr.sfia_skill_name,
        category: sr.sfia_category,
        subcategory: '',
        level: (sr.estimated_level || 3) as SFIASkill['level'],
        confidence: sr.confidence_score || 0,
        source: 'parsed',
        notes: sr.evidence_text
    }))

    return {
        id: data.id,
        profileId: profile ? profile.id : undefined,
        name: data.full_name || 'Unknown',
        email: data.email || '',
        role: data.role || 'Data Role',
        cvText: '',
        uploadedAt: data.uploaded_at || new Date().toISOString(),
        status: profile && profile.status ? (profile.status.toLowerCase() as ValidationStatus) : 'pending',
        skills: MappedSkills
    }
}