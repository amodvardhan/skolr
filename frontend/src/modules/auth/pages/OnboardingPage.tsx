import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import axios from 'axios';
import { 
  GraduationCap, 
  ArrowRight, 
  ArrowLeft, 
  School, 
  User, 
  Check, 
  ShieldAlert,
  Sparkles,
  CheckCircle2
} from 'lucide-react';
import { api } from '../../../lib/api';
import { useTenantStore } from '../../../stores/tenantStore';

const onboardingSchema = z.object({
  name: z.string().min(3, 'School name must be at least 3 characters'),
  subdomain: z.string()
    .min(2, 'Subdomain must be at least 2 characters')
    .regex(/^[a-zA-Z0-9\-]+$/, 'Subdomain can only contain alphanumeric characters and dashes'),
  admin_email: z.string().email('Please enter a valid email address'),
  admin_password: z.string().min(6, 'Password must be at least 6 characters'),
  admin_first_name: z.string().min(2, 'First name must be at least 2 characters'),
  admin_last_name: z.string().min(2, 'Last name must be at least 2 characters'),
  plan_code: z.enum(['starter', 'growth', 'pro']),
});

type OnboardingFormData = z.infer<typeof onboardingSchema>;

interface OnboardingPageProps {
  onBackToLogin: () => void;
}

