import { api } from '../../../lib/api';

export interface Exam {
  id: string;
  name: string;
  academic_year_id: string;
  status: 'draft' | 'scheduled' | 'completed';
  created_at: string;
  updated_at: string;
}

export interface ExamSchedule {
  id: string;
  exam_id: string;
  subject_id: string;
  class_id: string;
  subject_name?: string;
  subject_code?: string;
  exam_date: string;
  max_marks: number;
  passing_marks: number;
  created_at: string;
  updated_at: string;
}

export interface ExamMark {
  id: string;
  exam_schedule_id: string;
  student_id: string;
  student_name: string;
  roll_number: number | null;
  marks_obtained: number | null;
  remarks: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface GradeScale {
  id: string;
  min_percentage: number;
  max_percentage: number;
  grade_name: string;
  description: string | null;
  created_at: string;
  updated_at: string;
}

export interface ExamResponse {
  success: boolean;
  data: Exam;
  message: string;
}

export interface ExamListResponse {
  success: boolean;
  data: Exam[];
  message: string;
}

export interface ExamScheduleResponse {
  success: boolean;
  data: ExamSchedule;
  message: string;
}

export interface ExamScheduleListResponse {
  success: boolean;
  data: ExamSchedule[];
  message: string;
}

export interface ExamMarkListResponse {
  success: boolean;
  data: ExamMark[];
  message: string;
}

export interface GradeScaleResponse {
  success: boolean;
  data: GradeScale;
  message: string;
}

export interface GradeScaleListResponse {
  success: boolean;
  data: GradeScale[];
  message: string;
}

export const examsApi = {
  // --- Exams ---
  listExams: async (academicYearId?: string): Promise<ExamListResponse> => {
    const params = new URLSearchParams();
    if (academicYearId) params.append('academic_year_id', academicYearId);
    const response = await api.get(`/exams?${params.toString()}`);
    return response.data;
  },

  getExam: async (id: string): Promise<ExamResponse> => {
    const response = await api.get(`/exams/${id}`);
    return response.data;
  },

  createExam: async (data: { name: string; academic_year_id: string }): Promise<ExamResponse> => {
    const response = await api.post('/exams', data);
    return response.data;
  },

  updateExam: async (id: string, data: { name?: string; status?: string }): Promise<ExamResponse> => {
    const response = await api.put(`/exams/${id}`, data);
    return response.data;
  },

  deleteExam: async (id: string): Promise<void> => {
    await api.delete(`/exams/${id}`);
  },

  // --- Schedules ---
  listSchedules: async (examId: string, classId?: string): Promise<ExamScheduleListResponse> => {
    const params = new URLSearchParams();
    if (classId) params.append('class_id', classId);
    const response = await api.get(`/exams/${examId}/schedule?${params.toString()}`);
    return response.data;
  },

  createSchedule: async (
    examId: string,
    data: {
      exam_id: string;
      subject_id: string;
      class_id: string;
      exam_date: string;
      max_marks: number;
      passing_marks: number;
    }
  ): Promise<ExamScheduleResponse> => {
    const response = await api.post(`/exams/${examId}/schedule`, data);
    return response.data;
  },

  deleteSchedule: async (schedId: string): Promise<void> => {
    await api.delete(`/exams/schedule/${schedId}`);
  },

  // --- Marks ---
  listMarksRoster: async (schedId: string): Promise<ExamMarkListResponse> => {
    const response = await api.get(`/exams/schedule/${schedId}/marks`);
    return response.data;
  },

  saveMarksLedger: async (
    schedId: string,
    marks: { student_id: string; marks_obtained: number; remarks?: string }[]
  ): Promise<{ success: boolean; message: string }> => {
    const response = await api.post(`/exams/schedule/${schedId}/marks`, { marks });
    return response.data;
  },

  // --- Grade Scales ---
  listGradeScales: async (): Promise<GradeScaleListResponse> => {
    const response = await api.get('/exams/grade-scales');
    return response.data;
  },

  createGradeScale: async (data: {
    min_percentage: number;
    max_percentage: number;
    grade_name: string;
    description?: string;
  }): Promise<GradeScaleResponse> => {
    const response = await api.post('/exams/grade-scales', data);
    return response.data;
  },

  deleteGradeScale: async (scaleId: string): Promise<void> => {
    await api.delete(`/exams/grade-scales/${scaleId}`);
  },

  // --- Report Cards ---
  downloadReportCard: async (studentId: string, examId: string): Promise<Blob> => {
    const response = await api.get(`/exams/student/${studentId}/report-card`, {
      params: { exam_id: examId },
      responseType: 'blob',
    });
    return response.data;
  },
};
