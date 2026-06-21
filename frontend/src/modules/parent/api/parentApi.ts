import { api } from '../../../lib/api';
import { StudentResponseData } from '../../students/api/studentApi';

export interface ParentStudentResponse {
  success: boolean;
  data: StudentResponseData[];
  message: string;
}

export interface ParentAttendanceSummary {
  present_days: number;
  absent_days: number;
  late_days: number;
  total_days: number;
  attendance_percentage: number;
}

export interface ParentAttendanceLog {
  date: string;
  session_type: string;
  status: 'P' | 'A' | 'L' | 'H';
  remarks: string | null;
}

export interface ParentAttendanceResponse {
  success: boolean;
  data: {
    summary: ParentAttendanceSummary;
    logs: ParentAttendanceLog[];
  };
}

export interface ParentHomeworkItem {
  id: string;
  title: string;
  description: string;
  due_date: string;
  attachment_url: string | null;
  subject_name: string;
  subject_code: string;
  teacher_name: string;
}

export interface ParentHomeworkResponse {
  success: boolean;
  data: ParentHomeworkItem[];
}

export interface ParentExamSchedule {
  id: string;
  exam_name: string;
  exam_id: string;
  subject_name: string;
  exam_date: string;
  max_marks: number;
  passing_marks: number;
}

export interface ParentExamMark {
  id: string;
  exam_name: string;
  exam_id: string;
  subject_name: string;
  marks_obtained: number;
  max_marks: number;
  remarks: string | null;
}

export interface ParentExamsResponse {
  success: boolean;
  data: {
    schedules: ParentExamSchedule[];
    marks: ParentExamMark[];
  };
}

export interface ParentPaymentLinkResponse {
  success: boolean;
  payment_url: string;
}

export const parentApi = {
  getLinkedStudents: async (): Promise<ParentStudentResponse> => {
    const response = await api.get('/parent/students');
    return response.data;
  },

  getChildAttendance: async (studentId: string): Promise<ParentAttendanceResponse> => {
    const response = await api.get(`/parent/students/${studentId}/attendance`);
    return response.data;
  },

  getChildHomework: async (studentId: string): Promise<ParentHomeworkResponse> => {
    const response = await api.get(`/parent/students/${studentId}/homework`);
    return response.data;
  },

  getChildExams: async (studentId: string): Promise<ParentExamsResponse> => {
    const response = await api.get(`/parent/students/${studentId}/exams`);
    return response.data;
  },

  getChildFees: async (studentId: string): Promise<any> => {
    const response = await api.get(`/fees/accounts/student/${studentId}`);
    return response.data;
  },

  getChildPaymentLink: async (studentId: string): Promise<ParentPaymentLinkResponse> => {
    const response = await api.post(`/fees/accounts/student/${studentId}/payment-link`);
    return response.data;
  }
};
