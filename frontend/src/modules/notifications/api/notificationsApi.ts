import { api } from '../../../lib/api';

export interface NotificationTemplate {
  id: string;
  name: string;
  template_name: string;
  body_format: string;
  category: string;
  created_at: string;
  updated_at: string;
}

export interface NotificationLog {
  id: string;
  sender_id: string | null;
  sender_name: string | null;
  recipient_name: string;
  recipient_phone: string;
  message_body: string;
  channel: string;
  status: 'sent' | 'failed' | 'pending';
  error_message: string | null;
  created_at: string;
}

export interface NotificationLogPagination {
  page: number;
  per_page: number;
  total: number;
  pages: number;
}

export interface NotificationTemplateResponse {
  success: boolean;
  data: NotificationTemplate;
  message: string;
}

export interface NotificationTemplateListResponse {
  success: boolean;
  data: NotificationTemplate[];
  message: string;
}

export interface NotificationLogListResponse {
  success: boolean;
  data: NotificationLog[];
  pagination: NotificationLogPagination;
  message: string;
}

export interface NotificationTemplateCreate {
  name: string;
  template_name: string;
  body_format: string;
  category: string;
}

export interface BroadcastRequest {
  template_id: string;
  target_type: 'all' | 'class' | 'individual';
  class_id?: string;
  custom_phones?: string[];
  variables: string[];
}

export const notificationsApi = {
  listTemplates: async (): Promise<NotificationTemplateListResponse> => {
    const response = await api.get('/notifications/templates');
    return response.data;
  },

  createTemplate: async (data: NotificationTemplateCreate): Promise<NotificationTemplateResponse> => {
    const response = await api.post('/notifications/templates', data);
    return response.data;
  },

  deleteTemplate: async (id: string): Promise<void> => {
    await api.delete(`/notifications/templates/${id}`);
  },

  listLogs: async (page: number, perPage: number, status?: string): Promise<NotificationLogListResponse> => {
    const params = new URLSearchParams();
    params.append('page', page.toString());
    params.append('per_page', perPage.toString());
    if (status) {
      params.append('status', status);
    }
    const response = await api.get(`/notifications/logs?${params.toString()}`);
    return response.data;
  },

  triggerBroadcast: async (data: BroadcastRequest): Promise<{ success: boolean; message: string }> => {
    const response = await api.post('/notifications/broadcast', data);
    return response.data;
  },
};
