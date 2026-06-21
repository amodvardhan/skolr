import { useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Save, AlertCircle, Sparkles, Loader2 } from 'lucide-react';

import { studentApi } from '../api/studentApi';
import { CustomSelect } from '../../../components/CustomSelect';

const parentSchema = z.object({
  first_name: z.string().min(2, "First name is too short"),
  last_name: z.string().min(2, "Last name is too short"),
  mobile: z.string().regex(/^\+?[0-9]{10,15}$/, "Enter a valid mobile number (10-15 digits)"),
  email: z.string().email("Enter a valid email").optional().or(z.literal('')),
  occupation: z.string().optional().or(z.literal('')),
});

const studentAdmissionSchema = z.object({
  first_name: z.string().min(2, "First name is too short"),
  last_name: z.string().min(2, "Last name is too short"),
  date_of_birth: z.string().min(1, "Date of birth is required"),
  gender: z.enum(['M', 'F', 'O'], { errorMap: () => ({ message: "Select gender" }) }),
  roll_number: z.number().optional().or(z.nan()),
  admission_date: z.string().min(1, "Admission date is required"),
  class_id: z.string().uuid("Please select a class"),
  
  father: parentSchema,
  mother: parentSchema,
});

type StudentFormValues = z.infer<typeof studentAdmissionSchema>;

interface StudentFormPageProps {
  onCancel: () => void;
  onSuccess: () => void;
  prefillData?: any;
}

