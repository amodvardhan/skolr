import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { 
  Calendar, 
  TrendingUp, 
  UserCheck, 
  UserX,
  Loader2,
  AlertCircle,
  BarChart3,
  CalendarDays
} from 'lucide-react';
import { studentApi } from '../../students/api/studentApi';
import { attendanceApi } from '../api/attendanceApi';

export function AttendanceSummaryPage() {
  // Select past 30 days by default
  const todayStr = new Date().toISOString().split('T')[0];
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const thirtyDaysAgoStr = thirtyDaysAgo.toISOString().split('T')[0];

  const [selectedClassId, setSelectedClassId] = useState<string>('');
  const [startDate, setStartDate] = useState<string>(thirtyDaysAgoStr);
  const [endDate, setEndDate] = useState<string>(todayStr);

  // Fetch classes
  const { data: classes = [], isLoading: isLoadingClasses } = useQuery({
    queryKey: ['classes'],
    queryFn: studentApi.classes,
  });

  // Automatically select first class
  if (classes.length > 0 && !selectedClassId) {
    setSelectedClassId(classes[0].id);
  }

  // Fetch class summary stats
  const { data: summaryResponse, isLoading: isLoadingSummary, error } = useQuery({
    queryKey: ['class-attendance-summary', selectedClassId, startDate, endDate],
    queryFn: () => attendanceApi.getClassSummary(selectedClassId, startDate, endDate),
    enabled: !!selectedClassId && !!startDate && !!endDate,
  });

  const dailyRecords = summaryResponse?.data || [];

  // Calculate aggregates
  const totalDays = dailyRecords.length;
  
  const aggregates = dailyRecords.reduce(
    (acc: { present: number; absent: number; late: number; total: number; ratesSum: number }, record: any) => {
      const rate = record.total_count > 0 ? (record.present_count / record.total_count) * 100 : 100;
      return {
        present: acc.present + record.present_count,
        absent: acc.absent + record.absent_count,
        late: acc.late + record.late_count,
        total: acc.total + record.total_count,
        ratesSum: acc.ratesSum + rate,
      };
    },
    { present: 0, absent: 0, late: 0, total: 0, ratesSum: 0 }
  );

  const avgAttendanceRate = totalDays > 0 ? Math.round(aggregates.ratesSum / totalDays) : 100;
  const avgPresent = totalDays > 0 ? Math.round(aggregates.present / totalDays) : 0;
  const avgAbsent = totalDays > 0 ? Math.round(aggregates.absent / totalDays) : 0;

  const activeClass = classes.find((c: any) => c.id === selectedClassId);

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="page-header">
        <div>
          <h2 className="text-2xl font-bold font-display text-neutral-900">Attendance Analytics</h2>
          <p className="text-sm text-neutral-500 font-sans">View class performance metrics and historical stats.</p>
        </div>
      </div>

      {/* Filter Options */}
      <div className="card grid grid-cols-1 md:grid-cols-4 gap-4 py-5">
        <div>
          <label className="block text-xs font-semibold uppercase text-neutral-500 mb-1.5">Class</label>
          <select
            value={selectedClassId}
            onChange={(e) => setSelectedClassId(e.target.value)}
            disabled={isLoadingClasses}
            className="input-field bg-white"
          >
            {isLoadingClasses ? (
              <option>Loading...</option>
            ) : (
              classes.map((c: any) => (
                <option key={c.id} value={c.id}>
                  {c.name} - Section {c.section}
                </option>
              ))
            )}
          </select>
        </div>

        <div>
          <label className="block text-xs font-semibold uppercase text-neutral-500 mb-1.5">Start Date</label>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="input-field"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold uppercase text-neutral-500 mb-1.5">End Date</label>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="input-field"
          />
        </div>

        <div className="flex items-end">
          <div className="text-xs text-neutral-450 p-2 border border-neutral-100 rounded-lg bg-neutral-50 w-full text-center">
            Class Size: <span className="font-bold text-neutral-800">{dailyRecords[0]?.total_count || '-'}</span>
          </div>
        </div>
      </div>

      {/* Metrics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metric 1 */}
        <div className="card flex items-center gap-4 bg-gradient-to-br from-blue-500/5 to-primary-light/5 hover:border-primary/20 transition duration-200">
          <div className="p-3.5 bg-primary/10 rounded-xl text-primary shrink-0">
            <TrendingUp className="h-6 w-6" />
          </div>
          <div>
            <div className="text-2xl font-bold text-neutral-900 tracking-tight">{avgAttendanceRate}%</div>
            <div className="text-xs font-semibold text-neutral-500 uppercase tracking-wide">Avg Attendance</div>
          </div>
        </div>

        {/* Metric 2 */}
        <div className="card flex items-center gap-4 bg-gradient-to-br from-emerald-500/5 to-emerald-600/5 hover:border-emerald-500/20 transition duration-200">
          <div className="p-3.5 bg-emerald-500/10 rounded-xl text-emerald-600 shrink-0">
            <UserCheck className="h-6 w-6" />
          </div>
          <div>
            <div className="text-2xl font-bold text-neutral-900 tracking-tight">{avgPresent}</div>
            <div className="text-xs font-semibold text-neutral-500 uppercase tracking-wide">Avg Present / Day</div>
          </div>
        </div>

        {/* Metric 3 */}
        <div className="card flex items-center gap-4 bg-gradient-to-br from-rose-500/5 to-rose-600/5 hover:border-rose-500/20 transition duration-200">
          <div className="p-3.5 bg-rose-500/10 rounded-xl text-rose-600 shrink-0">
            <UserX className="h-6 w-6" />
          </div>
          <div>
            <div className="text-2xl font-bold text-neutral-900 tracking-tight">{avgAbsent}</div>
            <div className="text-xs font-semibold text-neutral-500 uppercase tracking-wide">Avg Absent / Day</div>
          </div>
        </div>

        {/* Metric 4 */}
        <div className="card flex items-center gap-4 bg-gradient-to-br from-amber-500/5 to-amber-600/5 hover:border-amber-500/20 transition duration-200">
          <div className="p-3.5 bg-amber-500/10 rounded-xl text-amber-600 shrink-0">
            <CalendarDays className="h-6 w-6" />
          </div>
          <div>
            <div className="text-2xl font-bold text-neutral-900 tracking-tight">{totalDays}</div>
            <div className="text-xs font-semibold text-neutral-500 uppercase tracking-wide">Total Days Logged</div>
          </div>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 text-danger border border-red-200 rounded-xl px-5 py-4 flex items-center gap-3">
          <AlertCircle className="h-5 w-5 shrink-0" />
          <span className="text-sm font-medium">Failed to fetch summary logs. Is server running?</span>
        </div>
      )}

      {isLoadingSummary ? (
        <div className="card flex flex-col items-center justify-center py-20 space-y-3">
          <Loader2 className="h-10 w-10 text-primary animate-spin" />
          <span className="text-sm text-neutral-500 font-medium">Loading summary graphs...</span>
        </div>
      ) : dailyRecords.length === 0 ? (
        <div className="card py-16 text-center text-neutral-500">
          <BarChart3 className="h-12 w-12 mx-auto text-neutral-300 mb-3" />
          <h4 className="font-semibold text-neutral-800 text-lg">No Historical Logs Found</h4>
          <p className="text-sm text-neutral-500 max-w-sm mx-auto mt-1">
            There are no attendance registers logged for Class {activeClass?.name} Section {activeClass?.section} in the selected date range.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Custom SVG/Bar Chart Visualisation */}
          <div className="card lg:col-span-2 space-y-6">
            <h3 className="section-title flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-neutral-500" /> Attendance Trends (%)
            </h3>

            {/* Premium styled custom chart bars */}
            <div className="h-64 flex items-end justify-between border-b border-neutral-200 pb-2 gap-1.5 sm:gap-3 overflow-x-auto min-w-[280px]">
              {dailyRecords.map((r: any, idx: number) => {
                const percent = r.total_count > 0 ? Math.round((r.present_count / r.total_count) * 100) : 100;
                return (
                  <div key={idx} className="flex flex-col items-center flex-1 min-w-[24px] group relative h-full justify-end">
                    {/* Tooltip on Hover */}
                    <div className="absolute bottom-full mb-2 bg-neutral-900 text-white text-[10px] rounded px-2 py-1 opacity-0 group-hover:opacity-100 transition duration-150 pointer-events-none whitespace-nowrap z-20 shadow-md">
                      <div>Date: {new Date(r.date).toLocaleDateString()}</div>
                      <div>Present: {r.present_count}</div>
                      <div>Absent: {r.absent_count}</div>
                      <div className="font-bold text-emerald-400">Rate: {percent}%</div>
                    </div>
                    
                    {/* Percentage height display */}
                    <div className="text-[10px] font-semibold text-neutral-400 opacity-0 group-hover:opacity-100 transition mb-1">
                      {percent}%
                    </div>
                    
                    {/* Vertical Bar */}
                    <div 
                      style={{ height: `${percent}%` }}
                      className={`w-full rounded-t-md transition duration-300 min-h-[4px] cursor-pointer ${
                        percent >= 90 
                          ? 'bg-emerald-500 hover:bg-emerald-400' 
                          : percent >= 75 
                          ? 'bg-blue-500 hover:bg-blue-400' 
                          : percent >= 60 
                          ? 'bg-amber-500 hover:bg-amber-400' 
                          : 'bg-rose-500 hover:bg-rose-400'
                      }`}
                    />
                    
                    {/* Day label */}
                    <div className="text-[8px] font-mono text-neutral-500 mt-2 truncate w-full text-center">
                      {new Date(r.date).getDate()}
                    </div>
                  </div>
                );
              })}
            </div>
            
            {/* Legend info */}
            <div className="flex flex-wrap items-center justify-center gap-4 text-xs font-semibold">
              <span className="flex items-center gap-1.5"><span className="h-3 w-3 rounded bg-emerald-500" /> Excellent (&gt;=90%)</span>
              <span className="flex items-center gap-1.5"><span className="h-3 w-3 rounded bg-blue-500" /> Good (75-89%)</span>
              <span className="flex items-center gap-1.5"><span className="h-3 w-3 rounded bg-amber-500" /> Warning (60-74%)</span>
              <span className="flex items-center gap-1.5"><span className="h-3 w-3 rounded bg-rose-500" /> Critical (&lt;60%)</span>
            </div>
          </div>

          {/* Roster Listing */}
          <div className="card space-y-4">
            <h3 className="section-title flex items-center gap-2">
              <Calendar className="h-5 w-5 text-neutral-500" /> Historical Logs
            </h3>
            
            <div className="space-y-2.5 overflow-y-auto max-h-[280px] pr-1">
              {dailyRecords.map((r: any, idx: number) => {
                const percent = r.total_count > 0 ? Math.round((r.present_count / r.total_count) * 100) : 100;
                return (
                  <div key={idx} className="flex items-center justify-between border border-neutral-100 rounded-lg p-2.5 bg-neutral-50/50 hover:bg-white hover:shadow-sm transition duration-150">
                    <div>
                      <div className="font-semibold text-neutral-800 text-xs sm:text-sm">
                        {new Date(r.date).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}
                      </div>
                      <div className="text-[10px] text-neutral-500 font-medium">
                        Present: {r.present_count} | Absent: {r.absent_count}
                      </div>
                    </div>
                    
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold ${
                      percent >= 90 
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-250' 
                        : percent >= 75 
                        ? 'bg-blue-50 text-blue-700 border border-blue-200' 
                        : 'bg-rose-50 text-rose-700 border border-rose-200'
                    }`}>
                      {percent}%
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
