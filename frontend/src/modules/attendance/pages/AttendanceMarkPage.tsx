import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  CheckCircle2, 
  XCircle, 
  Clock, 
  ShieldAlert,
  Users,
  Search,
  Check,
  AlertTriangle,
  Loader2,
  CalendarCheck
} from 'lucide-react';
import { studentApi } from '../../students/api/studentApi';
import { attendanceApi, StudentAttendanceMark } from '../api/attendanceApi';
import { CustomSelect } from '../../../components/CustomSelect';
import { DatePicker } from '../../../components/DatePicker';
import { toast } from '../../../stores/useToastStore';

export function AttendanceMarkPage() {
  const queryClient = useQueryClient();
  
  // Local state for filters
  const [selectedClassId, setSelectedClassId] = useState<string>('');
  const [selectedDate, setSelectedDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  const [sessionType, setSessionType] = useState<'morning' | 'afternoon' | 'period'>('morning');
  const [searchTerm, setSearchTerm] = useState('');
  
  // Local temporary state for the records table while editing
  const [records, setRecords] = useState<Record<string, { status: 'P' | 'A' | 'L' | 'H'; remarks: string }>>({});

  // Fetch classes
  const { data: classes = [], isLoading: isLoadingClasses } = useQuery({
    queryKey: ['classes'],
    queryFn: studentApi.classes,
  });

  // Automatically select the first class if none selected
  useEffect(() => {
    if (classes.length > 0 && !selectedClassId) {
      setSelectedClassId(classes[0].id);
    }
  }, [classes, selectedClassId]);

  // Fetch student roster for the class
  const { data: studentResponse, isLoading: isLoadingStudents, error: studentError } = useQuery({
    queryKey: ['students-attendance-roster', selectedClassId],
    queryFn: () => studentApi.list({ class_id: selectedClassId, per_page: 100 }),
    enabled: !!selectedClassId,
  });
  
  const students = studentResponse?.data || [];

  // Fetch existing attendance session details
  const { data: sessionDetails, isLoading: isLoadingSession } = useQuery({
    queryKey: ['attendance-session', selectedClassId, selectedDate, sessionType],
    queryFn: () => attendanceApi.getSessionDetails(selectedClassId, selectedDate, sessionType),
    enabled: !!selectedClassId && !!selectedDate && !!sessionType,
  });

  // Sync session records to local state when loaded
  useEffect(() => {
    if (sessionDetails?.exists && sessionDetails.records) {
      const recordsMap: Record<string, { status: 'P' | 'A' | 'L' | 'H'; remarks: string }> = {};
      sessionDetails.records.forEach((r: any) => {
        recordsMap[r.student_id] = {
          status: r.status as 'P' | 'A' | 'L' | 'H',
          remarks: r.remarks || '',
        };
      });
      setRecords(recordsMap);
    } else if (students.length > 0) {
      // Default all to Present
      const defaultRecords: Record<string, { status: 'P' | 'A' | 'L' | 'H'; remarks: string }> = {};
      students.forEach((s: any) => {
        defaultRecords[s.id] = {
          status: 'P',
          remarks: '',
        };
      });
      setRecords(defaultRecords);
    }
  }, [sessionDetails, students]);

  // Check if session is locked (more than 2 hours since taken_at)
  const isLocked = (() => {
    if (!sessionDetails?.exists || !sessionDetails.session?.taken_at) return false;
    const takenAt = new Date(sessionDetails.session.taken_at).getTime();
    const now = new Date().getTime();
    const twoHoursInMs = 2 * 60 * 60 * 1000;
    return now - takenAt > twoHoursInMs;
  })();

  // Mutation to save attendance
  const saveMutation = useMutation({
    mutationFn: (data: Parameters<typeof attendanceApi.mark>[0]) => attendanceApi.mark(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['attendance-session'] });
      toast.success('Attendance saved successfully!');
    },
    onError: (err: any) => {
      const msg = err.response?.data?.detail || 'Failed to save attendance';
      toast.error(msg);
    }
  });

  const handleStatusChange = (studentId: string, status: 'P' | 'A' | 'L' | 'H') => {
    if (isLocked) return;
    setRecords(prev => ({
      ...prev,
      [studentId]: {
        ...prev[studentId],
        status
      }
    }));
  };

  const handleRemarksChange = (studentId: string, remarks: string) => {
    if (isLocked) return;
    setRecords(prev => ({
      ...prev,
      [studentId]: {
        ...prev[studentId],
        remarks
      }
    }));
  };

  const handleMarkAllPresent = () => {
    if (isLocked) return;
    const updated = { ...records };
    students.forEach((s: any) => {
      if (updated[s.id]) {
        updated[s.id].status = 'P';
      }
    });
    setRecords(updated);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedClassId) return;

    const formattedRecords: StudentAttendanceMark[] = students.map((s: any) => {
      const studentRec = records[s.id] || { status: 'P', remarks: '' };
      return {
        student_id: s.id,
        status: studentRec.status,
        remarks: studentRec.remarks || undefined
      };
    });

    saveMutation.mutate({
      session: {
        class_id: selectedClassId,
        session_date: selectedDate,
        session_type: sessionType
      },
      records: formattedRecords
    });
  };

  const filteredStudents = students.filter((s: any) => {
    const fullName = `${s.first_name} ${s.last_name}`.toLowerCase();
    const admNum = s.admission_number.toLowerCase();
    const query = searchTerm.toLowerCase();
    return fullName.includes(query) || admNum.includes(query);
  });

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="page-header">
        <div>
          <h2 className="text-2xl font-bold font-display text-neutral-900">Attendance Register</h2>
          <p className="text-sm text-neutral-500">Track and log daily student attendance sessions.</p>
        </div>
      </div>

      {/* Filter Options */}
      <div className="card grid grid-cols-1 md:grid-cols-3 gap-4 py-5">
        <div>
          <label className="block text-xs font-semibold uppercase text-neutral-500 mb-1.5">Select Class</label>
          <CustomSelect
            value={selectedClassId}
            onChange={(val) => setSelectedClassId(val)}
            disabled={isLoadingClasses}
            placeholder={isLoadingClasses ? "Loading classes..." : "Select Class"}
            options={classes.map((c: any) => ({
              value: c.id,
              label: `${c.name} - Section ${c.section}`
            }))}
          />
        </div>

        <div>
          <label className="block text-xs font-semibold uppercase text-neutral-500 mb-1.5">Date</label>
          <DatePicker
            value={selectedDate}
            onChange={(val) => setSelectedDate(val)}
          />
        </div>

        <div>
          <label className="block text-xs font-semibold uppercase text-neutral-500 mb-1.5">Session Type</label>
          <CustomSelect
            value={sessionType}
            onChange={(val) => setSessionType(val as any)}
            options={[
              { value: 'morning', label: 'Morning Attendance' },
              { value: 'afternoon', label: 'Afternoon Attendance' },
              { value: 'period', label: 'Subject Period' }
            ]}
          />
        </div>
      </div>

      {/* Warning/Status Alerts */}
      {isLocked && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl px-5 py-4 flex items-start gap-3 text-amber-850">
          <ShieldAlert className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
          <div className="text-sm">
            <span className="font-bold">Locked Session:</span> Attendance for this class session was submitted over 2 hours ago. Updates are locked. Please contact the School Administrator for overriding changes.
          </div>
        </div>
      )}

      {sessionDetails?.exists && !isLocked && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl px-5 py-4 flex items-start gap-3 text-blue-800">
          <AlertTriangle className="h-5 w-5 text-blue-500 shrink-0 mt-0.5" />
          <div className="text-sm">
            <span className="font-bold">Editing Session:</span> Attendance is already logged for this session. You can modify records and resubmit before the 2-hour window expires.
          </div>
        </div>
      )}

      {/* Main Student Roster Section */}
      <div className="card p-0 overflow-hidden">
        <div className="px-6 py-4 bg-neutral-50/50 border-b border-neutral-100 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="relative w-full sm:max-w-xs">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-neutral-400" />
            <input
              type="text"
              placeholder="Search student by name..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="input-field pl-9 py-1.5 text-xs"
            />
          </div>

          <div className="flex gap-2 w-full sm:w-auto">
            <button
              type="button"
              onClick={handleMarkAllPresent}
              disabled={isLocked || students.length === 0}
              className="btn-secondary py-1.5 px-3 text-xs flex items-center justify-center gap-1.5 w-full sm:w-auto"
            >
              <Check className="h-3.5 w-3.5" />
              Mark All Present
            </button>
          </div>
        </div>

        {isLoadingStudents || isLoadingSession ? (
          <div className="flex flex-col items-center justify-center py-20 space-y-3">
            <Loader2 className="h-10 w-10 text-primary animate-spin" />
            <span className="text-sm text-neutral-500 font-medium">Loading roster...</span>
          </div>
        ) : studentError ? (
          <div className="p-8 text-center text-danger">
            Failed to load student roster. Please check database connection.
          </div>
        ) : filteredStudents.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center space-y-3">
            <Users className="h-10 w-10 text-neutral-300" />
            <div className="space-y-1">
              <h4 className="font-semibold text-neutral-800">No Students Found</h4>
              <p className="text-sm text-neutral-500">Ensure active students are admitted to this class.</p>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="divide-y divide-neutral-100">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-neutral-50/55 text-xs font-semibold text-neutral-500 uppercase tracking-wider border-b border-neutral-100">
                    <th className="px-6 py-3.5 w-1/4">Student</th>
                    <th className="px-6 py-3.5 w-1/12">Roll No</th>
                    <th className="px-6 py-3.5 w-2/5 text-center">Status</th>
                    <th className="px-6 py-3.5">Remarks</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-150 text-sm">
                  {filteredStudents.map((student: any) => {
                    const rec = records[student.id] || { status: 'P', remarks: '' };
                    return (
                      <tr key={student.id} className="hover:bg-neutral-50/20 transition duration-150">
                        <td className="px-6 py-4">
                          <div className="font-semibold text-neutral-900">
                            {student.first_name} {student.last_name}
                          </div>
                          <div className="text-xs text-neutral-500 font-mono">
                            {student.admission_number}
                          </div>
                        </td>
                        <td className="px-6 py-4 font-mono text-neutral-600">
                          {student.roll_number ?? '-'}
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex justify-center items-center gap-1.5">
                            {/* Present Button */}
                            <button
                              type="button"
                              onClick={() => handleStatusChange(student.id, 'P')}
                              disabled={isLocked}
                              className={`flex-1 max-w-[76px] py-1.5 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1 ${
                                rec.status === 'P'
                                  ? 'bg-emerald-50 text-emerald-700 border-2 border-emerald-500'
                                  : 'bg-white hover:bg-neutral-50 border border-neutral-200 text-neutral-600'
                              }`}
                            >
                              <CheckCircle2 className={`h-3.5 w-3.5 ${rec.status === 'P' ? 'text-emerald-600' : 'text-neutral-400'}`} />
                              P
                            </button>

                            {/* Late Button */}
                            <button
                              type="button"
                              onClick={() => handleStatusChange(student.id, 'L')}
                              disabled={isLocked}
                              className={`flex-1 max-w-[76px] py-1.5 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1 ${
                                rec.status === 'L'
                                  ? 'bg-amber-50 text-amber-700 border-2 border-amber-500'
                                  : 'bg-white hover:bg-neutral-50 border border-neutral-200 text-neutral-600'
                              }`}
                            >
                              <Clock className={`h-3.5 w-3.5 ${rec.status === 'L' ? 'text-amber-600' : 'text-neutral-400'}`} />
                              L
                            </button>

                            {/* Absent Button */}
                            <button
                              type="button"
                              onClick={() => handleStatusChange(student.id, 'A')}
                              disabled={isLocked}
                              className={`flex-1 max-w-[76px] py-1.5 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1 ${
                                rec.status === 'A'
                                  ? 'bg-rose-50 text-rose-700 border-2 border-rose-500 animate-pulse'
                                  : 'bg-white hover:bg-neutral-50 border border-neutral-200 text-neutral-600'
                              }`}
                            >
                              <XCircle className={`h-3.5 w-3.5 ${rec.status === 'A' ? 'text-rose-600' : 'text-neutral-400'}`} />
                              A
                            </button>

                            {/* Holiday Button */}
                            <button
                              type="button"
                              onClick={() => handleStatusChange(student.id, 'H')}
                              disabled={isLocked}
                              className={`flex-1 max-w-[76px] py-1.5 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1 ${
                                rec.status === 'H'
                                  ? 'bg-slate-100 text-slate-700 border-2 border-slate-400'
                                  : 'bg-white hover:bg-neutral-50 border border-neutral-200 text-neutral-600'
                              }`}
                            >
                              <CalendarCheck className={`h-3.5 w-3.5 ${rec.status === 'H' ? 'text-slate-600' : 'text-neutral-400'}`} />
                              H
                            </button>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <input
                            type="text"
                            placeholder="Optional reason/remarks..."
                            value={rec.remarks}
                            onChange={(e) => handleRemarksChange(student.id, e.target.value)}
                            disabled={isLocked}
                            className="input-field py-1 text-xs"
                          />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Submit Action Bar */}
            <div className="px-6 py-4 bg-neutral-50/50 border-t border-neutral-100 flex items-center justify-between">
              <span className="text-xs text-neutral-500 font-medium">
                Class roster contains {students.length} students.
              </span>
              <button
                type="submit"
                disabled={isLocked || saveMutation.isPending}
                className="btn-primary flex items-center gap-2"
              >
                {saveMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                {sessionDetails?.exists ? 'Update Attendance' : 'Save & Submit Register'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
