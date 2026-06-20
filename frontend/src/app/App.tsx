import { useEffect, useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { 
  GraduationCap, 
  LayoutDashboard, 
  Users, 
  CalendarCheck, 
  IndianRupee, 
  LogOut, 
  ChevronLeft, 
  Menu,
  Globe,
  Settings,
  Contact,
  BookOpen,
  MessageSquare,
  ShieldCheck
} from 'lucide-react';

import { SubjectConfigPage } from '../modules/academics/pages/SubjectConfigPage';
import { HomeworkListPage } from '../modules/academics/pages/HomeworkListPage';
import { HomeworkDetailPage } from '../modules/academics/pages/HomeworkDetailPage';
import { ExamSchedulePage } from '../modules/exams/pages/ExamSchedulePage';
import { MarksEntryPage } from '../modules/exams/pages/MarksEntryPage';
import { GradeScalePage } from '../modules/exams/pages/GradeScalePage';
import { AnnouncementsPage } from '../modules/notifications/pages/AnnouncementsPage';
import { NotificationLogsPage } from '../modules/notifications/pages/NotificationLogsPage';
import { CBSECompliancePage } from '../modules/cbse/pages/CBSECompliancePage';


import { useAuthStore } from '../stores/authStore';
import { useUIStore } from '../stores/uiStore';
import { useTenantStore } from '../stores/tenantStore';
import { LoginPage } from '../modules/auth/pages/LoginPage';
import { OnboardingPage } from '../modules/auth/pages/OnboardingPage';
import { SettingsPage } from '../modules/settings/pages/SettingsPage';
import { DashboardPage } from '../modules/dashboard/pages/DashboardPage';
import { StudentListPage } from '../modules/students/pages/StudentListPage';
import { StudentFormPage } from '../modules/students/pages/StudentFormPage';
import { StudentDetailPage } from '../modules/students/pages/StudentDetailPage';
import { AttendanceMarkPage } from '../modules/attendance/pages/AttendanceMarkPage';
import { AttendanceSummaryPage } from '../modules/attendance/pages/AttendanceSummaryPage';
import { FeeStructurePage } from '../modules/fees/pages/FeeStructurePage';
import { FeeCollectPage } from '../modules/fees/pages/FeeCollectPage';
import { FeeDefaultersPage } from '../modules/fees/pages/FeeDefaultersPage';
import { FeeDashboardPage } from '../modules/fees/pages/FeeDashboardPage';
import { EmployeeListPage } from '../modules/employees/pages/EmployeeListPage';
import { EmployeeFormPage } from '../modules/employees/pages/EmployeeFormPage';
import { EmployeeDetailPage } from '../modules/employees/pages/EmployeeDetailPage';

// Create a client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

function MainAppContent() {
  const { isAuthenticated, logout, user } = useAuthStore();
  const { sidebarOpen, toggleSidebar, activeTab, setActiveTab } = useUIStore();
  const { resolveTenant, loading, schoolName } = useTenantStore();
  
  // Navigation tabs state is now managed globally
  const [authView, setAuthView] = useState<'login' | 'onboard'>('login');
  
  // Student module inner navigation state
  const [studentView, setStudentView] = useState<'list' | 'form' | 'details'>('list');
  const [selectedStudentId, setSelectedStudentId] = useState<string>('');
  
  // Attendance module inner navigation state
  const [attendanceView, setAttendanceView] = useState<'mark' | 'analytics'>('mark');
  
  // Fees module inner navigation state
  const [feesView, setFeesView] = useState<'dashboard' | 'defaulters' | 'collect' | 'structure'>('dashboard');
  const [selectedFeeStudentId, setSelectedFeeStudentId] = useState<string>('');

  // Employee module inner navigation state
  const [employeeView, setEmployeeView] = useState<'list' | 'form' | 'details'>('list');
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>('');

  // Academics module inner navigation state
  const [academicsView, setAcademicsView] = useState<'homework' | 'subjects'>('homework');
  const [academicsSubView, setAcademicsSubView] = useState<'list' | 'details'>('list');
  const [selectedHomeworkId, setSelectedHomeworkId] = useState<string>('');

  // Exams module inner navigation state
  const [examsView, setExamsView] = useState<'schedule' | 'marks' | 'grades'>('schedule');

  // Notifications module inner navigation state
  const [notificationsView, setNotificationsView] = useState<'broadcast' | 'logs'>('broadcast');

  useEffect(() => {
    resolveTenant();
  }, [resolveTenant]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-slate-200">
        <GraduationCap className="h-12 w-12 text-amber-500 animate-bounce mb-4" />
        <p className="text-sm font-medium animate-pulse font-display">Resolving School Portal...</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    if (authView === 'onboard') {
      return <OnboardingPage onBackToLogin={() => setAuthView('login')} />;
    }
    return <LoginPage onGoToOnboard={() => setAuthView('onboard')} />;
  }

  const navItems = [
    { id: 'dashboard', name: 'Dashboard', icon: LayoutDashboard },
    { id: 'students', name: 'Students', icon: Users },
    { id: 'attendance', name: 'Attendance', icon: CalendarCheck },
    { id: 'fees', name: 'Fees Ledger', icon: IndianRupee },
    { id: 'academics', name: 'Academics', icon: BookOpen },
    { id: 'exams', name: 'Exams & Grades', icon: GraduationCap },
    { id: 'notifications', name: 'Announcements', icon: MessageSquare },
    { id: 'cbse', name: 'CBSE Compliance', icon: ShieldCheck },
    { id: 'website', name: 'Website Builder', icon: Globe },
    ...(user?.role === 'school_admin' ? [
      { id: 'employees', name: 'Staff Directory', icon: Contact },
      { id: 'settings', name: 'Settings', icon: Settings }
    ] : []),
  ];

  // Helper to render body based on active tab
  const renderTabContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return <DashboardPage />;
      case 'students':
        if (studentView === 'form') {
          return (
            <StudentFormPage 
              onCancel={() => setStudentView('list')} 
              onSuccess={() => setStudentView('list')} 
            />
          );
        }
        if (studentView === 'details' && selectedStudentId) {
          return (
            <StudentDetailPage 
              studentId={selectedStudentId} 
              onBack={() => setStudentView('list')} 
            />
          );
        }
        return (
          <StudentListPage 
            onAdmitClick={() => setStudentView('form')} 
            onViewDetails={(id) => {
              setSelectedStudentId(id);
              setStudentView('details');
            }} 
          />
        );
      case 'attendance':
        return (
          <div className="space-y-6">
            <div className="flex border-b border-neutral-200 gap-6">
              <button 
                onClick={() => setAttendanceView('mark')}
                className={`pb-3 text-sm font-semibold border-b-2 px-1 transition duration-150 ${
                  attendanceView === 'mark' 
                    ? 'border-primary text-primary' 
                    : 'border-transparent text-neutral-500 hover:text-neutral-900'
                }`}
              >
                Mark Register
              </button>
              <button 
                onClick={() => setAttendanceView('analytics')}
                className={`pb-3 text-sm font-semibold border-b-2 px-1 transition duration-150 ${
                  attendanceView === 'analytics' 
                    ? 'border-primary text-primary' 
                    : 'border-transparent text-neutral-500 hover:text-neutral-900'
                }`}
              >
                Analytics & History
              </button>
            </div>
            {attendanceView === 'mark' ? <AttendanceMarkPage /> : <AttendanceSummaryPage />}
          </div>
        );
      case 'fees':
        return (
          <div className="space-y-6">
            <div className="flex border-b border-neutral-200 gap-6">
              <button 
                onClick={() => setFeesView('dashboard')}
                className={`pb-3 text-sm font-semibold border-b-2 px-1 transition duration-150 ${
                  feesView === 'dashboard' 
                    ? 'border-primary text-primary' 
                    : 'border-transparent text-neutral-500 hover:text-neutral-900'
                }`}
              >
                Analytics Dashboard
              </button>
              <button 
                onClick={() => setFeesView('defaulters')}
                className={`pb-3 text-sm font-semibold border-b-2 px-1 transition duration-150 ${
                  feesView === 'defaulters' 
                    ? 'border-primary text-primary' 
                    : 'border-transparent text-neutral-500 hover:text-neutral-900'
                }`}
              >
                Defaulters List
              </button>
              <button 
                onClick={() => setFeesView('collect')}
                className={`pb-3 text-sm font-semibold border-b-2 px-1 transition duration-150 ${
                  feesView === 'collect' 
                    ? 'border-primary text-primary' 
                    : 'border-transparent text-neutral-500 hover:text-neutral-900'
                }`}
              >
                Collect Payment
              </button>
              <button 
                onClick={() => setFeesView('structure')}
                className={`pb-3 text-sm font-semibold border-b-2 px-1 transition duration-150 ${
                  feesView === 'structure' 
                    ? 'border-primary text-primary' 
                    : 'border-transparent text-neutral-500 hover:text-neutral-900'
                }`}
              >
                Fees Configurator
              </button>
            </div>

            {feesView === 'dashboard' && <FeeDashboardPage />}
            {feesView === 'defaulters' && (
              <FeeDefaultersPage 
                onCollectClick={(studentId) => {
                  setSelectedFeeStudentId(studentId);
                  setFeesView('collect');
                }} 
              />
            )}
            {feesView === 'collect' && (
              <FeeCollectPage 
                preSelectedStudentId={selectedFeeStudentId}
                onClearPreSelection={() => setSelectedFeeStudentId('')}
              />
            )}
            {feesView === 'structure' && <FeeStructurePage />}
          </div>
        );
      case 'academics':
        return (
          <div className="space-y-6">
            {academicsSubView === 'details' && selectedHomeworkId ? (
              <HomeworkDetailPage 
                homeworkId={selectedHomeworkId}
                onBack={() => setAcademicsSubView('list')}
              />
            ) : (
              <div className="space-y-6">
                <div className="flex border-b border-neutral-200 gap-6">
                  <button 
                    onClick={() => setAcademicsView('homework')}
                    className={`pb-3 text-sm font-semibold border-b-2 px-1 transition duration-150 ${
                      academicsView === 'homework' 
                        ? 'border-primary text-primary' 
                        : 'border-transparent text-neutral-500 hover:text-neutral-900'
                    }`}
                  >
                    Homework Board
                  </button>
                  {user?.role === 'school_admin' && (
                    <button 
                    onClick={() => setAcademicsView('subjects')}
                    className={`pb-3 text-sm font-semibold border-b-2 px-1 transition duration-150 ${
                      academicsView === 'subjects' 
                        ? 'border-primary text-primary' 
                        : 'border-transparent text-neutral-500 hover:text-neutral-900'
                    }`}
                  >
                    Subject Catalog
                  </button>
                  )}
                </div>
                {academicsView === 'homework' ? (
                  <HomeworkListPage 
                    onViewDetails={(id) => {
                      setSelectedHomeworkId(id);
                      setAcademicsSubView('details');
                    }}
                  />
                ) : (
                  <SubjectConfigPage />
                )}
              </div>
            )}
          </div>
        );
      case 'exams':
        return (
          <div className="space-y-6">
            <div className="flex border-b border-neutral-200 gap-6">
              <button 
                onClick={() => setExamsView('schedule')}
                className={`pb-3 text-sm font-semibold border-b-2 px-1 transition duration-150 ${
                  examsView === 'schedule' 
                    ? 'border-primary text-primary' 
                    : 'border-transparent text-neutral-500 hover:text-neutral-900'
                }`}
              >
                Exam Timetable
              </button>
              <button 
                onClick={() => setExamsView('marks')}
                className={`pb-3 text-sm font-semibold border-b-2 px-1 transition duration-150 ${
                  examsView === 'marks' 
                    ? 'border-primary text-primary' 
                    : 'border-transparent text-neutral-500 hover:text-neutral-900'
                }`}
              >
                Marks Ledger
              </button>
              <button 
                onClick={() => setExamsView('grades')}
                className={`pb-3 text-sm font-semibold border-b-2 px-1 transition duration-150 ${
                  examsView === 'grades' 
                    ? 'border-primary text-primary' 
                    : 'border-transparent text-neutral-500 hover:text-neutral-900'
                }`}
              >
                Grading Scales
              </button>
            </div>

            {examsView === 'schedule' && <ExamSchedulePage />}
            {examsView === 'marks' && <MarksEntryPage />}
            {examsView === 'grades' && <GradeScalePage />}
          </div>
        );
      case 'notifications':
        return (
          <div className="space-y-6">
            <div className="flex border-b border-neutral-200 gap-6">
              <button 
                onClick={() => setNotificationsView('broadcast')}
                className={`pb-3 text-sm font-semibold border-b-2 px-1 transition duration-150 ${
                  notificationsView === 'broadcast' 
                    ? 'border-primary text-primary' 
                    : 'border-transparent text-neutral-500 hover:text-neutral-900'
                }`}
              >
                Send Broadcasts
              </button>
              <button 
                onClick={() => setNotificationsView('logs')}
                className={`pb-3 text-sm font-semibold border-b-2 px-1 transition duration-150 ${
                  notificationsView === 'logs' 
                    ? 'border-primary text-primary' 
                    : 'border-transparent text-neutral-500 hover:text-neutral-900'
                }`}
              >
                Delivery Logs
              </button>
            </div>

            {notificationsView === 'broadcast' ? <AnnouncementsPage /> : <NotificationLogsPage />}
          </div>
        );
      case 'cbse':
        return <CBSECompliancePage />;
      case 'settings':
        return <SettingsPage />;
      case 'employees':
        if (employeeView === 'form') {
          return (
            <EmployeeFormPage 
              onCancel={() => setEmployeeView('list')}
              onSuccess={() => setEmployeeView('list')}
            />
          );
        }
        if (employeeView === 'details' && selectedEmployeeId) {
          return (
            <EmployeeDetailPage 
              employeeId={selectedEmployeeId}
              onBack={() => setEmployeeView('list')}
            />
          );
        }
        return (
          <EmployeeListPage 
            onAddClick={() => setEmployeeView('form')}
            onViewDetails={(id) => {
              setSelectedEmployeeId(id);
              setEmployeeView('details');
            }}
          />
        );
      default:
        return (
          <div className="card text-center py-20">
            <h3 className="section-title mb-2">Module under active construction</h3>
            <p className="text-sm text-neutral-500">
              The {activeTab} module is part of the Phase 1 Core ERP roadmap.
            </p>
          </div>
        );
    }
  };

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden font-sans">
      {/* Sidebar Navigation */}
      <aside 
        className={`bg-slate-900 text-slate-100 flex flex-col justify-between transition-all duration-300 border-r border-slate-800 ${
          sidebarOpen ? 'w-60' : 'w-16'
        }`}
      >
        <div className="space-y-6">
          {/* Sidebar Top: Logo */}
          <div className="h-16 flex items-center px-4 justify-between border-b border-slate-800">
            <div className="flex items-center gap-2.5 overflow-hidden">
              <GraduationCap className="h-7 w-7 text-amber-500 shrink-0" />
              {sidebarOpen && (
                <span className="font-display font-extrabold text-lg tracking-wider text-white">
                  SKOLR
                </span>
              )}
            </div>
            {sidebarOpen && (
              <button 
                onClick={toggleSidebar}
                className="text-slate-400 hover:text-white transition"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
            )}
          </div>

          {/* Nav Links */}
          <nav className="px-2 space-y-1.5">
            {navItems.map((item) => (
              <button
                key={item.id}
                onClick={() => {
                  setActiveTab(item.id);
                  if (item.id === 'students') setStudentView('list');
                  if (item.id === 'employees') setEmployeeView('list');
                  if (item.id === 'exams') setExamsView('schedule');
                  if (item.id === 'notifications') setNotificationsView('broadcast');
                  if (item.id === 'academics') {
                    setAcademicsView('homework');
                    setAcademicsSubView('list');
                  }
                }}
                className={`w-full flex items-center gap-3.5 px-3 py-2.5 rounded-lg text-sm font-medium transition duration-150 ${
                  activeTab === item.id 
                    ? 'bg-primary text-white' 
                    : 'text-slate-400 hover:bg-slate-800 hover:text-slate-100'
                }`}
              >
                <item.icon className="h-5 w-5 shrink-0" />
                {sidebarOpen && <span>{item.name}</span>}
              </button>
            ))}
          </nav>
        </div>

        {/* Sidebar Footer: User / Logout */}
        <div className="p-2 border-t border-slate-800 bg-slate-950/40">
          {sidebarOpen ? (
            <div className="flex items-center justify-between gap-2 p-2">
              <div className="min-w-0">
                <div className="text-xs font-semibold text-white truncate">
                  {user?.firstName} {user?.lastName}
                </div>
                <div className="text-[10px] text-slate-450 truncate">
                  {user?.email}
                </div>
              </div>
              <button 
                onClick={logout}
                title="Logout"
                className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-850 rounded-lg transition"
              >
                <LogOut className="h-4.5 w-4.5" />
              </button>
            </div>
          ) : (
            <button 
              onClick={logout}
              title="Logout"
              className="w-full flex justify-center py-2 text-slate-400 hover:text-white transition"
            >
              <LogOut className="h-5 w-5" />
            </button>
          )}
        </div>
      </aside>

      {/* Main Panel Content Area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Header Panel */}
        <header className="h-16 bg-white border-b border-neutral-200 flex items-center justify-between px-6 shrink-0 shadow-sm z-10">
          <div className="flex items-center gap-4">
            {!sidebarOpen && (
              <button 
                onClick={toggleSidebar}
                className="text-neutral-500 hover:text-neutral-900 transition"
              >
                <Menu className="h-5 w-5" />
              </button>
            )}
            <div className="font-display font-bold text-neutral-800 text-lg">
              {schoolName || 'School Portal'}
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <span className="text-xs font-semibold bg-emerald-50 text-emerald-700 px-2.5 py-1 rounded-full border border-emerald-200">
              DBMS ONLINE
            </span>
          </div>
        </header>

        {/* Scrollable Body Container */}
        <main className="flex-1 overflow-y-auto bg-slate-50 p-6 lg:p-8">
          <div className="max-w-7xl mx-auto">
            {renderTabContent()}
          </div>
        </main>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <MainAppContent />
    </QueryClientProvider>
  );
}
