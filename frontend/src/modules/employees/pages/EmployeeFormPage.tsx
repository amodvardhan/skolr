import { useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Save, AlertCircle, Sparkles, Loader2 } from 'lucide-react';

import { employeesApi, EmployeeCreateData } from '../api/employeesApi';
import { CustomSelect } from '../../../components/CustomSelect';

const employeeSchema = z.object({
  employee_code: z.string().min(2, "Code is too short (min 2 chars)").max(20),
  first_name: z.string().min(2, "First name is too short"),
  last_name: z.string().min(2, "Last name is too short"),
  designation: z.string().min(1, "Designation is required"),
  department: z.string().min(1, "Department is required"),
  date_of_joining: z.string().min(1, "Date of joining is required"),
  employment_type: z.enum(['permanent', 'contract'], { errorMap: () => ({ message: "Select employment type" }) }),
  mobile: z.string().regex(/^\+?[0-9]{10,15}$/, "Enter a valid mobile number (10-15 digits)"),
  email: z.string().email("Enter a valid email address"),
});

type EmployeeFormValues = z.infer<typeof employeeSchema>;

interface EmployeeFormPageProps {
  onCancel: () => void;
  onSuccess: () => void;
}

export function EmployeeFormPage({ onCancel, onSuccess }: EmployeeFormPageProps) {
  const queryClient = useQueryClient();
  const [submitError, setSubmitError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
  } = useForm<EmployeeFormValues>({
    resolver: zodResolver(employeeSchema),
    defaultValues: {
      employee_code: '',
      first_name: '',
      last_name: '',
      designation: 'Teacher',
      department: 'Academics',
      date_of_joining: new Date().toISOString().split('T')[0],
      employment_type: 'permanent',
      mobile: '',
      email: '',
    }
  });

  // Mutator to onboard employee
  const onboardMutation = useMutation({
    mutationFn: async (values: EmployeeFormValues) => {
      const payload: EmployeeCreateData = {
        employee_code: values.employee_code.trim(),
        first_name: values.first_name.trim(),
        last_name: values.last_name.trim(),
        designation: values.designation.trim(),
        department: values.department.trim(),
        date_of_joining: values.date_of_joining,
        employment_type: values.employment_type,
        mobile: values.mobile.trim(),
        email: values.email.trim(),
      };
      return await employeesApi.create(payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      alert('Employee onboarded successfully!');
      onSuccess();
    },
    onError: (err: any) => {
      console.error(err);
      const detail = err.response?.data?.detail;
      if (typeof detail === 'string') {
        setSubmitError(detail);
      } else {
        setSubmitError('Failed to onboard employee record. Make sure Code and Email are unique.');
      }
    }
  });

  const onSubmit = (values: EmployeeFormValues) => {
    setSubmitError(null);
    onboardMutation.mutate(values);
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center gap-4 border-b border-neutral-250 pb-4">
        <button
          onClick={onCancel}
          className="btn-secondary p-2 rounded-lg"
          title="Back"
        >
          <ArrowLeft className="h-4.5 w-4.5 text-neutral-600" />
        </button>
        <div>
          <h2 className="text-2xl font-bold font-display text-neutral-900">Onboard Employee</h2>
          <p className="text-sm text-neutral-500 font-sans">Register new staff/teachers to the dynamic school roster.</p>
        </div>
      </div>

      {submitError && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-start gap-3 text-sm animate-fadeIn">
          <AlertCircle className="h-5 w-5 text-red-500 shrink-0 mt-0.5" />
          <span>{submitError}</span>
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Profile Details */}
        <div className="card space-y-6">
          <h3 className="section-title border-b border-neutral-100 pb-2 flex items-center gap-1.5">
            <Sparkles className="h-4 w-4 text-primary" />
            1. Staff Information
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-neutral-500 uppercase tracking-wider">
                Employee Code <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                {...register('employee_code')}
                placeholder="e.g. EMP002"
                className="input-field"
              />
              {errors.employee_code && (
                <p className="text-red-500 text-xs mt-1">{errors.employee_code.message}</p>
              )}
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-neutral-500 uppercase tracking-wider">
                First Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                {...register('first_name')}
                placeholder="Enter first name"
                className="input-field"
              />
              {errors.first_name && (
                <p className="text-red-500 text-xs mt-1">{errors.first_name.message}</p>
              )}
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-neutral-500 uppercase tracking-wider">
                Last Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                {...register('last_name')}
                placeholder="Enter last name"
                className="input-field"
              />
              {errors.last_name && (
                <p className="text-red-500 text-xs mt-1">{errors.last_name.message}</p>
              )}
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-neutral-500 uppercase tracking-wider">
                Email Address <span className="text-red-500">*</span>
              </label>
              <input
                type="email"
                {...register('email')}
                placeholder="e.g. staff@school.com"
                className="input-field"
              />
              {errors.email && (
                <p className="text-red-500 text-xs mt-1">{errors.email.message}</p>
              )}
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-neutral-500 uppercase tracking-wider">
                Mobile Number <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                {...register('mobile')}
                placeholder="e.g. 9876543210"
                className="input-field"
              />
              {errors.mobile && (
                <p className="text-red-500 text-xs mt-1">{errors.mobile.message}</p>
              )}
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-neutral-500 uppercase tracking-wider">
                Date of Joining <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                {...register('date_of_joining')}
                className="input-field"
              />
              {errors.date_of_joining && (
                <p className="text-red-500 text-xs mt-1">{errors.date_of_joining.message}</p>
              )}
            </div>
          </div>
        </div>

        {/* Professional Details */}
        <div className="card space-y-6">
          <h3 className="section-title border-b border-neutral-100 pb-2">
            2. Department & Contract details
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-neutral-500 uppercase tracking-wider">
                Department <span className="text-red-500">*</span>
              </label>
              <Controller
                control={control}
                name="department"
                render={({ field }) => (
                  <CustomSelect
                    value={field.value}
                    onChange={field.onChange}
                    options={[
                      { value: 'Academics', label: 'Academics' },
                      { value: 'Administration', label: 'Administration' },
                      { value: 'Finance', label: 'Finance' },
                      { value: 'Support', label: 'Support Services' },
                    ]}
                  />
                )}
              />
              {errors.department && (
                <p className="text-red-500 text-xs mt-1">{errors.department.message}</p>
              )}
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-neutral-500 uppercase tracking-wider">
                Designation <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                {...register('designation')}
                placeholder="e.g. Teacher, Accountant, Principal"
                className="input-field"
              />
              {errors.designation && (
                <p className="text-red-500 text-xs mt-1">{errors.designation.message}</p>
              )}
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-neutral-500 uppercase tracking-wider">
                Employment Type <span className="text-red-500">*</span>
              </label>
              <Controller
                control={control}
                name="employment_type"
                render={({ field }) => (
                  <CustomSelect
                    value={field.value}
                    onChange={field.onChange}
                    options={[
                      { value: 'permanent', label: 'Permanent / Full-Time' },
                      { value: 'contract', label: 'Contract / Temp' }
                    ]}
                  />
                )}
              />
              {errors.employment_type && (
                <p className="text-red-500 text-xs mt-1">{errors.employment_type.message}</p>
              )}
            </div>
          </div>
        </div>

        {/* Submit */}
        <div className="flex justify-end gap-3 border-t border-neutral-200 pt-4">
          <button
            type="button"
            onClick={onCancel}
            className="btn-secondary"
          >
            Cancel
          </button>
          
          <button
            type="submit"
            disabled={onboardMutation.isPending}
            className="btn-primary flex items-center gap-2"
          >
            {onboardMutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            Onboard Employee
          </button>
        </div>
      </form>
    </div>
  );
}
