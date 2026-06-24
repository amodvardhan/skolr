import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import {
  CalendarDays,
  Plus,
  Trash2,
  AlertCircle,
  Loader2,
  ListOrdered,
  Calendar,
} from 'lucide-react';

import { examsApi, Exam } from '../api/examsApi';
import { studentApi } from '../../students/api/studentApi';
import { academicsApi } from '../../academics/api/academicsApi';
import { CustomSelect } from '../../../components/CustomSelect';
import { DatePicker } from '../../../components/DatePicker';
import { confirm } from '../../../stores/useConfirmStore';


const examSchema = z.object({
  name: z.string().min(2, "Exam name must be at least 2 characters").max(100),
  academic_year_id: z.string().min(1, "Select academic year"),
});

const scheduleSchema = z.object({
  subject_id: z.string().min(1, "Select subject"),
  exam_date: z.string().min(1, "Select exam date"),
  max_marks: z.coerce.number().min(1, "Max marks must be >= 1"),
  passing_marks: z.coerce.number().min(0, "Passing marks must be >= 0"),
}).refine(data => data.passing_marks <= data.max_marks, {
  message: "Passing marks cannot exceed maximum marks",
  path: ["passing_marks"],
});

type ExamFormValues = z.infer<typeof examSchema>;
type ScheduleFormValues = z.infer<typeof scheduleSchema>;

