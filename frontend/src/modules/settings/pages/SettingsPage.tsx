import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import axios from 'axios';
import { 
  Building2, 
  Plus, 
  Check, 
  AlertCircle, 
  Loader2, 
  Layers, 
  ShieldCheck,
  Crown
} from 'lucide-react';
import { api } from '../../../lib/api';
import { useAuthStore } from '../../../stores/authStore';
import { useTenantStore } from '../../../stores/tenantStore';

const classSchema = z.object({
  name: z.string().min(1, 'Class name is required (e.g. Class 6)'),
  section: z.string().min(1, 'Section name is required (e.g. B)'),
  academic_year_id: z.string().min(1, 'Academic year is required'),
});

type ClassFormData = z.infer<typeof classSchema>;

interface ClassItem {
  id: string;
  name: string;
  section: string;
}

interface AcademicYearItem {
  id: string;
  name: string;
  is_current: boolean;
}

export function SettingsPage() {
  const user = useAuthStore((state) => state.user);
  const schoolId = useAuthStore((state) => state.schoolId);
  const schoolName = useTenantStore((state) => state.schoolName);
  const subdomain = useTenantStore((state) => state.subdomain);
  const queryClient = useQueryClient();
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Restrict to school_admin
  if (user?.role !== 'school_admin') {
    return (
      <div className="card text-center py-20 bg-white border border-red-200 rounded-2xl max-w-xl mx-auto space-y-4">
        <div className="h-14 w-14 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto">
          <AlertCircle className="h-8 w-8" />
        </div>
        <h3 className="text-xl font-bold text-neutral-800">Access Denied</h3>
        <p className="text-sm text-neutral-500 max-w-md mx-auto px-4">
          The School Settings and Academics Master Config modules are strictly restricted to institutional administrators.
        </p>
      </div>
    );
  }

  // Queries
  const { data: years, isLoading: loadingYears } = useQuery<AcademicYearItem[]>({
    queryKey: ['academic-years'],
    queryFn: async () => {
      const res = await api.get('/students/academic-years');
      return res.data;
    },
  });

  const { data: classes, isLoading: loadingClasses } = useQuery<ClassItem[]>({
    queryKey: ['classes-list'],
    queryFn: async () => {
      const res = await api.get('/students/classes');
      return res.data;
    },
  });

  // Form
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ClassFormData>({
    resolver: zodResolver(classSchema),
    defaultValues: {
      name: '',
      section: '',
      academic_year_id: '',
    },
  });

  // Mutation to create class
  const createClassMutation = useMutation({
    mutationFn: async (data: ClassFormData) => {
      const res = await api.post('/students/classes', data);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['classes-list'] });
      setSuccessMsg('New class and section added to master roster.');
      setErrorMsg(null);
      reset({
        name: '',
        section: '',
        academic_year_id: years?.find((y) => y.is_current)?.id || '',
      });
      setTimeout(() => setSuccessMsg(null), 4000);
    },
    onError: (err: any) => {
      if (axios.isAxiosError(err) && err.response) {
        setErrorMsg(err.response.data?.detail || 'Failed to create class record.');
      } else {
        setErrorMsg('Network error while processing class registration.');
      }
    },
  });

  const onSubmit = (data: ClassFormData) => {
    setErrorMsg(null);
    setSuccessMsg(null);
    createClassMutation.mutate(data);
  };

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-neutral-200 pb-5">
        <div>
          <h1 className="text-2xl font-extrabold text-neutral-900 tracking-tight flex items-center gap-2">
            <Building2 className="h-6 w-6 text-primary" />
            School Settings
          </h1>
          <p className="text-sm text-neutral-500">
            Manage your school instance credentials, plan specifications, and academic master lists.
          </p>
        </div>
        <div className="flex items-center gap-2 bg-amber-500/10 text-amber-700 font-semibold px-3 py-1.5 rounded-full text-xs border border-amber-500/20 shadow-sm shrink-0 self-start md:self-auto">
          <Crown className="h-4 w-4" />
          <span>Administrator Access Panel</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: School Context & Plan Profile */}
        <div className="lg:col-span-1 space-y-6">
          <div className="card space-y-5">
            <h3 className="font-display font-extrabold text-lg text-neutral-900 border-b border-neutral-100 pb-2 flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-emerald-600" />
              Instance Identity
            </h3>

            <div className="space-y-4">
              <div>
                <span className="text-xs font-semibold text-neutral-400 uppercase tracking-wider block">
                  Registered Name
                </span>
                <span className="text-sm font-bold text-neutral-800">
                  {schoolName || 'Prestige Public School'}
                </span>
              </div>

              <div>
                <span className="text-xs font-semibold text-neutral-400 uppercase tracking-wider block">
                  Dedicated Subdomain
                </span>
                <span className="text-sm font-mono font-bold text-primary">
                  {subdomain ? `${subdomain}.skolr.in` : 'default.skolr.in'}
                </span>
              </div>

              <div>
                <span className="text-xs font-semibold text-neutral-400 uppercase tracking-wider block">
                  Tenant Registry UUID
                </span>
                <span className="text-xs font-mono text-neutral-600 break-all select-all">
                  {schoolId}
                </span>
              </div>

              <div className="pt-4 border-t border-neutral-100">
                <span className="text-xs font-semibold text-neutral-400 uppercase tracking-wider block mb-1">
                  Active Subscription Tier
                </span>
                <div className="inline-flex items-center gap-1.5 bg-gradient-to-r from-indigo-50 to-blue-50 text-primary font-bold px-3 py-1.5 rounded-lg text-xs border border-blue-100">
                  <Crown className="h-3.5 w-3.5 text-amber-500" />
                  Pro Tier Package
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right 2 Columns: Master Class Configuration */}
        <div className="lg:col-span-2 space-y-6">
          <div className="card space-y-6">
            <div>
              <h3 className="font-display font-extrabold text-lg text-neutral-900 flex items-center gap-2">
                <Layers className="h-5 w-5 text-amber-500" />
                Academics Configurator
              </h3>
              <p className="text-xs text-neutral-500">
                Define master structures (classes and sections) used to register students and track performance.
              </p>
            </div>

            {/* Error or Success Alert */}
            {successMsg && (
              <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 px-4 py-3 rounded-xl flex items-start gap-2.5 text-sm animate-fadeIn">
                <Check className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" />
                <span>{successMsg}</span>
              </div>
            )}
            {errorMsg && (
              <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-xl flex items-start gap-2.5 text-sm animate-fadeIn">
                <AlertCircle className="h-5 w-5 text-red-600 shrink-0 mt-0.5" />
                <span>{errorMsg}</span>
              </div>
            )}

            {/* Create Class Form */}
            <form onSubmit={handleSubmit(onSubmit)} className="bg-neutral-50 p-4 rounded-xl border border-neutral-200/60 space-y-4">
              <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-600">Create New Class & Section</h4>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Academic Year Selection */}
                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-neutral-500 uppercase tracking-wide">
                    Academic Year
                  </label>
                  {loadingYears ? (
                    <div className="h-10 bg-neutral-200 animate-pulse rounded-lg"></div>
                  ) : (
                    <select
                      {...register('academic_year_id')}
                      className="w-full bg-white border border-neutral-300 rounded-lg px-3 py-2 text-sm text-neutral-800 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition"
                    >
                      <option value="">Select Year...</option>
                      {years?.map((y) => (
                        <option key={y.id} value={y.id}>
                          {y.name} {y.is_current ? '(Current)' : ''}
                        </option>
                      ))}
                    </select>
                  )}
                  {errors.academic_year_id && (
                    <p className="text-red-600 text-xs mt-0.5">{errors.academic_year_id.message}</p>
                  )}
                </div>

                {/* Class Name */}
                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-neutral-500 uppercase tracking-wide">
                    Class Name
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Class 6"
                    {...register('name')}
                    className="w-full bg-white border border-neutral-300 rounded-lg px-3 py-2 text-sm text-neutral-800 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition"
                  />
                  {errors.name && (
                    <p className="text-red-600 text-xs mt-0.5">{errors.name.message}</p>
                  )}
                </div>

                {/* Section Name */}
                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-neutral-500 uppercase tracking-wide">
                    Section Prefix
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. B"
                    {...register('section')}
                    className="w-full bg-white border border-neutral-300 rounded-lg px-3 py-2 text-sm text-neutral-800 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition"
                  />
                  {errors.section && (
                    <p className="text-red-600 text-xs mt-0.5">{errors.section.message}</p>
                  )}
                </div>
              </div>

              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={createClassMutation.isPending}
                  className="bg-primary hover:bg-blue-700 active:bg-blue-800 text-white font-bold py-2 px-4 rounded-lg flex items-center gap-1.5 text-xs transition shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {createClassMutation.isPending ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Plus className="h-3.5 w-3.5" />
                  )}
                  <span>Create Class</span>
                </button>
              </div>
            </form>

            {/* List of Classes */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-600">Active Roster Classes ({classes?.length ?? 0})</h4>
              
              {loadingClasses ? (
                <div className="space-y-2">
                  <div className="h-10 bg-neutral-100 animate-pulse rounded-lg"></div>
                  <div className="h-10 bg-neutral-100 animate-pulse rounded-lg"></div>
                </div>
              ) : classes && classes.length > 0 ? (
                <div className="overflow-x-auto border border-neutral-200 rounded-xl">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-neutral-50 text-neutral-600 text-xs font-bold border-b border-neutral-200">
                        <th className="p-3">Class Name</th>
                        <th className="p-3">Section</th>
                        <th className="p-3">Identifier UUID</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-150 text-sm text-neutral-800">
                      {classes.map((c) => (
                        <tr key={c.id} className="hover:bg-neutral-50/55 transition">
                          <td className="p-3 font-semibold text-neutral-900">{c.name}</td>
                          <td className="p-3">
                            <span className="bg-neutral-100 text-neutral-700 font-semibold px-2.5 py-0.5 rounded-full text-xs border border-neutral-250">
                              Section {c.section}
                            </span>
                          </td>
                          <td className="p-3 font-mono text-xs text-neutral-500">{c.id}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center py-6 text-neutral-400 text-xs font-medium border border-dashed border-neutral-250 rounded-xl">
                  No classes pre-registered for current academic term.
                </div>
              )}
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}
