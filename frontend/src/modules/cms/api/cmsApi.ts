import { api } from '../../../lib/api';

export interface CMSSite {
  id: string;
  template_id: string;
  color_scheme: string;
  is_published: boolean;
  published_at?: string;
  settings: {
    admissions_open?: boolean;
    phone?: string;
    email?: string;
    address?: string;
    facebook_url?: string;
    instagram_url?: string;
    name?: string;
    [key: string]: any;
  };
}

export interface CMSPage {
  id: string;
  slug: string;
  title: string;
  sections: any[];
  is_published: boolean;
  seo_title?: string;
  seo_description?: string;
  created_at?: string;
  updated_at?: string;
}

export interface CMSSiteResponse {
  success: boolean;
  data: CMSSite;
  message: string;
}

export interface CMSPageResponse {
  success: boolean;
  data: CMSPage;
  message: string;
}

export interface CMSPageListResponse {
  success: boolean;
  data: CMSPage[];
  message: string;
}

export interface PublishResponse {
  success: boolean;
  data: {
    success: boolean;
    url: string;
    published_at: string;
  };
  message: string;
}

export interface CMSInquiry {
  id: string;
  name: string;
  email: string;
  message: string;
  status: 'new' | 'contacted' | 'visit_scheduled' | 'applied' | 'admitted' | 'archived' | 'read' | 'resolved';
  phone?: string;
  student_name?: string;
  student_dob?: string;
  target_class_id?: string;
  follow_up_notes: Array<{
    id: string;
    note: string;
    author: string;
    created_at: string;
  }>;
  target_class_name?: string;
  created_at: string;
  updated_at?: string;
}

export interface CMSInquiryResponse {
  success: boolean;
  data: CMSInquiry;
  message: string;
}

export interface CMSInquiryListResponse {
  success: boolean;
  data: CMSInquiry[];
  message: string;
}

export const cmsApi = {
  getSite: async (): Promise<CMSSiteResponse> => {
    const response = await api.get('/cms/site');
    return response.data;
  },

  updateSite: async (data: Partial<CMSSite>): Promise<CMSSiteResponse> => {
    const response = await api.put('/cms/site', data);
    return response.data;
  },

  getPages: async (): Promise<CMSPageListResponse> => {
    const response = await api.get('/cms/pages');
    return response.data;
  },

  getPageDetails: async (pageId: string): Promise<CMSPageResponse> => {
    const response = await api.get(`/cms/pages/${pageId}`);
    return response.data;
  },

  createPage: async (data: Partial<CMSPage>): Promise<CMSPageResponse> => {
    const response = await api.post('/cms/pages', data);
    return response.data;
  },

  updatePage: async (pageId: string, data: Partial<CMSPage>): Promise<CMSPageResponse> => {
    const response = await api.patch(`/cms/pages/${pageId}`, data);
    return response.data;
  },

  deletePage: async (pageId: string): Promise<void> => {
    await api.delete(`/cms/pages/${pageId}`);
  },

  publishSite: async (): Promise<PublishResponse> => {
    const response = await api.post('/cms/publish');
    return response.data;
  },

  uploadImage: async (file: File): Promise<{ success: boolean; url: string }> => {
    const formData = new FormData();
    formData.append('file', file);
    const response = await api.post('/cms/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });
    return response.data;
  },

  getInquiries: async (): Promise<CMSInquiryListResponse> => {
    const response = await api.get('/cms/inquiries');
    return response.data;
  },

  updateInquiryStatus: async (inquiryId: string, status: string): Promise<CMSInquiryResponse> => {
    const response = await api.patch(`/cms/inquiries/${inquiryId}/status?status_val=${status}`);
    return response.data;
  },

  addInquiryNote: async (inquiryId: string, data: { note: string; author: string }): Promise<CMSInquiryResponse> => {
    const response = await api.post(`/cms/inquiries/${inquiryId}/notes`, data);
    return response.data;
  },

  convertInquiryToAdmission: async (inquiryId: string): Promise<{ success: boolean; data: any; message: string }> => {
    const response = await api.post(`/cms/inquiries/${inquiryId}/admit`);
    return response.data;
  },

  getUploadedFiles: async (): Promise<UploadedFilesResponse> => {
    const response = await api.get('/cms/uploads');
    return response.data;
  }
};

export interface UploadedFile {
  name: string;
  url: string;
  size: number;
  type: 'image' | 'document';
  uploaded_at: string;
}

export interface UploadedFilesResponse {
  success: boolean;
  data: UploadedFile[];
}
