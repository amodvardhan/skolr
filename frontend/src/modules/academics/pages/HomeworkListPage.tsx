import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { 
  FileSpreadsheet, 
  Plus, 
  Eye, 
  Trash2, 
  Loader2, 
  AlertCircle, 
  Calendar, 
  BookOpen, 
  X
} from 'lucide-react';

import { academicsApi, HomeworkCreateData } from '../api/academicsApi';
import { studentApi } from '../../students/api/studentApi';
import { CustomSelect } from '../../../components/CustomSelect';
import { useAuthStore } from '../../../stores/authStore';
import { DatePicker } from '../../../components/DatePicker';
import { toast } from '../../../stores/useToastStore';
import { confirm } from '../../../stores/useConfirmStore';

const homeworkSchema = z.object({
  title: z.string().min(2, "Title must be at least 2 characters").max(200),
  description: z.string().min(2, "Description must be at least 2 characters").max(1000),
  due_date: z.string().min(1, "Select due date"),
  class_id: z.string().min(1, "Select class"),
  subject_id: z.string().min(1, "Select subject"),
});

interface HomeworkListPageProps {
  onViewDetails: (id: string) => void;
}

export function HomeworkListPage({ onViewDetails }: HomeworkListPageProps) {
  const queryClient = useQueryClient();
  const user = useAuthStore((state) => state.user);
  const [showModal, setShowModal] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  
  const [classFilter, setClassFilter] = useState('');
  const [subjectFilter, setSubjectFilter] = useState('');

  // 1. Queries
  const { data: homeworkRes, isLoading: loadingHW } = useQuery({
    queryKey: ['homework-list', classFilter, subjectFilter],
    queryFn: () => academicsApi.listHomework({ 
      classId: classFilter || undefined, 
      subjectId: subjectFilter || undefined 
    }),
  });

  const { data: classes = [] } = useQuery({
    queryKey: ['classes-master'],
    queryFn: studentApi.classes,
  });

  const { data: subjectsRes } = useQuery({
    queryKey: ['subjects-master'],
    queryFn: academicsApi.listSubjects,
  });

  const homeworkList = homeworkRes?.data || [];
  const subjects = subjectsRes?.data || [];

  // 2. React Hook Form for creation
  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors }
  } = useForm<HomeworkCreateData>({
    resolver: zodResolver(homeworkSchema),
    defaultValues: {
      title: '',
      description: '',
      due_date: new Date(Date.now() + 86400000).toISOString().split('T')[0], // tomorrow
      class_id: '',
      subject_id: '',
    }
  });

  // 3. Mutations
  const createMutation = useMutation({
    mutationFn: academicsApi.createHomework,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['homework-list'] });
      reset();
      setShowModal(false);
      setSubmitError(null);
      toast.success('Homework assigned successfully!');
    },
    onError: (err: any) => {
      console.error(err);
      setSubmitError(err.response?.data?.detail || 'Failed to assign homework task.');
    }
  });

  const deleteMutation = useMutation({
    mutationFn: academicsApi.deleteHomework,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['homework-list'] });
      toast.success('Homework task deleted.');
    },
    onError: (err: any) => {
      console.error(err);
      toast.error(err.response?.data?.detail || 'Failed to delete homework.');
    }
  });

  const onSubmit = (values: HomeworkCreateData) => {
    setSubmitError(null);
    createMutation.mutate(values);
  };

  const handleDelete = async (id: string) => {
    if (await confirm('Are you sure you want to delete this homework? All grades and submissions will be permanently removed.', { type: 'danger', title: 'Delete Homework' })) {
      deleteMutation.mutate(id);
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="page-header">
        <div>
          <h2 className="text-2xl font-bold font-display text-neutral-900 flex items-center gap-2">
            <FileSpreadsheet className="h-6 w-6 text-primary" />
            Homework & Assignments Board
          </h2>
          <p className="text-sm text-neutral-500 font-sans">
            Assign homework tasks, set target dates, and review student grading rosters.
          </p>
        </div>
        
        {/* Only teachers and school admin can assign homework */}
        {(user?.role === 'teacher' || user?.role === 'school_admin') && (
          <button
            onClick={() => {
              setSubmitError(null);
              reset();
              setShowModal(true);
            }}
            className="btn-primary flex items-center gap-2"
          >
            <Plus className="h-4 w-4" />
            Assign Homework
          </button>
        )}
      </div>

      {/* Filters */}
      <div className="card flex flex-col md:flex-row gap-4 py-4 items-center justify-between">
        <div className="text-sm font-semibold text-neutral-600 block shrink-0">Filter Roster Dashboard:</div>
        <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto md:min-w-[400px]">
          <CustomSelect
            value={classFilter}
            onChange={(val) => setClassFilter(val)}
            options={[
              { value: '', label: 'All Classes' },
              ...classes.map((c: any) => ({ value: c.id, label: `${c.name}-${c.section}` }))
            ]}
          />
          
          <CustomSelect
            value={subjectFilter}
            onChange={(val) => setSubjectFilter(val)}
            options={[
              { value: '', label: 'All Subjects' },
              ...subjects.map(s => ({ value: s.id, label: s.name }))
            ]}
          />
        </div>
      </div>

      {/* List / Cards */}
      {loadingHW ? (
        <div className="flex flex-col items-center justify-center py-20 space-y-3">
          <Loader2 className="h-10 w-10 text-primary animate-spin" />
          <span className="text-sm text-neutral-500 font-medium">Loading homework board...</span>
        </div>
      ) : homeworkList.length === 0 ? (
        <div className="card text-center py-20 max-w-xl mx-auto space-y-4">
          <div className="h-14 w-14 bg-slate-100 text-neutral-450 rounded-full flex items-center justify-center mx-auto">
            <FileSpreadsheet className="h-8 w-8" />
          </div>
          <h3 className="text-xl font-bold text-neutral-800">No Homework Assigned</h3>
          <p className="text-sm text-neutral-500 max-w-md mx-auto">
            There are no homework tasks assigned matching the selected filters.
          </p>
          {(user?.role === 'teacher' || user?.role === 'school_admin') && (
            <button onClick={() => setShowModal(true)} className="btn-secondary">
              Assign First Task
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {homeworkList.map((hw) => {
            const isOverdue = new Date(hw.due_date) < new Date() && new Date(hw.due_date).toDateString() !== new Date().toDateString();
            
            return (
              <div 
                key={hw.id} 
                className="card flex flex-col justify-between hover:shadow-md border border-neutral-200 hover:border-primary/30 transition duration-200 bg-white"
              >
                <div className="space-y-4">
                  {/* Tags & Actions */}
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="bg-blue-50 text-primary border border-blue-200 text-[10px] font-bold px-2 py-0.5 rounded-full">
                        {hw.class_name}
                      </span>
                      <span className="bg-emerald-50 text-emerald-800 border border-emerald-200 text-[10px] font-bold px-2 py-0.5 rounded-full">
                        {hw.subject_name}
                      </span>
                    </div>
                    
                    {/* Delete button (school admin, or teacher who created it) */}
                    {(user?.role === 'school_admin' || user?.email === hw.teacher_name?.split(' ').pop()) && (
                      <button
                        onClick={() => handleDelete(hw.id)}
                        className="text-neutral-450 hover:text-danger p-1 hover:bg-neutral-100 rounded-md transition"
                        title="Delete Assignment"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>

                  {/* Title & Description */}
                  <div className="space-y-1">
                    <h4 className="font-bold text-neutral-900 text-lg line-clamp-1">{hw.title}</h4>
                    <p className="text-xs text-neutral-500 line-clamp-3 leading-relaxed">{hw.description}</p>
                  </div>
                </div>

                {/* Footer details */}
                <div className="border-t border-neutral-100 pt-3.5 mt-4 flex items-center justify-between gap-2">
                  <div className="space-y-1 text-[11px]">
                    <div className="flex items-center gap-1 text-neutral-500 font-mono">
                      <Calendar className="h-3.5 w-3.5" /> Due: {' '}
                      <span className={isOverdue ? 'text-danger font-bold' : 'text-neutral-700 font-semibold'}>
                        {new Date(hw.due_date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                      </span>
                    </div>
                    <div className="text-neutral-400">Assigned by: {hw.teacher_name}</div>
                  </div>

                  <button
                    onClick={() => onViewDetails(hw.id)}
                    className="btn-secondary text-[11px] py-1.5 px-3 flex items-center gap-1 shadow-sm shrink-0"
                  >
                    <Eye className="h-3.5 w-3.5" />
                    Roster
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Creation Modal Form */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-2xl relative border border-neutral-150 space-y-4">
            <button
              onClick={() => setShowModal(false)}
              className="absolute right-4 top-4 p-1 rounded-lg text-neutral-400 hover:text-neutral-800 hover:bg-neutral-100 transition"
            >
              <X className="h-5 w-5" />
            </button>
            
            <div>
              <h3 className="text-lg font-bold text-neutral-900 flex items-center gap-2">
                <BookOpen className="h-5 w-5 text-primary" /> Assign Homework
              </h3>
              <p className="text-xs text-neutral-500">Provide parameters to publish a homework card to parent channels.</p>
            </div>

            {submitError && (
              <div className="bg-red-50 border border-red-200 text-red-700 p-3 rounded-lg flex items-start gap-2.5 text-xs animate-fadeIn">
                <AlertCircle className="h-4.5 w-4.5 text-red-500 shrink-0 mt-0.5" />
                <span>{submitError}</span>
              </div>
            )}

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                {/* Class */}
                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase text-neutral-500">Class & Section <span className="text-red-500">*</span></label>
                  <Controller
                    control={control}
                    name="class_id"
                    render={({ field }) => (
                      <CustomSelect
                        value={field.value}
                        onChange={field.onChange}
                        options={[
                          { value: '', label: 'Select Class...' },
                          ...classes.map((c: any) => ({ value: c.id, label: `${c.name}-${c.section}` }))
                        ]}
                      />
                    )}
                  />
                  {errors.class_id && (
                    <p className="text-red-500 text-xs mt-0.5">{errors.class_id.message}</p>
                  )}
                </div>

                {/* Subject */}
                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase text-neutral-500">Subject <span className="text-red-500">*</span></label>
                  <Controller
                    control={control}
                    name="subject_id"
                    render={({ field }) => (
                      <CustomSelect
                        value={field.value}
                        onChange={field.onChange}
                        options={[
                          { value: '', label: 'Select Subject...' },
                          ...subjects.map(s => ({ value: s.id, label: s.name }))
                        ]}
                      />
                    )}
                  />
                  {errors.subject_id && (
                    <p className="text-red-500 text-xs mt-0.5">{errors.subject_id.message}</p>
                  )}
                </div>
              </div>

              {/* Title */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase text-neutral-500">Homework Title <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  placeholder="e.g. Algebra Chapter 2 Exercises"
                  {...register('title')}
                  className="input-field"
                  required
                />
                {errors.title && (
                  <p className="text-red-500 text-xs mt-0.5">{errors.title.message}</p>
                )}
              </div>

              {/* Description */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase text-neutral-500">Instructions / Description <span className="text-red-500">*</span></label>
                <textarea
                  placeholder="Detail the work and reading list required..."
                  {...register('description')}
                  rows={4}
                  className="input-field"
                  required
                />
                {errors.description && (
                  <p className="text-red-500 text-xs mt-0.5">{errors.description.message}</p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                {/* Due Date */}
                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase text-neutral-500">Due Date <span className="text-red-500">*</span></label>
                  <Controller
                    control={control}
                    name="due_date"
                    render={({ field }) => (
                      <DatePicker
                        value={field.value}
                        onChange={field.onChange}
                      />
                    )}
                  />
                  {errors.due_date && (
                    <p className="text-red-500 text-xs mt-0.5">{errors.due_date.message}</p>
                  )}
                </div>

                {/* Optional Attachment URL */}
                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase text-neutral-500">Optional Attachment URL</label>
                  <input
                    type="url"
                    placeholder="e.g. S3 link or drive link"
                    {...register('attachment_url')}
                    className="input-field"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 border-t border-neutral-100 pt-4">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="btn-secondary py-2 text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createMutation.isPending}
                  className="btn-primary py-2 text-xs flex items-center gap-1"
                >
                  {createMutation.isPending ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Plus className="h-3.5 w-3.5" />
                  )}
                  Assign Homework
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
