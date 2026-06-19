import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  ArrowLeft, 
  User, 
  Mail, 
  Phone, 
  Calendar, 
  Briefcase, 
  ShieldCheck, 
  Lock, 
  Loader2,
  CheckCircle,
  AlertCircle
} from 'lucide-react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';

import { employeesApi, LinkUserData } from '../api/employeesApi';
import { CustomSelect } from '../../../components/CustomSelect';

const linkUserSchema = z.object({
  email: z.string().email("Enter a valid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  role: z.enum(['teacher', 'accountant', 'school_admin'], { errorMap: () => ({ message: "Select system role" }) }),
});

interface EmployeeDetailPageProps {
  employeeId: string;
  onBack: () => void;
}

export function EmployeeDetailPage({ employeeId, onBack }: EmployeeDetailPageProps) {
  const queryClient = useQueryClient();
  const [linkError, setLinkError] = useState<string | null>(null);

  // Query employee details from API
  const { data: employeeRes, isLoading, error } = useQuery({
    queryKey: ['employee-detail', employeeId],
    queryFn: () => employeesApi.get(employeeId),
    enabled: !!employeeId,
  });

  const employee = employeeRes?.data;

  // React Hook Form for linking system user
  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
    setValue
  } = useForm<LinkUserData>({
    resolver: zodResolver(linkUserSchema),
    defaultValues: {
      email: employee?.email || '',
      password: '',
      role: 'teacher'
    }
  });

  // Prefill email once employee details are loaded
  useState(() => {
    if (employee?.email) {
      setValue('email', employee.email);
    }
  });

  const linkMutation = useMutation({
    mutationFn: async (values: LinkUserData) => {
      return await employeesApi.linkUser(employeeId, values);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employee-detail', employeeId] });
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      alert('System credentials successfully mapped to staff profile!');
      setLinkError(null);
    },
    onError: (err: any) => {
      console.error(err);
      setLinkError(err.response?.data?.detail || 'Failed to create and map user credentials.');
    }
  });

  const handleLinkUser = (values: LinkUserData) => {
    setLinkError(null);
    linkMutation.mutate(values);
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 space-y-3">
        <Loader2 className="h-10 w-10 text-primary animate-spin" />
        <span className="text-sm text-neutral-500 font-medium">Loading staff profile...</span>
      </div>
    );
  }

  if (error || !employee) {
    return (
      <div className="card text-center py-20 max-w-xl mx-auto space-y-4">
        <div className="h-14 w-14 bg-red-100 text-red-650 rounded-full flex items-center justify-center mx-auto">
          <AlertCircle className="h-8 w-8" />
        </div>
        <h3 className="text-xl font-bold text-neutral-800">Error Loading Profile</h3>
        <p className="text-sm text-neutral-550 max-w-md mx-auto">
          We could not resolve this employee credentials. Make sure the record has not been deleted or deactivated.
        </p>
        <button onClick={onBack} className="btn-secondary">Back to Directory</button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center gap-4 border-b border-neutral-250 pb-4">
        <button
          onClick={onBack}
          className="btn-secondary p-2 rounded-lg"
          title="Back"
        >
          <ArrowLeft className="h-4.5 w-4.5 text-neutral-600" />
        </button>
        <div>
          <h2 className="text-2xl font-bold font-display text-neutral-900">{employee.first_name} {employee.last_name}</h2>
          <p className="text-sm text-neutral-500 font-mono">Employee Code: {employee.employee_code}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Profile Card and contract info */}
        <div className="lg:col-span-2 space-y-6">
          {/* Profile Card */}
          <div className="card space-y-6">
            <h3 className="section-title border-b border-neutral-100 pb-2 flex items-center gap-2">
              <User className="h-5 w-5 text-primary" /> Profile Credentials
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm">
              <div className="flex items-start gap-3">
                <Mail className="h-4.5 w-4.5 text-neutral-400 shrink-0 mt-0.5" />
                <div>
                  <span className="text-xs text-neutral-450 uppercase font-semibold block">Email Address</span>
                  <span className="font-semibold text-neutral-800">{employee.email}</span>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Phone className="h-4.5 w-4.5 text-neutral-400 shrink-0 mt-0.5" />
                <div>
                  <span className="text-xs text-neutral-450 uppercase font-semibold block">Mobile Contact</span>
                  <span className="font-semibold text-neutral-800 font-mono">{employee.mobile}</span>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Calendar className="h-4.5 w-4.5 text-neutral-400 shrink-0 mt-0.5" />
                <div>
                  <span className="text-xs text-neutral-450 uppercase font-semibold block">Date of Joining</span>
                  <span className="font-semibold text-neutral-800">{new Date(employee.date_of_joining).toLocaleDateString()}</span>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Briefcase className="h-4.5 w-4.5 text-neutral-400 shrink-0 mt-0.5" />
                <div>
                  <span className="text-xs text-neutral-450 uppercase font-semibold block">Employment Contract</span>
                  <span className="font-semibold text-neutral-800 capitalize">{employee.employment_type}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Department & designation details */}
          <div className="card space-y-4">
            <h3 className="section-title border-b border-neutral-100 pb-2">Academic & Org Context</h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-xs text-neutral-450 block font-semibold">Department</span>
                <span className="text-neutral-850 font-bold mt-0.5 block">{employee.department}</span>
              </div>
              <div>
                <span className="text-xs text-neutral-450 block font-semibold">Official Designation</span>
                <span className="text-neutral-850 font-bold mt-0.5 block">{employee.designation}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right 1 Col: User Mapping Panel */}
        <div className="space-y-6">
          {/* Mapping status */}
          <div className="card space-y-4">
            <h3 className="text-md font-bold text-neutral-850 flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-amber-500" />
              Credentials Map
            </h3>

            {employee.user_id ? (
              // Linked details card
              <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 space-y-3 text-emerald-800">
                <div className="flex items-start gap-2.5">
                  <CheckCircle className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-bold text-sm">Mapped System Account</h4>
                    <p className="text-xs text-emerald-700 mt-1">
                      This staff member is linked to active portal credentials. They can sign in using:
                    </p>
                  </div>
                </div>
                
                <div className="pt-2 border-t border-emerald-200/50 text-xs font-mono space-y-1 text-emerald-900">
                  <div>Email: <strong>{employee.email}</strong></div>
                  <div>ID Mapping: <span className="text-[10px] break-all block">{employee.user_id}</span></div>
                </div>
              </div>
            ) : (
              // Form to Link Credentials
              <div className="space-y-4">
                <div className="bg-amber-50 border border-amber-250 text-amber-900 p-4 rounded-xl text-xs space-y-1">
                  <h4 className="font-bold">Unlinked Staff Record</h4>
                  <p className="text-amber-800">
                    This staff profile is not linked to any portal user login credentials. Create credentials below to grant system access.
                  </p>
                </div>

                {linkError && (
                  <div className="bg-red-50 border border-red-200 text-red-700 p-3 rounded-lg flex items-start gap-2.5 text-xs">
                    <AlertCircle className="h-4.5 w-4.5 text-red-500 shrink-0 mt-0.5" />
                    <span>{linkError}</span>
                  </div>
                )}

                <form onSubmit={handleSubmit(handleLinkUser)} className="space-y-3">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold uppercase text-neutral-500">Sign-in Email</label>
                    <input 
                      type="email" 
                      {...register('email')}
                      className="input-field py-1.5 text-xs" 
                      required 
                    />
                    {errors.email && (
                      <p className="text-red-500 text-xs">{errors.email.message}</p>
                    )}
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold uppercase text-neutral-500">Temporary Password</label>
                    <div className="relative">
                      <input 
                        type="password" 
                        {...register('password')}
                        placeholder="Min 6 characters"
                        className="input-field py-1.5 text-xs pl-8" 
                        required 
                      />
                      <Lock className="h-3.5 w-3.5 text-neutral-450 absolute left-2.5 top-2.5" />
                    </div>
                    {errors.password && (
                      <p className="text-red-500 text-xs">{errors.password.message}</p>
                    )}
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold uppercase text-neutral-500">System Access Role</label>
                    <Controller
                      control={control}
                      name="role"
                      render={({ field }) => (
                        <CustomSelect
                          value={field.value}
                          onChange={field.onChange}
                          options={[
                            { value: 'teacher', label: 'Teacher / Faculty' },
                            { value: 'accountant', label: 'Accountant / Finance' },
                            { value: 'school_admin', label: 'School Admin / Principal' }
                          ]}
                        />
                      )}
                    />
                    {errors.role && (
                      <p className="text-red-500 text-xs">{errors.role.message}</p>
                    )}
                  </div>

                  <button 
                    type="submit"
                    disabled={linkMutation.isPending}
                    className="w-full btn-primary text-xs py-2 flex items-center justify-center gap-1.5 mt-2"
                  >
                    {linkMutation.isPending ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Lock className="h-3.5 w-3.5" />
                    )}
                    Generate Portal Account
                  </button>
                </form>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
