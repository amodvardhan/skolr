import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import {
  ShieldCheck,
  Building,
  AlertTriangle,
  FileDown,
  Loader2,
  CheckCircle,
  XCircle,
  GraduationCap,
  BookOpen,
  RefreshCw,
  Info,
  Users
} from 'lucide-react';

import { cbseApi } from '../api/cbseApi';

// Validation Schema for Infrastructure settings
const infraSchema = z.object({
  affiliation_number: z.string().max(50).nullable().or(z.literal('')),
  school_code: z.string().max(50).nullable().or(z.literal('')),
  land_area_sq_mtrs: z.coerce.number().min(0, "Area must be >= 0"),
  built_up_area_sq_mtrs: z.coerce.number().min(0, "Area must be >= 0"),
  playground_area_sq_mtrs: z.coerce.number().min(0, "Area must be >= 0"),
  classroom_count: z.coerce.number().int().min(0, "Count must be >= 0"),
  composite_science_lab_count: z.coerce.number().int().min(0, "Count must be >= 0"),
  math_lab_count: z.coerce.number().int().min(0, "Count must be >= 0"),
  computer_lab_count: z.coerce.number().int().min(0, "Count must be >= 0"),
  library_book_count: z.coerce.number().int().min(0, "Count must be >= 0"),
  library_magazine_count: z.coerce.number().int().min(0, "Count must be >= 0"),
  library_newspaper_count: z.coerce.number().int().min(0, "Count must be >= 0"),
});

type InfraFormValues = z.infer<typeof infraSchema>;

