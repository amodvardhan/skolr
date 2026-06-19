import { create } from 'zustand';
import { useTenantStore } from './tenantStore';

interface UserProfile {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
}

interface AuthState {
  token: string | null;
  role: string | null;
  schoolId: string | null;
  user: UserProfile | null;
  isAuthenticated: boolean;
  setAuth: (
    token: string, 
    role: string, 
    schoolId: string | null, 
    schoolName: string | null, 
    schoolSubdomain: string | null,
    user: UserProfile
  ) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  token: localStorage.getItem('skolr_token'),
  role: localStorage.getItem('skolr_role'),
  schoolId: localStorage.getItem('skolr_school_id'),
  user: localStorage.getItem('skolr_user') 
    ? JSON.parse(localStorage.getItem('skolr_user') as string) 
    : null,
  isAuthenticated: !!localStorage.getItem('skolr_token'),

  setAuth: (token, role, schoolId, schoolName, schoolSubdomain, user) => {
    localStorage.setItem('skolr_token', token);
    localStorage.setItem('skolr_role', role);
    if (schoolId) {
      localStorage.setItem('skolr_school_id', schoolId);
    }
    if (schoolName) {
      localStorage.setItem('skolr_school_name', schoolName);
    }
    if (schoolSubdomain) {
      localStorage.setItem('skolr_subdomain', schoolSubdomain);
    }
    localStorage.setItem('skolr_user', JSON.stringify(user));
    
    // Sync with Tenant Store immediately
    useTenantStore.setState({ schoolId, schoolName, subdomain: schoolSubdomain });
    
    set({ 
      token, 
      role, 
      schoolId: schoolId || localStorage.getItem('skolr_school_id'), 
      user,
      isAuthenticated: true
    });
  },

  logout: () => {
    localStorage.removeItem('skolr_token');
    localStorage.removeItem('skolr_role');
    localStorage.removeItem('skolr_user');
    
    set({ 
      token: null, 
      role: null, 
      user: null,
      isAuthenticated: false
    });
  },
}));
