import { useQuery } from '@tanstack/react-query';
import { Calendar, CheckCircle, XCircle, AlertCircle, RefreshCw } from 'lucide-react';
import { parentApi } from '../api/parentApi';

interface ParentAttendanceProps {
  studentId: string;
}

export function ParentAttendancePage({ studentId }: ParentAttendanceProps) {
  const { data: attendanceRes, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['parent_attendance', studentId],
    queryFn: () => parentApi.getChildAttendance(studentId),
    enabled: !!studentId,
  });

  const attendance = attendanceRes?.data;

  return (
    <div className="space-y-6">
      {/* Page Title & Stats summary banner */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white p-5 border border-neutral-200 rounded-2xl shadow-sm">
        <div>
          <h2 className="text-base font-bold text-neutral-800 font-display">Daily Attendance Register</h2>
          <p className="text-xs text-neutral-500 mt-0.5">Track your child's classroom attendance registry history</p>
        </div>
        <button
          onClick={() => refetch()}
          disabled={isLoading || isRefetching}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl border border-neutral-200 text-neutral-600 bg-neutral-50 hover:bg-neutral-100 disabled:opacity-50 transition"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${isRefetching ? 'animate-spin' : ''}`} />
          Refresh Registry
        </button>
      </div>

      {/* Aggregate Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white p-4 border border-neutral-200 rounded-2xl text-center">
          <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider block">Attendance Rate</span>
          <span className="text-2xl font-black text-emerald-600 font-display mt-1 block">
            {attendance?.summary?.attendance_percentage || 0}%
          </span>
        </div>
        <div className="bg-white p-4 border border-neutral-200 rounded-2xl text-center">
          <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider block">Present Days</span>
          <span className="text-2xl font-black text-neutral-700 font-display mt-1 block">
            {attendance?.summary?.present_days || 0}
          </span>
        </div>
        <div className="bg-white p-4 border border-neutral-200 rounded-2xl text-center">
          <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider block">Absent Days</span>
          <span className="text-2xl font-black text-red-500 font-display mt-1 block">
            {attendance?.summary?.absent_days || 0}
          </span>
        </div>
        <div className="bg-white p-4 border border-neutral-200 rounded-2xl text-center">
          <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider block">Late Days</span>
          <span className="text-2xl font-black text-amber-500 font-display mt-1 block">
            {attendance?.summary?.late_days || 0}
          </span>
        </div>
      </div>

      {/* Attendance Logs Table */}
      <div className="bg-white border border-neutral-200 rounded-2xl overflow-hidden shadow-sm">
        <div className="px-5 py-4 border-b border-neutral-200">
          <h3 className="text-xs font-bold text-neutral-400 uppercase tracking-wider font-display">Daily Attendance Logs</h3>
        </div>
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20 space-y-3">
            <span className="border-2 border-primary border-t-transparent w-8 h-8 rounded-full animate-spin"></span>
            <span className="text-xs font-semibold text-neutral-450 font-display animate-pulse">Loading daily logs...</span>
          </div>
        ) : attendance?.logs && attendance.logs.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-neutral-50 text-neutral-500 font-bold uppercase border-b border-neutral-200">
                <tr>
                  <th className="px-5 py-3 font-display">Log Date</th>
                  <th className="px-5 py-3 font-display">Session Segment</th>
                  <th className="px-5 py-3 font-display">Register Status</th>
                  <th className="px-5 py-3 font-display">Teacher Remarks</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100 font-medium">
                {attendance.logs.map((log, idx) => (
                  <tr key={idx} className="hover:bg-neutral-50/50 transition">
                    <td className="px-5 py-3.5 font-semibold text-neutral-800">
                      {new Date(log.date).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}
                    </td>
                    <td className="px-5 py-3.5 text-neutral-600 capitalize">
                      {log.session_type}
                    </td>
                    <td className="px-5 py-3.5">
                      {log.status === 'P' && (
                        <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-600 bg-emerald-50 border border-emerald-250 w-max px-2.5 py-0.5 rounded-full">
                          <CheckCircle className="h-3.5 w-3.5" /> Present
                        </span>
                      )}
                      {log.status === 'A' && (
                        <span className="flex items-center gap-1 text-[10px] font-bold text-red-600 bg-red-50 border border-red-250 w-max px-2.5 py-0.5 rounded-full">
                          <XCircle className="h-3.5 w-3.5" /> Absent
                        </span>
                      )}
                      {log.status === 'L' && (
                        <span className="flex items-center gap-1 text-[10px] font-bold text-amber-600 bg-amber-50 border border-amber-250 w-max px-2.5 py-0.5 rounded-full">
                          <AlertCircle className="h-3.5 w-3.5" /> Late
                        </span>
                      )}
                      {log.status === 'H' && (
                        <span className="flex items-center gap-1 text-[10px] font-bold text-neutral-600 bg-neutral-50 border border-neutral-250 w-max px-2.5 py-0.5 rounded-full">
                          <Calendar className="h-3.5 w-3.5" /> Holiday
                        </span>
                      )}
                    </td>
                    <td className="px-5 py-3.5 text-neutral-450 italic">
                      {log.remarks || 'No remarks provided'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-20 text-neutral-450 text-xs font-semibold">
            No attendance register records seeded for this child profile.
          </div>
        )}
      </div>
    </div>
  );
}