export function StudentFormPage({ onCancel, onSuccess, prefillData }: StudentFormPageProps) {
  const queryClient = useQueryClient();
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Fetch classes from backend dynamically
  const { data: classesData, isLoading: isLoadingClasses } = useQuery({
    queryKey: ['classes'],
    queryFn: () => studentApi.classes(),
  });

  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
  } = useForm<StudentFormValues>({
    resolver: zodResolver(studentAdmissionSchema),
    defaultValues: {
      first_name: prefillData?.first_name || '',
      last_name: prefillData?.last_name || '',
      date_of_birth: prefillData?.date_of_birth || '',
      gender: prefillData?.gender || 'M',
      roll_number: undefined,
      admission_date: prefillData?.admission_date || new Date().toISOString().split('T')[0],
      class_id: prefillData?.class_id || '',
      father: {
        first_name: prefillData?.parents?.[0]?.first_name || '',
        last_name: prefillData?.parents?.[0]?.last_name || '',
        mobile: prefillData?.parents?.[0]?.mobile || '',
        email: prefillData?.parents?.[0]?.email || '',
        occupation: prefillData?.parents?.[0]?.occupation || ''
      },
      mother: { first_name: '', last_name: '', mobile: '', email: '', occupation: '' }
    }
  });

  // Mutator to submit student admission
  const admitMutation = useMutation({
    mutationFn: async (values: StudentFormValues) => {
      // Map form values to API schema payload structure
      const payload = {
        first_name: values.first_name,
        last_name: values.last_name,
        date_of_birth: values.date_of_birth,
        gender: values.gender,
        roll_number: isNaN(Number(values.roll_number)) ? undefined : Number(values.roll_number),
        admission_date: values.admission_date,
        class_id: values.class_id,
        parents: [
          {
            parent_type: 'father',
            first_name: values.father.first_name,
            last_name: values.father.last_name,
            mobile: values.father.mobile,
            email: values.father.email || undefined,
            occupation: values.father.occupation || undefined,
          },
          {
            parent_type: 'mother',
            first_name: values.mother.first_name,
            last_name: values.mother.last_name,
            mobile: values.mother.mobile,
            email: values.mother.email || undefined,
            occupation: values.mother.occupation || undefined,
          }
        ]
      };
      return await studentApi.admit(payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['students'] });
      onSuccess();
    },
    onError: (err: any) => {
      console.error(err);
      const detail = err.response?.data?.detail;
      if (typeof detail === 'string') {
        setSubmitError(detail);
      } else if (Array.isArray(detail)) {
        const messages = detail.map((d: any) => {
          const field = d.loc ? d.loc.filter((x: any) => x !== 'body').join('.') : '';
          return `${field ? field + ': ' : ''}${d.msg}`;
        }).join('; ');
        setSubmitError(messages || 'Validation failed');
      } else {
        setSubmitError('Failed to submit admission record');
      }
    }
  });

  const onSubmit = (values: StudentFormValues) => {
    setSubmitError(null);
    admitMutation.mutate(values);
  };

  const classesList = classesData || [];

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
          <h2 className="text-2xl font-bold font-display text-neutral-900">Student Admission</h2>
          <p className="text-sm text-neutral-500">Admit a new student into the dynamic tenant registry.</p>
        </div>
      </div>

      {submitError && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-start gap-3 text-sm">
          <AlertCircle className="h-5 w-5 text-red-500 shrink-0 mt-0.5" />
          <span>{submitError}</span>
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Section 1: Student Details */}
        <div className="card space-y-6">
          <h3 className="section-title border-b border-neutral-100 pb-2 flex items-center gap-1.5">
            <Sparkles className="h-4 w-4 text-primary" />
            1. Student Information
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-neutral-600 uppercase tracking-wider">
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
              <label className="text-xs font-semibold text-neutral-600 uppercase tracking-wider">
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
              <label className="text-xs font-semibold text-neutral-600 uppercase tracking-wider">
                Gender <span className="text-red-500">*</span>
              </label>
              <Controller
                control={control}
                name="gender"
                render={({ field }) => (
                  <CustomSelect
                    value={field.value}
                    onChange={field.onChange}
                    options={[
                      { value: 'M', label: 'Male' },
                      { value: 'F', label: 'Female' },
                      { value: 'O', label: 'Other' }
                    ]}
                  />
                )}
              />
              {errors.gender && (
                <p className="text-red-500 text-xs mt-1">{errors.gender.message}</p>
              )}
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-neutral-600 uppercase tracking-wider">
                Date of Birth <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                {...register('date_of_birth')}
                className="input-field"
              />
              {errors.date_of_birth && (
                <p className="text-red-500 text-xs mt-1">{errors.date_of_birth.message}</p>
              )}
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-neutral-600 uppercase tracking-wider">
                Admission Date <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                {...register('admission_date')}
                className="input-field"
              />
              {errors.admission_date && (
                <p className="text-red-500 text-xs mt-1">{errors.admission_date.message}</p>
              )}
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-neutral-600 uppercase tracking-wider">
                Roll Number (Optional)
              </label>
              <input
                type="number"
                {...register('roll_number', { valueAsNumber: true })}
                placeholder="Enter roll number"
                className="input-field"
              />
            </div>
          </div>
        </div>

        {/* Section 2: Class Assignment */}
        <div className="card space-y-4">
          <h3 className="section-title border-b border-neutral-100 pb-2">
            2. Class Allocation
          </h3>
          <div className="max-w-md space-y-1">
            <label className="text-xs font-semibold text-neutral-600 uppercase tracking-wider">
              Class & Section <span className="text-red-500">*</span>
            </label>
            <Controller
              control={control}
              name="class_id"
              render={({ field }) => (
                <CustomSelect
                  value={field.value}
                  onChange={field.onChange}
                  disabled={isLoadingClasses}
                  placeholder={isLoadingClasses ? "Fetching active classes..." : "-- Select Class --"}
                  options={classesList.map((cls: any) => ({
                    value: cls.id,
                    label: `${cls.name} (Section ${cls.section})`
                  }))}
                />
              )}
            />
            {errors.class_id && (
              <p className="text-red-500 text-xs mt-1">{errors.class_id.message}</p>
            )}
            {isLoadingClasses && (
              <span className="text-xs text-neutral-400 font-medium">Fetching active classes...</span>
            )}
          </div>
        </div>

        {/* Section 3: Parents details */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Father Information */}
          <div className="card space-y-4">
            <h3 className="section-title border-b border-neutral-100 pb-2 text-blue-800">
              3a. Father's Information
            </h3>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs text-neutral-605 font-medium">First Name *</label>
                  <input type="text" {...register('father.first_name')} className="input-field" />
                  {errors.father?.first_name && (
                    <p className="text-red-500 text-xs">{errors.father.first_name.message}</p>
                  )}
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-neutral-605 font-medium">Last Name *</label>
                  <input type="text" {...register('father.last_name')} className="input-field" />
                  {errors.father?.last_name && (
                    <p className="text-red-500 text-xs">{errors.father.last_name.message}</p>
                  )}
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs text-neutral-605 font-medium">Mobile Number *</label>
                <input type="text" {...register('father.mobile')} className="input-field" placeholder="e.g. 9876543210" />
                {errors.father?.mobile && (
                  <p className="text-red-500 text-xs">{errors.father.mobile.message}</p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs text-neutral-605 font-medium">Email Address</label>
                  <input type="email" {...register('father.email')} className="input-field" />
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-neutral-605 font-medium">Occupation</label>
                  <input type="text" {...register('father.occupation')} className="input-field" />
                </div>
              </div>
            </div>
          </div>

          {/* Mother Information */}
          <div className="card space-y-4">
            <h3 className="section-title border-b border-neutral-100 pb-2 text-rose-800">
              3b. Mother's Information
            </h3>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs text-neutral-605 font-medium">First Name *</label>
                  <input type="text" {...register('mother.first_name')} className="input-field" />
                  {errors.mother?.first_name && (
                    <p className="text-red-500 text-xs">{errors.mother.first_name.message}</p>
                  )}
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-neutral-605 font-medium">Last Name *</label>
                  <input type="text" {...register('mother.last_name')} className="input-field" />
                  {errors.mother?.last_name && (
                    <p className="text-red-500 text-xs">{errors.mother.last_name.message}</p>
                  )}
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs text-neutral-605 font-medium">Mobile Number *</label>
                <input type="text" {...register('mother.mobile')} className="input-field" placeholder="e.g. 9876543210" />
                {errors.mother?.mobile && (
                  <p className="text-red-500 text-xs">{errors.mother.mobile.message}</p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs text-neutral-605 font-medium">Email Address</label>
                  <input type="email" {...register('mother.email')} className="input-field" />
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-neutral-605 font-medium">Occupation</label>
                  <input type="text" {...register('mother.occupation')} className="input-field" />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
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
            disabled={admitMutation.isPending}
            className="btn-primary flex items-center gap-2"
          >
            {admitMutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            Admit Student
          </button>
        </div>
      </form>
    </div>
  );
}
