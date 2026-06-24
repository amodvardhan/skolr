import { useQuery } from '@tanstack/react-query';
import { 
  Users, 
  GraduationCap, 
  CalendarDays, 
  IndianRupee, 
  Clock, 
  Building2,
  ChevronRight,
  Sparkles
} from 'lucide-react';

import { useAuthStore } from '../../../stores/authStore';
import { useTenantStore } from '../../../stores/tenantStore';
import { useUIStore } from '../../../stores/uiStore';
import { dashboardApi } from '../api/dashboardApi';
import { studentApi } from '../../students/api/studentApi';

export function DashboardPage() {
  const user = useAuthStore((state) => state.user);
  const schoolId = useAuthStore((state) => state.schoolId);
  const schoolName = useTenantStore((state) => state.schoolName);
  const setActiveTab = useUIStore((state) => state.setActiveTab);

  // Fetch live stats from API
  const { data: statsData, isLoading } = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: dashboardApi.getStats,
  });

  // Fetch first student to display as active record
  const { data: studentListData, isLoading: isStudentLoading } = useQuery({
    queryKey: ['dashboard-first-student'],
    queryFn: () => studentApi.list({ page: 1, per_page: 1 }),
  });

  // Fetch classes to resolve the class name
  const { data: classesData } = useQuery({
    queryKey: ['dashboard-classes'],
    queryFn: studentApi.classes,
  });

  const firstStudent = studentListData?.data?.[0];
  const matchedClass = firstStudent && classesData 
    ? classesData.find((c: any) => c.id === firstStudent.class_id)
    : null;
  const studentClassName = matchedClass 
    ? `${matchedClass.name}-${matchedClass.section}`
    : 'Not Assigned';

  const stats = [
    {
      name: 'Total Enrolled Students',
      value: isLoading ? '...' : (statsData?.total_students ?? 0).toString(),
      change: 'Active status',
      icon: Users,
      color: 'bg-blue-50 text-blue-700 border-blue-100',
    },
    {
      name: 'Active Employees',
      value: isLoading ? '...' : (statsData?.active_employees ?? 0).toString(),
      change: 'Administration',
      icon: GraduationCap,
      color: 'bg-emerald-50 text-emerald-700 border-emerald-100',
    },
    {
      name: 'Fee Collection',
      value: isLoading ? '...' : `₹ ${(statsData?.total_fees_collected ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      change: 'Outstanding tracking',
      icon: IndianRupee,
      color: 'bg-amber-55 text-amber-700 border-amber-100',
    },
    {
      name: 'Current Term',
      value: isLoading ? '...' : (statsData?.current_term ?? '2025-26'),
      change: 'Academic Year active',
      icon: CalendarDays,
      color: 'bg-indigo-50 text-indigo-700 border-indigo-100',
    },
  ];

  const quickNavs = [
    { name: 'Students Directory', tab: 'students' },
    { name: 'Fees Ledger', tab: 'fees' },
    { name: 'Attendance marking', tab: 'attendance' }
  ];

  return (
    <div className="space-y-6">
      {/* Top Banner Greeting */}
      <div className="bg-gradient-to-r from-blue-700 via-indigo-850 to-indigo-950 text-white rounded-2xl p-6 lg:p-8 shadow-sm border border-blue-900/10 relative overflow-hidden">
        {/* Glow effect */}
        <div className="absolute right-0 top-0 w-80 h-80 bg-white/5 rounded-full blur-3xl translate-x-20 -translate-y-20"></div>
        
        <div className="relative z-10 space-y-3.5 max-w-2xl">
          <div className="inline-flex items-center gap-1.5 bg-white/10 px-3 py-1 rounded-full text-[10px] font-bold tracking-wider uppercase border border-white/10 backdrop-blur-sm">
            <Sparkles className="h-3.5 w-3.5 text-amber-300" />
            Phase 1 Core ERP Activated
          </div>
          <h1 className="text-2xl lg:text-3xl font-extrabold tracking-tight font-display text-white">
            Welcome to {schoolName || 'School Portal'}
          </h1>
          <p className="text-slate-200 text-sm leading-relaxed font-sans font-medium">
            You are signed in as <span className="font-bold text-white">{user?.firstName} {user?.lastName}</span> ({user?.role}). Manage student details, trace fee ledgers, and check daily attendance rosters.
          </p>
        </div>
      </div>

      {/* Grid of Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, idx) => (
          <div key={idx} className="card flex items-center justify-between hover:shadow-md hover:border-slate-300 transition-all duration-300 hover:scale-101">
            <div className="space-y-1.5">
              <span className="text-[10px] font-bold text-slate-450 uppercase tracking-widest block font-sans">
                {stat.name}
              </span>
              <div className="text-2xl font-black text-slate-900 tracking-tight font-display">
                {stat.value}
              </div>
              <span className="text-[11px] text-slate-400 font-semibold font-sans block">
                {stat.change}
              </span>
            </div>
            <div className={`p-3 rounded-xl border shrink-0 flex items-center justify-center ${stat.color}`}>
              <stat.icon className="h-5.5 w-5.5" />
            </div>
          </div>
        ))}
      </div>

      {/* Main Contents Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 cols: Main Action areas */}
        <div className="lg:col-span-2 space-y-6">
          <div className="card space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="section-title">Preseeded Student Record</h3>
              <span className="text-[10px] font-bold bg-blue-50 text-blue-700 px-2.5 py-0.5 rounded-full border border-blue-100 font-mono">
                ACTIVE
              </span>
            </div>
            
            {isStudentLoading ? (
              <div className="flex justify-center items-center py-6">
                <span className="border-2 border-blue-600 border-t-transparent w-5 h-5 rounded-full animate-spin"></span>
              </div>
            ) : firstStudent ? (
              <div className="flex items-center gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200/60 transition hover:bg-slate-100/50">
                <div className="h-12 w-12 bg-blue-100 text-blue-700 border border-blue-200 rounded-xl flex items-center justify-center font-bold text-base font-display shadow-sm">
                  {firstStudent.first_name[0]}{firstStudent.last_name[0]}
                </div>
                <div>
                  <h4 className="font-bold text-slate-900 text-sm font-display">{firstStudent.first_name} {firstStudent.last_name}</h4>
                  <p className="text-xs text-slate-500 font-sans mt-0.5 font-medium">
                    Admission: <span className="font-mono font-bold text-slate-700">{firstStudent.admission_number}</span> | Class {studentClassName}
                  </p>
                </div>
                <div className="ml-auto text-right">
                  <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block font-sans">
                    Roll Number
                  </span>
                  <span className="text-sm font-bold text-slate-800 font-mono">{firstStudent.roll_number ?? '-'}</span>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-6 bg-slate-50 border border-slate-200/60 rounded-xl space-y-2 text-center p-4">
                <p className="text-xs text-slate-500 font-bold font-sans">
                  No students have been admitted to this school tenant yet.
                </p>
                <button
                  type="button"
                  onClick={() => setActiveTab('students')}
                  className="text-xs font-bold text-blue-700 hover:underline cursor-pointer"
                >
                  Admit your first student →
                </button>
              </div>
            )}

            <p className="text-xs text-slate-550 leading-relaxed font-medium">
              This record is loaded directly from your dynamic tenant schema (`school_${schoolId?.replace(/-/g, '_') || 'default'}`) using the search path interceptor in our FastAPI application.
            </p>
          </div>

          <div className="card space-y-4">
            <h3 className="section-title">Quick Navigation Check</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {quickNavs.map((nav, i) => (
                <div 
                  key={i} 
                  onClick={() => setActiveTab(nav.tab)}
                  className="border border-slate-200 hover:border-blue-600/50 hover:bg-blue-50/10 cursor-pointer rounded-xl p-4 flex items-center justify-between group transition duration-200"
                >
                  <span className="font-bold text-xs text-slate-700 group-hover:text-blue-700 transition">
                    {nav.name}
                  </span>
                  <ChevronRight className="h-4.5 w-4.5 text-slate-450 group-hover:text-blue-700 transition transform group-hover:translate-x-0.5 duration-200" />
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Col: Admin / Tenant Details */}
        <div className="space-y-6">
          <div className="card space-y-4 bg-slate-900 border border-slate-950 text-slate-200 relative overflow-hidden">
            {/* Soft decorative visual badge */}
            <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500/5 rounded-full blur-xl translate-x-4 -translate-y-4"></div>

            <h3 className="text-sm font-bold tracking-tight text-white flex items-center gap-2 border-b border-slate-800 pb-3 font-display">
              <Building2 className="h-4.5 w-4.5 text-amber-500" />
              Tenant Context
            </h3>
            
            <div className="space-y-3.5 text-xs font-sans font-medium">
              <div>
                <span className="text-slate-450 text-[10px] uppercase block font-bold tracking-wider">
                  School Name (DB)
                </span>
                <span className="text-sm font-bold text-white block mt-0.5">
                  {schoolName || 'Prestige Public School'}
                </span>
              </div>

              <div>
                <span className="text-slate-450 text-[10px] uppercase block font-bold tracking-wider">
                  Active Tenant UUID
                </span>
                <span className="font-mono text-xs text-slate-300 block break-all mt-0.5">
                  {schoolId}
                </span>
              </div>

              <div>
                <span className="text-slate-450 text-[10px] uppercase block font-bold tracking-wider">
                  Database Schema
                </span>
                <span className="font-mono text-xs text-slate-350 block mt-0.5">
                  school_{schoolId?.replace(/-/g, '_') || 'default'}
                </span>
              </div>

              <div className="pt-2 border-t border-slate-800/80">
                <span className="text-slate-450 text-[10px] uppercase block font-bold tracking-wider">
                  Active User Session
                </span>
                <span className="text-slate-300 block mt-0.5">
                  {user?.email}
                </span>
              </div>
            </div>
          </div>

          <div className="card space-y-4">
            <h3 className="section-title flex items-center gap-2">
              <Clock className="h-4.5 w-4.5 text-slate-450" />
              Server Connection
            </h3>
            <p className="text-xs text-slate-500 leading-relaxed font-medium">
              The API client injects the `X-Process-Time` header to display backend execution times.
            </p>
            <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-4 text-center">
              <span className="text-[10px] font-bold text-slate-450 uppercase tracking-widest block">
                Average Latency
              </span>
              <span className="text-xl font-bold font-mono text-slate-800 mt-1 block">
                &lt; 10ms
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
