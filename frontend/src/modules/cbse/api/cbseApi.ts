import { api } from '../../../lib/api';

export interface CBSEProfile {
  id?: string;
  affiliation_number: string | null;
  school_code: string | null;
  land_area_sq_mtrs: number;
  built_up_area_sq_mtrs: number;
  playground_area_sq_mtrs: number;
  classroom_count: number;
  composite_science_lab_count: number;
  math_lab_count: number;
  computer_lab_count: number;
  library_book_count: number;
  library_magazine_count: number;
  library_newspaper_count: number;
}

export interface CBSESectionInfo {
  id: string;
  class_name: string;
  section: string;
  student_count: number;
}

export interface CBSESubjectInfo {
  id: string;
  name: string;
  code: string;
  description: string | null;
}

export interface CBSETeacherInfo {
  id: string;
  employee_code: string;
  first_name: string;
  last_name: string;
  designation: string;
  qualification: string | null;
}

export interface CBSEComplianceStats {
  total_students: number;
  total_teachers: number;
  student_teacher_ratio: number;
  student_teacher_compliant: boolean;
  total_sections: number;
  teacher_section_ratio: number;
  teacher_section_compliant: boolean;
  sections_over_capacity: CBSESectionInfo[];
  sections_over_capacity_compliant: boolean;
  subjects_missing_codes: CBSESubjectInfo[];
  subjects_compliant: boolean;
  teachers_missing_qualifications: CBSETeacherInfo[];
  teachers_missing_professional: CBSETeacherInfo[];
  land_area_compliant: boolean;
  land_area_required: number;
  library_books_compliant: boolean;
  library_books_required: number;
  labs_compliant: boolean;
  missing_labs: string[];
}

export interface CBSEProfileResponse {
  success: boolean;
  data: CBSEProfile | null;
  message: string;
}

export interface CBSEComplianceResponse {
  success: boolean;
  data: CBSEComplianceStats;
  message: string;
}

export const cbseApi = {
  getProfile: async (): Promise<CBSEProfileResponse> => {
    const response = await api.get('/cbse/profile');
    return response.data;
  },

  updateProfile: async (data: CBSEProfile): Promise<CBSEProfileResponse> => {
    const response = await api.put('/cbse/profile', data);
    return response.data;
  },

  getCompliance: async (): Promise<CBSEComplianceResponse> => {
    const response = await api.get('/cbse/compliance');
    return response.data;
  },

  downloadComplianceReport: async (): Promise<Blob> => {
    const response = await api.get('/cbse/export-pdf', {
      responseType: 'blob',
    });
    return response.data;
  },
};
