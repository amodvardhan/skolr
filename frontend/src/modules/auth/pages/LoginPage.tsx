import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import axios from 'axios';
import { GraduationCap, Lock, Mail, AlertCircle, ArrowRight } from 'lucide-react';

import { useAuthStore } from '../../../stores/authStore';
import { useTenantStore } from '../../../stores/tenantStore';
import { api } from '../../../lib/api';

const loginSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

type LoginFormData = z.infer<typeof loginSchema>;

export function LoginPage({ onGoToOnboard }: { onGoToOnboard: () => void }) {
  const setAuth = useAuthStore((state) => state.setAuth);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  const handleFillDemoAdmin = () => {
    setValue('email', 'admin@default.skolr.in');
    setValue('password', 'admin123');
  };

  const handleFillDemoTeacher = () => {
    setValue('email', 'teacher@default.skolr.in');
    setValue('password', 'admin123');
  };

  const onSubmit = async (data: LoginFormData) => {
    const schoolId = useTenantStore.getState().schoolId;
    if (!schoolId) {
      setError('Active school portal could not be resolved.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const response = await api.post('/auth/login', data, {
        headers: {
          'X-School-ID': schoolId,
        },
      });

      const { 
        access_token, 
        role, 
        school_id: serverSchoolId, 
        school_name: serverSchoolName,
        school_subdomain: serverSchoolSubdomain
      } = response.data.data;
      
      // Fetch user profile info
      const meResponse = await api.get('/auth/me', {
        headers: {
          Authorization: `Bearer ${access_token}`,
          'X-School-ID': schoolId,
        },
      });

      const userProfile = meResponse.data.data;
      
      setAuth(
        access_token,
        role,
        serverSchoolId || schoolId,
        serverSchoolName || userProfile.school_name || 'Prestige Public School',
        serverSchoolSubdomain || userProfile.school_subdomain || null,
        {
          id: userProfile.id,
          email: userProfile.email,
          firstName: userProfile.first_name,
          lastName: userProfile.last_name,
          role: userProfile.role,
        }
      );
    } catch (err: any) {
      console.error(err);
      if (axios.isAxiosError(err) && err.response) {
        setError(err.response.data?.detail || 'Invalid email or password');
      } else {
        setError('Network error. Is backend server running?');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-slate-900 text-slate-100 font-sans">
      {/* Left Column: Visual Brand Intro */}
      <div className="hidden md:flex md:w-1/2 bg-gradient-to-tr from-blue-900 via-indigo-950 to-slate-900 flex-col justify-between p-12 relative overflow-hidden">
        {/* Subtle decorative circles */}
        <div className="absolute top-0 left-0 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl -translate-x-12 -translate-y-12"></div>
        <div className="absolute bottom-0 right-0 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl translate-x-12 translate-y-12"></div>

        <div className="flex items-center gap-2 relative z-10">
          <GraduationCap className="h-8 w-8 text-amber-500" />
          <span className="font-display font-extrabold text-2xl tracking-tight text-white">
            SKOLR
          </span>
        </div>

        <div className="my-auto space-y-6 relative z-10 max-w-lg">
          <h1 className="text-4xl lg:text-5xl font-extrabold font-display leading-tight text-white">
            The complete operating system for Indian schools.
          </h1>
          <p className="text-slate-350 text-lg leading-relaxed">
            Manage student records, fee collections, daily attendance, and publish a premium school website effortlessly.
          </p>
        </div>

        <div className="text-slate-400 text-sm relative z-10">
          © 2026 Skolr SaaS Platform. All rights reserved.
        </div>
      </div>

      {/* Right Column: Login Form */}
      <div className="flex-1 flex items-center justify-center p-8 bg-slate-950">
        <div className="w-full max-w-md space-y-8">
          <div className="space-y-2 text-center md:text-left">
            {/* Logo for mobile */}
            <div className="flex items-center justify-center md:hidden gap-2 mb-4">
              <GraduationCap className="h-8 w-8 text-amber-500" />
              <span className="font-display font-extrabold text-2xl tracking-tight text-white">SKOLR</span>
            </div>
            <h2 className="text-3xl font-bold font-display text-white">Portal Sign In</h2>
            <p className="text-slate-400 text-sm">
              Enter credentials assigned by your school administrator.
            </p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            {error && (
              <div className="bg-red-950/50 border border-red-500/30 text-red-200 px-4 py-3 rounded-lg flex items-start gap-3 text-sm">
                <AlertCircle className="h-5 w-5 text-red-400 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            <div className="space-y-4">
              {/* Email */}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                  <input
                    type="email"
                    placeholder="name@school.com"
                    {...register('email')}
                    className="w-full bg-slate-900 border border-slate-700/60 rounded-lg pl-10 pr-4 py-2.5 text-sm text-slate-200 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition duration-200"
                  />
                </div>
                {errors.email && (
                  <p className="text-red-400 text-xs mt-1">{errors.email.message}</p>
                )}
              </div>

              {/* Password */}
              <div className="space-y-1">
                <div className="flex justify-between items-center">
                  <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
                    Password
                  </label>
                </div>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                  <input
                    type="password"
                    placeholder="••••••••"
                    {...register('password')}
                    className="w-full bg-slate-900 border border-slate-700/60 rounded-lg pl-10 pr-4 py-2.5 text-sm text-slate-200 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition duration-200"
                  />
                </div>
                {errors.password && (
                  <p className="text-red-400 text-xs mt-1">{errors.password.message}</p>
                )}
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-amber-500 hover:bg-amber-600 active:bg-amber-700 text-slate-950 font-bold py-3 px-4 rounded-lg flex items-center justify-center gap-2 transition duration-200 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <span className="border-2 border-slate-950 border-t-transparent w-5 h-5 rounded-full animate-spin"></span>
              ) : (
                <>
                  <span>Sign In</span>
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </button>

            <div className="text-center text-sm pt-2">
              <span className="text-slate-450">Want to register a new school? </span>
              <button
                type="button"
                onClick={onGoToOnboard}
                className="text-amber-500 font-bold hover:underline hover:text-amber-400 transition ml-1"
              >
                Onboard here
              </button>
            </div>
          </form>

          {/* Quick Seeding Help */}
          <div className="bg-slate-900/60 border border-slate-850 rounded-2xl p-4 space-y-3">
            <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Quick Dev Access
            </div>
            <p className="text-[11px] text-slate-450 leading-relaxed">
              Instantly seed forms with the pre-configured mock credentials to verify role behaviors:
            </p>
            <div className="flex flex-col gap-2">
              <button
                type="button"
                onClick={handleFillDemoAdmin}
                className="w-full bg-slate-950 hover:bg-slate-900 border border-slate-800 text-xs text-amber-500 hover:text-amber-400 font-semibold py-2 px-3 rounded-lg text-left transition flex justify-between items-center"
              >
                <span>Fill School Admin Account</span>
                <span className="text-[10px] text-slate-500 font-normal">admin@default.skolr.in</span>
              </button>
              <button
                type="button"
                onClick={handleFillDemoTeacher}
                className="w-full bg-slate-950 hover:bg-slate-900 border border-slate-800 text-xs text-amber-500 hover:text-amber-400 font-semibold py-2 px-3 rounded-lg text-left transition flex justify-between items-center"
              >
                <span>Fill Class Teacher Account</span>
                <span className="text-[10px] text-slate-500 font-normal">teacher@default.skolr.in</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
