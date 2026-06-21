import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { BookOpen, Award, FileText, Download, Loader2 } from 'lucide-react';
import { parentApi } from '../api/parentApi';
import { useAuthStore } from '../../../stores/authStore';

interface ParentAcademicsProps {
  studentId: string;
}

export function ParentAcademicsPage({ studentId }: ParentAcademicsProps) {
  const { token } = useAuthStore();
  const [activeTab, setActiveTab] = useState<'homework' | 'exams'>('homework');
  const [downloadingReportId, setDownloadingReportId] = useState<string | null>(null);

  // Query homework list
  const { data: homeworkRes, isLoading: homeworkLoading } = useQuery({
    queryKey: ['parent_homework', studentId],
    queryFn: () => parentApi.getChildHomework(studentId),
    enabled: !!studentId && activeTab === 'homework',
  });

  // Query exams and marks details
  const { data: examsRes, isLoading: examsLoading } = useQuery({
    queryKey: ['parent_exams', studentId],
    queryFn: () => parentApi.getChildExams(studentId),
    enabled: !!studentId && activeTab === 'exams',
  });

  const homework = homeworkRes?.data || [];
  const examSchedules = examsRes?.data?.schedules || [];
  const examMarks = examsRes?.data?.marks || [];

  // Group marks by exam name to show report cards options
  const examsList = Array.from(new Set(examSchedules.map((s: any) => s.exam_name)))
    .map((name) => {
      const match = examSchedules.find((s: any) => s.exam_name === name);
      return {
        name,
        exam_id: match?.exam_id || '',
      };
    }).filter(e => e.exam_id);

  const handleDownloadReportCard = async (examId: string, examName: string) => {
    if (!studentId || !examId) return;
    setDownloadingReportId(examId);

    const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api/v1';

    try {
      const response = await fetch(`${apiBaseUrl}/exams/student/${studentId}/report-card?exam_id=${examId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'X-School-ID': localStorage.getItem('skolr_school_id') || '',
        }
      });
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `report-card-${examName.toLowerCase().replace(/\s+/g, '-')}-${studentId}.pdf`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        window.URL.revokeObjectURL(url);
      } else {
        alert('Failed to generate report card PDF. Please verify that marks have been graded for this exam term.');
      }
    } catch (err) {
      alert('Error downloading report card PDF.');
    } finally {
      setDownloadingReportId(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Tab Navigation header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-4 border border-neutral-200 rounded-2xl shadow-sm">
        <div className="flex border-b border-neutral-100 gap-6 shrink-0">
          <button
            onClick={() => setActiveTab('homework')}
            className={`pb-3 text-xs font-bold border-b-2 px-1 transition duration-150 uppercase tracking-wider font-display ${
              activeTab === 'homework'
                ? 'border-primary text-primary'
                : 'border-transparent text-neutral-400 hover:text-neutral-600'
            }`}
          >
            <span className="flex items-center gap-1.5"><BookOpen className="h-4 w-4" /> Homework Board</span>
          </button>
          <button
            onClick={() => setActiveTab('exams')}
            className={`pb-3 text-xs font-bold border-b-2 px-1 transition duration-150 uppercase tracking-wider font-display ${
              activeTab === 'exams'
                ? 'border-primary text-primary'
                : 'border-transparent text-neutral-400 hover:text-neutral-600'
            }`}
          >
            <span className="flex items-center gap-1.5"><Award className="h-4 w-4" /> Exams & Report Cards</span>
          </button>
        </div>
        <p className="text-xs text-neutral-450 font-semibold italic">Track class curriculums and CBSE compliant results</p>
      </div>

      {activeTab === 'homework' && (
        <div className="space-y-4">
          {homeworkLoading ? (
            <div className="flex flex-col items-center justify-center py-20 space-y-3 bg-white border border-neutral-200 rounded-2xl">
              <span className="border-2 border-primary border-t-transparent w-8 h-8 rounded-full animate-spin"></span>
              <span className="text-xs font-semibold text-neutral-450 font-display">Loading homework list...</span>
            </div>
          ) : homework.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {homework.map((item) => (
                <div key={item.id} className="card bg-white border border-neutral-200 rounded-2xl p-5 shadow-sm space-y-3 flex flex-col justify-between">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[10px] font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                        {item.subject_name} ({item.subject_code})
                      </span>
                      <span className="text-[10px] font-bold text-neutral-450">
                        Due: {new Date(item.due_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </span>
                    </div>
                    <h3 className="text-sm font-bold text-neutral-800 font-display">{item.title}</h3>
                    <p className="text-xs text-neutral-500 leading-relaxed">{item.description}</p>
                  </div>

                  <div className="pt-3 border-t border-neutral-100 flex items-center justify-between text-[11px] text-neutral-450">
                    <span>Teacher: {item.teacher_name}</span>
                    {item.attachment_url && (
                      <a
                        href={item.attachment_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 font-bold text-primary hover:underline"
                      >
                        <Download className="h-3.5 w-3.5" /> View Syllabus File
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-20 bg-white border border-neutral-200 rounded-2xl text-neutral-450 text-xs font-semibold shadow-sm">
              No homework circular announcements logged for this class.
            </div>
          )}
        </div>
      )}

      {activeTab === 'exams' && (
        <div className="space-y-6">
          {examsLoading ? (
            <div className="flex flex-col items-center justify-center py-20 space-y-3 bg-white border border-neutral-200 rounded-2xl">
              <span className="border-2 border-primary border-t-transparent w-8 h-8 rounded-full animate-spin"></span>
              <span className="text-xs font-semibold text-neutral-450 font-display">Loading academic schedules...</span>
            </div>
          ) : (
            <>
              {/* Printable PDF report cards cards list */}
              {examsList.length > 0 && (
                <div className="bg-white border border-neutral-200 rounded-2xl p-5 shadow-sm space-y-4">
                  <h3 className="text-xs font-bold text-neutral-400 uppercase tracking-wider font-display flex items-center gap-1.5">
                    <FileText className="h-4 w-4 text-primary" /> Download Printable Report Cards
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                    {examsList.map((ex) => (
                      <div key={ex.exam_id} className="p-4 border border-neutral-200 bg-neutral-50/50 rounded-xl flex items-center justify-between gap-4">
                        <div>
                          <div className="text-xs font-bold text-neutral-800 font-display">{ex.name}</div>
                          <span className="text-[10px] text-neutral-450 font-semibold">Official CBSE Fact Sheet PDF</span>
                        </div>
                        <button
                          onClick={() => handleDownloadReportCard(ex.exam_id, ex.name)}
                          disabled={downloadingReportId === ex.exam_id}
                          className="flex items-center justify-center p-2 rounded-lg bg-primary hover:bg-primary-light text-white transition disabled:opacity-50"
                          title="Download PDF"
                        >
                          {downloadingReportId === ex.exam_id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Download className="h-4 w-4" />
                          )}
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Marks Ledger / Subject wise details */}
              <div className="bg-white border border-neutral-200 rounded-2xl overflow-hidden shadow-sm">
                <div className="px-5 py-4 border-b border-neutral-200">
                  <h3 className="text-xs font-bold text-neutral-400 uppercase tracking-wider font-display">Graded Marks Ledger</h3>
                </div>
                {examMarks.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-neutral-50 text-neutral-500 font-bold uppercase border-b border-neutral-200">
                        <tr>
                          <th className="px-5 py-3 font-display">Exam Term</th>
                          <th className="px-5 py-3 font-display">Subject Name</th>
                          <th className="px-5 py-3 font-display">Marks Obtained</th>
                          <th className="px-5 py-3 font-display">Percentage</th>
                          <th className="px-5 py-3 font-display">Comments</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-neutral-100 font-medium">
                        {examMarks.map((mark) => {
                          const percentage = (mark.marks_obtained / mark.max_marks) * 100;
                          return (
                            <tr key={mark.id} className="hover:bg-neutral-50/50 transition">
                              <td className="px-5 py-3.5 font-bold text-neutral-800">{mark.exam_name}</td>
                              <td className="px-5 py-3.5 text-neutral-600 font-semibold">{mark.subject_name}</td>
                              <td className="px-5 py-3.5 font-bold text-neutral-700">
                                {mark.marks_obtained} <span className="text-[10px] text-neutral-450 font-normal">/ {mark.max_marks}</span>
                              </td>
                              <td className="px-5 py-3.5">
                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                                  percentage >= 75 
                                    ? 'bg-emerald-50 text-emerald-700 border-emerald-250' 
                                    : (percentage >= 40 ? 'bg-amber-50 text-amber-700 border-amber-250' : 'bg-red-50 text-red-700 border-red-250')
                                }`}>
                                  {percentage.toFixed(1)}%
                                </span>
                              </td>
                              <td className="px-5 py-3.5 text-neutral-450 italic">{mark.remarks || 'No comments'}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="text-center py-12 text-neutral-450 text-xs font-semibold">
                    No graded report marks recorded for this profile yet.
                  </div>
                )}
              </div>

              {/* Schedules Table */}
              <div className="bg-white border border-neutral-200 rounded-2xl overflow-hidden shadow-sm">
                <div className="px-5 py-4 border-b border-neutral-200">
                  <h3 className="text-xs font-bold text-neutral-400 uppercase tracking-wider font-display">Exam Schedules</h3>
                </div>
                {examSchedules.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-neutral-50 text-neutral-500 font-bold uppercase border-b border-neutral-200">
                        <tr>
                          <th className="px-5 py-3 font-display">Exam Term</th>
                          <th className="px-5 py-3 font-display">Subject Name</th>
                          <th className="px-5 py-3 font-display">Paper Date</th>
                          <th className="px-5 py-3 font-display">Passing Dues</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-neutral-100 font-medium">
                        {examSchedules.map((sched) => (
                          <tr key={sched.id} className="hover:bg-neutral-50/50 transition">
                            <td className="px-5 py-3.5 font-bold text-neutral-800">{sched.exam_name}</td>
                            <td className="px-5 py-3.5 text-neutral-600 font-semibold">{sched.subject_name}</td>
                            <td className="px-5 py-3.5 font-bold text-neutral-700">
                              {new Date(sched.exam_date).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}
                            </td>
                            <td className="px-5 py-3.5 text-neutral-450">
                              Passing: {sched.passing_marks} <span className="text-[10px]">/ {sched.max_marks} marks</span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="text-center py-12 text-neutral-450 text-xs font-semibold">
                    No exam paper schedules announced yet.
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
