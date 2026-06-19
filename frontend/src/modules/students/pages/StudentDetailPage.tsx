import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, Phone, Mail, Briefcase, Calendar, Info, Loader2, AlertCircle } from 'lucide-react';

import { studentApi } from '../api/studentApi';

interface StudentDetailPageProps {
  studentId: string;
  onBack: () => void;
}

export function StudentDetailPage({ studentId, onBack }: StudentDetailPageProps) {
  // Query student details from API
  const { data, isLoading, error } = useQuery({
    queryKey: ['student', studentId],
    queryFn: () => studentApi.get(studentId),
  });

  const student = data?.data;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4 border-b border-neutral-250 pb-4">
        <button
          onClick={onBack}
          className="btn-secondary p-2 rounded-lg"
          title="Back to List"
        >
          <ArrowLeft className="h-4.5 w-4.5 text-neutral-600" />
        </button>
        <div>
          <h2 className="text-2xl font-bold font-display text-neutral-900">Student Profile</h2>
          <p className="text-sm text-neutral-500">View admission registry and contact details.</p>
        </div>
      </div>

      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-24 space-y-3">
          <Loader2 className="h-10 w-10 text-primary animate-spin" />
          <span className="text-sm text-neutral-500 font-medium">Loading profile ledger...</span>
        </div>
      ) : error || !student ? (
        <div className="bg-red-50 border border-red-200 text-red-700 px-6 py-4 rounded-xl flex items-center gap-3">
          <AlertCircle className="h-5 w-5 text-red-500" />
          <span>Failed to load student details. Record may have been removed or backend is offline.</span>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Panel: Primary Info Card */}
          <div className="card space-y-6 flex flex-col items-center text-center justify-start py-8">
            <div className="h-24 w-24 bg-primary/10 text-primary rounded-full flex items-center justify-center text-3xl font-bold">
              {student.first_name[0]}{student.last_name[0]}
            </div>
            
            <div className="space-y-1">
              <h3 className="text-xl font-bold font-display text-neutral-900">
                {student.first_name} {student.last_name}
              </h3>
              <p className="font-mono text-xs text-neutral-500 font-semibold uppercase tracking-wider">
                Admission No: {student.admission_number}
              </p>
            </div>

            <div className="w-full border-t border-neutral-100 pt-4 space-y-3 text-left">
              <div className="flex justify-between items-center text-sm">
                <span className="text-neutral-500">Status</span>
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold uppercase bg-green-50 text-green-700 border border-green-200">
                  {student.status}
                </span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-neutral-500">Roll Number</span>
                <span className="font-semibold text-neutral-800">{student.roll_number ?? '-'}</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-neutral-500">Gender</span>
                <span className="font-semibold text-neutral-800">
                  {student.gender === 'M' ? 'Male' : student.gender === 'F' ? 'Female' : 'Other'}
                </span>
              </div>
            </div>
          </div>

          {/* Right Panel: Tabs or Info Lists */}
          <div className="lg:col-span-2 space-y-6">
            {/* Enrollment Ledger */}
            <div className="card space-y-4">
              <h4 className="section-title border-b border-neutral-100 pb-2 flex items-center gap-2">
                <Calendar className="h-5 w-5 text-neutral-500" />
                Admission & Academics
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm">
                <div>
                  <span className="text-xs text-neutral-450 font-semibold uppercase block">Date of Birth</span>
                  <span className="font-medium text-neutral-800">{new Date(student.date_of_birth).toLocaleDateString('en-US', { dateStyle: 'long' })}</span>
                </div>
                <div>
                  <span className="text-xs text-neutral-450 font-semibold uppercase block">Date of Admission</span>
                  <span className="font-medium text-neutral-800">{new Date(student.admission_date).toLocaleDateString('en-US', { dateStyle: 'long' })}</span>
                </div>
              </div>
            </div>

            {/* Parents Ledger */}
            <div className="card space-y-6">
              <h4 className="section-title border-b border-neutral-100 pb-2 flex items-center gap-2">
                <Info className="h-5 w-5 text-neutral-500" />
                Parent & Guardian Contact Directory
              </h4>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {student.parents.map((parent: any) => (
                  <div key={parent.id} className="space-y-4 border border-neutral-100 p-4 rounded-xl bg-neutral-50/50">
                    <div className="flex items-center justify-between border-b border-neutral-100 pb-1.5">
                      <span className="font-display font-bold text-neutral-800 capitalize">
                        {parent.parent_type} ({parent.first_name} {parent.last_name})
                      </span>
                    </div>

                    <div className="space-y-2.5 text-sm">
                      <div className="flex items-center gap-2 text-neutral-600">
                        <Phone className="h-4 w-4 text-neutral-400 shrink-0" />
                        <span className="font-mono">{parent.mobile}</span>
                      </div>
                      
                      <div className="flex items-center gap-2 text-neutral-600">
                        <Mail className="h-4 w-4 text-neutral-400 shrink-0" />
                        <span className="truncate">{parent.email || 'No Email Registered'}</span>
                      </div>

                      <div className="flex items-center gap-2 text-neutral-600">
                        <Briefcase className="h-4 w-4 text-neutral-400 shrink-0" />
                        <span>{parent.occupation || 'Not specified'}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
