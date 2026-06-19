import { create } from 'zustand';
import axios from 'axios';

interface TenantState {
  schoolId: string | null;
  schoolName: string | null;
  subdomain: string | null;
  loading: boolean;
  error: string | null;
  resolveTenant: () => Promise<string | null>;
}

export const useTenantStore = create<TenantState>((set) => ({
  schoolId: localStorage.getItem('skolr_school_id'),
  schoolName: localStorage.getItem('skolr_school_name'),
  subdomain: localStorage.getItem('skolr_subdomain'),
  loading: false,
  error: null,
  resolveTenant: async () => {
    const token = localStorage.getItem('skolr_token');
    const savedId = localStorage.getItem('skolr_school_id');
    const savedName = localStorage.getItem('skolr_school_name');
    const savedSubdomain = localStorage.getItem('skolr_subdomain');
    
    // Only respect saved school details if there is an active logged-in session
    if (token && savedId && savedName) {
      set({ 
        schoolId: savedId, 
        schoolName: savedName, 
        subdomain: savedSubdomain, 
        loading: false 
      });
      return savedId;
    }

    // Resolve subdomain dynamically from window location
    const host = window.location.hostname;
    const parts = host.split('.');
    let subdomain = 'default';
    
    if (host.endsWith('localhost')) {
      if (parts.length > 1 && parts[0] !== 'localhost') {
        subdomain = parts[0];
      }
    } else if (parts.length > 2 && parts[0] !== 'www') {
      subdomain = parts[0];
    }
    
    set({ loading: true, error: null });
    try {
      const baseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api/v1';
      const response = await axios.get(`${baseUrl}/tenants/resolve`, {
        params: { subdomain }
      });
      
      const { id, name, subdomain: resolvedSubdomain } = response.data.data;
      localStorage.setItem('skolr_school_id', id);
      localStorage.setItem('skolr_school_name', name);
      localStorage.setItem('skolr_subdomain', resolvedSubdomain);
      
      set({ 
        schoolId: id, 
        schoolName: name, 
        subdomain: resolvedSubdomain,
        loading: false 
      });
      return id;
    } catch (err: any) {
      console.error(err);
      const errorMsg = err.response?.data?.detail || 'Failed to resolve school tenant';
      
      // Clear school ID and details from local storage and store if resolution fails
      localStorage.removeItem('skolr_school_id');
      localStorage.removeItem('skolr_school_name');
      localStorage.removeItem('skolr_subdomain');
      
      set({ 
        schoolId: null, 
        schoolName: null, 
        subdomain: null,
        error: errorMsg, 
        loading: false 
      });
      return null;
    }
  }
}));
