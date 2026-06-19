import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { 
  ArrowLeft, 
  AlertCircle, 
  Loader2, 
  CheckCircle,
  FileText,
  UserCheck,
  Edit2,
  X
} from 'lucide-react';

import { academicsApi, GradeSubmissionData, HomeworkSubmission } from '../api/academicsApi';
import { CustomSelect } from '../../../components/CustomSelect';

const gradeSchema = z.object({
  status: z.enum(['submitted', 'graded']),
  remarks: z.string().max(255).optional(),
  grade: z.string().max(10).optional(),
});

interface HomeworkDetailPageProps {
  homeworkId: string;
  onBack: () => void;
}

export function HomeworkDetailPage({ homeworkId, onBack }: HomeworkDetailPageProps) {
  const queryClient = useQueryClient();
  const [gradingStudent, setGradingStudent] = useState<HomeworkSubmission | null>(null);
  const [gradeError, setGradeError] = useState<string | null>(null);

  // 1. Queries
  const { data: homeworkRes, isLoading: loadingHW, error: hwError } = useQuery({
    queryKey: ['homework-detail', homeworkId],
    queryFn: () => academicsApi.getHomework(homeworkId),
    enabled: !!homeworkId
  });

  const { data: rosterRes, isLoading: loadingRoster, error: rosterError } = useQuery({
    queryKey: ['homework-submissions', homeworkId],
    queryFn: () => academicsApi.listSubmissions(homeworkId),
    enabled: !!homeworkId
  });

  const homework = homeworkRes?.data;
  const roster = rosterRes?.data || [];

  // 2. React Hook Form for grading
  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors }
  } = useForm<GradeSubmissionData>({
    resolver: zodResolver(gradeSchema),
    defaultValues: {
      status: 'graded',
      remarks: '',
      grade: '',
    }
  });

  // 3. Mutation to grade submission
  const gradeMutation = useMutation({
    mutationFn: async (values: GradeSubmissionData) => {
      if (!gradingStudent) throw new Error("No student selected");
      return await academicsApi.gradeSubmission(homeworkId, gradingStudent.student_id, values);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['homework-submissions', homeworkId] });
      setGradingStudent(null);
      setGradeError(null);
      alert('Student submission graded successfully.');
    },
    onError: (err: any) => {
      console.error(err);
      setGradeError(err.response?.data?.detail || 'Failed to grade submission.');
    }
  });

  const openGradingModal = (student: HomeworkSubmission) => {
    setGradeError(null);
    setGradingStudent(student);
    reset({
      status: student.status === 'missing' ? 'submitted' : (student.status as any),
      remarks: student.remarks || '',
      grade: student.grade || ''
    });
  };

  const onGradeSubmit = (values: GradeSubmissionData) => {
    setGradeError(null);
    gradeMutation.mutate(values);
  };

  if (loadingHW || loadingRoster) {
    return (
      <div className="flex flex-col items-center justify-center py-20 space-y-3">
        <Loader2 className="h-10 w-10 text-primary animate-spin" />
        <span className="text-sm text-neutral-500 font-medium">Loading task roster...</span>
      </div>
    );
  }

  if (hwError || rosterError || !homework) {
    return (
      <div className="card text-center py-20 max-w-xl mx-auto space-y-4">
        <div className="h-14 w-14 bg-red-100 text-red-650 rounded-full flex items-center justify-center mx-auto">
          <AlertCircle className="h-8 w-8" />
        </div>
        <h3 className="text-xl font-bold text-neutral-800">Error Loading Assignment Details</h3>
        <p className="text-sm text-neutral-550 max-w-md mx-auto">
          We could not resolve this homework. Make sure it has not been deleted.
        </p>
        <button onClick={onBack} className="btn-secondary">Back to Board</button>
      </div>
    );
  }

  const submittedCount = roster.filter(r => r.status === 'submitted' || r.status === 'graded').length;
  const gradedCount = roster.filter(r => r.status === 'graded').length;

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
          <h2 className="text-2xl font-bold font-display text-neutral-900">{homework.title}</h2>
          <p className="text-sm text-neutral-500 font-sans">
            Class: <span className="font-semibold text-neutral-700">{homework.class_name}</span> | Subject: <span className="font-semibold text-neutral-700">{homework.subject_name}</span>
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Homework details & aggregate status */}
        <div className="lg:col-span-1 space-y-6">
          <div className="card space-y-4">
            <h3 className="section-title border-b border-neutral-100 pb-2 flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" /> Assignment Prompt
            </h3>
            
            <div className="space-y-3 text-sm">
              <div className="bg-neutral-50 p-3.5 rounded-xl border border-neutral-200/60 leading-relaxed text-neutral-750">
                {homework.description}
              </div>

              {homework.attachment_url && (
                <div className="pt-2">
                  <a 
                    href={homework.attachment_url} 
                    target="_blank" 
                    rel="noreferrer"
                    className="text-xs text-primary font-bold hover:underline flex items-center gap-1.5"
                  >
                    <span>📎 View Attached Material</span>
                  </a>
                </div>
              )}

              <div className="pt-3 border-t border-neutral-100 space-y-2 text-xs">
                <div className="flex items-center justify-between text-neutral-500">
                  <span>Due Date:</span>
                  <strong className="text-neutral-800">{new Date(homework.due_date).toLocaleDateString()}</strong>
                </div>
                <div className="flex items-center justify-between text-neutral-500">
                  <span>Assigned:</span>
                  <strong className="text-neutral-800">{new Date(homework.created_at).toLocaleDateString()}</strong>
                </div>
                <div className="flex items-center justify-between text-neutral-500">
                  <span>Assigned By:</span>
                  <strong className="text-neutral-800">{homework.teacher_name}</strong>
                </div>
              </div>
            </div>
          </div>

          {/* Aggregates */}
          <div className="card space-y-4">
            <h3 className="section-title border-b border-neutral-100 pb-2">Roster Progress</h3>
            <div className="grid grid-cols-2 gap-4 text-center">
              <div className="bg-neutral-50 border border-neutral-150 p-3 rounded-xl">
                <span className="text-[10px] font-bold text-neutral-450 uppercase block">Submissions</span>
                <span className="text-xl font-bold text-neutral-800 font-mono mt-1 block">
                  {submittedCount} / {roster.length}
                </span>
              </div>
              <div className="bg-neutral-50 border border-neutral-150 p-3 rounded-xl">
                <span className="text-[10px] font-bold text-neutral-450 uppercase block">Graded Dues</span>
                <span className="text-xl font-bold text-neutral-800 font-mono mt-1 block">
                  {gradedCount} / {submittedCount}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Right 2 Columns: Students Roster Table */}
        <div className="lg:col-span-2 space-y-6">
          <div className="card p-0 overflow-hidden">
            <div className="px-6 py-4 border-b border-neutral-200">
              <h3 className="section-title flex items-center gap-2">
                <UserCheck className="h-5 w-5 text-emerald-600" />
                Class Student Directory Roster
              </h3>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-neutral-50 border-b border-neutral-200 text-xs font-semibold text-neutral-500 uppercase tracking-wider">
                    <th className="px-6 py-4">Roll No</th>
                    <th className="px-6 py-4">Student Name</th>
                    <th className="px-6 py-4">Status</th>
                    <th className="px-6 py-4">Grade</th>
                    <th className="px-6 py-4">Remarks / Notes</th>
                    <th className="px-6 py-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-150 text-sm">
                  {roster.map((sub) => (
                    <tr key={sub.student_id} className="hover:bg-neutral-50/50 transition">
                      <td className="px-6 py-4 font-mono text-neutral-500">
                        {sub.roll_number ?? '-'}
                      </td>
                      <td className="px-6 py-4 font-semibold text-neutral-900">
                        {sub.student_name}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold uppercase ${
                          sub.status === 'graded'
                            ? 'bg-green-50 text-green-700 border border-green-200'
                            : sub.status === 'submitted'
                            ? 'bg-amber-50 text-amber-700 border border-amber-200'
                            : 'bg-neutral-100 text-neutral-700 border border-neutral-200'
                        }`}>
                          {sub.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 font-bold text-neutral-800">
                        {sub.grade ?? '-'}
                      </td>
                      <td className="px-6 py-4 text-neutral-550 text-xs truncate max-w-[150px]">
                        {sub.remarks ?? '-'}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button
                          onClick={() => openGradingModal(sub)}
                          className="text-neutral-500 hover:text-primary p-1.5 hover:bg-neutral-100 rounded-lg transition"
                          title="Grade/Mark Submission"
                        >
                          <Edit2 className="h-4.5 w-4.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {/* Grading Modal Form */}
      {gradingStudent && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl relative border border-neutral-150 space-y-4">
            <button
              onClick={() => setGradingStudent(null)}
              className="absolute right-4 top-4 p-1 rounded-lg text-neutral-400 hover:text-neutral-800 hover:bg-neutral-100 transition"
            >
              <X className="h-5 w-5" />
            </button>
            
            <div>
              <h3 className="text-lg font-bold text-neutral-900 flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-emerald-600" /> Grade Homework Submission
              </h3>
              <p className="text-xs text-neutral-500">
                Update status, grade values, and write teacher notes for <strong className="text-neutral-700">{gradingStudent.student_name}</strong>.
              </p>
            </div>

            {gradeError && (
              <div className="bg-red-50 border border-red-200 text-red-700 p-3 rounded-lg flex items-start gap-2.5 text-xs">
                <AlertCircle className="h-4.5 w-4.5 text-red-500 shrink-0 mt-0.5" />
                <span>{gradeError}</span>
              </div>
            )}

            <form onSubmit={handleSubmit(onGradeSubmit)} className="space-y-4">
              {/* Status */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase text-neutral-500">Submission Status <span className="text-red-500">*</span></label>
                <Controller
                  control={control}
                  name="status"
                  render={({ field }) => (
                    <CustomSelect
                      value={field.value}
                      onChange={field.onChange}
                      options={[
                        { value: 'submitted', label: 'Submitted (Pending Grade)' },
                        { value: 'graded', label: 'Graded / Marked' }
                      ]}
                    />
                  )}
                />
                {errors.status && (
                  <p className="text-red-500 text-xs mt-0.5">{errors.status.message}</p>
                )}
              </div>

              {/* Grade */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase text-neutral-500">Score / Grade Value</label>
                <input
                  type="text"
                  placeholder="e.g. A+, 9/10, Excellent"
                  {...register('grade')}
                  className="input-field py-2 text-xs"
                />
                {errors.grade && (
                  <p className="text-red-500 text-xs mt-0.5">{errors.grade.message}</p>
                )}
              </div>

              {/* Remarks */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase text-neutral-500">Feedback Remarks</label>
                <textarea
                  placeholder="Leave brief feedback for the student/parent circular..."
                  {...register('remarks')}
                  rows={3}
                  className="input-field py-2 text-xs"
                />
                {errors.remarks && (
                  <p className="text-red-500 text-xs mt-0.5">{errors.remarks.message}</p>
                )}
              </div>

              <div className="flex justify-end gap-3 border-t border-neutral-100 pt-4">
                <button
                  type="button"
                  onClick={() => setGradingStudent(null)}
                  className="btn-secondary py-2 text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={gradeMutation.isPending}
                  className="btn-primary py-2 text-xs flex items-center gap-1.5"
                >
                  {gradeMutation.isPending ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <CheckCircle className="h-3.5 w-3.5" />
                  )}
                  Save Grades
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
