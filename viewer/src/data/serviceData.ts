import axios, { AxiosError } from 'axios'
import type { APICandidate, DashboardStat, SkillRecordPatch } from '../types/types'

class SFIAService {
    private apiURL: string
    private fetchAxios: typeof axios

    constructor() {
        this.apiURL = String('/api')
        this.fetchAxios = axios
    }

    // Overview Candidates List
    public async getCandidates() {
        try {
            const getcandidate = this.fetchAxios.get<APICandidate[]>(`${this.apiURL}/candidates`)
            return (await getcandidate).data
        } catch (error) {
            if (this.fetchAxios.isAxiosError(error) && error.response) {
                return error.response.data
            }
        }
    }

    // Get Candidates by ID
    public async getCandidatesByID(id: number): Promise<APICandidate> {
        try {
            const CandidateById = await this.fetchAxios.get(`${this.apiURL}/candidates/${id}`)
            return CandidateById.data
        } catch (error) {
            this.handleAxiosError(error, `Candidate with ID: ${id}`)
        }
    }

    // Profile of Candidate details
    public async getProfile(profile_id: number) {
        try {
            const response = await this.fetchAxios.get(`${this.apiURL}/profiles/${profile_id}`)
            return response.data
        } catch (error) {
            this.handleAxiosError(error, `with Profile ID: ${profile_id}`)
        }
    }

    // Skills Validation
    public async validateSkill(profile_id: number, skill_id: number, payload: SkillRecordPatch) {
        try {
            const response = await this.fetchAxios.patch(
                `${this.apiURL}/profiles/${profile_id}/skills/${skill_id}`,
                payload
            )

            return response.data
        } catch (error) {
            this.handleAxiosError(error, `Skill Validation Error with Profile ID: ${profile_id} and Skills_ID: ${skill_id}`)
        }
    }

    // Approving the Profile
    public async approveProfile(profile_id: number, actor: string = "reviewer") {
        try {
            const response = await this.fetchAxios.post(
                `${this.apiURL}/profiles/${profile_id}/approve?actor=${encodeURIComponent(actor)}`
            )
            return response.data
        } catch (error) {
            if (error instanceof Error) {
                throw new Error(`Error on validation Profile with Profile ID: ${profile_id}, ${error.message}`)
            } else if (this.fetchAxios.isAxiosError(error) && error.response?.status === 400) {
                throw new Error(error.response.data.detail || "Cannot Approve: Some Skills are still pending")
            } else {
                this.handleAxiosError(error, `Profile Approval for ID: ${profile_id}`)
            }
        }
    }
    
    // Get the Dashboard Skills from API
    public async getDashboardSkills(): Promise<DashboardStat[]> {
        try {
            const response = await this.fetchAxios.get<DashboardStat[]>(`${this.apiURL}/dashboard/skills`)
            return response.data
        } catch (error) {
            if (this.fetchAxios.isAxiosError(error) && error.response) {
                console.error("Error Text: ", error.response.statusText)
                throw new Error(`Dashboard API Error: ${error.response.status}`)
            }

            throw new Error("Failed to fetch the Dashboard Status")
        }
    }

    private handleAxiosError(error: unknown, context: string): never {
        if (this.fetchAxios.isAxiosError(error)) {
            const axiosError = error as AxiosError;

            if (axiosError.response?.status === 404) {
                throw new Error(`${context} not found (404)`);
            }
            if (axiosError.response?.status === 500) {
                throw new Error(`Server error while fetching ${context} (500)`);
            }
            if (axiosError.code === 'ERR_NETWORK') {
                throw new Error(`Cannot connect to API at ${this.apiURL}`);
            }
            if (axiosError.code === 'ECONNABORTED') {
                throw new Error(`Request Timed out for ${context}`);
            }
            if (axiosError.response?.data) {
                const ErrData = axiosError.response.data as { detail?: string, stack?: string };
                throw new Error(ErrData.detail || ErrData.stack || `API Error: ${axiosError.response.status}`);
            }
            throw new Error(`Failed to process ${context}: ${axiosError.message}`);
        }
        throw new Error(`Unexpected Error: ${error instanceof Error ? error.message : String(error)}`);
    }
}

export const sfia_service = new SFIAService()