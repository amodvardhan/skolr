import { useQuery } from '@tanstack/react-query';
import { Calendar, CreditCard, ShieldAlert, Award } from 'lucide-react';
import { parentApi } from '../api/parentApi';

interface ParentDashboardProps {
  studentId: string;
}

export function ParentDashboardPage({ studentId }: ParentDashboardProps) {
  // Query child attendance data
  const { data: attendanceRes, isLoading: attendanceLoading } = useQuery({
    queryKey: ['parent_attendance', studentId],
    queryFn: () => parentApi.getChildAttendance(studentId),
    enabled: !!studentId,
  });

  // Query child fees data
  const { data: feesRes, isLoading: feesLoading } = useQuery({
    queryKey: ['parent_fees', studentId],
    queryFn: () => parentApi.getChildFees(studentId),
    enabled: !!studentId,
  });

  // Query child exams data
  const { data: examsRes, isLoading: examsLoading } = useQuery({
    queryKey: ['parent_exams', studentId],
    queryFn: () => parentApi.getChildExams(studentId),
    enabled: !!studentId,
  });

  if (!studentId) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-neutral-400">
        <ShieldAlert className="h-10 w-10 mb-2 animate-bounce" />
        <p className="text-sm font-semibold">No student profile selected.</p>
      </div>
    );
  }

  const attendance = attendanceRes?.data?.summary;
  const feesAccount = feesRes?.account;
  const upcomingExams = examsRes?.data?.schedules?.slice(0, 3) || [];

  return (
    <div className="space-y-6">
      {/* Header Announcement Bar */}
      <div className="p-5 bg-slate-900 text-white rounded-2xl shadow-xl flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold font-display tracking-tight">Parent Portal Welcome Page</h2>
          <p className="text-xs text-slate-400 mt-1">Monitor real-time CBSE class progress, check daily registers, and pay outstanding fee accounts.</p>
        </div>
        <div className="hidden sm:flex items-center gap-2 text-xs font-bold bg-amber-500/20 text-amber-400 px-3 py-1.5 rounded-full border border-amber-500/30">
          <Calendar className="h-4 w-4" /> Academic Year: 2025-26
        </div>
      </div>

      {/* Main Grid Panels */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* CARD 1: Attendance Circular Gauge */}
        <div className="card flex flex-col justify-between items-center p-6 bg-white border border-neutral-200 rounded-2xl shadow-sm h-72">
          <div className="w-full flex items-center justify-between">
            <span className="text-xs font-bold text-neutral-400 uppercase tracking-wider font-display">Attendance Record</span>
            <span className="p-1.5 bg-emerald-50 text-emerald-600 rounded-lg"><Calendar className="h-4 w-4" /></span>
          </div>

          {attendanceLoading ? (
            <div className="flex flex-col items-center space-y-2">
              <span className="border-2 border-primary border-t-transparent w-6 h-6 rounded-full animate-spin"></span>
              <span className="text-xs font-semibold text-neutral-450">Loading summary...</span>
            </div>
          ) : (
            <div className="flex flex-col items-center">
              <div className="relative flex items-center justify-center w-28 h-28">
                <svg className="w-full h-full transform -rotate-90">
                  <circle cx="56" cy="56" r="48" className="stroke-neutral-100" strokeWidth="8" fill="transparent" />
                  <circle
                    cx="56"
                    cy="56"
                    r="48"
                    className="stroke-emerald-500 transition-all duration-500"
                    strokeWidth="8"
                    fill="transparent"
                    strokeDasharray={301.6}
                    strokeDashoffset={301.6 - (301.6 * (attendance?.attendance_percentage || 0)) / 100}
                  />
                </svg>
                <div className="absolute text-center">
                  <span className="text-2xl font-extrabold text-neutral-800 font-display">{attendance?.attendance_percentage || 0}%</span>
                </div>
              </div>
              <p className="text-xs text-neutral-500 font-semibold mt-3">
                {attendance?.present_days} of {attendance?.total_days} school days attended
              </p>
            </div>
          )}

          <div className="text-[10px] text-neutral-400 text-center font-medium">Updated live by teachers daily</div>
        </div>

        {/* CARD 2: Outstanding Fees Card */}
        <div className="card flex flex-col justify-between p-6 bg-white border border-neutral-200 rounded-2xl shadow-sm h-72">
          <div className="w-full flex items-center justify-between">
            <span className="text-xs font-bold text-neutral-400 uppercase tracking-wider font-display">Fees Ledger</span>
            <span className="p-1.5 bg-rose-50 text-rose-600 rounded-lg"><CreditCard className="h-4 w-4" /></span>
          </div>

          {feesLoading ? (
            <div className="flex flex-col items-center justify-center py-10 space-y-2">
              <span className="border-2 border-primary border-t-transparent w-6 h-6 rounded-full animate-spin"></span>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="text-center">
                <span className="text-xs text-neutral-400 font-semibold block">Outstanding Dues</span>
                <span className="text-3xl font-black text-rose-600 font-display">₹{feesAccount?.outstanding_balance?.toLocaleString('en-IN') || 0}</span>
              </div>
              <div className="bg-neutral-50 rounded-xl p-3 border border-neutral-100 text-xs text-neutral-600 space-y-1.5">
                <div className="flex justify-between">
                  <span>Total Applicable:</span>
                  <span className="font-semibold text-neutral-800">₹{feesAccount?.total_applicable?.toLocaleString('en-IN') || 0}</span>
                </div>
                <div className="flex justify-between">
                  <span>Total Paid:</span>
                  <span className="font-semibold text-neutral-800">₹{feesAccount?.total_paid?.toLocaleString('en-IN') || 0}</span>
                </div>
              </div>
            </div>
          )}

          <div className="text-[10px] text-neutral-400 text-center font-medium">Verify structured details in the Fees tab</div>
        </div>

        {/* CARD 3: Exam Term & CBSE Profile */}
        <div className="card flex flex-col justify-between p-6 bg-white border border-neutral-200 rounded-2xl shadow-sm h-72">
          <div className="w-full flex items-center justify-between">
            <span className="text-xs font-bold text-neutral-400 uppercase tracking-wider font-display">Upcoming Tests</span>
            <span className="p-1.5 bg-amber-50 text-amber-600 rounded-lg"><Award className="h-4 w-4" /></span>
          </div>

          {examsLoading ? (
            <div className="flex flex-col items-center justify-center py-10 space-y-2">
              <span className="border-2 border-primary border-t-transparent w-6 h-6 rounded-full animate-spin"></span>
            </div>
          ) : (
            <div className="space-y-2.5">
              {upcomingExams.length > 0 ? (
                upcomingExams.map((ex: any) => (
                  <div key={ex.id} className="flex justify-between items-center p-2 rounded-xl bg-neutral-50 hover:bg-neutral-100 border border-neutral-100 transition duration-150">
                    <div>
                      <div className="text-xs font-bold text-neutral-800">{ex.subject_name}</div>
                      <div className="text-[10px] text-neutral-450 font-semibold">{ex.exam_name}</div>
                    </div>
                    <span className="text-[10px] font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                      {new Date(ex.exam_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                    </span>
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-neutral-400 text-xs font-medium">
                  No exam papers scheduled
                </div>
              )}
            </div>
          )}

          <div className="text-[10px] text-neutral-400 text-center font-medium">Exam syllabus files available below</div>
        </div>
      </div>
    </div>
  );
}
