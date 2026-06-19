import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { 
  BookOpen, 
  Plus, 
  Trash2, 
  AlertCircle, 
  Loader2, 
  Sparkles, 
  FolderLock
} from 'lucide-react';

import { academicsApi, SubjectCreateData } from '../api/academicsApi';

const subjectSchema = z.object({
  name: z.string().min(2, "Subject name must be at least 2 characters").max(100),
  code: z.string().min(2, "Subject code must be at least 2 characters").max(20),
  description: z.string().max(255).optional()
});

export function SubjectConfigPage() {
  const queryClient = useQueryClient();
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const { data: subjectRes, isLoading, error } = useQuery({
    queryKey: ['subjects'],
    queryFn: academicsApi.listSubjects,
  });

  const subjects = subjectRes?.data || [];

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors }
  } = useForm<SubjectCreateData>({
    resolver: zodResolver(subjectSchema),
    defaultValues: {
      name: '',
      code: '',
      description: ''
    }
  });

  // Mutation to create a subject
  const createMutation = useMutation({
    mutationFn: academicsApi.createSubject,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subjects'] });
      reset();
      setErrorMsg(null);
      alert('Subject created successfully!');
    },
    onError: (err: any) => {
      console.error(err);
      setErrorMsg(err.response?.data?.detail || 'Failed to register new subject.');
    }
  });

  // Mutation to delete a subject
  const deleteMutation = useMutation({
    mutationFn: academicsApi.deleteSubject,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subjects'] });
      alert('Subject removed from catalog.');
    },
    onError: (err: any) => {
      console.error(err);
      alert(err.response?.data?.detail || 'Failed to delete subject.');
    }
  });

  const onSubmit = (values: SubjectCreateData) => {
    setErrorMsg(null);
    createMutation.mutate(values);
  };

  const handleDelete = (id: string) => {
    if (confirm('Are you sure you want to delete this subject? This might affect existing homework/records.')) {
      deleteMutation.mutate(id);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-neutral-200 pb-4">
        <div>
          <h2 className="text-2xl font-bold font-display text-neutral-900 flex items-center gap-2">
            <BookOpen className="h-6 w-6 text-primary" />
            Subject Master Catalog
          </h2>
          <p className="text-sm text-neutral-500 font-sans">
            Add, update, or remove subjects taught in the CBSE/School curriculum.
          </p>
        </div>
        <div className="flex items-center gap-2 bg-indigo-50 text-primary font-bold px-3 py-1.5 rounded-full text-xs border border-indigo-150 shadow-sm self-start md:self-auto">
          <FolderLock className="h-4 w-4" />
          <span>Curriculum Master</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 1 Col: Create Subject Form */}
        <div className="lg:col-span-1">
          <div className="card space-y-5">
            <h3 className="section-title border-b border-neutral-100 pb-2 flex items-center gap-1.5">
              <Plus className="h-4 w-4 text-primary" /> Add Subject
            </h3>

            {errorMsg && (
              <div className="bg-red-50 border border-red-200 text-red-800 p-3 rounded-lg flex items-start gap-2.5 text-xs animate-fadeIn">
                <AlertCircle className="h-4.5 w-4.5 text-red-500 shrink-0 mt-0.5" />
                <span>{errorMsg}</span>
              </div>
            )}

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase text-neutral-500">Subject Name <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  placeholder="e.g. Mathematics"
                  {...register('name')}
                  className="input-field py-2 text-xs"
                  required
                />
                {errors.name && (
                  <p className="text-red-500 text-xs mt-1">{errors.name.message}</p>
                )}
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase text-neutral-500">Subject Code <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  placeholder="e.g. MATH101"
                  {...register('code')}
                  className="input-field py-2 text-xs font-mono uppercase"
                  required
                />
                <span className="text-[10px] text-neutral-450 block">CBSE or School-wide unique curriculum code.</span>
                {errors.code && (
                  <p className="text-red-500 text-xs mt-1">{errors.code.message}</p>
                )}
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase text-neutral-500">Description</label>
                <textarea
                  placeholder="Subject details or level"
                  {...register('description')}
                  rows={3}
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
                Register Subject
              </button>
            </form>
          </div>
        </div>

        {/* Right 2 Cols: Subject Grid */}
        <div className="lg:col-span-2 space-y-6">
          <div className="card space-y-4">
            <h3 className="section-title flex items-center gap-2 border-b border-neutral-100 pb-2">
              <Sparkles className="h-4.5 w-4.5 text-amber-500" />
              Active Subjects ({subjects.length})
            </h3>

            {isLoading ? (
              <div className="flex flex-col items-center justify-center py-20 space-y-3">
                <Loader2 className="h-10 w-10 text-primary animate-spin" />
                <span className="text-sm text-neutral-500 font-medium">Loading catalog...</span>
              </div>
            ) : error ? (
              <div className="bg-red-50 border border-red-200 text-red-800 p-4 rounded-xl flex items-center gap-2.5 text-sm">
                <AlertCircle className="h-5 w-5 text-red-500" />
                <span>Failed to resolve subjects catalog from endpoint.</span>
              </div>
            ) : subjects.length === 0 ? (
              <div className="text-center py-20 text-neutral-400 text-sm border border-dashed border-neutral-250 rounded-xl">
                No subjects registered in the master catalog yet. Use the form on the left to add your first subject.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {subjects.map((sub) => (
                  <div 
                    key={sub.id} 
                    className="border border-neutral-250 hover:border-primary/45 rounded-xl p-4 flex flex-col justify-between hover:shadow-md transition duration-200 bg-white relative group"
                  >
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-mono font-bold bg-neutral-100 text-neutral-600 px-2 py-0.5 rounded border border-neutral-200">
                          {sub.code}
                        </span>
                        <button
                          onClick={() => handleDelete(sub.id)}
                          className="text-neutral-400 hover:text-danger p-1 hover:bg-neutral-100 rounded-md transition md:opacity-0 group-hover:opacity-100"
                          title="Delete Subject"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                      <h4 className="font-bold text-neutral-900 text-base">{sub.name}</h4>
                      {sub.description && (
                        <p className="text-xs text-neutral-550 leading-relaxed truncate">
                          {sub.description}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