export function CBSECompliancePage() {
  const queryClient = useQueryClient();
  const [activeSubTab, setActiveSubTab] = useState<'profile' | 'audit'>('profile');
  const [downloading, setDownloading] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Queries
  const { data: profileRes, isLoading: loadingProfile } = useQuery({
    queryKey: ['cbse-profile'],
    queryFn: cbseApi.getProfile,
  });

  const { data: complianceRes, isLoading: loadingCompliance, refetch: refetchCompliance, isFetching: fetchingCompliance } = useQuery({
    queryKey: ['cbse-compliance'],
    queryFn: cbseApi.getCompliance,
  });

  const profile = profileRes?.data;
  const stats = complianceRes?.data;

  // React Hook Form
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors }
  } = useForm<InfraFormValues>({
    resolver: zodResolver(infraSchema),
    defaultValues: {
      affiliation_number: '',
      school_code: '',
      land_area_sq_mtrs: 0,
      built_up_area_sq_mtrs: 0,
      playground_area_sq_mtrs: 0,
      classroom_count: 0,
      composite_science_lab_count: 0,
      math_lab_count: 0,
      computer_lab_count: 0,
      library_book_count: 0,
      library_magazine_count: 0,
      library_newspaper_count: 0,
    }
  });

  // Reset form when profile is fetched
  useEffect(() => {
    if (profile) {
      reset({
        affiliation_number: profile.affiliation_number || '',
        school_code: profile.school_code || '',
        land_area_sq_mtrs: profile.land_area_sq_mtrs || 0,
        built_up_area_sq_mtrs: profile.built_up_area_sq_mtrs || 0,
        playground_area_sq_mtrs: profile.playground_area_sq_mtrs || 0,
        classroom_count: profile.classroom_count || 0,
        composite_science_lab_count: profile.composite_science_lab_count || 0,
        math_lab_count: profile.math_lab_count || 0,
        computer_lab_count: profile.computer_lab_count || 0,
        library_book_count: profile.library_book_count || 0,
        library_magazine_count: profile.library_magazine_count || 0,
        library_newspaper_count: profile.library_newspaper_count || 0,
      });
    }
  }, [profile, reset]);

  // Mutations
  const updateProfileMutation = useMutation({
    mutationFn: cbseApi.updateProfile,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cbse-profile'] });
      queryClient.invalidateQueries({ queryKey: ['cbse-compliance'] });
      setSuccessMsg('CBSE institutional profile and infrastructure metrics updated.');
      setErrorMsg(null);
      window.scrollTo({ top: 0, behavior: 'smooth' });
      setTimeout(() => setSuccessMsg(null), 4000);
    },
    onError: (err: any) => {
      console.error(err);
      setErrorMsg(err.response?.data?.detail || 'Failed to update CBSE profile.');
      setSuccessMsg(null);
    }
  });

  const onSubmit = (values: InfraFormValues) => {
    setErrorMsg(null);
    setSuccessMsg(null);
    updateProfileMutation.mutate({
      affiliation_number: values.affiliation_number || null,
      school_code: values.school_code || null,
      land_area_sq_mtrs: values.land_area_sq_mtrs,
      built_up_area_sq_mtrs: values.built_up_area_sq_mtrs,
      playground_area_sq_mtrs: values.playground_area_sq_mtrs,
      classroom_count: values.classroom_count,
      composite_science_lab_count: values.composite_science_lab_count,
      math_lab_count: values.math_lab_count,
      computer_lab_count: values.computer_lab_count,
      library_book_count: values.library_book_count,
      library_magazine_count: values.library_magazine_count,
      library_newspaper_count: values.library_newspaper_count,
    });
  };

  const handleDownloadPdf = async () => {
    try {
      setDownloading(true);
      const blob = await cbseApi.downloadComplianceReport();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'cbse-affiliation-fact-sheet.pdf';
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      console.error(err);
      alert('Failed to generate compliance fact sheet PDF.');
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-neutral-200 pb-4">
        <div>
          <h2 className="text-2xl font-bold font-display text-neutral-900 flex items-center gap-2">
            <ShieldCheck className="h-6 w-6 text-primary" />
            CBSE Affiliation & Compliance
          </h2>
          <p className="text-sm text-neutral-500 font-sans">
            Audit school records against CBSE standards, update infrastructure metrics, and export the official Fact Sheet.
          </p>
        </div>
        
        <div className="flex items-center gap-2 self-start md:self-auto">
          <button
            onClick={() => refetchCompliance()}
            disabled={fetchingCompliance}
            className="btn-secondary text-xs py-2 px-3 flex items-center gap-1.5"
            title="Recalculate metrics"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${fetchingCompliance ? 'animate-spin' : ''}`} />
            Refresh
          </button>

          <button
            onClick={handleDownloadPdf}
            disabled={downloading}
            className="btn-primary text-xs py-2 px-4 flex items-center gap-1.5 shadow-sm"
          >
            {downloading ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <FileDown className="h-3.5 w-3.5" />
            )}
            Download Board Fact Sheet PDF
          </button>
        </div>
      </div>

      {/* Alerts */}
      {successMsg && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 p-4 rounded-xl flex items-start gap-3 text-sm animate-fadeIn">
          <CheckCircle className="h-5 w-5 text-emerald-500 shrink-0 mt-0.5" />
          <span>{successMsg}</span>
        </div>
      )}

      {errorMsg && (
        <div className="bg-red-50 border border-red-200 text-red-800 p-4 rounded-xl flex items-start gap-3 text-sm animate-fadeIn">
          <AlertTriangle className="h-5 w-5 text-red-500 shrink-0 mt-0.5" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Compliance Health Overview Cards */}
      {loadingCompliance ? (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-28 bg-neutral-200 animate-pulse rounded-xl"></div>
            ))}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-28 bg-neutral-200 animate-pulse rounded-xl"></div>
            ))}
          </div>
        </div>
      ) : stats ? (
        <div className="space-y-6">
          {/* Row 1: Academic & Staffing Audits */}
          <div>
            <h3 className="text-xs font-bold uppercase text-neutral-400 mb-3 tracking-wider">Academic & Staffing Standards</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Card 1: Student Teacher Ratio */}
              <div className="card flex flex-col justify-between p-4 hover:shadow-md transition">
                <div className="flex justify-between items-start">
                  <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">Student-Teacher Ratio</span>
                  {stats.student_teacher_compliant ? (
                    <CheckCircle className="h-4.5 w-4.5 text-emerald-500" />
                  ) : (
                    <XCircle className="h-4.5 w-4.5 text-red-500" />
                  )}
                </div>
                <div className="mt-2">
                  <h3 className="text-2xl font-extrabold text-neutral-900 font-display">
                    {stats.student_teacher_ratio} : 1
                  </h3>
                  <p className="text-[10px] text-neutral-500 mt-1 font-sans">
                    CBSE Standard: <span className="font-semibold text-neutral-700">&le; 30:1</span>
                  </p>
                </div>
                <div className="mt-2 pt-2 border-t border-neutral-100">
                  <span className={`text-[10px] font-bold uppercase ${
                    stats.student_teacher_compliant ? 'text-emerald-600' : 'text-red-600'
                  }`}>
                    {stats.student_teacher_compliant ? 'Compliant' : 'Exceeds Standard'}
                  </span>
                </div>
              </div>

              {/* Card 2: Teacher Section Ratio */}
              <div className="card flex flex-col justify-between p-4 hover:shadow-md transition">
                <div className="flex justify-between items-start">
                  <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">Teacher-Section Ratio</span>
                  {stats.teacher_section_compliant ? (
                    <CheckCircle className="h-4.5 w-4.5 text-emerald-500" />
                  ) : (
                    <XCircle className="h-4.5 w-4.5 text-red-500" />
                  )}
                </div>
                <div className="mt-2">
                  <h3 className="text-2xl font-extrabold text-neutral-900 font-display">
                    {stats.teacher_section_ratio} : 1
                  </h3>
                  <p className="text-[10px] text-neutral-500 mt-1 font-sans">
                    CBSE Standard: <span className="font-semibold text-neutral-700">&ge; 1.5:1</span>
                  </p>
                </div>
                <div className="mt-2 pt-2 border-t border-neutral-100">
                  <span className={`text-[10px] font-bold uppercase ${
                    stats.teacher_section_compliant ? 'text-emerald-600' : 'text-red-600'
                  }`}>
                    {stats.teacher_section_compliant ? 'Compliant' : 'Understaffed'}
                  </span>
                </div>
              </div>

              {/* Card 3: Class Capacities */}
              <div className="card flex flex-col justify-between p-4 hover:shadow-md transition">
                <div className="flex justify-between items-start">
                  <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">Section Enrollment Cap</span>
                  {stats.sections_over_capacity_compliant ? (
                    <CheckCircle className="h-4.5 w-4.5 text-emerald-500" />
                  ) : (
                    <AlertTriangle className="h-4.5 w-4.5 text-amber-500" />
                  )}
                </div>
                <div className="mt-2">
                  <h3 className="text-2xl font-extrabold text-neutral-900 font-display">
                    {stats.sections_over_capacity.length} Warning(s)
                  </h3>
                  <p className="text-[10px] text-neutral-500 mt-1 font-sans">
                    CBSE Standard: <span className="font-semibold text-neutral-700">&le; 40 / section</span>
                  </p>
                </div>
                <div className="mt-2 pt-2 border-t border-neutral-100">
                  <span className={`text-[10px] font-bold uppercase ${
                    stats.sections_over_capacity_compliant ? 'text-emerald-600' : 'text-amber-600'
                  }`}>
                    {stats.sections_over_capacity_compliant ? 'Compliant' : 'Overcapacity Sections'}
                  </span>
                </div>
              </div>

              {/* Card 4: Subject Curriculums */}
              <div className="card flex flex-col justify-between p-4 hover:shadow-md transition">
                <div className="flex justify-between items-start">
                  <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">Subject Codes Mapping</span>
                  {stats.subjects_compliant ? (
                    <CheckCircle className="h-4.5 w-4.5 text-emerald-500" />
                  ) : (
                    <AlertTriangle className="h-4.5 w-4.5 text-amber-500" />
                  )}
                </div>
                <div className="mt-2">
                  <h3 className="text-2xl font-extrabold text-neutral-900 font-display">
                    {stats.subjects_missing_codes.length} Missing
                  </h3>
                  <p className="text-[10px] text-neutral-500 mt-1 font-sans">
                    Curriculum Alignment: <span className="font-semibold text-neutral-700">100% Required</span>
                  </p>
                </div>
                <div className="mt-2 pt-2 border-t border-neutral-100">
                  <span className={`text-[10px] font-bold uppercase ${
                    stats.subjects_compliant ? 'text-emerald-600' : 'text-amber-600'
                  }`}>
                    {stats.subjects_compliant ? 'Compliant' : 'Needs Review'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Row 2: Physical Infrastructure Audits */}
          <div>
            <h3 className="text-xs font-bold uppercase text-neutral-400 mb-3 tracking-wider">Facility & Resource Audits</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {/* Card 5: Land Area */}
              <div className="card flex flex-col justify-between p-4 hover:shadow-md transition">
                <div className="flex justify-between items-start">
                  <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">Campus Land Area</span>
                  {stats.land_area_compliant ? (
                    <CheckCircle className="h-4.5 w-4.5 text-emerald-500" />
                  ) : (
                    <AlertTriangle className="h-4.5 w-4.5 text-amber-500" />
                  )}
                </div>
                <div className="mt-2">
                  <h3 className="text-2xl font-extrabold text-neutral-900 font-display">
                    {profile?.land_area_sq_mtrs ? `${profile.land_area_sq_mtrs.toLocaleString()} ㎡` : '0 ㎡'}
                  </h3>
                  <p className="text-[10px] text-neutral-500 mt-1 font-sans">
                    CBSE Standard: <span className="font-semibold text-neutral-700">&ge; 4,000 ㎡</span>
                  </p>
                </div>
                <div className="mt-2 pt-2 border-t border-neutral-100">
                  <span className={`text-[10px] font-bold uppercase ${
                    stats.land_area_compliant ? 'text-emerald-600' : 'text-amber-600'
                  }`}>
                    {stats.land_area_compliant ? 'Compliant' : 'Below Standard'}
                  </span>
                </div>
              </div>

              {/* Card 6: Library Books */}
              <div className="card flex flex-col justify-between p-4 hover:shadow-md transition">
                <div className="flex justify-between items-start">
                  <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">Library Books Inventory</span>
                  {stats.library_books_compliant ? (
                    <CheckCircle className="h-4.5 w-4.5 text-emerald-500" />
                  ) : (
                    <XCircle className="h-4.5 w-4.5 text-red-500" />
                  )}
                </div>
                <div className="mt-2">
                  <h3 className="text-2xl font-extrabold text-neutral-900 font-display">
                    {profile?.library_book_count ? profile.library_book_count.toLocaleString() : '0'}
                  </h3>
                  <p className="text-[10px] text-neutral-500 mt-1 font-sans">
                    Required Min: <span className="font-semibold text-neutral-700">{stats.library_books_required.toLocaleString()}</span>
                  </p>
                </div>
                <div className="mt-2 pt-2 border-t border-neutral-100">
                  <span className={`text-[10px] font-bold uppercase ${
                    stats.library_books_compliant ? 'text-emerald-600' : 'text-red-600'
                  }`}>
                    {stats.library_books_compliant ? 'Compliant' : 'Deficit'}
                  </span>
                </div>
              </div>

              {/* Card 7: Laboratories */}
              <div className="card flex flex-col justify-between p-4 hover:shadow-md transition">
                <div className="flex justify-between items-start">
                  <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">Required Labs presence</span>
                  {stats.labs_compliant ? (
                    <CheckCircle className="h-4.5 w-4.5 text-emerald-500" />
                  ) : (
                    <AlertTriangle className="h-4.5 w-4.5 text-amber-500" />
                  )}
                </div>
                <div className="mt-2">
                  <h3 className="text-2xl font-extrabold text-neutral-900 font-display">
                    {stats.labs_compliant ? 'All Present' : `${stats.missing_labs.length} Missing`}
                  </h3>
                  <p className="text-[10px] text-neutral-500 mt-1 font-sans">
                    Sci, Math, CS: <span className="font-semibold text-neutral-700">Min 1 each</span>
                  </p>
                </div>
                <div className="mt-2 pt-2 border-t border-neutral-100">
                  <span className={`text-[10px] font-bold uppercase ${
                    stats.labs_compliant ? 'text-emerald-600' : 'text-amber-600'
                  }`}>
                    {stats.labs_compliant ? 'Compliant' : 'Gaps Found'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {/* Tabs */}
      <div className="flex border-b border-neutral-200 gap-6">
        <button
          onClick={() => setActiveSubTab('profile')}
          className={`pb-3 text-sm font-semibold border-b-2 px-1 transition duration-150 ${
            activeSubTab === 'profile'
              ? 'border-primary text-primary'
              : 'border-transparent text-neutral-500 hover:text-neutral-900'
          }`}
        >
          Institutional Profile & Assets
        </button>
        <button
          onClick={() => setActiveSubTab('audit')}
          className={`pb-3 text-sm font-semibold border-b-2 px-1 transition duration-150 ${
            activeSubTab === 'audit'
              ? 'border-primary text-primary'
              : 'border-transparent text-neutral-500 hover:text-neutral-900'
          }`}
        >
          Compliance Audits & Data Gaps
        </button>
      </div>

      {/* Tab 1: Profile and Infrastructure Form */}
      {activeSubTab === 'profile' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-fadeIn">
          {/* Left Description Card */}
          <div className="lg:col-span-1 space-y-6">
            <div className="card space-y-4">
              <h3 className="section-title border-b border-neutral-100 pb-2 flex items-center gap-1.5">
                <Info className="h-4.5 w-4.5 text-primary" /> Info & Guidelines
              </h3>
              <p className="text-xs text-neutral-500 leading-relaxed">
                CBSE inspects physical infrastructure assets during audits. Please make sure the physical measurements and counts are accurate and match documentation submitted to the board.
              </p>
              
              <div className="space-y-3 pt-2">
                <div className="flex items-start gap-2.5 text-xs text-neutral-600">
                  <Building className="h-4 w-4 text-neutral-400 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-semibold text-neutral-800">Minimum Land Requirement:</span>
                    <p className="text-[11px] text-neutral-400 mt-0.5">CBSE generally mandates a minimum land area of 4000 sq. mtrs (reduced to 2000 sq. mtrs in cities with 1.5M+ population).</p>
                  </div>
                </div>

                <div className="flex items-start gap-2.5 text-xs text-neutral-600">
                  <BookOpen className="h-4 w-4 text-neutral-400 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-semibold text-neutral-800">Library Standards:</span>
                    <p className="text-[11px] text-neutral-400 mt-0.5">Must have at least 1500 books for starter schools, or at least 15 books per student enrolled.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Infrastructure Form */}
          <div className="lg:col-span-2">
            <div className="card space-y-5">
              <h3 className="section-title border-b border-neutral-100 pb-2">Configure CBSE Institutional Metrics</h3>
              
              {loadingProfile ? (
                <div className="flex justify-center items-center py-10">
                  <Loader2 className="h-6 w-6 text-primary animate-spin" />
                </div>
              ) : (
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                  {/* Row 1: Board IDs */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold uppercase text-neutral-500">CBSE Affiliation Number</label>
                      <input
                        type="text"
                        placeholder="e.g. 1130872"
                        {...register('affiliation_number')}
                        className="input-field py-2 text-xs font-semibold"
                      />
                      {errors.affiliation_number && (
                        <p className="text-red-500 text-xs mt-1">{errors.affiliation_number.message}</p>
                      )}
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] font-bold uppercase text-neutral-500">CBSE School Code</label>
                      <input
                        type="text"
                        placeholder="e.g. 30652"
                        {...register('school_code')}
                        className="input-field py-2 text-xs font-semibold"
                      />
                      {errors.school_code && (
                        <p className="text-red-500 text-xs mt-1">{errors.school_code.message}</p>
                      )}
                    </div>
                  </div>

                  {/* Row 2: Campus Areas */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 border-t border-neutral-100 pt-4">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold uppercase text-neutral-500">Total Land Area (sq mtrs)</label>
                      <input
                        type="number"
                        step="0.01"
                        placeholder="e.g. 6000"
                        {...register('land_area_sq_mtrs')}
                        className="input-field py-2 text-xs font-semibold"
                      />
                      {errors.land_area_sq_mtrs && (
                        <p className="text-red-500 text-xs mt-1">{errors.land_area_sq_mtrs.message}</p>
                      )}
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] font-bold uppercase text-neutral-500">Built-Up Area (sq mtrs)</label>
                      <input
                        type="number"
                        step="0.01"
                        placeholder="e.g. 2400"
                        {...register('built_up_area_sq_mtrs')}
                        className="input-field py-2 text-xs font-semibold"
                      />
                      {errors.built_up_area_sq_mtrs && (
                        <p className="text-red-500 text-xs mt-1">{errors.built_up_area_sq_mtrs.message}</p>
                      )}
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] font-bold uppercase text-neutral-500">Playground Area (sq mtrs)</label>
                      <input
                        type="number"
                        step="0.01"
                        placeholder="e.g. 3600"
                        {...register('playground_area_sq_mtrs')}
                        className="input-field py-2 text-xs font-semibold"
                      />
                      {errors.playground_area_sq_mtrs && (
                        <p className="text-red-500 text-xs mt-1">{errors.playground_area_sq_mtrs.message}</p>
                      )}
                    </div>
                  </div>

                  {/* Row 3: Classrooms & Labs */}
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4 border-t border-neutral-100 pt-4">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold uppercase text-neutral-500">Classrooms Count</label>
                      <input
                        type="number"
                        {...register('classroom_count')}
                        className="input-field py-2 text-xs font-semibold"
                      />
                      {errors.classroom_count && (
                        <p className="text-red-500 text-xs mt-1">{errors.classroom_count.message}</p>
                      )}
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] font-bold uppercase text-neutral-500">Composite Sci Labs</label>
                      <input
                        type="number"
                        {...register('composite_science_lab_count')}
                        className="input-field py-2 text-xs font-semibold"
                      />
                      {errors.composite_science_lab_count && (
                        <p className="text-red-500 text-xs mt-1">{errors.composite_science_lab_count.message}</p>
                      )}
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] font-bold uppercase text-neutral-500">Mathematics Labs</label>
                      <input
                        type="number"
                        {...register('math_lab_count')}
                        className="input-field py-2 text-xs font-semibold"
                      />
                      {errors.math_lab_count && (
                        <p className="text-red-500 text-xs mt-1">{errors.math_lab_count.message}</p>
                      )}
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] font-bold uppercase text-neutral-500">Computer Science Labs</label>
                      <input
                        type="number"
                        {...register('computer_lab_count')}
                        className="input-field py-2 text-xs font-semibold"
                      />
                      {errors.computer_lab_count && (
                        <p className="text-red-500 text-xs mt-1">{errors.computer_lab_count.message}</p>
                      )}
                    </div>
                  </div>

                  {/* Row 4: Library Asset details */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 border-t border-neutral-100 pt-4">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold uppercase text-neutral-500">Total Library Books</label>
                      <input
                        type="number"
                        {...register('library_book_count')}
                        className="input-field py-2 text-xs font-semibold"
                      />
                      {errors.library_book_count && (
                        <p className="text-red-500 text-xs mt-1">{errors.library_book_count.message}</p>
                      )}
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] font-bold uppercase text-neutral-500">Subscribed Magazines</label>
                      <input
                        type="number"
                        {...register('library_magazine_count')}
                        className="input-field py-2 text-xs font-semibold"
                      />
                      {errors.library_magazine_count && (
                        <p className="text-red-500 text-xs mt-1">{errors.library_magazine_count.message}</p>
                      )}
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] font-bold uppercase text-neutral-500">Daily Newspapers</label>
                      <input
                        type="number"
                        {...register('library_newspaper_count')}
                        className="input-field py-2 text-xs font-semibold"
                      />
                      {errors.library_newspaper_count && (
                        <p className="text-red-500 text-xs mt-1">{errors.library_newspaper_count.message}</p>
                      )}
                    </div>
                  </div>

                  {/* Submit Button */}
                  <div className="flex justify-end pt-4 border-t border-neutral-100">
                    <button
                      type="submit"
                      disabled={updateProfileMutation.isPending}
                      className="btn-primary text-xs py-2 px-6 flex items-center gap-1.5"
                    >
                      {updateProfileMutation.isPending && (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      )}
                      Save CBSE Infrastructure Details
                    </button>
                  </div>

                </form>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Compliance Audits & Data Gaps */}
      {activeSubTab === 'audit' && (
        <div className="space-y-6 animate-fadeIn">
          {/* Sub-section 1: Overcapacity Sections */}
          <div className="card space-y-4">
            <h3 className="section-title border-b border-neutral-100 pb-2 flex items-center gap-1.5">
              <Users className="h-4.5 w-4.5 text-amber-500" /> Overcapacity Roster Sections
            </h3>
            <p className="text-xs text-neutral-500">
              CBSE mandates a maximum limit of <span className="font-semibold text-neutral-700">40 students</span> per class section. Roster classes exceeding this threshold will trigger review warnings.
            </p>

            {loadingCompliance ? (
              <div className="flex justify-center py-6">
                <Loader2 className="h-6 w-6 text-primary animate-spin" />
              </div>
            ) : !stats || stats.sections_over_capacity.length === 0 ? (
              <div className="p-4 bg-emerald-50 border border-emerald-250 text-emerald-800 text-xs font-semibold rounded-lg flex items-center gap-2">
                <CheckCircle className="h-4.5 w-4.5 text-emerald-600" />
                <span>Excellent! All class sections are within the CBSE maximum cap of 40 students.</span>
              </div>
            ) : (
              <div className="overflow-x-auto border border-neutral-200 rounded-xl">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-neutral-50 text-xs font-bold border-b border-neutral-200 text-neutral-600">
                      <th className="p-3">Class Name</th>
                      <th className="p-3">Section</th>
                      <th className="p-3 text-center">Active Enrolled Students</th>
                      <th className="p-3 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-150 text-sm">
                    {stats.sections_over_capacity.map((sec) => (
                      <tr key={sec.id} className="hover:bg-neutral-50/50">
                        <td className="p-3 font-semibold text-neutral-900">{sec.class_name}</td>
                        <td className="p-3">
                          <span className="bg-neutral-100 text-neutral-700 px-2.5 py-0.5 rounded-full text-xs font-semibold">
                            Section {sec.section}
                          </span>
                        </td>
                        <td className="p-3 text-center font-bold text-red-600">{sec.student_count}</td>
                        <td className="p-3 text-center">
                          <span className="bg-red-50 border border-red-200 text-red-700 px-2.5 py-0.5 rounded-lg text-xs font-bold">
                            Exceeds limit
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Sub-section 2: Teachers Missing Qualifications */}
          <div className="card space-y-4">
            <h3 className="section-title border-b border-neutral-100 pb-2 flex items-center gap-1.5">
              <GraduationCap className="h-4.5 w-4.5 text-amber-500" /> Teacher Qualifications Audit
            </h3>
            <p className="text-xs text-neutral-500">
              CBSE requires complete academic and professional credentials (e.g., B.Ed., M.Sc.) for all registered teachers. Below are active teachers missing qualifications in their staff profile.
            </p>

            {loadingCompliance ? (
              <div className="flex justify-center py-6">
                <Loader2 className="h-6 w-6 text-primary animate-spin" />
              </div>
            ) : !stats || stats.teachers_missing_qualifications.length === 0 ? (
              <div className="p-4 bg-emerald-50 border border-emerald-250 text-emerald-800 text-xs font-semibold rounded-lg flex items-center gap-2">
                <CheckCircle className="h-4.5 w-4.5 text-emerald-600" />
                <span>All active teachers have qualification details configured in their profiles.</span>
              </div>
            ) : (
              <div className="overflow-x-auto border border-neutral-200 rounded-xl">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-neutral-50 text-xs font-bold border-b border-neutral-200 text-neutral-600">
                      <th className="p-3">Staff Code</th>
                      <th className="p-3">Teacher Name</th>
                      <th className="p-3">Designation</th>
                      <th className="p-3 text-center">Audit Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-150 text-sm">
                    {stats.teachers_missing_qualifications.map((t) => (
                      <tr key={t.id} className="hover:bg-neutral-50/50">
                        <td className="p-3 font-mono text-xs font-bold">{t.employee_code}</td>
                        <td className="p-3 font-semibold text-neutral-900">{t.first_name} {t.last_name}</td>
                        <td className="p-3 text-neutral-600">{t.designation}</td>
                        <td className="p-3 text-center">
                          <span className="bg-amber-50 border border-amber-250 text-amber-800 px-2.5 py-0.5 rounded-lg text-xs font-bold">
                            Missing Credentials
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Sub-section 3: Teacher Credentials Professional Audit */}
          <div className="card space-y-4">
            <h3 className="section-title border-b border-neutral-100 pb-2 flex items-center gap-1.5">
              <GraduationCap className="h-4.5 w-4.5 text-amber-500" /> Teacher Credentials Professional Audit
            </h3>
            <p className="text-xs text-neutral-500">
              CBSE mandates that all teaching staff hold a professional teaching qualification (such as B.Ed, M.Ed, or D.El.Ed). Below are teachers who have credentials listed, but lack a recognized pedagogical qualification.
            </p>

            {loadingCompliance ? (
              <div className="flex justify-center py-6">
                <Loader2 className="h-6 w-6 text-primary animate-spin" />
              </div>
            ) : !stats || stats.teachers_missing_professional.length === 0 ? (
              <div className="p-4 bg-emerald-50 border border-emerald-250 text-emerald-800 text-xs font-semibold rounded-lg flex items-center gap-2">
                <CheckCircle className="h-4.5 w-4.5 text-emerald-600" />
                <span>All listed teachers possess recognized professional teaching qualifications.</span>
              </div>
            ) : (
              <div className="overflow-x-auto border border-neutral-200 rounded-xl">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-neutral-50 text-xs font-bold border-b border-neutral-200 text-neutral-600">
                      <th className="p-3">Staff Code</th>
                      <th className="p-3">Teacher Name</th>
                      <th className="p-3">Configured Profile Qualifications</th>
                      <th className="p-3 text-center">Audit Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-150 text-sm">
                    {stats.teachers_missing_professional.map((t) => (
                      <tr key={t.id} className="hover:bg-neutral-50/50">
                        <td className="p-3 font-mono text-xs font-bold">{t.employee_code}</td>
                        <td className="p-3 font-semibold text-neutral-900">{t.first_name} {t.last_name}</td>
                        <td className="p-3 text-neutral-600 font-medium">{t.qualification}</td>
                        <td className="p-3 text-center">
                          <span className="bg-amber-50 border border-amber-250 text-amber-800 px-2.5 py-0.5 rounded-lg text-xs font-bold">
                            Missing B.Ed / D.El.Ed
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Sub-section 4: Subjects Missing CBSE Codes */}
          <div className="card space-y-4">
            <h3 className="section-title border-b border-neutral-100 pb-2 flex items-center gap-1.5">
              <BookOpen className="h-4.5 w-4.5 text-amber-500" /> Curriculum Code Audit
            </h3>
            <p className="text-xs text-neutral-500">
              All offered subjects must be mapped to their official CBSE subject code (e.g. 041 for Mathematics, 086 for Science) for board registrations.
            </p>

            {loadingCompliance ? (
              <div className="flex justify-center py-6">
                <Loader2 className="h-6 w-6 text-primary animate-spin" />
              </div>
            ) : !stats || stats.subjects_missing_codes.length === 0 ? (
              <div className="p-4 bg-emerald-50 border border-emerald-250 text-emerald-800 text-xs font-semibold rounded-lg flex items-center gap-2">
                <CheckCircle className="h-4.5 w-4.5 text-emerald-600" />
                <span>All academic subjects are mapped to a curriculum subject code.</span>
              </div>
            ) : (
              <div className="overflow-x-auto border border-neutral-200 rounded-xl">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-neutral-50 text-xs font-bold border-b border-neutral-200 text-neutral-600">
                      <th className="p-3">Subject Name</th>
                      <th className="p-3 w-1/2">Description</th>
                      <th className="p-3 text-center">Audit Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-150 text-sm">
                    {stats.subjects_missing_codes.map((sub) => (
                      <tr key={sub.id} className="hover:bg-neutral-50/50">
                        <td className="p-3 font-semibold text-neutral-900">{sub.name}</td>
                        <td className="p-3 text-neutral-500">{sub.description || 'No description provided'}</td>
                        <td className="p-3 text-center">
                          <span className="bg-red-50 border border-red-200 text-red-700 px-2.5 py-0.5 rounded-lg text-xs font-bold">
                            Missing CBSE Code
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Sub-section 5: Physical Infrastructure & Resource Audits */}
          <div className="card space-y-4">
            <h3 className="section-title border-b border-neutral-100 pb-2 flex items-center gap-1.5">
              <Building className="h-4.5 w-4.5 text-amber-500" /> Physical Infrastructure & Resource Audits
            </h3>
            <p className="text-xs text-neutral-500">
              Audit of campus land area, libraries, and science/computer laboratories according to minimum CBSE affiliation specifications.
            </p>

            {loadingCompliance ? (
              <div className="flex justify-center py-6">
                <Loader2 className="h-6 w-6 text-primary animate-spin" />
              </div>
            ) : !stats ? (
              null
            ) : (stats.land_area_compliant && stats.library_books_compliant && stats.labs_compliant) ? (
              <div className="p-4 bg-emerald-50 border border-emerald-250 text-emerald-800 text-xs font-semibold rounded-lg flex items-center gap-2">
                <CheckCircle className="h-4.5 w-4.5 text-emerald-600" />
                <span>All physical infrastructure assets and resource capacities meet CBSE guidelines.</span>
              </div>
            ) : (
              <div className="space-y-3">
                {/* Land Area Warning */}
                {!stats.land_area_compliant && (
                  <div className="p-3 bg-amber-50 border border-amber-200 text-amber-900 text-xs rounded-xl flex items-start gap-2.5">
                    <AlertTriangle className="h-4.5 w-4.5 text-amber-600 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold text-amber-850">Land Area Shortfall Warning</span>
                      <p className="mt-0.5 text-neutral-600">The current land area is <span className="font-bold text-neutral-800">{profile?.land_area_sq_mtrs.toLocaleString()} ㎡</span>. The CBSE standard requirement is at least <span className="font-bold text-neutral-800">{stats.land_area_required.toLocaleString()} ㎡</span> for standard urban schools.</p>
                    </div>
                  </div>
                )}

                {/* Library Books Warning */}
                {!stats.library_books_compliant && (
                  <div className="p-3 bg-red-50 border border-red-200 text-red-900 text-xs rounded-xl flex items-start gap-2.5">
                    <AlertTriangle className="h-4.5 w-4.5 text-red-600 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold text-red-850">Library Book Capacity Deficit</span>
                      <p className="mt-0.5 text-neutral-600">The school has <span className="font-bold text-neutral-800">{profile?.library_book_count.toLocaleString()}</span> books. Based on CBSE guidelines (min 1,500 books or 15 per student, whichever is higher), the minimum required count is <span className="font-bold text-neutral-800">{stats.library_books_required.toLocaleString()}</span> books.</p>
                    </div>
                  </div>
                )}

                {/* Laboratories Warning */}
                {!stats.labs_compliant && (
                  <div className="p-3 bg-amber-50 border border-amber-200 text-amber-900 text-xs rounded-xl flex items-start gap-2.5">
                    <AlertTriangle className="h-4.5 w-4.5 text-amber-600 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold text-amber-850">Missing Required Facilities</span>
                      <p className="mt-0.5 text-neutral-600">The following mandatory laboratories are missing from the school facility profile:</p>
                      <ul className="list-disc pl-4 mt-1 space-y-0.5 text-neutral-600 font-semibold">
                        {stats.missing_labs.map((lab, i) => (
                          <li key={i}>{lab}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}


