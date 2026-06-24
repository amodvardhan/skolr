import { useEffect, useState } from 'react';
import { QueryClient, QueryClientProvider, useQuery } from '@tanstack/react-query';
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
  ShieldCheck,
  Sparkles,
  Building2
} from 'lucide-react';

import { SubjectConfigPage } from '../modules/academics/pages/SubjectConfigPage';
import { HomeworkListPage } from '../modules/academics/pages/HomeworkListPage';
import { HomeworkDetailPage } from '../modules/academics/pages/HomeworkDetailPage';
import { ExamSchedulePage } from '../modules/exams/pages/ExamSchedulePage';
import { MarksEntryPage } from '../modules/exams/pages/MarksEntryPage';
import { CorporateHubPage } from '../modules/corporate/pages/CorporateHubPage';

import { GradeScalePage } from '../modules/exams/pages/GradeScalePage';
import { AnnouncementsPage } from '../modules/notifications/pages/AnnouncementsPage';
import { NotificationLogsPage } from '../modules/notifications/pages/NotificationLogsPage';
import { CBSECompliancePage } from '../modules/cbse/pages/CBSECompliancePage';
import { CMSEditorPage } from '../modules/cms/pages/CMSEditorPage';
import { AdmissionsCRMPage } from '../modules/cms/pages/AdmissionsCRMPage';


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

