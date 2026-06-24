import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import axios from 'axios';
import { 
  GraduationCap, 
  Lock, 
  Mail, 
  AlertCircle, 
  ArrowRight, 
  LayoutDashboard, 
  Globe, 
  Key, 
  Code,
  Smartphone,
  Monitor,
  Palette
} from 'lucide-react';

import { useAuthStore } from '../../../stores/authStore';
import { useTenantStore } from '../../../stores/tenantStore';
import { api } from '../../../lib/api';

const loginSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

type LoginFormData = z.infer<typeof loginSchema>;

export function LoginPage({ onGoToOnboard }: { onGoToOnboard: () => void }) {
  const setAuth = useAuthStore((state) => state.setAuth);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [activeShowcaseTab, setActiveShowcaseTab] = useState<'erp' | 'cms'>('erp');
  const [devDrawerOpen, setDevDrawerOpen] = useState(false);

  // CMS Mock interactive state
  const [mockPrimaryColor, setMockPrimaryColor] = useState('#1E40AF');
  const [mockDevice, setMockDevice] = useState<'desktop' | 'mobile'>('desktop');

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  const handleFillAccount = (email: string, pass: string) => {
    setValue('email', email);
    setValue('password', pass);
    setDevDrawerOpen(false);
  };

  const onSubmit = async (data: LoginFormData) => {
    const schoolId = useTenantStore.getState().schoolId;
    if (!schoolId) {
      setError('Active school portal could not be resolved.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const response = await api.post('/auth/login', data, {
        headers: {
          'X-School-ID': schoolId,
        },
      });

      const { 
        access_token, 
        role, 
        school_id: serverSchoolId, 
        school_name: serverSchoolName,
        school_subdomain: serverSchoolSubdomain
      } = response.data.data;
      
      const meResponse = await api.get('/auth/me', {
        headers: {
          Authorization: `Bearer ${access_token}`,
          'X-School-ID': schoolId,
        },
      });

      const userProfile = meResponse.data.data;
      
      setAuth(
        access_token,
        role,
        serverSchoolId || schoolId,
        serverSchoolName || userProfile.school_name || 'Prestige Public School',
        serverSchoolSubdomain || userProfile.school_subdomain || null,
        {
          id: userProfile.id,
          email: userProfile.email,
          firstName: userProfile.first_name,
          lastName: userProfile.last_name,
          role: userProfile.role,
        }
      );
    } catch (err: any) {
      console.error(err);
      if (axios.isAxiosError(err) && err.response) {
        setError(err.response.data?.detail || 'Invalid email or password');
      } else {
        setError('Network error. Is backend server running?');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex bg-slate-50 font-sans">
      {/* Left Column: Innovative Showcase Simulator */}
      <div className="hidden lg:flex lg:w-1/2 bg-slate-950 text-slate-100 flex-col justify-between p-12 relative overflow-hidden border-r border-slate-900">
        {/* Subtle mesh background grid */}
        <div className="absolute inset-0 opacity-10 bg-[linear-gradient(to_right,#1e293b_1px,transparent_1px),linear-gradient(to_bottom,#1e293b_1px,transparent_1px)] bg-[size:32px_32px]"></div>
        
        {/* Glowing aura blobs */}
        <div className="absolute top-1/4 -left-20 w-80 h-80 bg-blue-600/10 rounded-full blur-3xl"></div>
        <div className="absolute bottom-1/4 -right-20 w-80 h-80 bg-indigo-600/10 rounded-full blur-3xl"></div>

        {/* Top Branding Header */}
        <div className="flex items-center gap-3 relative z-10">
          <div className="h-10 w-10 bg-gradient-to-tr from-blue-600 to-indigo-700 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/20 border border-blue-500/20">
            <GraduationCap className="h-5.5 w-5.5 text-white" />
          </div>
          <span className="font-display font-black text-xl tracking-wider text-white">
            SKOLR
          </span>
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-900 border border-slate-800 text-blue-450 uppercase tracking-widest font-mono">
            SaaS Core
          </span>
        </div>

        {/* Mid-Showcase Canvas Simulator */}
        <div className="my-auto relative z-10 w-full max-w-xl space-y-6">
          <div className="space-y-2">
            <h1 className="text-3xl font-extrabold font-display leading-tight text-white">
              The unified engine for Indian schools.
            </h1>
            <p className="text-slate-400 text-sm leading-relaxed">
              Experience a features-rich ERP dashboard synced with a customizable drag-and-drop public website editor.
            </p>
          </div>

          {/* Interactive Switcher Tabs */}
          <div className="flex bg-slate-900 p-1.5 rounded-xl border border-slate-850 gap-1.5 w-full">
            <button
              onClick={() => setActiveShowcaseTab('erp')}
              className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-semibold tracking-wide transition duration-150 cursor-pointer ${
                activeShowcaseTab === 'erp' 
                  ? 'bg-slate-800 text-white shadow-sm border border-slate-700/50' 
                  : 'text-slate-450 hover:text-slate-200'
              }`}
            >
              <LayoutDashboard className="h-4 w-4" />
              <span>🚀 Control Center ERP</span>
            </button>
            <button
              onClick={() => setActiveShowcaseTab('cms')}
              className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-semibold tracking-wide transition duration-150 cursor-pointer ${
                activeShowcaseTab === 'cms' 
                  ? 'bg-slate-800 text-white shadow-sm border border-slate-700/50' 
                  : 'text-slate-450 hover:text-slate-200'
              }`}
            >
              <Globe className="h-4 w-4" />
              <span>🎨 Drag & Drop CMS</span>
            </button>
          </div>

          {/* Dynamic Mockup Viewport */}
          <div className="bg-slate-900/60 border border-slate-850 rounded-2xl p-5 shadow-2xl relative h-[280px] flex flex-col justify-between overflow-hidden">
            {activeShowcaseTab === 'erp' ? (
              /* ERP simulator mockup */
              <div className="flex-1 flex flex-col justify-between animate-scale-in">
                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                  <div className="flex items-center gap-2">
                    <span className="h-2 w-2 bg-emerald-500 rounded-full animate-ping"></span>
                    <span className="text-xs font-bold text-slate-300 font-display">Live Database Metrics</span>
                  </div>
                  <span className="text-[10px] font-bold font-mono text-slate-500">v1.4-active</span>
                </div>

                {/* Simulated Bento Metric widgets */}
                <div className="grid grid-cols-3 gap-3 my-4">
                  <div className="bg-slate-950 border border-slate-850 p-3 rounded-xl space-y-1">
                    <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider block">Admissions</span>
                    <span className="text-lg font-bold font-mono text-white block">1,284</span>
                    <span className="text-[9px] font-semibold text-emerald-400 font-mono">+12.4%</span>
                  </div>
                  <div className="bg-slate-950 border border-slate-850 p-3 rounded-xl space-y-1">
                    <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider block">Collection</span>
                    <span className="text-lg font-bold font-mono text-amber-500 block">86.2%</span>
                    <span className="text-[9px] font-semibold text-slate-400 font-mono">Ledger synced</span>
                  </div>
                  <div className="bg-slate-950 border border-slate-850 p-3 rounded-xl space-y-1">
                    <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider block">Attendance</span>
                    <span className="text-lg font-bold font-mono text-white block">95.8%</span>
                    <span className="text-[9px] font-semibold text-blue-400 font-mono">Roll-calls checked</span>
                  </div>
                </div>

                {/* Developer query simulator terminal snippet */}
                <div className="bg-slate-950 p-3 rounded-xl border border-slate-850 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2 text-blue-400 shrink-0">
                    <Code className="h-4 w-4" />
                    <span className="text-[10px] font-bold font-mono">SQL-Console</span>
                  </div>
                  <span className="text-[10px] font-mono text-slate-400 truncate text-right">
                    SELECT COUNT(*) FROM school_dav.students WHERE section='A';
                  </span>
                </div>
              </div>
            ) : (
              /* CMS simulator mockup */
              <div className="flex-1 flex flex-col justify-between animate-scale-in">
                {/* CMS Toolbar */}
                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1.5 bg-slate-950 px-2.5 py-1 rounded-lg border border-slate-850">
                      <Palette className="h-3.5 w-3.5 text-blue-450" />
                      <span className="text-[10px] font-bold text-slate-350">Theme Controls</span>
                    </div>
                    {/* Theme color swatch selectors */}
                    <div className="flex gap-1.5">
                      {['#1E40AF', '#7C3AED', '#059669', '#DC2626'].map((col) => (
                        <button
                          key={col}
                          onClick={() => setMockPrimaryColor(col)}
                          className={`h-4.5 w-4.5 rounded-full border transition cursor-pointer ${
                            mockPrimaryColor === col ? 'border-white scale-110' : 'border-transparent'
                          }`}
                          style={{ backgroundColor: col }}
                        />
                      ))}
                    </div>
                  </div>
                  {/* Device layout preview icons */}
                  <div className="flex items-center gap-1 bg-slate-950 p-0.5 rounded-lg border border-slate-850">
                    <button
                      onClick={() => setMockDevice('desktop')}
                      className={`p-1 rounded transition cursor-pointer ${
                        mockDevice === 'desktop' ? 'bg-slate-850 text-white' : 'text-slate-500'
                      }`}
                    >
                      <Monitor className="h-3 w-3" />
                    </button>
                    <button
                      onClick={() => setMockDevice('mobile')}
                      className={`p-1 rounded transition cursor-pointer ${
                        mockDevice === 'mobile' ? 'bg-slate-850 text-white' : 'text-slate-500'
                      }`}
                    >
                      <Smartphone className="h-3 w-3" />
                    </button>
                  </div>
                </div>

                {/* Live canvas display simulation wrapper */}
                <div className="flex-1 flex items-center justify-center p-3 relative bg-slate-950 rounded-xl mt-3 overflow-hidden border border-slate-850">
                  <div 
                    className={`bg-slate-900 border rounded-lg p-3 space-y-2 transition-all duration-300 shadow-lg ${
                      mockDevice === 'mobile' ? 'w-[140px] text-center' : 'w-full'
                    }`}
                    style={{ borderColor: `${mockPrimaryColor}30` }}
                  >
                    <div 
                      className="h-2 w-12 rounded mx-auto" 
                      style={{ backgroundColor: mockPrimaryColor }}
                    />
                    <div className="text-[10px] font-bold text-white tracking-tight">
                      DAV Prestige Academy
                    </div>
                    <div className="text-[8px] text-slate-500 leading-normal line-clamp-2">
                      Now admitting students for CBSE standard rosters. Drag layout headers, color configurations and news modules dynamically.
                    </div>
                    <div 
                      className="text-[8px] text-white py-1 px-2.5 rounded font-bold inline-block cursor-pointer"
                      style={{ backgroundColor: mockPrimaryColor }}
                    >
                      Apply Online
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer info text */}
        <div className="text-slate-500 text-[11px] relative z-10 font-medium">
          © 2026 Skolr School Management & Website Builder SaaS. All rights reserved.
        </div>
      </div>

      {/* Right Column: Portal Login Form */}
      <div className="flex-1 flex flex-col justify-center items-center p-6 bg-slate-100/60 academic-mesh-grid relative">
        <div className="w-full max-w-md space-y-6">
          
          {/* Logo for mobile */}
          <div className="flex items-center justify-center lg:hidden gap-3 mb-6">
            <div className="h-10 w-10 bg-gradient-to-tr from-blue-600 to-indigo-750 rounded-xl flex items-center justify-center shadow-md">
              <GraduationCap className="h-5.5 w-5.5 text-white" />
            </div>
            <span className="font-display font-black text-xl tracking-wider text-slate-900">SKOLR</span>
          </div>

          {/* Form Card */}
          <div className="bg-white border border-slate-200 rounded-2xl p-8 shadow-sm flex flex-col gap-6 relative">
            <div className="space-y-1">
              <h2 className="text-xl font-bold text-slate-900 tracking-tight font-display">Portal Sign In</h2>
              <p className="text-xs text-slate-500 leading-relaxed">
                Enter details assigned by your school administrator workspace.
              </p>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              {error && (
                <div className="bg-rose-50 border border-rose-150 text-rose-800 p-3 rounded-xl flex items-start gap-2.5 text-xs font-semibold leading-relaxed">
                  <AlertCircle className="h-4.5 w-4.5 text-rose-600 shrink-0 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}

              <div className="space-y-3.5">
                {/* Email Address */}
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-450 uppercase tracking-widest block">
                    Email Address
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3.5 top-3.5 h-4.5 w-4.5 text-slate-400" />
                    <input
                      type="email"
                      placeholder="name@school.com"
                      {...register('email')}
                      className="w-full bg-white border border-slate-200 rounded-xl pl-11 pr-4 py-3 text-sm text-slate-800 transition focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600/10 placeholder:text-slate-400 font-medium"
                    />
                  </div>
                  {errors.email && (
                    <p className="text-rose-500 text-xs mt-1 font-semibold">{errors.email.message}</p>
                  )}
                </div>

                {/* Password */}
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-450 uppercase tracking-widest block">
                    Password
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-3.5 h-4.5 w-4.5 text-slate-400" />
                    <input
                      type="password"
                      placeholder="••••••••"
                      {...register('password')}
                      className="w-full bg-white border border-slate-200 rounded-xl pl-11 pr-4 py-3 text-sm text-slate-800 transition focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600/10 placeholder:text-slate-400 font-medium"
                    />
                  </div>
                  {errors.password && (
                    <p className="text-rose-500 text-xs mt-1 font-semibold">{errors.password.message}</p>
                  )}
                </div>
              </div>

              {/* Submit CTA */}
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-gradient-to-r from-blue-700 to-indigo-850 hover:from-blue-600 hover:to-indigo-750 text-white font-bold py-3.5 px-4 rounded-xl flex items-center justify-center gap-2 transition duration-200 shadow-md shadow-blue-750/15 disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none cursor-pointer mt-2"
              >
                {loading ? (
                  <span className="border-2 border-white border-t-transparent w-4.5 h-4.5 rounded-full animate-spin"></span>
                ) : (
                  <>
                    <span>Sign In</span>
                    <ArrowRight className="h-4.5 w-4.5" />
                  </>
                )}
              </button>
            </form>

            {/* School registration referral */}
            <div className="text-center text-xs pt-2 border-t border-slate-100">
              <span className="text-slate-450 font-medium">Want to register a new school?</span>
              <button
                type="button"
                onClick={onGoToOnboard}
                className="text-blue-700 font-bold hover:underline ml-1 cursor-pointer transition"
              >
                Onboard here
              </button>
            </div>
          </div>

          {/* Quick Seeding Drawer (out-of-the-box accordion style) */}
          <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
            <button
              type="button"
              onClick={() => setDevDrawerOpen(!devDrawerOpen)}
              className="w-full px-5 py-4 flex items-center justify-between text-xs font-bold text-slate-600 hover:text-slate-900 transition cursor-pointer"
            >
              <span className="flex items-center gap-2">
                <Key className="h-4 w-4 text-blue-600" />
                Developer Account Quick Fill
              </span>
              <span className={`text-[10px] font-extrabold uppercase px-2.5 py-0.5 rounded-full border transition-all duration-200 ${
                devDrawerOpen ? 'bg-blue-50 text-blue-700 border-blue-100' : 'bg-slate-50 text-slate-500 border-slate-200'
              }`}>
                {devDrawerOpen ? 'Hide' : 'Show Options'}
              </span>
            </button>

            {/* Expanded items list */}
            {devDrawerOpen && (
              <div className="px-5 pb-5 pt-1 border-t border-slate-100 grid grid-cols-1 gap-2 animate-scale-in">
                {[
                  { title: 'School Admin Account', email: 'admin@default.skolr.in', pass: 'admin123' },
                  { title: 'Class Teacher Account', email: 'teacher@default.skolr.in', pass: 'admin123' },
                  { title: 'Student Parent Account', email: 'parent@default.skolr.in', pass: 'parent123' },
                  { title: 'Super Admin (Platform)', email: 'super@skolr.com', pass: 'admin123' },
                  { title: 'Chain Admin (DAV Director)', email: 'director@dav.com', pass: 'admin123' },
                ].map((account, index) => (
                  <button
                    key={index}
                    type="button"
                    onClick={() => handleFillAccount(account.email, account.pass)}
                    className="w-full bg-slate-50 hover:bg-blue-50/50 border border-slate-200 hover:border-blue-150 text-[11px] text-slate-700 hover:text-blue-800 font-semibold py-2.5 px-3.5 rounded-xl text-left transition flex justify-between items-center cursor-pointer"
                  >
                    <span>{account.title}</span>
                    <span className="text-[10px] font-mono text-slate-400 font-normal">{account.email}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  );
}
