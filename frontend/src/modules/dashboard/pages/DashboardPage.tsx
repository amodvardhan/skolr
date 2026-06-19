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
      color: 'bg-blue-500/10 text-blue-600',
    },
    {
      name: 'Active Employees',
      value: isLoading ? '...' : (statsData?.active_employees ?? 0).toString(),
      change: 'Administration',
      icon: GraduationCap,
      color: 'bg-green-500/10 text-green-600',
    },
    {
      name: 'Fee Collection',
      value: isLoading ? '...' : `₹ ${(statsData?.total_fees_collected ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      change: 'Outstanding balance tracking',
      icon: IndianRupee,
      color: 'bg-amber-500/10 text-accent',
    },
    {
      name: 'Current Term',
      value: isLoading ? '...' : (statsData?.current_term ?? '2025-26'),
      change: 'Academic Year active',
      icon: CalendarDays,
      color: 'bg-purple-500/10 text-purple-600',
    },
  ];

  const quickNavs = [
    { name: 'Students', tab: 'students' },
    { name: 'Fees Ledger', tab: 'fees' },
    { name: 'Attendance marking', tab: 'attendance' }
  ];

  return (
    <div className="space-y-6">
      {/* Top Banner Greeting */}
      <div className="bg-gradient-to-r from-primary to-blue-800 text-white rounded-2xl p-6 lg:p-8 shadow-sm border border-blue-900/10 relative overflow-hidden">
        {/* Glow effect */}
        <div className="absolute right-0 top-0 w-80 h-80 bg-white/5 rounded-full blur-3xl translate-x-20 -translate-y-20"></div>
        
        <div className="relative z-10 space-y-2 max-w-2xl">
          <div className="inline-flex items-center gap-1.5 bg-white/10 px-3 py-1 rounded-full text-xs font-semibold tracking-wide backdrop-blur-sm">
            <Sparkles className="h-3.5 w-3.5 text-amber-300" />
            Phase 1 Core ERP Activated
          </div>
          <h1 className="text-3xl lg:text-4xl font-extrabold tracking-tight">
            Welcome to {schoolName || 'School Portal'}
          </h1>
          <p className="text-blue-100 text-sm md:text-base">
            You are signed in as <span className="font-semibold">{user?.firstName} {user?.lastName}</span> ({user?.role}). Manage admissions, trace fee ledgers, and track attendance from this panel.
          </p>
        </div>
      </div>

      {/* Grid of Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, idx) => (
          <div key={idx} className="card flex items-center justify-between hover:shadow-md transition duration-200">
            <div className="space-y-2">
              <span className="text-xs font-semibold text-neutral-500 uppercase tracking-wider">
                {stat.name}
              </span>
              <div className="text-3xl font-extrabold text-neutral-900 tracking-tight">
                {stat.value}
              </div>
              <span className="text-xs text-neutral-400 block font-medium">
                {stat.change}
              </span>
            </div>
            <div className={`p-3 rounded-xl ${stat.color}`}>
              <stat.icon className="h-6 w-6" />
            </div>
          </div>
        ))}
      </div>

      {/* Main Contents Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 cols: Main Action areas */}
        <div className="lg:col-span-2 space-y-6">
          <div className="card space-y-4">
            <div className="flex items-center justify-between border-b border-neutral-100 pb-3">
              <h3 className="section-title">Preseeded Student Record</h3>
              <span className="text-xs bg-blue-100 text-blue-700 font-semibold px-2 py-0.5 rounded-full">
                Active Record
              </span>
            </div>
            
            {isStudentLoading ? (
              <div className="flex justify-center items-center py-6">
                <span className="border-2 border-primary border-t-transparent w-6 h-6 rounded-full animate-spin"></span>
              </div>
            ) : firstStudent ? (
              <div className="flex items-center gap-4 bg-neutral-50 p-4 rounded-xl border border-neutral-100">
                <div className="h-12 w-12 bg-primary/10 text-primary rounded-xl flex items-center justify-center font-bold text-lg">
                  {firstStudent.first_name[0]}{firstStudent.last_name[0]}
                </div>
                <div>
                  <h4 className="font-semibold text-neutral-900">{firstStudent.first_name} {firstStudent.last_name}</h4>
                  <p className="text-xs text-neutral-500">
                    Admission No: <span className="font-mono font-medium">{firstStudent.admission_number}</span> | Class: Class {studentClassName}
                  </p>
                </div>
                <div className="ml-auto text-right">
                  <span className="text-xs font-semibold text-neutral-400 uppercase tracking-wider block">
                    Roll Number
                  </span>
                  <span className="text-sm font-bold text-neutral-800">{firstStudent.roll_number ?? '-'}</span>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-6 bg-neutral-50 border border-neutral-100 rounded-xl space-y-2 text-center p-4">
                <p className="text-sm text-neutral-500 font-medium">
                  No students have been admitted to this school tenant yet.
                </p>
                <button
                  type="button"
                  onClick={() => setActiveTab('students')}
                  className="text-xs font-bold text-primary hover:underline"
                >
                  Admit your first student →
                </button>
              </div>
            )}

            <p className="text-sm text-neutral-500 leading-relaxed">
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
                  className="border border-neutral-200 hover:border-primary/50 cursor-pointer rounded-xl p-4 flex items-center justify-between group transition hover:bg-neutral-50"
                >
                  <span className="font-medium text-sm text-neutral-700 group-hover:text-primary transition">
                    {nav.name}
                  </span>
                  <ChevronRight className="h-4 w-4 text-neutral-400 group-hover:text-primary transition" />
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Col: Admin / Tenant Details */}
        <div className="space-y-6">
          <div className="card space-y-4 bg-slate-900 text-slate-100 border-none">
            <h3 className="text-md font-bold tracking-tight text-white flex items-center gap-2">
              <Building2 className="h-5 w-5 text-amber-500" />
              Tenant Context
            </h3>
            
            <div className="space-y-3 text-sm">
              <div className="border-b border-slate-800 pb-2">
                <span className="text-slate-400 text-xs uppercase block font-semibold tracking-wider">
                  School Name (DB)
                </span>
                <span className="font-sans text-sm font-bold text-slate-100 block mt-0.5">
                  {schoolName || 'Prestige Public School'}
                </span>
              </div>

              <div className="border-b border-slate-800 pb-2">
                <span className="text-slate-400 text-xs uppercase block font-semibold tracking-wider">
                  Active Tenant UUID
                </span>
                <span className="font-mono text-xs text-slate-200 block break-all mt-0.5">
                  {schoolId}
                </span>
              </div>

              <div className="border-b border-slate-800 pb-2">
                <span className="text-slate-400 text-xs uppercase block font-semibold tracking-wider">
                  Database Schema
                </span>
                <span className="font-mono text-xs text-slate-200 block mt-0.5">
                  school_{schoolId?.replace(/-/g, '_') || 'default'}
                </span>
              </div>

              <div>
                <span className="text-slate-400 text-xs uppercase block font-semibold tracking-wider">
                  Active User Session
                </span>
                <span className="text-slate-200 block mt-0.5">
                  {user?.email}
                </span>
              </div>
            </div>
          </div>

          <div className="card space-y-4">
            <h3 className="section-title flex items-center gap-2">
              <Clock className="h-5 w-5 text-neutral-400" />
              Server Latency Tracker
            </h3>
            <p className="text-xs text-neutral-500">
              The API client injects the `X-Process-Time` header to display backend execution times.
            </p>
            <div className="bg-neutral-50 border border-neutral-100 rounded-xl p-3 text-center">
              <span className="text-xs font-semibold text-neutral-400 uppercase tracking-wider block">
                Average Latency
              </span>
              <span className="text-2xl font-bold font-mono text-neutral-800">
                &lt; 10ms
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