import { ParentDashboardPage } from '../modules/parent/pages/ParentDashboardPage';
import { ParentAttendancePage } from '../modules/parent/pages/ParentAttendancePage';
import { ParentAcademicsPage } from '../modules/parent/pages/ParentAcademicsPage';
import { ParentFeesPage } from '../modules/parent/pages/ParentFeesPage';
import { parentApi } from '../modules/parent/api/parentApi';
import { Toaster } from '../components/Toaster';
import { ConfirmDialog } from '../components/ConfirmDialog';


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
  const { sidebarOpen, toggleSidebar, activeTab, setActiveTab, zenMode } = useUIStore();
  const { resolveTenant, loading, schoolName } = useTenantStore();
  
  // Navigation tabs state is now managed globally
  const [authView, setAuthView] = useState<'login' | 'onboard'>('login');

  // Parent sibling selection state
  const [activeStudentId, setActiveStudentId] = useState<string>('');

  // Fetch sibling details if role is parent
  const { data: siblingRes } = useQuery({
    queryKey: ['parent_siblings'],
    queryFn: () => parentApi.getLinkedStudents(),
    enabled: isAuthenticated && user?.role === 'parent',
  });

  useEffect(() => {
    if (user?.role === 'parent' && siblingRes?.data && siblingRes.data.length > 0 && !activeStudentId) {
      setActiveStudentId(siblingRes.data[0].id);
    }
  }, [siblingRes, user, activeStudentId]);
  
  // Student module inner navigation state
  const [studentView, setStudentView] = useState<'list' | 'form' | 'details'>('list');
  const [selectedStudentId, setSelectedStudentId] = useState<string>('');
  const [crmPrefillData, setCrmPrefillData] = useState<any>(null);
  
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

  const getNavItems = () => {
    const role = user?.role;
    if (role === 'parent') {
      return [
        { id: 'dashboard', name: 'Dashboard', icon: LayoutDashboard },
        { id: 'attendance', name: 'Attendance', icon: CalendarCheck },
        { id: 'academics', name: 'Academics', icon: BookOpen },
        { id: 'fees', name: 'Fees Ledger', icon: IndianRupee },
      ];
    }
    if (role === 'accountant') {
      return [
        { id: 'dashboard', name: 'Dashboard', icon: LayoutDashboard },
        { id: 'students', name: 'Students', icon: Users },
        { id: 'fees', name: 'Fees Ledger', icon: IndianRupee },
      ];
    }
    if (role === 'teacher') {
      return [
        { id: 'dashboard', name: 'Dashboard', icon: LayoutDashboard },
        { id: 'students', name: 'Students', icon: Users },
        { id: 'attendance', name: 'Attendance', icon: CalendarCheck },
        { id: 'academics', name: 'Academics', icon: BookOpen },
        { id: 'exams', name: 'Exams & Grades', icon: GraduationCap },
        { id: 'notifications', name: 'Announcements', icon: MessageSquare },
      ];
    }
    if (role === 'chain_admin') {
      return [
        { id: 'corporate_hub', name: 'Corporate Hub', icon: Building2 },
      ];
    }
    
    // Default / Admin full access (school_admin)
    const adminItems = [
      { id: 'dashboard', name: 'Dashboard', icon: LayoutDashboard },
      { id: 'students', name: 'Students', icon: Users },
      { id: 'attendance', name: 'Attendance', icon: CalendarCheck },
      { id: 'fees', name: 'Fees Ledger', icon: IndianRupee },
      { id: 'academics', name: 'Academics', icon: BookOpen },
      { id: 'exams', name: 'Exams & Grades', icon: GraduationCap },
      { id: 'notifications', name: 'Announcements', icon: MessageSquare },
      { id: 'cbse', name: 'CBSE Compliance', icon: ShieldCheck },
      { id: 'website', name: 'Website Builder', icon: Globe },
      { id: 'admissions_crm', name: 'Admissions CRM', icon: Sparkles },
      { id: 'employees', name: 'Staff Directory', icon: Contact },
      { id: 'settings', name: 'Settings', icon: Settings },
    ];

    if (role === 'super_admin') {
      return [
        { id: 'corporate_hub', name: 'Corporate Hub', icon: Building2 },
        ...adminItems
      ];
    }
    
    return adminItems;
  };

  const navItems = getNavItems();

  // Helper to render body based on active tab
  const renderTabContent = () => {
    // Enforce Tab RBAC: if the activeTab is not present in navItems list, fallback to first allowed tab
    const isTabAllowed = navItems.some(item => item.id === activeTab);
    if (!isTabAllowed) {
      const defaultTab = navItems[0]?.id || 'dashboard';
      setTimeout(() => setActiveTab(defaultTab), 0);
      return null;
    }

    if (user?.role === 'parent') {
      switch (activeTab) {
        case 'dashboard':
          return <ParentDashboardPage studentId={activeStudentId} />;
        case 'attendance':
          return <ParentAttendancePage studentId={activeStudentId} />;
        case 'academics':
          return <ParentAcademicsPage studentId={activeStudentId} />;
        case 'fees':
          return <ParentFeesPage studentId={activeStudentId} />;
        default:
          return <ParentDashboardPage studentId={activeStudentId} />;
      }
    }

    switch (activeTab) {
      case 'corporate_hub':
        return <CorporateHubPage />;
      case 'dashboard':
        return <DashboardPage />;
      case 'students':
        if (studentView === 'form') {
          return (
            <StudentFormPage 
              onCancel={() => {
                setStudentView('list');
                setCrmPrefillData(null);
              }} 
              onSuccess={() => {
                setStudentView('list');
                setCrmPrefillData(null);
              }}
              prefillData={crmPrefillData}
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
      case 'website':
        return <CMSEditorPage />;
      case 'admissions_crm':
        return (
          <AdmissionsCRMPage 
            onConvertToAdmission={(prefill) => {
              setCrmPrefillData(prefill);
              setActiveTab('students');
              setStudentView('form');
            }} 
          />
        );
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
    <div className="flex h-screen bg-slate-100/60 overflow-hidden font-sans p-3 lg:p-4 gap-4 academic-mesh-grid">
      {/* Sidebar Navigation */}
      <aside 
        className={`bg-slate-950 text-slate-100 flex flex-col justify-between transition-all duration-300 border border-slate-900 rounded-2xl shadow-xl ${
          zenMode ? 'hidden w-0 border-none' : (sidebarOpen ? 'w-64' : 'w-20')
        }`}
      >
        <div className="space-y-6">
          {/* Sidebar Top: Logo */}
          <div className="h-20 flex items-center px-5 justify-between border-b border-slate-900">
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
                className="text-slate-400 hover:text-white transition cursor-pointer"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
            )}
          </div>

          {/* Nav Links */}
          <nav className="px-3 space-y-1.5">
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
                className={`w-full flex items-center rounded-xl text-sm font-semibold transition-all duration-200 cursor-pointer ${
                  sidebarOpen ? 'gap-3.5 px-4 py-3' : 'justify-center p-3.5'
                } ${
                  activeTab === item.id 
                    ? 'bg-gradient-to-r from-blue-600 to-indigo-750 text-white shadow-lg shadow-blue-600/15' 
                    : 'text-slate-400 hover:bg-slate-900 hover:text-slate-200'
                }`}
              >
                <item.icon className="h-5 w-5 shrink-0" />
                {sidebarOpen && <span>{item.name}</span>}
              </button>
            ))}
          </nav>
        </div>

        {/* Sidebar Footer: User / Logout */}
        <div className="p-3 border-t border-slate-900 bg-slate-950/40 rounded-b-2xl">
          {sidebarOpen ? (
            <div className="flex items-center justify-between gap-2 p-2 bg-slate-900/50 border border-slate-900 rounded-xl">
              <div className="min-w-0">
                <div className="text-xs font-bold text-white truncate font-display">
                  {user?.firstName} {user?.lastName}
                </div>
                <div className="text-[10px] text-slate-450 truncate font-mono mt-0.5">
                  {user?.email}
                </div>
              </div>
              <button 
                onClick={logout}
                title="Logout"
                className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition cursor-pointer"
              >
                <LogOut className="h-4.5 w-4.5" />
              </button>
            </div>
          ) : (
            <button 
              onClick={logout}
              title="Logout"
              className="w-full flex justify-center py-3 text-slate-400 hover:text-rose-450 hover:bg-rose-500/10 rounded-xl transition cursor-pointer"
            >
              <LogOut className="h-5 w-5" />
            </button>
          )}
        </div>
      </aside>

      {/* Main Panel Content Area */}
      <div className="flex-1 flex flex-col overflow-hidden bg-white border border-slate-200 rounded-2xl shadow-sm">
        {/* Top Header Panel */}
        <header className={`h-20 bg-white border-b border-slate-100 items-center justify-between px-8 shrink-0 z-10 ${
          zenMode ? 'hidden' : 'flex'
        }`}>
          <div className="flex items-center gap-4">
            {!sidebarOpen && (
              <button 
                onClick={toggleSidebar}
                className="text-slate-500 hover:text-slate-900 transition cursor-pointer p-1.5 hover:bg-slate-50 rounded-lg"
              >
                <Menu className="h-5 w-5" />
              </button>
            )}
            <div className="font-display font-bold text-slate-800 text-lg">
              {schoolName || 'School Portal'}
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            {user?.role === 'parent' && siblingRes?.data && siblingRes.data.length > 0 && (
              <div className="flex items-center gap-2 mr-2">
                <span className="text-xs text-slate-505 font-bold font-display">Student:</span>
                <select
                  value={activeStudentId}
                  onChange={(e) => setActiveStudentId(e.target.value)}
                  className="text-xs font-bold bg-slate-50 hover:bg-slate-100 text-slate-800 px-3.5 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-600 transition cursor-pointer"
                >
                  {siblingRes.data.map((student: any) => (
                    <option key={student.id} value={student.id}>
                      {student.first_name} {student.last_name} ({student.class_name || 'N/A'})
                    </option>
                  ))}
                </select>
              </div>
            )}
            <span className="text-xs font-bold font-mono bg-emerald-50 text-emerald-700 px-3 py-1.5 rounded-xl border border-emerald-200 flex items-center gap-1.5">
              <span className="h-2 w-2 bg-emerald-500 rounded-full animate-pulse"></span>
              DBMS ONLINE
            </span>
          </div>
        </header>

        {/* Scrollable Body Container */}
        <main className={`flex-1 overflow-y-auto bg-slate-50/50 ${zenMode ? 'p-0' : 'p-6 lg:p-8'}`}>
          <div className={zenMode ? 'w-full h-full' : 'max-w-7xl mx-auto animate-scale-in'}>
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
      <Toaster />
      <ConfirmDialog />
    </QueryClientProvider>
  );
}
