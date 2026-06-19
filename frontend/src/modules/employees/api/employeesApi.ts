import { api } from '../../../lib/api';

export interface Employee {
  id: string;
  employee_code: string;
  first_name: string;
  last_name: string;
  designation: string;
  department: string;
  date_of_joining: string;
  employment_type: 'permanent' | 'contract';
  mobile: string;
  email: string;
  status: 'active' | 'inactive';
  user_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface EmployeeCreateData {
  employee_code: string;
  first_name: string;
  last_name: string;
  designation: string;
  department: string;
  date_of_joining: string;
  employment_type: 'permanent' | 'contract';
  mobile: string;
  email: string;
}

export interface EmployeeUpdateData {
  first_name?: string;
  last_name?: string;
  designation?: string;
  department?: string;
  date_of_joining?: string;
  employment_type?: 'permanent' | 'contract';
  mobile?: string;
  email?: string;
  status?: 'active' | 'inactive';
}

export interface LinkUserData {
  email: string;
  password: string;
  role: 'teacher' | 'accountant' | 'school_admin';
}

export interface PaginatedEmployeeResponse {
  success: boolean;
  data: Employee[];
  pagination: {
    page: number;
    per_page: number;
    total: number;
    pages: number;
  };
  message: string;
}

export interface EmployeeResponse {
  success: boolean;
  data: Employee;
  message: string;
}

export interface EmployeeFilters {
  page: number;
  per_page: number;
  department?: string;
  designation?: string;
  status?: string;
  search?: string;
}

export const employeesApi = {
  list: async (filters: EmployeeFilters): Promise<PaginatedEmployeeResponse> => {
    const params = new URLSearchParams();
    params.append('page', filters.page.toString());
    params.append('per_page', filters.per_page.toString());
    if (filters.department) params.append('department', filters.department);
    if (filters.designation) params.append('designation', filters.designation);
    if (filters.status) params.append('status', filters.status);
    if (filters.search) params.append('search', filters.search);

    const response = await api.get(`/employees?${params.toString()}`);
    return response.data;
  },

  get: async (id: string): Promise<EmployeeResponse> => {
    const response = await api.get(`/employees/${id}`);
    return response.data;
  },

  create: async (data: EmployeeCreateData): Promise<EmployeeResponse> => {
    const response = await api.post('/employees', data);
    return response.data;
  },

  update: async (id: string, data: EmployeeUpdateData): Promise<EmployeeResponse> => {
    const response = await api.put(`/employees/${id}`, data);
    return response.data;
  },

  delete: async (id: string): Promise<void> => {
    await api.delete(`/employees/${id}`);
  },

  linkUser: async (id: string, data: LinkUserData): Promise<EmployeeResponse> => {
    const response = await api.post(`/employees/${id}/link-user`, data);
    return response.data;
  }
};
