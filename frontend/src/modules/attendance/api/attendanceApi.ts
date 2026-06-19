import { api } from '../../../lib/api';

export interface StudentAttendanceMark {
  student_id: string;
  status: 'P' | 'A' | 'L' | 'H';
  remarks?: string;
}

export interface AttendanceSessionCreate {
  class_id: string;
  session_date: string;
  session_type: 'morning' | 'afternoon' | 'period';
  subject_id?: string;
}

export interface AttendanceMarkRequest {
  session: AttendanceSessionCreate;
  records: StudentAttendanceMark[];
}

export const attendanceApi = {
  mark: async (data: AttendanceMarkRequest) => {
    const response = await api.post('/attendance/', data);
    return response.data;
  },

  getStudentSummary: async (studentId: string) => {
    const response = await api.get(`/attendance/summary/student/${studentId}`);
    return response.data;
  },

  getClassSummary: async (classId: string, startDate: string, endDate: string) => {
    const response = await api.get(`/attendance/summary/class/${classId}`, {
      params: { start_date: startDate, end_date: endDate }
    });
    return response.data;
  },

  getSessionDetails: async (classId: string, date: string, sessionType: string) => {
    const response = await api.get('/attendance/session', {
      params: { class_id: classId, session_date: date, session_type: sessionType }
    });
    return response.data;
  }
};
