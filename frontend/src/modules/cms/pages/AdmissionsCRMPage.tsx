import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  Phone, 
  Mail, 
  Plus, 
  Loader2, 
  AlertCircle,
  X,
  UserCheck,
  Clock,
  ArrowRight,
  TrendingUp
} from 'lucide-react';
import { cmsApi, CMSInquiry } from '../api/cmsApi';

const COLUMNS = [
  { id: 'new', label: 'New Lead', color: 'border-blue-400 bg-blue-50/50 text-blue-700 hover:bg-blue-50' },
  { id: 'contacted', label: 'Contacted', color: 'border-indigo-400 bg-indigo-50/50 text-indigo-700 hover:bg-indigo-50' },
  { id: 'visit_scheduled', label: 'Visit Scheduled', color: 'border-amber-400 bg-amber-50/50 text-amber-700 hover:bg-amber-50' },
  { id: 'applied', label: 'Applied', color: 'border-purple-400 bg-purple-50/50 text-purple-700 hover:bg-purple-50' },
  { id: 'admitted', label: 'Admitted', color: 'border-green-400 bg-green-50/50 text-green-700 hover:bg-green-50' },
  { id: 'archived', label: 'Archived', color: 'border-neutral-400 bg-neutral-50/50 text-neutral-700 hover:bg-neutral-50' },
];

interface AdmissionsCRMPageProps {
  onConvertToAdmission: (prefillData: any) => void;
}

