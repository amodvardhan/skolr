import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  FileSpreadsheet,
  Save,
  Loader2,
  FileDown,
  CheckCircle,
} from 'lucide-react';

import { examsApi, ExamMark } from '../api/examsApi';
import { studentApi } from '../../students/api/studentApi';
import { CustomSelect } from '../../../components/CustomSelect';

export function MarksEntryPage() {
  const queryClient = useQueryClient();
  
  // Selection States
  const [selectedExamId, setSelectedExamId] = useState<string>('');
  const [selectedClassId, setSelectedClassId] = useState<string>('');
  const [selectedSchedId, setSelectedSchedId] = useState<string>('');
  
  // Local ledger editing state
  const [ledger, setLedger] = useState<ExamMark[]>([]);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Queries
  const { data: examsRes } = useQuery({
    queryKey: ['exams-sessions'],
    queryFn: () => examsApi.listExams(),
  });

  const { data: classes = [] } = useQuery({
    queryKey: ['classes-master'],
    queryFn: studentApi.classes,
  });

  // Fetch subject schedules for selected exam + class
  const { data: schedulesRes, isLoading: loadingSchedules } = useQuery({
    queryKey: ['exam-schedules', selectedExamId, selectedClassId],
    queryFn: () => examsApi.listSchedules(selectedExamId, selectedClassId || undefined),
    enabled: !!selectedExamId && !!selectedClassId,
  });

  // Fetch marks roster when schedule is selected
  const { data: marksRes, isLoading: loadingMarks } = useQuery({
    queryKey: ['exam-marks-roster', selectedSchedId],
    queryFn: () => examsApi.listMarksRoster(selectedSchedId),
    enabled: !!selectedSchedId,
  });

  const exams = examsRes?.data || [];
  const schedules = schedulesRes?.data || [];
  const rawMarks = marksRes?.data || [];

  const selectedSchedule = schedules.find(s => s.id === selectedSchedId);

  // Automatically reset selected schedule if exam or class changes
  useEffect(() => {
    setSelectedSchedId('');
    setLedger([]);
    setValidationErrors({});
    setSaveSuccess(false);
  }, [selectedExamId, selectedClassId]);

  // Sync server marks to local state when fetched
  useEffect(() => {
    if (rawMarks.length > 0) {
      // Map null marks to empty string for easier input editing
      setLedger(rawMarks.map(m => ({
        ...m,
        marks_obtained: m.marks_obtained === null ? null : m.marks_obtained,
        remarks: m.remarks || ''
      })));
      setValidationErrors({});
      setSaveSuccess(false);
    } else {
      setLedger([]);
    }
  }, [rawMarks]);

  // Handle local marks changes
  const handleMarkChange = (studentId: string, value: string) => {
    setSaveSuccess(false);
    
    // Validate value
    let error = '';
    let parsedValue: number | null = null;
    
    if (value.trim() !== '') {
      parsedValue = Number(value);
      if (isNaN(parsedValue)) {
        error = 'Must be a valid number';
      } else if (parsedValue < 0) {
        error = 'Cannot be negative';
      } else if (selectedSchedule && parsedValue > selectedSchedule.max_marks) {
        error = `Cannot exceed max marks (${selectedSchedule.max_marks})`;
      }
    }

    setValidationErrors(prev => ({
      ...prev,
      [studentId]: error
    }));

    setLedger(prev =>
      prev.map(m =>
        m.student_id === studentId
          ? { ...m, marks_obtained: error ? null : (value.trim() === '' ? null : parsedValue) }
          : m
      )
    );
  };

  // Handle local remarks changes
  const handleRemarksChange = (studentId: string, value: string) => {
    setSaveSuccess(false);
    setLedger(prev =>
      prev.map(m =>
        m.student_id === studentId
          ? { ...m, remarks: value }
          : m
      )
    );
  };

  // Save Mutation
  const saveMutation = useMutation({
    mutationFn: (data: any) => examsApi.saveMarksLedger(selectedSchedId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['exam-marks-roster', selectedSchedId] });
      setSaveSuccess(true);
      alert('Marks ledger saved successfully!');
    },
    onError: (err: any) => {
      alert(err.response?.data?.detail || 'Failed to save marks ledger.');
    }
  });

  const handleSave = () => {
    // Check for validation errors
    const hasErrors = Object.values(validationErrors).some(err => !!err);
    if (hasErrors) {
      alert('Please resolve validation errors before saving.');
      return;
    }

    // Build payload. For blank scores, we default to 0 or ask them to fill. We'll send it as is, or default to 0.
    const payload = ledger.map(m => ({
      student_id: m.student_id,
      marks_obtained: m.marks_obtained === null ? 0 : m.marks_obtained,
      remarks: m.remarks || ''
    }));

    saveMutation.mutate(payload);
  };

  // Report Card Download
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  const handleDownloadReport = async (studentId: string, studentName: string) => {
    setDownloadingId(studentId);
    try {
      const blob = await examsApi.downloadReportCard(studentId, selectedExamId);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `report-card-${studentName.replace(/\s+/g, '_')}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error(err);
      alert('Failed to download report card. Make sure all subject marks are entered and saved.');
    } finally {
      setDownloadingId(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-neutral-200 pb-4">
        <div>
          <h2 className="text-2xl font-bold font-display text-neutral-900 flex items-center gap-2">
            <FileSpreadsheet className="h-6 w-6 text-primary" />
            Marks Ledger & Entry
          </h2>
          <p className="text-sm text-neutral-500 font-sans">
            Enter subject scores for class rosters and print custom academic report cards.
          </p>
        </div>
      </div>

      {/* Filters Card */}
      <div className="card grid grid-cols-1 md:grid-cols-3 gap-4 py-4 items-center">
        <div className="space-y-1">
          <label className="text-[10px] font-bold uppercase text-neutral-500">Exam Term</label>
          <CustomSelect
            value={selectedExamId}
            onChange={setSelectedExamId}
            options={exams.map(e => ({ value: e.id, label: e.name }))}
            placeholder="Choose Exam Term..."
            className="py-1 text-xs"
          />
        </div>

        <div className="space-y-1">
          <label className="text-[10px] font-bold uppercase text-neutral-500">Class & Section</label>
          <CustomSelect
            value={selectedClassId}
            onChange={setSelectedClassId}
            options={classes.map((c: any) => ({ value: c.id, label: `${c.name}-${c.section}` }))}
            placeholder="Choose Class..."
            className="py-1 text-xs"
            disabled={!selectedExamId}
          />
        </div>

        <div className="space-y-1">
          <label className="text-[10px] font-bold uppercase text-neutral-500">Scheduled Subject Paper</label>
          <CustomSelect
            value={selectedSchedId}
            onChange={setSelectedSchedId}
            options={schedules.map(s => ({ value: s.id, label: `${s.subject_name} (${s.exam_date})` }))}
            placeholder={loadingSchedules ? "Loading schedules..." : "Choose Subject Paper..."}
            className="py-1 text-xs"
            disabled={!selectedClassId || schedules.length === 0}
          />
        </div>
      </div>

      {/* Ledger Grid */}
      {selectedSchedId ? (
        <div className="card space-y-4">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 border-b border-neutral-100 pb-3">
            <div>
              <h3 className="section-title">
                Roster Marks Ledger: {selectedSchedule?.subject_name}
              </h3>
              <p className="text-xs text-neutral-500">
                Max Marks: <span className="font-bold text-neutral-800">{selectedSchedule?.max_marks}</span> | 
                Passing Marks: <span className="font-bold text-neutral-800">{selectedSchedule?.passing_marks}</span>
              </p>
            </div>

            <div className="flex items-center gap-3">
              {saveSuccess && (
                <div className="text-xs text-success font-semibold flex items-center gap-1 animate-fadeIn">
                  <CheckCircle className="h-4 w-4" /> Marks Saved
                </div>
              )}
              <button
                onClick={handleSave}
                disabled={saveMutation.isPending || ledger.length === 0}
                className="btn-primary py-2 px-4 text-xs flex items-center gap-1.5"
              >
                {saveMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Save className="h-4 w-4" />
                )}
                Save Marks Ledger
              </button>
            </div>
          </div>

          {loadingMarks ? (
            <div className="flex flex-col items-center justify-center py-20 space-y-3">
              <Loader2 className="h-10 w-10 text-primary animate-spin" />
              <span className="text-sm text-neutral-500 font-medium">Loading roster marks...</span>
            </div>
          ) : ledger.length === 0 ? (
            <div className="text-center py-20 text-neutral-450 text-xs border border-dashed border-neutral-250 rounded-xl">
              No students found registered for this class.
            </div>
          ) : (
            <div className="overflow-x-auto border border-neutral-200 rounded-xl">
              <table className="min-w-full divide-y divide-neutral-200">
                <thead className="bg-neutral-50">
                  <tr>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-bold text-neutral-500 uppercase tracking-wider style={{ width: '8%' }}">
                      Roll No
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-bold text-neutral-500 uppercase tracking-wider style={{ width: '25%' }}">
                      Student Name
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-bold text-neutral-500 uppercase tracking-wider style={{ width: '20%' }}">
                      Marks Obtained (/{selectedSchedule?.max_marks})
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-bold text-neutral-500 uppercase tracking-wider style={{ width: '32%' }}">
                      Remarks
                    </th>
                    <th scope="col" className="px-6 py-3 text-right text-xs font-bold text-neutral-500 uppercase tracking-wider style={{ width: '15%' }}">
                      Reports
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-neutral-200">
                  {ledger.map((row) => (
                    <tr key={row.student_id} className="hover:bg-neutral-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-neutral-600">
                        {row.roll_number || '—'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-neutral-900">
                        {row.student_name}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <div className="space-y-1 max-w-[150px]">
                          <input
                            type="text"
                            placeholder="e.g. 78.5"
                            defaultValue={row.marks_obtained === null ? '' : row.marks_obtained}
                            onChange={(e) => handleMarkChange(row.student_id, e.target.value)}
                            className={`input-field text-xs py-1.5 px-2.5 font-bold ${
                              validationErrors[row.student_id] ? 'border-red-500 focus:ring-red-500' : ''
                            }`}
                          />
                          {validationErrors[row.student_id] && (
                            <p className="text-red-500 text-[10px] font-semibold">
                              {validationErrors[row.student_id]}
                            </p>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <input
                          type="text"
                          placeholder="Feedback remarks..."
                          value={row.remarks || ''}
                          onChange={(e) => handleRemarksChange(row.student_id, e.target.value)}
                          className="input-field text-xs py-1.5 px-2.5 max-w-xs"
                        />
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-xs">
                        <button
                          onClick={() => handleDownloadReport(row.student_id, row.student_name)}
                          disabled={downloadingId === row.student_id}
                          className="btn-secondary py-1.5 px-3 flex items-center gap-1 text-[11px] self-end ml-auto"
                        >
                          {downloadingId === row.student_id ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : (
                            <FileDown className="h-3.5 w-3.5" />
                          )}
                          Report Card
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      ) : (
        <div className="card text-center py-20 text-neutral-400 text-sm border border-dashed border-neutral-250 rounded-xl max-w-lg mx-auto">
          Please select an **Exam Term**, a **Class & Section**, and a **Scheduled Subject Paper** to view the ledger.
        </div>
      )}
    </div>
  );
}
