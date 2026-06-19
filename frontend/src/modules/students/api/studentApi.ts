import { api } from '../../../lib/api';

export interface ParentData {
  parent_type: string;
  first_name: string;
  last_name: string;
  mobile: string;
  email?: string;
  occupation?: string;
}

export interface StudentCreateData {
  first_name: string;
  last_name: string;
  date_of_birth: string;
  gender: string;
  roll_number?: number;
  admission_date: string;
  class_id: string;
  parents: ParentData[];
}

export interface StudentUpdateData {
  first_name?: string;
  last_name?: string;
  date_of_birth?: string;
  gender?: string;
  roll_number?: number;
  admission_date?: string;
  class_id?: string;
  status?: string;
}

export interface ParentResponse {
  id: string;
  parent_type: string;
  first_name: string;
  last_name: string;
  mobile: string;
  email?: string;
  occupation?: string;
}

export interface StudentResponseData {
  id: string;
  admission_number: string;
  first_name: string;
  last_name: string;
  date_of_birth: string;
  gender: string;
  roll_number?: number;
  admission_date: string;
  status: string;
  class_id: string;
  parents: ParentResponse[];
  created_at: string;
  updated_at: string;
}

export interface StudentFilters {
  page?: number;
  per_page?: number;
  class_id?: string;
  status?: string;
  search?: string;
}

export const studentApi = {
  list: async (filters: StudentFilters = {}) => {
    const response = await api.get('/students/', { params: filters });
    return response.data;
  },

  get: async (id: string) => {
    const response = await api.get(`/students/${id}`);
    return response.data;
  },

  admit: async (data: StudentCreateData) => {
    const response = await api.post('/students/', data);
    return response.data;
  },

  update: async (id: string, data: StudentUpdateData) => {
    const response = await api.put(`/students/${id}`, data);
    return response.data;
  },

  delete: async (id: string) => {
    const response = await api.delete(`/students/${id}`);
    return response.data;
  },

  classes: async () => {
    const response = await api.get('/students/classes');
    return response.data;
  },

  academicYears: async () => {
    const response = await api.get('/students/academic-years');
    return response.data;
  }
};
