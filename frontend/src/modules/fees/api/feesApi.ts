import { api } from '../../../lib/api';
import { useAuthStore } from '../../../stores/authStore';

export interface FeeHead {
  id: string;
  name: string;
  description?: string;
  created_at: string;
}

export interface FeeHeadCreateData {
  name: string;
  description?: string;
}

export interface FeeStructureItem {
  id: string;
  fee_head_id: string;
  amount: number;
  frequency: string;
  fee_head?: FeeHead;
}

export interface FeeStructureItemCreateData {
  fee_head_id: string;
  amount: number;
  frequency: string;
}

export interface FeeStructure {
  id: string;
  name: string;
  academic_year_id: string;
  items: FeeStructureItem[];
  created_at: string;
}

export interface FeeStructureCreateData {
  name: string;
  academic_year_id: string;
  items: FeeStructureItemCreateData[];
}

export interface StudentFeeAccount {
  id: string;
  student_id: string;
  fee_structure_id: string;
  total_applicable: number;
  total_paid: number;
  total_discount: number;
  outstanding_balance: number;
  fee_structure?: FeeStructure;
}

export interface FeeTransaction {
  id: string;
  student_id: string;
  receipt_number: string;
  amount_paid: number;
  payment_mode: string;
  payment_date: string;
  transaction_reference?: string;
  remarks?: string;
  created_at: string;
}

export interface FeeTransactionCreateData {
  student_id: string;
  amount_paid: number;
  payment_mode: string;
  transaction_reference?: string;
  remarks?: string;
}

export interface FeeDefaulter {
  student_id: string;
  first_name: string;
  last_name: string;
  admission_number: string;
  class_name: string;
  class_section: string;
  parent_mobile: string;
  total_applicable: number;
  total_paid: number;
  total_discount: number;
  outstanding_balance: number;
}

export interface FeeSummary {
  total_collected: number;
  total_outstanding: number;
  total_applicable: number;
  collection_rate: number;
}

export const feesApi = {
  getHeads: async (): Promise<FeeHead[]> => {
    const response = await api.get('/fees/heads');
    return response.data;
  },

  createHead: async (data: FeeHeadCreateData): Promise<FeeHead> => {
    const response = await api.post('/fees/heads', data);
    return response.data;
  },

  getStructures: async (): Promise<FeeStructure[]> => {
    const response = await api.get('/fees/structures');
    return response.data;
  },

  createStructure: async (data: FeeStructureCreateData): Promise<FeeStructure> => {
    const response = await api.post('/fees/structures', data);
    return response.data;
  },

  assignStructure: async (studentId: string, feeStructureId: string): Promise<StudentFeeAccount> => {
    const response = await api.post('/fees/accounts/assign', {
      student_id: studentId,
      fee_structure_id: feeStructureId
    });
    return response.data;
  },

  getStudentDetails: async (studentId: string): Promise<{ account?: StudentFeeAccount; transactions: FeeTransaction[] }> => {
    const response = await api.get(`/fees/accounts/student/${studentId}`);
    return response.data;
  },

  recordPayment: async (data: FeeTransactionCreateData): Promise<FeeTransaction> => {
    const response = await api.post('/fees/transactions', data);
    return response.data;
  },

  getDefaulters: async (): Promise<FeeDefaulter[]> => {
    const response = await api.get('/fees/defaulters');
    return response.data;
  },

  getSummary: async (): Promise<FeeSummary> => {
    const response = await api.get('/fees/summary');
    return response.data;
  },

  sendWhatsAppReminder: async (studentId: string): Promise<{ success: boolean; message: string }> => {
    const response = await api.post(`/fees/defaulters/${studentId}/remind`);
    return response.data;
  },

  generatePaymentLink: async (studentId: string): Promise<{ success: boolean; payment_url: string }> => {
    const response = await api.post(`/fees/accounts/student/${studentId}/payment-link`);
    return response.data;
  },

  getReceiptUrl: (transactionId: string): string => {
    const baseUrl = api.defaults.baseURL || '/api/v1';
    const token = useAuthStore.getState().token;
    return `${baseUrl}/fees/transactions/${transactionId}/receipt?token=${token || ''}`;
  }
};