export function OnboardingPage({ onBackToLogin }: OnboardingPageProps) {
  const [step, setStep] = useState<number>(1);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<boolean>(false);

  const {
    register,
    handleSubmit,
    trigger,
    watch,
    setValue,
    formState: { errors },
  } = useForm<OnboardingFormData>({
    resolver: zodResolver(onboardingSchema),
    defaultValues: {
      name: '',
      subdomain: '',
      admin_email: '',
      admin_password: '',
      admin_first_name: '',
      admin_last_name: '',
      plan_code: 'pro',
    },
  });

  const selectedPlan = watch('plan_code');
  const schoolNameVal = watch('name');
  const subdomainVal = watch('subdomain');
  const adminEmailVal = watch('admin_email');

  const nextStep = async () => {
    let fieldsToValidate: Array<keyof OnboardingFormData> = [];
    if (step === 1) {
      fieldsToValidate = ['name', 'subdomain'];
    } else if (step === 2) {
      fieldsToValidate = ['admin_first_name', 'admin_last_name', 'admin_email', 'admin_password'];
    }

    const isValid = await trigger(fieldsToValidate);
    if (isValid) {
      setStep((prev) => prev + 1);
    }
  };

  const prevStep = () => {
    setStep((prev) => Math.max(prev - 1, 1));
  };

  const onSubmit = async (data: OnboardingFormData) => {
    setLoading(true);
    setError(null);
    try {
      const response = await api.post('/tenants/onboard', {
        name: data.name,
        subdomain: data.subdomain,
        admin_email: data.admin_email,
        admin_password: data.admin_password,
        admin_first_name: data.admin_first_name,
        admin_last_name: data.admin_last_name,
        plan_code: data.plan_code,
      });

      const { school_id } = response.data;
      
      useTenantStore.setState({
        schoolId: school_id,
        schoolName: data.name,
        subdomain: data.subdomain,
        error: null
      });
      localStorage.setItem('skolr_school_id', school_id);
      localStorage.setItem('skolr_school_name', data.name);
      localStorage.setItem('skolr_subdomain', data.subdomain);

      setSuccess(true);
    } catch (err: any) {
      console.error(err);
      if (axios.isAxiosError(err) && err.response) {
        setError(err.response.data?.detail || 'An error occurred during onboarding');
      } else {
        setError('Connection error. Is the server running?');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleFormSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (step < 3) {
      nextStep();
    } else {
      handleSubmit(onSubmit)(e);
    }
  };

  const plans = [
    {
      code: 'starter' as const,
      name: 'Starter Tier',
      limit: 'Up to 300 Students',
      price: '₹ 4,999/mo',
      features: ['Students & Parents Directory', 'Attendance Marking', 'Basic Fee Collection Ledger'],
    },
    {
      code: 'growth' as const,
      name: 'Growth Tier',
      limit: 'Up to 1,000 Students',
      price: '₹ 9,999/mo',
      features: ['Everything in Starter', 'Dynamic Fee Structures', 'Custom Website Templates', 'Exams Module'],
    },
    {
      code: 'pro' as const,
      name: 'Pro Tier',
      limit: 'Up to 3,000 Students',
      price: '₹ 19,999/mo',
      features: ['Everything in Growth', 'Admission CRM Pipeline', 'WhatsApp Notifications', 'Self-Service Portal'],
      recommended: true,
    },
  ];

  if (success) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6 text-slate-800 relative academic-mesh-grid">
        <div className="w-full max-w-xl bg-white border border-slate-200 rounded-2xl p-8 text-center space-y-6 relative shadow-sm">
          <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-emerald-500 to-teal-500 rounded-t-2xl"></div>
          
          <div className="h-16 w-16 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center mx-auto mb-2 border border-emerald-100">
            <CheckCircle2 className="h-10 w-10" />
          </div>

          <div className="space-y-2">
            <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight font-display">Onboarding Completed!</h2>
            <p className="text-slate-500 text-sm leading-relaxed">
              Your school database, isolated schema workspace, and admin access have been successfully provisioned.
            </p>
          </div>

          <div className="bg-slate-50 rounded-xl p-5 border border-slate-200 text-left space-y-4 font-sans">
            <h4 className="font-bold text-slate-800 border-b border-slate-200 pb-2 text-xs uppercase tracking-wider font-display">Provisioning Report</h4>
            <div className="grid grid-cols-2 gap-y-3 gap-x-4 text-xs font-semibold">
              <div>
                <span className="text-slate-400 block uppercase text-[10px] tracking-wider">School Name</span>
                <span className="text-slate-800 text-sm mt-0.5">{schoolNameVal}</span>
              </div>
              <div>
                <span className="text-slate-400 block uppercase text-[10px] tracking-wider">Assigned Subdomain</span>
                <span className="text-blue-700 text-sm font-mono mt-0.5 font-bold">{subdomainVal}.skolr.in</span>
              </div>
              <div>
                <span className="text-slate-400 block uppercase text-[10px] tracking-wider">Schema Namespace</span>
                <span className="text-slate-800 text-sm font-mono mt-0.5 font-bold">school_{subdomainVal.replace(/-/g, '_')}</span>
              </div>
              <div>
                <span className="text-slate-400 block uppercase text-[10px] tracking-wider">Administrator User</span>
                <span className="text-slate-800 text-sm mt-0.5">{adminEmailVal}</span>
              </div>
            </div>
          </div>

          <div className="text-xs text-slate-500 leading-relaxed font-medium">
            You can now proceed to log in. Please use subdomain <span className="font-bold text-blue-700 font-mono">{subdomainVal}</span> to configure this school.
          </div>

          <button
            onClick={onBackToLogin}
            className="w-full bg-gradient-to-r from-blue-700 to-indigo-800 hover:from-blue-600 hover:to-indigo-700 text-white font-bold py-3.5 px-4 rounded-xl transition shadow-md cursor-pointer shadow-blue-750/15"
          >
            Go to Login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50/50 flex flex-col items-center justify-center p-6 text-slate-800 relative overflow-hidden academic-mesh-grid">
      
      <div className="w-full max-w-2xl space-y-8 relative z-10">
        {/* Header */}
        <div className="flex flex-col items-center text-center space-y-3">
          <div className="flex items-center gap-2 px-3 py-1 bg-white border border-slate-200 rounded-full text-[10px] font-bold tracking-wider text-blue-700 uppercase shadow-sm">
            <Sparkles className="h-3.5 w-3.5 text-blue-650" />
            Establish School Workspace
          </div>
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 bg-gradient-to-tr from-blue-600 to-indigo-750 rounded-xl flex items-center justify-center shadow-md">
              <GraduationCap className="h-5.5 w-5.5 text-white" />
            </div>
            <span className="font-display font-black text-2xl tracking-wider text-slate-900">SKOLR Platform</span>
          </div>
          <p className="text-slate-550 text-xs max-w-sm leading-relaxed font-medium">
            Onboard your educational institute with an isolated database schema, structured roles, and billing preferences.
          </p>
        </div>

        {/* Step Timeline Indicator */}
        <div className="max-w-md mx-auto flex items-center justify-between relative px-2">
          <div className="absolute left-0 top-1/2 -translate-y-1/2 h-0.5 bg-slate-200 w-full z-0"></div>
          <div className={`absolute left-0 top-1/2 -translate-y-1/2 h-0.5 bg-blue-600 transition-all duration-300 z-0`} style={{ width: `${((step - 1) / 2) * 100}%` }}></div>

          {[1, 2, 3].map((s) => (
            <div
              key={s}
              className={`h-9 w-9 rounded-full flex items-center justify-center font-bold text-xs border-2 z-10 transition duration-350 cursor-pointer ${
                step >= s 
                  ? 'bg-blue-600 border-blue-600 text-white shadow-md shadow-blue-600/10' 
                  : 'bg-white border-slate-200 text-slate-400'
              }`}
            >
              {step > s ? <Check className="h-4 w-4 stroke-[3px]" /> : s}
            </div>
          ))}
        </div>

        {/* Error Alert */}
        {error && (
          <div className="bg-rose-50 border border-rose-150 text-rose-800 p-4 rounded-xl flex items-start gap-3 text-xs font-semibold leading-relaxed max-w-xl mx-auto">
            <ShieldAlert className="h-5 w-5 text-rose-600 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold block uppercase tracking-wider text-[10px]">Onboarding Error</span>
              <span className="text-slate-600">{error}</span>
            </div>
          </div>
        )}

        {/* Step Form Card */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 lg:p-8 shadow-sm max-w-xl mx-auto w-full">
          <form 
            onSubmit={handleFormSubmit} 
            className="space-y-6"
          >
            
            {/* Step 1: School Identity */}
            {step === 1 && (
              <div className="space-y-5 animate-scale-in">
                <div className="flex items-center gap-2.5 pb-2.5 border-b border-slate-100">
                  <School className="h-5 w-5 text-blue-700" />
                  <h3 className="text-base font-bold text-slate-900 font-display">School Identity & Subdomain</h3>
                </div>

                <div className="space-y-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-450 uppercase tracking-widest block">
                      Official School Name
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. DAV Public School"
                      {...register('name')}
                      className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-800 transition focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600/10 placeholder:text-slate-400 font-medium"
                    />
                    {errors.name && (
                      <p className="text-rose-500 text-xs mt-1 font-semibold">{errors.name.message}</p>
                    )}
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-450 uppercase tracking-widest block">
                      Subdomain Prefix
                    </label>
                    <div className="flex rounded-xl bg-white border border-slate-200 focus-within:border-blue-600 focus-within:ring-2 focus-within:ring-blue-600/10 overflow-hidden transition">
                      <input
                        type="text"
                        placeholder="davprestige"
                        {...register('subdomain')}
                        className="flex-1 bg-transparent px-4 py-3 text-sm text-slate-800 focus:outline-none font-medium placeholder:text-slate-400"
                      />
                      <span className="bg-slate-50 border-l border-slate-200 text-slate-550 px-4 py-3 text-sm font-semibold select-none font-mono">
                        .skolr.in
                      </span>
                    </div>
                    <p className="text-slate-400 text-[10px] leading-relaxed font-medium">
                      Only alphanumeric letters and dashes. This determines the unique URL resolved to identify your schema.
                    </p>
                    {errors.subdomain && (
                      <p className="text-rose-500 text-xs mt-1 font-semibold">{errors.subdomain.message}</p>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Step 2: Administrative Account */}
            {step === 2 && (
              <div className="space-y-5 animate-scale-in">
                <div className="flex items-center gap-2.5 pb-2.5 border-b border-slate-100">
                  <User className="h-5 w-5 text-blue-700" />
                  <h3 className="text-base font-bold text-slate-900 font-display">Administrator Credentials</h3>
                </div>

                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-450 uppercase tracking-widest block">
                        First Name
                      </label>
                      <input
                        type="text"
                        placeholder="Principal"
                        {...register('admin_first_name')}
                        className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-800 transition focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600/10 placeholder:text-slate-400 font-medium"
                      />
                      {errors.admin_first_name && (
                        <p className="text-rose-500 text-xs mt-1 font-semibold">{errors.admin_first_name.message}</p>
                      )}
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-450 uppercase tracking-widest block">
                        Last Name
                      </label>
                      <input
                        type="text"
                        placeholder="Officer"
                        {...register('admin_last_name')}
                        className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-800 transition focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600/10 placeholder:text-slate-400 font-medium"
                      />
                      {errors.admin_last_name && (
                        <p className="text-rose-500 text-xs mt-1 font-semibold">{errors.admin_last_name.message}</p>
                      )}
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-450 uppercase tracking-widest block">
                      Admin Email
                    </label>
                    <input
                      type="email"
                      placeholder="admin@yourschool.com"
                      {...register('admin_email')}
                      className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-800 transition focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600/10 placeholder:text-slate-400 font-medium"
                    />
                    {errors.admin_email && (
                      <p className="text-rose-500 text-xs mt-1 font-semibold">{errors.admin_email.message}</p>
                    )}
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-450 uppercase tracking-widest block">
                      Secure Password
                    </label>
                    <input
                      type="password"
                      placeholder="••••••••"
                      {...register('admin_password')}
                      className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-800 transition focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600/10 placeholder:text-slate-400 font-medium"
                    />
                    {errors.admin_password && (
                      <p className="text-rose-500 text-xs mt-1 font-semibold">{errors.admin_password.message}</p>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Step 3: Subscription Tier Allocation */}
            {step === 3 && (
              <div className="space-y-5 animate-scale-in">
                <div className="flex items-center gap-2.5 pb-2.5 border-b border-slate-100">
                  <Sparkles className="h-5 w-5 text-blue-700" />
                  <h3 className="text-base font-bold text-slate-900 font-display">Choose ERP Subscription Tier</h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {plans.map((p) => (
                    <div
                      key={p.code}
                      onClick={() => setValue('plan_code', p.code)}
                      className={`relative border rounded-xl p-4 flex flex-col justify-between cursor-pointer transition select-none ${
                        selectedPlan === p.code
                          ? 'border-blue-600 bg-blue-50/20 shadow-md shadow-blue-600/5'
                          : 'border-slate-200 hover:border-slate-300 bg-white'
                      }`}
                    >
                      {p.recommended && (
                        <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 text-[9px] font-extrabold uppercase bg-blue-600 text-white px-2 py-0.5 rounded-full tracking-wider">
                          Recommended
                        </span>
                      )}

                      <div className="space-y-2">
                        <div className="text-xs font-extrabold text-slate-900 font-display">{p.name}</div>
                        <div className="text-[9px] text-slate-450 uppercase tracking-wider font-semibold font-mono">{p.limit}</div>
                        <div className="text-base font-extrabold text-blue-700 font-display mt-1">{p.price}</div>
                        
                        <ul className="text-[9px] text-slate-500 space-y-1.5 pt-2.5 border-t border-slate-100 font-sans font-medium">
                          {p.features.map((f, i) => (
                            <li key={i} className="flex items-start gap-1">
                              <Check className="h-3 w-3 text-blue-600 shrink-0 mt-0.5" />
                              <span>{f}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex items-center justify-between pt-4 border-t border-slate-100">
              {step > 1 ? (
                <button
                  type="button"
                  onClick={prevStep}
                  className="bg-white border border-slate-200 text-slate-700 font-bold px-4 py-2.5 rounded-xl hover:bg-slate-50 transition flex items-center gap-1.5 text-xs cursor-pointer"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Back
                </button>
              ) : (
                <button
                  type="button"
                  onClick={onBackToLogin}
                  className="text-slate-450 hover:text-slate-700 transition text-xs font-bold cursor-pointer"
                >
                  Return to Sign In
                </button>
              )}

              {step < 3 ? (
                <button
                  type="button"
                  onClick={nextStep}
                  className="bg-gradient-to-r from-blue-700 to-indigo-850 hover:from-blue-600 hover:to-indigo-750 text-white font-bold px-5 py-2.5 rounded-xl transition flex items-center gap-1.5 text-xs ml-auto cursor-pointer"
                >
                  Continue
                  <ArrowRight className="h-4 w-4" />
                </button>
              ) : (
                <button
                  type="submit"
                  disabled={loading}
                  className="bg-gradient-to-r from-blue-700 to-indigo-850 hover:from-blue-600 hover:to-indigo-750 text-white font-bold px-6 py-2.5 rounded-xl transition flex items-center justify-center gap-2 text-xs ml-auto disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                >
                  {loading ? (
                    <span className="border-2 border-white border-t-transparent w-4 h-4 rounded-full animate-spin"></span>
                  ) : (
                    <>
                      <span>Submit Onboarding</span>
                      <Check className="h-4 w-4" />
                    </>
                  )}
                </button>
              )}
            </div>

          </form>
        </div>
      </div>
    </div>
  );
}