export function ExamSchedulePage() {
  const queryClient = useQueryClient();
  const [selectedExamId, setSelectedExamId] = useState<string>('');
  const [selectedClassId, setSelectedClassId] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [schedErrorMsg, setSchedErrorMsg] = useState<string | null>(null);

  // Queries
  const { data: examsRes, isLoading: loadingExams } = useQuery({
    queryKey: ['exams-sessions'],
    queryFn: () => examsApi.listExams(),
  });

  const { data: ayRes } = useQuery({
    queryKey: ['academic-years-master'],
    queryFn: studentApi.academicYears,
  });

  const { data: classes = [] } = useQuery({
    queryKey: ['classes-master'],
    queryFn: studentApi.classes,
  });

  const { data: subjectsRes } = useQuery({
    queryKey: ['subjects-master'],
    queryFn: academicsApi.listSubjects,
  });

  const { data: schedulesRes, isLoading: loadingSchedules } = useQuery({
    queryKey: ['exam-schedules', selectedExamId, selectedClassId],
    queryFn: () => examsApi.listSchedules(selectedExamId, selectedClassId || undefined),
    enabled: !!selectedExamId,
  });

  const exams = examsRes?.data || [];
  const academicYears = ayRes || [];
  const subjects = subjectsRes?.data || [];
  const schedules = schedulesRes?.data || [];

  const selectedExam = exams.find(e => e.id === selectedExamId);

  // React Hook Forms
  const {
    register: registerExam,
    handleSubmit: handleSubmitExam,
    reset: resetExam,
    control: controlExam,
    formState: { errors: examErrors }
  } = useForm<ExamFormValues>({
    resolver: zodResolver(examSchema),
    defaultValues: { name: '', academic_year_id: '' }
  });

  const {
    register: registerSched,
    handleSubmit: handleSubmitSched,
    reset: resetSched,
    control: controlSched,
    formState: { errors: schedErrors }
  } = useForm<ScheduleFormValues>({
    resolver: zodResolver(scheduleSchema),
    defaultValues: { subject_id: '', exam_date: '', max_marks: 100, passing_marks: 35 }
  });

  // Mutations
  const createExamMutation = useMutation({
    mutationFn: examsApi.createExam,
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['exams-sessions'] });
      resetExam();
      setErrorMsg(null);
      setSelectedExamId(res.data.id);
      alert('Exam session created successfully!');
    },
    onError: (err: any) => {
      setErrorMsg(err.response?.data?.detail || 'Failed to create exam session.');
    }
  });

  const updateExamStatusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) => examsApi.updateExam(id, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['exams-sessions'] });
      alert('Exam status updated.');
    },
    onError: (err: any) => {
      alert(err.response?.data?.detail || 'Failed to update exam status.');
    }
  });

  const deleteExamMutation = useMutation({
    mutationFn: examsApi.deleteExam,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['exams-sessions'] });
      setSelectedExamId('');
      alert('Exam session deleted.');
    },
    onError: (err: any) => {
      alert(err.response?.data?.detail || 'Failed to delete exam.');
    }
  });

  const createSchedMutation = useMutation({
    mutationFn: (data: any) => examsApi.createSchedule(selectedExamId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['exam-schedules', selectedExamId, selectedClassId] });
      resetSched();
      setSchedErrorMsg(null);
      alert('Subject exam schedule added!');
    },
    onError: (err: any) => {
      setSchedErrorMsg(err.response?.data?.detail || 'Failed to create schedule.');
    }
  });

  const deleteSchedMutation = useMutation({
    mutationFn: examsApi.deleteSchedule,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['exam-schedules', selectedExamId, selectedClassId] });
      alert('Schedule entry removed.');
    },
    onError: (err: any) => {
      alert(err.response?.data?.detail || 'Failed to delete schedule.');
    }
  });

  const onSubmitExam = (values: ExamFormValues) => {
    setErrorMsg(null);
    createExamMutation.mutate(values);
  };

  const onSubmitSched = (values: ScheduleFormValues) => {
    if (!selectedExamId || !selectedClassId) {
      alert('Please select an Exam and a Class first.');
      return;
    }
    setSchedErrorMsg(null);
    createSchedMutation.mutate({
      exam_id: selectedExamId,
      class_id: selectedClassId,
      ...values,
    });
  };

  const handleUpdateStatus = (exam: Exam, newStatus: 'draft' | 'scheduled' | 'completed') => {
    updateExamStatusMutation.mutate({ id: exam.id, status: newStatus });
  };

  const handleDeleteExam = async (id: string) => {
    if (await confirm('Are you sure you want to delete this exam session? This will delete all schedules and entered marks.', { type: 'danger', title: 'Delete Exam Term' })) {
      deleteExamMutation.mutate(id);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-neutral-200 pb-4">
        <div>
          <h2 className="text-2xl font-bold font-display text-neutral-900 flex items-center gap-2">
            <CalendarDays className="h-6 w-6 text-primary" />
            Exam Timetable & Sessions
          </h2>
          <p className="text-sm text-neutral-500 font-sans">
            Schedule exams for subject rosters, set max marks, dates, and manage active academic periods.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Exam Sessions */}
        <div className="lg:col-span-1 space-y-6">
          <div className="card space-y-5">
            <h3 className="section-title border-b border-neutral-100 pb-2 flex items-center gap-1.5">
              <Plus className="h-4 w-4 text-primary" /> Create Exam Term
            </h3>

            {errorMsg && (
              <div className="bg-red-50 border border-red-200 text-red-800 p-3 rounded-lg flex items-start gap-2.5 text-xs">
                <AlertCircle className="h-4.5 w-4.5 text-red-500 shrink-0 mt-0.5" />
                <span>{errorMsg}</span>
              </div>
            )}

            <form onSubmit={handleSubmitExam(onSubmitExam)} className="space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase text-neutral-500">Exam Term Name <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  placeholder="e.g. Mid-Term / Term 1 Final"
                  {...registerExam('name')}
                  className="input-field py-2 text-xs"
                  required
                />
                {examErrors.name && (
                  <p className="text-red-500 text-[11px] mt-1">{examErrors.name.message}</p>
                )}
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase text-neutral-500">Academic Year <span className="text-red-500">*</span></label>
                <Controller
                  name="academic_year_id"
                  control={controlExam}
                  render={({ field }) => (
                    <CustomSelect
                      value={field.value}
                      onChange={field.onChange}
                      options={academicYears.map((ay: any) => ({ value: ay.id, label: ay.name + (ay.is_current ? ' (Current)' : '') }))}
                      placeholder="Select Academic Year"
                      className="py-1 text-xs"
                    />
                  )}
                />
                {examErrors.academic_year_id && (
                  <p className="text-red-500 text-[11px] mt-1">{examErrors.academic_year_id.message}</p>
                )}
              </div>

              <button
                type="submit"
                disabled={createExamMutation.isPending}
                className="w-full btn-primary text-xs py-2 flex items-center justify-center gap-1.5 mt-2"
              >
                {createExamMutation.isPending ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Plus className="h-3.5 w-3.5" />
                )}
                Register Exam Term
              </button>
            </form>
          </div>

          {/* Exam List */}
          <div className="card space-y-4">
            <h3 className="section-title border-b border-neutral-100 pb-2">
              Registered Exam Terms ({exams.length})
            </h3>
            {loadingExams ? (
              <div className="flex justify-center py-6">
                <Loader2 className="h-6 w-6 text-primary animate-spin" />
              </div>
            ) : exams.length === 0 ? (
              <p className="text-xs text-neutral-400 text-center py-6">No exam terms registered.</p>
            ) : (
              <div className="space-y-2">
                {exams.map((exam) => (
                  <div
                    key={exam.id}
                    className={`p-3 rounded-lg border transition cursor-pointer flex flex-col justify-between gap-2 ${
                      selectedExamId === exam.id
                        ? 'border-primary bg-blue-50/40'
                        : 'border-neutral-200 hover:border-neutral-300 bg-white'
                    }`}
                    onClick={() => setSelectedExamId(exam.id)}
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <h4 className="text-sm font-bold text-neutral-900 line-clamp-1">{exam.name}</h4>
                        <span className="text-[10px] font-semibold text-neutral-500 uppercase">
                          Status: {exam.status}
                        </span>
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteExam(exam.id);
                        }}
                        className="text-neutral-450 hover:text-danger p-1 hover:bg-neutral-100 rounded-md transition"
                        title="Delete Exam"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>

                    {/* Status Toggles */}
                    <div className="flex items-center gap-1.5 pt-1.5 border-t border-neutral-100">
                      <span className="text-[9px] font-bold text-neutral-450 uppercase">Mark Status:</span>
                      <div className="flex gap-1">
                        {['draft', 'scheduled', 'completed'].map((st) => (
                          <button
                            key={st}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleUpdateStatus(exam, st as any);
                            }}
                            className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase transition ${
                              exam.status === st
                                ? 'bg-primary text-white'
                                : 'bg-neutral-100 hover:bg-neutral-200 text-neutral-600'
                            }`}
                          >
                            {st}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right 2 Columns: Subject Timetable */}
        <div className="lg:col-span-2 space-y-6">
          {/* Filtering */}
          <div className="card grid grid-cols-1 md:grid-cols-2 gap-4 py-4 items-center">
            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase text-neutral-500">Active Exam Term</label>
              <CustomSelect
                value={selectedExamId}
                onChange={setSelectedExamId}
                options={exams.map(e => ({ value: e.id, label: e.name }))}
                placeholder="Choose Exam Term..."
                className="py-1 text-xs"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase text-neutral-500">Filter By Class</label>
              <CustomSelect
                value={selectedClassId}
                onChange={setSelectedClassId}
                options={classes.map((c: any) => ({ value: c.id, label: `${c.name}-${c.section}` }))}
                placeholder="Choose Class..."
                className="py-1 text-xs"
                disabled={!selectedExamId}
              />
            </div>
          </div>

          {selectedExamId && selectedClassId ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Form to Schedule a Subject */}
              <div className="md:col-span-1">
                <div className="card space-y-5">
                  <h3 className="section-title border-b border-neutral-100 pb-2 flex items-center gap-1.5">
                    <Calendar className="h-4 w-4 text-primary" /> Add Subject Date
                  </h3>

                  {schedErrorMsg && (
                    <div className="bg-red-50 border border-red-200 text-red-800 p-3 rounded-lg flex items-start gap-2.5 text-xs">
                      <AlertCircle className="h-4.5 w-4.5 text-red-500 shrink-0 mt-0.5" />
                      <span>{schedErrorMsg}</span>
                    </div>
                  )}

                  <form onSubmit={handleSubmitSched(onSubmitSched)} className="space-y-4">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold uppercase text-neutral-500">Subject <span className="text-red-500">*</span></label>
                      <Controller
                        name="subject_id"
                        control={controlSched}
                        render={({ field }) => (
                          <CustomSelect
                            value={field.value}
                            onChange={field.onChange}
                            options={subjects.map(s => ({ value: s.id, label: `${s.name} (${s.code})` }))}
                            placeholder="Select Subject..."
                            className="py-1 text-xs"
                          />
                        )}
                      />
                      {schedErrors.subject_id && (
                        <p className="text-red-500 text-[11px] mt-1">{schedErrors.subject_id.message}</p>
                      )}
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] font-bold uppercase text-neutral-500">Date <span className="text-red-500">*</span></label>
                      <Controller
                        name="exam_date"
                        control={controlSched}
                        render={({ field }) => (
                          <DatePicker
                            value={field.value}
                            onChange={field.onChange}
                            placeholder="Select Exam Date..."
                          />
                        )}
                      />
                      {schedErrors.exam_date && (
                        <p className="text-red-500 text-[11px] mt-1">{schedErrors.exam_date.message}</p>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold uppercase text-neutral-500">Max Marks <span className="text-red-500">*</span></label>
                        <input
                          type="number"
                          placeholder="100"
                          {...registerSched('max_marks')}
                          className="input-field py-2 text-xs"
                          required
                        />
                        {schedErrors.max_marks && (
                          <p className="text-red-500 text-[11px] mt-1">{schedErrors.max_marks.message}</p>
                        )}
                      </div>

                      <div className="space-y-1">
                        <label className="text-[10px] font-bold uppercase text-neutral-500">Passing Marks <span className="text-red-500">*</span></label>
                        <input
                          type="number"
                          placeholder="35"
                          {...registerSched('passing_marks')}
                          className="input-field py-2 text-xs"
                          required
                        />
                        {schedErrors.passing_marks && (
                          <p className="text-red-500 text-[11px] mt-1">{schedErrors.passing_marks.message}</p>
                        )}
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={createSchedMutation.isPending}
                      className="w-full btn-primary text-xs py-2 flex items-center justify-center gap-1.5 mt-2"
                    >
                      {createSchedMutation.isPending ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Plus className="h-3.5 w-3.5" />
                      )}
                      Schedule Subject
                    </button>
                  </form>
                </div>
              </div>

              {/* Schedules Table */}
              <div className="md:col-span-2 space-y-4">
                <div className="card space-y-4">
                  <h3 className="section-title flex items-center gap-2 border-b border-neutral-100 pb-2">
                    <ListOrdered className="h-4.5 w-4.5 text-primary" />
                    Subject Schedule Details
                  </h3>

                  {loadingSchedules ? (
                    <div className="flex justify-center py-20">
                      <Loader2 className="h-8 w-8 text-primary animate-spin" />
                    </div>
                  ) : schedules.length === 0 ? (
                    <div className="text-center py-20 text-neutral-400 text-xs border border-dashed border-neutral-250 rounded-xl">
                      No subjects scheduled for this class in {selectedExam?.name}.
                    </div>
                  ) : (
                    <div className="overflow-x-auto border border-neutral-200 rounded-xl">
                      <table className="min-w-full divide-y divide-neutral-200">
                        <thead className="bg-neutral-50">
                          <tr>
                            <th scope="col" className="px-4 py-2 text-left text-xs font-bold text-neutral-500 uppercase tracking-wider">
                              Subject
                            </th>
                            <th scope="col" className="px-4 py-2 text-left text-xs font-bold text-neutral-500 uppercase tracking-wider">
                              Date
                            </th>
                            <th scope="col" className="px-4 py-2 text-center text-xs font-bold text-neutral-500 uppercase tracking-wider">
                              Max Marks
                            </th>
                            <th scope="col" className="px-4 py-2 text-center text-xs font-bold text-neutral-500 uppercase tracking-wider">
                              Passing Marks
                            </th>
                            <th scope="col" className="px-4 py-2 text-right text-xs font-bold text-neutral-500 uppercase tracking-wider">
                              Actions
                            </th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-neutral-200">
                          {schedules.map((s) => (
                            <tr key={s.id} className="hover:bg-neutral-50">
                              <td className="px-4 py-3 whitespace-nowrap text-xs font-bold text-neutral-900">
                                {s.subject_name} <span className="text-[10px] text-neutral-400 font-normal">({s.subject_code})</span>
                              </td>
                              <td className="px-4 py-3 whitespace-nowrap text-xs text-neutral-600 font-mono font-semibold">
                                {s.exam_date}
                              </td>
                              <td className="px-4 py-3 whitespace-nowrap text-xs text-neutral-900 text-center font-bold">
                                {s.max_marks}
                              </td>
                              <td className="px-4 py-3 whitespace-nowrap text-xs text-neutral-550 text-center font-bold">
                                {s.passing_marks}
                              </td>
                              <td className="px-4 py-3 whitespace-nowrap text-right text-xs font-medium">
                                <button
                                  onClick={() => deleteSchedMutation.mutate(s.id)}
                                  className="text-neutral-450 hover:text-danger p-1 hover:bg-neutral-100 rounded-lg transition"
                                  title="Delete Schedule"
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
          ) : (
            <div className="card text-center py-20 text-neutral-400 text-sm border border-dashed border-neutral-250 rounded-xl max-w-lg mx-auto">
              Please choose both an **Active Exam Term** and **Filter By Class** to schedule subjects and display details.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
