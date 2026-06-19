import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import {
  GraduationCap,
  Plus,
  Trash2,
  AlertCircle,
  Loader2,
  Sparkles,
} from 'lucide-react';

import { examsApi } from '../api/examsApi';

const gradeScaleSchema = z.object({
  min_percentage: z.coerce.number().min(0, "Percentage must be >= 0").max(100, "Percentage must be <= 100"),
  max_percentage: z.coerce.number().min(0, "Percentage must be >= 0").max(100, "Percentage must be <= 100"),
  grade_name: z.string().min(1, "Grade name required").max(5),
  description: z.string().max(100).optional(),
}).refine(data => data.min_percentage < data.max_percentage, {
  message: "Minimum percentage must be strictly less than maximum percentage",
  path: ["min_percentage"],
});

type GradeScaleFormValues = z.infer<typeof gradeScaleSchema>;

export function GradeScalePage() {
  const queryClient = useQueryClient();
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const { data: scalesRes, isLoading, error } = useQuery({
    queryKey: ['grade-scales'],
    queryFn: examsApi.listGradeScales,
  });

  const scales = scalesRes?.data || [];

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors }
  } = useForm<GradeScaleFormValues>({
    resolver: zodResolver(gradeScaleSchema),
    defaultValues: {
      min_percentage: 0,
      max_percentage: 100,
      grade_name: '',
      description: '',
    }
  });

  const createMutation = useMutation({
    mutationFn: examsApi.createGradeScale,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['grade-scales'] });
      reset();
      setErrorMsg(null);
      alert('Grade scale created successfully!');
    },
    onError: (err: any) => {
      console.error(err);
      setErrorMsg(err.response?.data?.detail || 'Failed to create grade scale.');
    }
  });

  const deleteMutation = useMutation({
    mutationFn: examsApi.deleteGradeScale,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['grade-scales'] });
      alert('Grade scale deleted.');
    },
    onError: (err: any) => {
      console.error(err);
      alert(err.response?.data?.detail || 'Failed to delete grade scale.');
    }
  });

  const onSubmit = (values: GradeScaleFormValues) => {
    setErrorMsg(null);
    createMutation.mutate(values);
  };

  const handleDelete = (id: string) => {
    if (confirm('Are you sure you want to delete this grade scale? This might affect automated grade assignments.')) {
      deleteMutation.mutate(id);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-neutral-200 pb-4">
        <div>
          <h2 className="text-2xl font-bold font-display text-neutral-900 flex items-center gap-2">
            <GraduationCap className="h-6 w-6 text-primary" />
            Grading Scales
          </h2>
          <p className="text-sm text-neutral-500 font-sans">
            Configure percentage ranges to automatically assign letter grades on report cards.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 1 Col: Form */}
        <div className="lg:col-span-1">
          <div className="card space-y-5">
            <h3 className="section-title border-b border-neutral-100 pb-2 flex items-center gap-1.5">
              <Plus className="h-4 w-4 text-primary" /> Add Grade Scale
            </h3>

            {errorMsg && (
              <div className="bg-red-50 border border-red-200 text-red-800 p-3 rounded-lg flex items-start gap-2.5 text-xs animate-fadeIn">
                <AlertCircle className="h-4.5 w-4.5 text-red-500 shrink-0 mt-0.5" />
                <span>{errorMsg}</span>
              </div>
            )}

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase text-neutral-500">Grade Letter / Name <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  placeholder="e.g. A+, B, Fail"
                  {...register('grade_name')}
                  className="input-field py-2 text-xs font-semibold"
                  required
                />
                {errors.grade_name && (
                  <p className="text-red-500 text-xs mt-1">{errors.grade_name.message}</p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase text-neutral-500">Min Percentage <span className="text-red-500">*</span></label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="e.g. 90"
                    {...register('min_percentage')}
                    className="input-field py-2 text-xs"
                    required
                  />
                  {errors.min_percentage && (
                    <p className="text-red-500 text-xs mt-1">{errors.min_percentage.message}</p>
                  )}
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase text-neutral-500">Max Percentage <span className="text-red-500">*</span></label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="e.g. 100"
                    {...register('max_percentage')}
                    className="input-field py-2 text-xs"
                    required
                  />
                  {errors.max_percentage && (
                    <p className="text-red-500 text-xs mt-1">{errors.max_percentage.message}</p>
                  )}
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase text-neutral-500">Description</label>
                <input
                  type="text"
                  placeholder="e.g. Outstanding Performance"
                  {...register('description')}
                  className="input-field py-2 text-xs"
                />
                {errors.description && (
                  <p className="text-red-500 text-xs mt-1">{errors.description.message}</p>
                )}
              </div>

              <button
                type="submit"
                disabled={createMutation.isPending}
                className="w-full btn-primary text-xs py-2 flex items-center justify-center gap-1.5 mt-2"
              >
                {createMutation.isPending ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Plus className="h-3.5 w-3.5" />
                )}
                Add Scale Range
              </button>
            </form>
          </div>
        </div>

        {/* Right 2 Cols: Grade Grid */}
        <div className="lg:col-span-2 space-y-6">
          <div className="card space-y-4">
            <h3 className="section-title flex items-center gap-2 border-b border-neutral-100 pb-2">
              <Sparkles className="h-4.5 w-4.5 text-amber-500" />
              Grading Scales Catalog ({scales.length})
            </h3>

            {isLoading ? (
              <div className="flex flex-col items-center justify-center py-20 space-y-3">
                <Loader2 className="h-10 w-10 text-primary animate-spin" />
                <span className="text-sm text-neutral-500 font-medium">Loading grading scales...</span>
              </div>
            ) : error ? (
              <div className="bg-red-50 border border-red-200 text-red-800 p-4 rounded-xl flex items-center gap-2.5 text-sm">
                <AlertCircle className="h-5 w-5 text-red-500" />
                <span>Failed to load grade scales from server.</span>
              </div>
            ) : scales.length === 0 ? (
              <div className="text-center py-20 text-neutral-400 text-sm border border-dashed border-neutral-250 rounded-xl">
                No grading scales found.
              </div>
            ) : (
              <div className="overflow-x-auto border border-neutral-200 rounded-xl">
                <table className="min-w-full divide-y divide-neutral-200">
                  <thead className="bg-neutral-50">
                    <tr>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-bold text-neutral-500 uppercase tracking-wider">
                        Grade Name
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-bold text-neutral-500 uppercase tracking-wider">
                        Score Range
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-bold text-neutral-500 uppercase tracking-wider">
                        Description
                      </th>
                      <th scope="col" className="px-6 py-3 text-right text-xs font-bold text-neutral-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-neutral-200">
                    {scales.map((s) => (
                      <tr key={s.id} className="hover:bg-neutral-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-primary flex items-center gap-2">
                          <span className="h-8 w-8 rounded-full bg-indigo-50 border border-indigo-100 flex items-center justify-center font-bold text-primary text-xs">
                            {s.grade_name}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-neutral-900 font-medium">
                          {s.min_percentage}% – {s.max_percentage}%
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-neutral-500">
                          {s.description || '—'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <button
                            onClick={() => handleDelete(s.id)}
                            className="text-neutral-400 hover:text-danger p-1.5 hover:bg-neutral-100 rounded-lg transition"
                            title="Delete Scale"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
