import { api } from '../../../lib/api';

export interface Subject {
  id: string;
  name: string;
  code: string;
  description: string | null;
  created_at: string;
  updated_at: string;
}

export interface SubjectCreateData {
  name: string;
  code: string;
  description?: string;
}

export interface SubjectResponse {
  success: boolean;
  data: Subject;
  message: string;
}

export interface SubjectListResponse {
  success: boolean;
  data: Subject[];
  message: string;
}

export interface Homework {
  id: string;
  title: string;
  description: string;
  due_date: string;
  attachment_url: string | null;
  class_id: string;
  subject_id: string;
  created_by: string;
  created_at: string;
  updated_at: string;
  class_name?: string;
  subject_name?: string;
  teacher_name?: string;
}

export interface HomeworkCreateData {
  title: string;
  description: string;
  due_date: string;
  attachment_url?: string;
  class_id: string;
  subject_id: string;
}

export interface HomeworkResponse {
  success: boolean;
  data: Homework;
  message: string;
}

export interface HomeworkListResponse {
  success: boolean;
  data: Homework[];
  message: string;
}

export interface HomeworkSubmission {
  id: string;
  homework_id: string;
  student_id: string;
  student_name: string | null;
  roll_number: number | null;
  submission_date: string | null;
  attachment_url: string | null;
  status: 'submitted' | 'graded' | 'missing';
  remarks: string | null;
  grade: string | null;
  created_at: string | null;
  updated_at: string | null;
}

export interface GradeSubmissionData {
  status: 'submitted' | 'graded';
  remarks?: string;
  grade?: string;
}

export interface SubmissionResponse {
  success: boolean;
  data: HomeworkSubmission;
  message: string;
}

export interface HomeworkSubmissionsListResponse {
  success: boolean;
  data: HomeworkSubmission[];
  message: string;
}

export const academicsApi = {
  // --- Subject Catalog ---
  listSubjects: async (): Promise<SubjectListResponse> => {
    const response = await api.get('/academics/subjects');
    return response.data;
  },

  createSubject: async (data: SubjectCreateData): Promise<SubjectResponse> => {
    const response = await api.post('/academics/subjects', data);
    return response.data;
  },

  deleteSubject: async (id: string): Promise<void> => {
    await api.delete(`/academics/subjects/${id}`);
  },

  // --- Homework Board ---
  listHomework: async (filters?: { classId?: string; subjectId?: string }): Promise<HomeworkListResponse> => {
    const params = new URLSearchParams();
    if (filters?.classId) params.append('class_id', filters.classId);
    if (filters?.subjectId) params.append('subject_id', filters.subjectId);

    const response = await api.get(`/academics/homework?${params.toString()}`);
    return response.data;
  },

  getHomework: async (id: string): Promise<HomeworkResponse> => {
    const response = await api.get(`/academics/homework/${id}`);
    return response.data;
  },

  createHomework: async (data: HomeworkCreateData): Promise<HomeworkResponse> => {
    const response = await api.post('/academics/homework', data);
    return response.data;
  },

  deleteHomework: async (id: string): Promise<void> => {
    await api.delete(`/academics/homework/${id}`);
  },

  // --- Submissions & Grading ---
  listSubmissions: async (homeworkId: string): Promise<HomeworkSubmissionsListResponse> => {
    const response = await api.get(`/academics/homework/${homeworkId}/submissions`);
    return response.data;
  },

  gradeSubmission: async (
    homeworkId: string, 
    studentId: string, 
    data: GradeSubmissionData
  ): Promise<SubmissionResponse> => {
    const response = await api.post(`/academics/homework/${homeworkId}/submissions/${studentId}/grade`, data);
    return response.data;
  }
};
