import { api } from '../../../lib/api';

export interface DashboardStats {
  total_students: number;
  active_employees: number;
  total_fees_collected: number;
  current_term: string;
}

export const dashboardApi = {
  getStats: async (): Promise<DashboardStats> => {
    const response = await api.get('/dashboard/stats');
    return response.data;
  }
};