export function AdmissionsCRMPage({ onConvertToAdmission }: AdmissionsCRMPageProps) {
  const queryClient = useQueryClient();
  const [selectedInquiry, setSelectedInquiry] = useState<CMSInquiry | null>(null);
  const [newNote, setNewNote] = useState('');
  const [noteAuthor, setNoteAuthor] = useState('');
  const [draggedOverColumn, setDraggedOverColumn] = useState<string | null>(null);

  // Fetch inquiries list
  const { data: inquiriesRes, isLoading, error } = useQuery({
    queryKey: ['cms_inquiries'],
    queryFn: cmsApi.getInquiries,
  });

  const inquiries = inquiriesRes?.data || [];

  // Update status mutation
  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      return await cmsApi.updateInquiryStatus(id, status);
    },
    onSuccess: (resData) => {
      queryClient.invalidateQueries({ queryKey: ['cms_inquiries'] });
      if (selectedInquiry && selectedInquiry.id === resData.data.id) {
        setSelectedInquiry(resData.data);
      }
    }
  });

  // Add note mutation
  const addNoteMutation = useMutation({
    mutationFn: async ({ id, note, author }: { id: string; note: string; author: string }) => {
      return await cmsApi.addInquiryNote(id, { note, author });
    },
    onSuccess: (resData) => {
      queryClient.invalidateQueries({ queryKey: ['cms_inquiries'] });
      if (selectedInquiry && selectedInquiry.id === resData.data.id) {
        setSelectedInquiry(resData.data);
      }
      setNewNote('');
    }
  });

  // Convert to Admission mutation
  const convertMutation = useMutation({
    mutationFn: async (id: string) => {
      return await cmsApi.convertInquiryToAdmission(id);
    },
    onSuccess: (resData) => {
      queryClient.invalidateQueries({ queryKey: ['cms_inquiries'] });
      if (resData && resData.success && resData.data) {
        onConvertToAdmission(resData.data);
      }
    }
  });

  // Drag and Drop handlers
  const handleDragStart = (e: React.DragEvent, id: string) => {
    e.dataTransfer.setData('text/plain', id);
  };

  const handleDragOver = (e: React.DragEvent, colId: string) => {
    e.preventDefault();
    setDraggedOverColumn(colId);
  };

  const handleDragLeave = () => {
    setDraggedOverColumn(null);
  };

  const handleDrop = (e: React.DragEvent, targetStatus: string) => {
    e.preventDefault();
    setDraggedOverColumn(null);
    const id = e.dataTransfer.getData('text/plain');
    if (id) {
      updateStatusMutation.mutate({ id, status: targetStatus });
    }
  };

  // Age helper
  const calculateAge = (dobString?: string) => {
    if (!dobString) return null;
    const dob = new Date(dobString);
    const diff = Date.now() - dob.getTime();
    const ageDate = new Date(diff);
    return Math.abs(ageDate.getUTCFullYear() - 1970);
  };

  const handleAddNote = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedInquiry || !newNote.trim()) return;
    addNoteMutation.mutate({
      id: selectedInquiry.id,
      note: newNote.trim(),
      author: noteAuthor.trim() || 'Staff'
    });
  };

  // Group inquiries by status columns
  const getInquiriesByStatus = (statusId: string) => {
    return inquiries.filter(inq => {
      if (statusId === 'new') {
        return inq.status === 'new' || inq.status === 'read';
      }
      if (statusId === 'archived') {
        return inq.status === 'archived' || inq.status === 'resolved';
      }
      return inq.status === statusId;
    });
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="page-header flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold font-display text-neutral-900 flex items-center gap-2">
            Admissions CRM Pipeline
          </h2>
          <p className="text-sm text-neutral-500">Track prospective school inquiries, schedule visits, and manage lead conversions.</p>
        </div>
        <div className="flex items-center gap-2 bg-neutral-100/80 px-3 py-1.5 rounded-lg border border-neutral-200 text-xs font-semibold text-neutral-600">
          <TrendingUp className="h-4 w-4 text-primary" />
          <span>Total Leads: {inquiries.length}</span>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-6 py-4 flex items-center gap-3 rounded-xl">
          <AlertCircle className="h-5 w-5 text-red-500" />
          <span>Failed to load CRM inquiries. Is database connected?</span>
        </div>
      )}

      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-24 space-y-3">
          <Loader2 className="h-10 w-10 text-primary animate-spin" />
          <span className="text-sm text-neutral-500 font-medium animate-pulse">Loading Kanban board...</span>
        </div>
      ) : (
        /* Kanban Board Scroll Container */
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4 overflow-x-auto min-h-[600px] pb-6">
          {COLUMNS.map(col => {
            const colLeads = getInquiriesByStatus(col.id);
            const isDraggedOver = draggedOverColumn === col.id;
            return (
              <div 
                key={col.id}
                onDragOver={(e) => handleDragOver(e, col.id)}
                onDragLeave={handleDragLeave}
                onDrop={(e) => handleDrop(e, col.id)}
                className={`flex flex-col rounded-xl border p-3 min-w-[220px] transition-all duration-200 ${
                  isDraggedOver 
                    ? 'border-dashed border-primary bg-primary-light/5 scale-[1.01]' 
                    : 'border-neutral-200 bg-neutral-50/40'
                }`}
              >
                {/* Column Header */}
                <div className="flex items-center justify-between mb-3 border-b border-neutral-150 pb-2">
                  <div className="flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full bg-primary" />
                    <h3 className="font-semibold text-neutral-800 text-sm font-display">{col.label}</h3>
                  </div>
                  <span className="text-xs font-bold text-neutral-450 bg-neutral-100 px-2 py-0.5 rounded-full">
                    {colLeads.length}
                  </span>
                </div>

                {/* Cards List */}
                <div className="flex-1 space-y-3 overflow-y-auto">
                  {colLeads.length === 0 ? (
                    <div className="h-24 flex items-center justify-center border border-dashed border-neutral-200 rounded-lg text-neutral-405 text-xs text-center p-4">
                      Drag leads here
                    </div>
                  ) : (
                    colLeads.map(inq => {
                      const isAdmissionsLead = !!inq.student_name;
                      return (
                        <div 
                          key={inq.id}
                          draggable
                          onDragStart={(e) => handleDragStart(e, inq.id)}
                          onClick={() => setSelectedInquiry(inq)}
                          className="bg-white border border-neutral-200 hover:border-primary-light hover:shadow-md rounded-xl p-3.5 space-y-3 cursor-grab active:cursor-grabbing transition-all duration-150 relative group"
                        >
                          <div className="space-y-1">
                            <h4 className="font-bold text-neutral-900 text-sm leading-snug group-hover:text-primary-light transition-colors">
                              {inq.name}
                            </h4>
                            <p className="text-[11px] font-medium text-neutral-400 flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {new Date(inq.created_at).toLocaleDateString(undefined, {month: 'short', day: 'numeric'})}
                            </p>
                          </div>

                          {isAdmissionsLead ? (
                            <div className="bg-neutral-50 border border-neutral-100 rounded-lg p-2 text-xs space-y-1">
                              <p className="font-semibold text-neutral-800 truncate">
                                Child: {inq.student_name}
                              </p>
                              {inq.target_class_name && (
                                <p className="text-[10px] text-neutral-500 font-medium">
                                  Grade: {inq.target_class_name}
                                </p>
                              )}
                            </div>
                          ) : (
                            <p className="text-xs text-neutral-500 line-clamp-2 italic leading-relaxed">
                              "{inq.message}"
                            </p>
                          )}

                          <div className="flex items-center justify-between text-neutral-400 border-t border-neutral-100 pt-2 text-[11px]">
                            <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                              isAdmissionsLead ? 'bg-amber-50 text-amber-700 border border-amber-250' : 'bg-slate-50 text-slate-700 border border-slate-200'
                            }`}>
                              {isAdmissionsLead ? 'Admissions' : 'General'}
                            </span>
                            {inq.phone && (
                              <span className="flex items-center gap-0.5 text-neutral-500 font-medium">
                                <Phone className="h-3 w-3 text-neutral-400" />
                                Call
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Details Side Drawer */}
      {selectedInquiry && (
        <div className="fixed inset-0 z-50 overflow-hidden" aria-labelledby="slide-over-title" role="dialog" aria-modal="true">
          <div className="absolute inset-0 overflow-hidden">
            {/* Overlay backdrop */}
            <div 
              onClick={() => setSelectedInquiry(null)}
              className="absolute inset-0 bg-neutral-900/40 backdrop-blur-xs transition-opacity duration-300"
            />

            <div className="pointer-events-none fixed inset-y-0 right-0 flex max-w-full pl-10">
              <div className="pointer-events-auto w-screen max-w-md transform bg-white shadow-2xl transition-transform duration-300 ease-in-out border-l border-neutral-200">
                <div className="flex h-full flex-col overflow-y-scroll bg-white">
                  
                  {/* Drawer Header */}
                  <div className="bg-neutral-50 px-6 py-5 border-b border-neutral-200 flex items-center justify-between">
                    <div>
                      <h3 className="text-base font-bold font-display text-neutral-900" id="slide-over-title">
                        Lead Details
                      </h3>
                      <p className="text-xs text-neutral-500 mt-1">Submitted on {new Date(selectedInquiry.created_at).toLocaleString()}</p>
                    </div>
                    <button 
                      onClick={() => setSelectedInquiry(null)}
                      className="rounded-lg p-1.5 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-600 transition"
                    >
                      <X className="h-5 w-5" />
                    </button>
                  </div>

                  {/* Drawer Body */}
                  <div className="relative flex-1 py-6 px-6 space-y-6">
                    
                    {/* Convert Button for Admissions Leads */}
                    {selectedInquiry.status !== 'admitted' && selectedInquiry.student_name && (
                      <button
                        onClick={() => {
                          if (confirm(`Convert lead ${selectedInquiry.name} directly to Student Admission profile?`)) {
                            convertMutation.mutate(selectedInquiry.id);
                          }
                        }}
                        disabled={convertMutation.isPending}
                        className="w-full btn-primary flex items-center justify-center gap-2 py-2.5 shadow-md shadow-primary-light/10 font-semibold"
                      >
                        {convertMutation.isPending ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <UserCheck className="h-4 w-4" />
                        )}
                        Convert to ERP Admission
                        <ArrowRight className="h-4 w-4" />
                      </button>
                    )}

                    {selectedInquiry.status === 'admitted' && (
                      <div className="bg-green-50 border border-green-200 text-green-800 rounded-xl p-3.5 text-xs flex items-center gap-2.5 font-medium">
                        <UserCheck className="h-5 w-5 text-green-600 shrink-0" />
                        <span>This lead has been converted successfully to an ERP Student Admission record.</span>
                      </div>
                    )}

                    {/* Section: Contact Details */}
                    <div className="space-y-3">
                      <h4 className="text-xs font-semibold text-neutral-450 uppercase tracking-wider">Contact Profile</h4>
                      <div className="card space-y-3 py-3.5">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-neutral-500">Parent Name</span>
                          <span className="font-semibold text-neutral-900">{selectedInquiry.name}</span>
                        </div>
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-neutral-500">Email Address</span>
                          <a href={`mailto:${selectedInquiry.email}`} className="font-medium text-primary hover:underline flex items-center gap-1">
                            <Mail className="h-3.5 w-3.5 text-neutral-400" />
                            {selectedInquiry.email}
                          </a>
                        </div>
                        {selectedInquiry.phone && (
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-neutral-500">Mobile Phone</span>
                            <a href={`tel:${selectedInquiry.phone}`} className="font-medium text-neutral-800 flex items-center gap-1">
                              <Phone className="h-3.5 w-3.5 text-neutral-400" />
                              {selectedInquiry.phone}
                            </a>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Section: Student Profile details */}
                    {selectedInquiry.student_name && (
                      <div className="space-y-3">
                        <h4 className="text-xs font-semibold text-neutral-450 uppercase tracking-wider">Child's Profile</h4>
                        <div className="card space-y-3 py-3.5 border-l-4 border-l-amber-400 bg-amber-50/5">
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-neutral-500">Student Name</span>
                            <span className="font-bold text-neutral-900">{selectedInquiry.student_name}</span>
                          </div>
                          {selectedInquiry.student_dob && (
                            <div className="flex items-center justify-between text-sm">
                              <span className="text-neutral-500">Date of Birth</span>
                              <span className="font-medium text-neutral-800">
                                {new Date(selectedInquiry.student_dob).toLocaleDateString()}
                                {calculateAge(selectedInquiry.student_dob) !== null && ` (${calculateAge(selectedInquiry.student_dob)} yrs old)`}
                              </span>
                            </div>
                          )}
                          {selectedInquiry.target_class_name && (
                            <div className="flex items-center justify-between text-sm">
                              <span className="text-neutral-500">Target Grade Class</span>
                              <span className="font-bold text-primary-light bg-blue-50 px-2 py-0.5 rounded text-xs">
                                {selectedInquiry.target_class_name}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Section: Original Message */}
                    <div className="space-y-2">
                      <h4 className="text-xs font-semibold text-neutral-450 uppercase tracking-wider">Original Inquiry Message</h4>
                      <div className="bg-neutral-50 border border-neutral-200 rounded-xl p-4 text-sm text-neutral-700 leading-relaxed italic">
                        "{selectedInquiry.message}"
                      </div>
                    </div>

                    {/* Section: Pipeline Stage Select */}
                    <div className="space-y-3">
                      <h4 className="text-xs font-semibold text-neutral-450 uppercase tracking-wider">Stage Actions</h4>
                      <div className="grid grid-cols-2 gap-2">
                        {COLUMNS.map(col => (
                          <button
                            key={col.id}
                            onClick={() => updateStatusMutation.mutate({ id: selectedInquiry.id, status: col.id })}
                            className={`px-3 py-2 rounded-lg border text-xs font-semibold text-center transition ${
                              selectedInquiry.status === col.id
                                ? 'bg-primary text-white border-primary shadow-sm'
                                : 'bg-white text-neutral-600 border-neutral-200 hover:bg-neutral-50'
                            }`}
                          >
                            {col.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Section: Follow-up History Timeline */}
                    <div className="space-y-4 border-t border-neutral-100 pt-6">
                      <h4 className="text-xs font-semibold text-neutral-450 uppercase tracking-wider">Timeline & Update logs</h4>
                      
                      {/* Note add form */}
                      <form onSubmit={handleAddNote} className="space-y-3 bg-neutral-50/60 border border-neutral-200 rounded-xl p-3.5">
                        <textarea
                          placeholder="Log follow-up details..."
                          value={newNote}
                          onChange={(e) => setNewNote(e.target.value)}
                          className="input-field bg-white py-2 px-3 text-sm"
                          rows={2}
                          required
                        />
                        <div className="flex items-center gap-2 justify-between">
                          <input
                            type="text"
                            placeholder="Author (e.g. principal)"
                            value={noteAuthor}
                            onChange={(e) => setNoteAuthor(e.target.value)}
                            className="input-field bg-white py-1 px-3.5 text-xs max-w-[160px]"
                          />
                          <button
                            type="submit"
                            disabled={addNoteMutation.isPending || !newNote.trim()}
                            className="btn-primary py-1 px-3 text-xs flex items-center gap-1 shadow-sm font-semibold"
                          >
                            {addNoteMutation.isPending ? (
                              <Loader2 className="h-3 w-3 animate-spin" />
                            ) : (
                              <Plus className="h-3 w-3" />
                            )}
                            Save Note
                          </button>
                        </div>
                      </form>

                      {/* Notes list timeline */}
                      <div className="space-y-3.5 max-h-[250px] overflow-y-auto pr-1">
                        {(!selectedInquiry.follow_up_notes || selectedInquiry.follow_up_notes.length === 0) ? (
                          <p className="text-xs text-neutral-400 italic text-center py-4">No follow-up notes logged yet.</p>
                        ) : (
                          selectedInquiry.follow_up_notes.map((note) => (
                            <div key={note.id} className="relative pl-4 border-l border-neutral-200 text-xs">
                              <span className="absolute -left-[4.5px] top-1.5 h-2 w-2 rounded-full bg-neutral-300" />
                              <div className="space-y-1">
                                <p className="text-neutral-700 leading-relaxed font-medium">{note.note}</p>
                                <div className="flex items-center gap-1.5 text-[10px] text-neutral-400 font-semibold">
                                  <span>{note.author}</span>
                                  <span>•</span>
                                  <span>{new Date(note.created_at).toLocaleString(undefined, {month: 'short', day: 'numeric', hour: '2-digit', minute:'2-digit'})}</span>
                                </div>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </div>

                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
