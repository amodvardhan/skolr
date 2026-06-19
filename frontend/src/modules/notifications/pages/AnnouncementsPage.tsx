import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import {
  MessageSquare,
  Plus,
  Trash2,
  AlertCircle,
  Loader2,
  Send,
  Users,
  UserCheck,
  CheckCircle,
} from 'lucide-react';

import { notificationsApi } from '../api/notificationsApi';
import { studentApi } from '../../students/api/studentApi';
import { CustomSelect } from '../../../components/CustomSelect';

// Validation Schema for Creating a Template
const templateSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters").max(100),
  template_name: z.string().min(2, "Template name must be at least 2 characters").max(100),
  body_format: z.string().min(2, "Format body is required").max(500),
  category: z.string().min(2).max(50),
});

type TemplateFormValues = z.infer<typeof templateSchema>;

// Helper to parse template variables (e.g. {{1}}, {{2}})
const getTemplateVariablesCount = (bodyFormat: string): number => {
  const matches = bodyFormat.match(/\{\{(\d+)\}\}/g);
  if (!matches) return 0;
  const indexes = matches.map(m => {
    const num = m.replace(/\{\{|\}\}/g, '');
    return parseInt(num, 10);
  });
  return Math.max(...indexes, 0);
};

export function AnnouncementsPage() {
  const queryClient = useQueryClient();
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');
  const [targetType, setTargetType] = useState<'all' | 'class' | 'individual'>('class');
  const [selectedClassId, setSelectedClassId] = useState<string>('');
  const [customPhonesRaw, setCustomPhonesRaw] = useState<string>('');
  const [templateVariables, setTemplateVariables] = useState<string[]>([]);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Queries
  const { data: templatesRes, isLoading: templatesLoading } = useQuery({
    queryKey: ['notification-templates'],
    queryFn: notificationsApi.listTemplates,
  });

  const { data: classes = [] } = useQuery({
    queryKey: ['classes-master'],
    queryFn: studentApi.classes,
  });

  const templates = templatesRes?.data || [];
  const selectedTemplate = templates.find(t => t.id === selectedTemplateId);

  // Form for Template Creation
  const {
    register,
    handleSubmit,
    reset: resetTemplateForm,
    formState: { errors }
  } = useForm<TemplateFormValues>({
    resolver: zodResolver(templateSchema),
    defaultValues: {
      name: '',
      template_name: '',
      body_format: '',
      category: 'general',
    }
  });

  // Track template variable inputs
  const variablesCount = selectedTemplate ? getTemplateVariablesCount(selectedTemplate.body_format) : 0;

  useEffect(() => {
    setTemplateVariables(Array(variablesCount).fill(''));
  }, [variablesCount, selectedTemplateId]);

  // Mutations
  const createTemplateMutation = useMutation({
    mutationFn: notificationsApi.createTemplate,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notification-templates'] });
      resetTemplateForm();
      setErrorMsg(null);
      alert('Notification template created successfully!');
    },
    onError: (err: any) => {
      console.error(err);
      setErrorMsg(err.response?.data?.detail || 'Failed to create notification template.');
    }
  });

  const deleteTemplateMutation = useMutation({
    mutationFn: notificationsApi.deleteTemplate,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notification-templates'] });
      if (selectedTemplateId) setSelectedTemplateId('');
      alert('Template deleted.');
    },
    onError: (err: any) => {
      console.error(err);
      alert(err.response?.data?.detail || 'Failed to delete template.');
    }
  });

  const broadcastMutation = useMutation({
    mutationFn: notificationsApi.triggerBroadcast,
    onSuccess: (res) => {
      setSuccessMsg(res.message || 'Broadcast has been triggered successfully in the background.');
      setErrorMsg(null);
      // Reset broadcast states
      setCustomPhonesRaw('');
      setTemplateVariables([]);
      setSelectedTemplateId('');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    },
    onError: (err: any) => {
      console.error(err);
      setErrorMsg(err.response?.data?.detail || 'Failed to trigger broadcast.');
      setSuccessMsg(null);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  });

  // Action handlers
  const onCreateTemplate = (values: TemplateFormValues) => {
    setErrorMsg(null);
    createTemplateMutation.mutate(values);
  };

  const onDeleteTemplate = (id: string) => {
    if (confirm('Are you sure you want to delete this template?')) {
      deleteTemplateMutation.mutate(id);
    }
  };

  const handleVariableChange = (index: number, val: string) => {
    const updated = [...templateVariables];
    updated[index] = val;
    setTemplateVariables(updated);
  };

  const handleBroadcast = () => {
    if (!selectedTemplateId) {
      alert('Please select a message template.');
      return;
    }

    // Verify all variables are filled
    if (templateVariables.some(v => v.trim() === '')) {
      alert('Please fill in all template placeholders.');
      return;
    }

    if (targetType === 'class' && !selectedClassId) {
      alert('Please select a target class.');
      return;
    }

    let customPhones: string[] | undefined = undefined;
    if (targetType === 'individual') {
      if (!customPhonesRaw.trim()) {
        alert('Please input at least one phone number.');
        return;
      }
      customPhones = customPhonesRaw
        .split(',')
        .map(p => p.trim())
        .filter(p => p.length > 0);
    }

    setErrorMsg(null);
    setSuccessMsg(null);

    broadcastMutation.mutate({
      template_id: selectedTemplateId,
      target_type: targetType,
      class_id: targetType === 'class' ? selectedClassId : undefined,
      custom_phones: customPhones,
      variables: templateVariables,
    });
  };

  // Preview body substitutions
  const getPreviewBody = () => {
    if (!selectedTemplate) return '';
    let preview = selectedTemplate.body_format;
    templateVariables.forEach((val, idx) => {
      const placeholder = `{{${idx + 1}}}`;
      preview = preview.replace(placeholder, val || `[Value ${idx + 1}]`);
    });
    return preview;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-neutral-200 pb-4">
        <div>
          <h2 className="text-2xl font-bold font-display text-neutral-900 flex items-center gap-2">
            <MessageSquare className="h-6 w-6 text-primary" />
            WhatsApp Announcements
          </h2>
          <p className="text-sm text-neutral-500 font-sans">
            Send WhatsApp messages using registered templates to parents and custom lists.
          </p>
        </div>
      </div>

      {/* Notifications Alerts */}
      {successMsg && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 p-4 rounded-xl flex items-start gap-3 text-sm animate-fadeIn">
          <CheckCircle className="h-5 w-5 text-emerald-500 shrink-0 mt-0.5" />
          <div>
            <h4 className="font-bold">Broadcast Queued</h4>
            <p className="text-xs mt-0.5">{successMsg}</p>
          </div>
        </div>
      )}

      {errorMsg && (
        <div className="bg-red-50 border border-red-200 text-red-800 p-4 rounded-xl flex items-start gap-3 text-sm animate-fadeIn">
          <AlertCircle className="h-5 w-5 text-red-500 shrink-0 mt-0.5" />
          <div>
            <h4 className="font-bold">Error</h4>
            <p className="text-xs mt-0.5">{errorMsg}</p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Templates Panel (1 Col) */}
        <div className="lg:col-span-1 space-y-6">
          {/* Create Template */}
          <div className="card space-y-5">
            <h3 className="section-title border-b border-neutral-100 pb-2 flex items-center gap-1.5">
              <Plus className="h-4 w-4 text-primary" /> Add Message Template
            </h3>

            <form onSubmit={handleSubmit(onCreateTemplate)} className="space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase text-neutral-500">Friendly Name <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  placeholder="e.g. School Rain Holiday"
                  {...register('name')}
                  className="input-field py-2 text-xs"
                  required
                />
                {errors.name && (
                  <p className="text-red-500 text-[11px] mt-1">{errors.name.message}</p>
                )}
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase text-neutral-500">Meta Template Name <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  placeholder="e.g. holiday_rain_announcement"
                  {...register('template_name')}
                  className="input-field py-2 text-xs"
                  required
                />
                {errors.template_name && (
                  <p className="text-red-500 text-[11px] mt-1">{errors.template_name.message}</p>
                )}
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase text-neutral-500">Category <span className="text-red-500">*</span></label>
                <select
                  {...register('category')}
                  className="input-field py-2 text-xs bg-white"
                  required
                >
                  <option value="general">General</option>
                  <option value="academic">Academic</option>
                  <option value="fees">Fees</option>
                  <option value="attendance">Attendance</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase text-neutral-500">Body Format <span className="text-red-500">*</span></label>
                <textarea
                  rows={4}
                  placeholder="Dear Parent, school remains closed on {{1}} due to {{2}}."
                  {...register('body_format')}
                  className="input-field py-2 text-xs resize-none"
                  required
                />
                <span className="text-[9px] text-neutral-400">Use double braces like {"{{1}}"}, {"{{2}}"} for positional parameters.</span>
                {errors.body_format && (
                  <p className="text-red-500 text-[11px] mt-1">{errors.body_format.message}</p>
                )}
              </div>

              <button
                type="submit"
                className="w-full btn-primary text-xs py-2 flex items-center justify-center gap-1.5 mt-2"
                disabled={createTemplateMutation.isPending}
              >
                {createTemplateMutation.isPending ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Plus className="h-3.5 w-3.5" />
                )}
                Add Template
              </button>
            </form>
          </div>

          {/* List Templates */}
          <div className="card space-y-4">
            <h3 className="section-title border-b border-neutral-100 pb-2">Registered Templates</h3>
            {templatesLoading ? (
              <div className="flex justify-center py-6">
                <Loader2 className="h-6 w-6 text-primary animate-spin" />
              </div>
            ) : templates.length === 0 ? (
              <p className="text-xs text-neutral-400 text-center py-6">No templates defined.</p>
            ) : (
              <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
                {templates.map(t => (
                  <div
                    key={t.id}
                    className={`p-3 rounded-lg border transition cursor-pointer flex flex-col justify-between gap-1 ${
                      selectedTemplateId === t.id
                        ? 'border-primary bg-blue-50/50'
                        : 'border-neutral-200 hover:bg-neutral-50'
                    }`}
                    onClick={() => setSelectedTemplateId(t.id)}
                  >
                    <div className="flex items-start justify-between">
                      <h4 className="text-xs font-bold text-neutral-900 line-clamp-1">{t.name}</h4>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onDeleteTemplate(t.id);
                        }}
                        className="text-neutral-400 hover:text-red-500 p-0.5 hover:bg-neutral-100 rounded-md transition"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                    <span className="text-[10px] text-neutral-500 font-mono">Meta: {t.template_name}</span>
                    <span className="text-[9px] uppercase px-1.5 py-0.5 rounded bg-neutral-100 text-neutral-600 font-bold self-start mt-1">
                      {t.category}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Broadcast Sender (2 Cols) */}
        <div className="lg:col-span-2 space-y-6">
          <div className="card space-y-6">
            <h3 className="section-title border-b border-neutral-100 pb-2 flex items-center gap-1.5">
              <Send className="h-4 w-4 text-primary" /> Send Broadcast
            </h3>

            {/* Step 1: Select Template */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-neutral-600">Step 1: Select Template <span className="text-red-500">*</span></label>
              <CustomSelect
                value={selectedTemplateId}
                onChange={setSelectedTemplateId}
                placeholder="Choose template to send..."
                options={templates.map(t => ({ value: t.id, label: `${t.name} (${t.template_name})` }))}
              />
            </div>

            {selectedTemplate && (
              <div className="space-y-6 animate-fadeIn">
                {/* Template Read-only body */}
                <div className="p-3 bg-neutral-50 border border-neutral-200 rounded-lg space-y-1">
                  <span className="text-[10px] font-bold text-neutral-400 uppercase">Template body format:</span>
                  <p className="text-xs font-sans text-neutral-700">{selectedTemplate.body_format}</p>
                </div>

                {/* Step 2: Input Variables */}
                {variablesCount > 0 && (
                  <div className="space-y-4 border-t border-neutral-100 pt-4">
                    <label className="text-xs font-bold text-neutral-600">Step 2: Enter Template Variables</label>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {Array.from({ length: variablesCount }).map((_, idx) => (
                        <div key={idx} className="space-y-1">
                          <label className="text-[10px] font-bold uppercase text-neutral-500">Placeholder {"{{"}{idx + 1}{"}}"}</label>
                          <input
                            type="text"
                            placeholder={`Value for {{${idx + 1}}}`}
                            value={templateVariables[idx] || ''}
                            onChange={(e) => handleVariableChange(idx, e.target.value)}
                            className="input-field py-2 text-xs font-medium"
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Live Preview */}
                <div className="p-3 bg-blue-50/50 border border-blue-100 rounded-lg space-y-1">
                  <span className="text-[10px] font-bold text-blue-500 uppercase">Live Message Preview:</span>
                  <p className="text-xs font-sans text-blue-900 italic font-medium">"{getPreviewBody()}"</p>
                </div>

                {/* Step 3: Select Targets */}
                <div className="space-y-4 border-t border-neutral-100 pt-4">
                  <label className="text-xs font-bold text-neutral-600">Step 3: Define Target Audience</label>

                  <div className="flex gap-4">
                    <button
                      type="button"
                      onClick={() => setTargetType('class')}
                      className={`flex-1 py-3 px-4 rounded-xl border flex flex-col items-center justify-center gap-1.5 transition text-xs font-bold ${
                        targetType === 'class'
                          ? 'border-primary bg-blue-50/30 text-primary'
                          : 'border-neutral-200 text-neutral-500 hover:bg-neutral-50'
                      }`}
                    >
                      <Users className="h-4.5 w-4.5" />
                      Class-wide Broadcast
                    </button>

                    <button
                      type="button"
                      onClick={() => setTargetType('all')}
                      className={`flex-1 py-3 px-4 rounded-xl border flex flex-col items-center justify-center gap-1.5 transition text-xs font-bold ${
                        targetType === 'all'
                          ? 'border-primary bg-blue-50/30 text-primary'
                          : 'border-neutral-200 text-neutral-500 hover:bg-neutral-50'
                      }`}
                    >
                      <UserCheck className="h-4.5 w-4.5" />
                      School-wide (All Parents)
                    </button>

                    <button
                      type="button"
                      onClick={() => setTargetType('individual')}
                      className={`flex-1 py-3 px-4 rounded-xl border flex flex-col items-center justify-center gap-1.5 transition text-xs font-bold ${
                        targetType === 'individual'
                          ? 'border-primary bg-blue-50/30 text-primary'
                          : 'border-neutral-200 text-neutral-500 hover:bg-neutral-50'
                      }`}
                    >
                      <Users className="h-4.5 w-4.5 rotate-90" />
                      Individual Numbers
                    </button>
                  </div>

                  {/* Target details */}
                  {targetType === 'class' && (
                    <div className="space-y-1.5 animate-fadeIn">
                      <label className="text-[10px] font-bold uppercase text-neutral-500">Target Class <span className="text-red-500">*</span></label>
                      <CustomSelect
                        value={selectedClassId}
                        onChange={setSelectedClassId}
                        placeholder="Select class term..."
                        options={classes.map((c: any) => ({ value: c.id, label: `${c.name}-${c.section}` }))}
                      />
                    </div>
                  )}

                  {targetType === 'individual' && (
                    <div className="space-y-1.5 animate-fadeIn">
                      <label className="text-[10px] font-bold uppercase text-neutral-500">Phone Numbers <span className="text-red-500">*</span></label>
                      <textarea
                        rows={3}
                        placeholder="e.g. 9876543210, 9999988888 (comma separated)"
                        value={customPhonesRaw}
                        onChange={(e) => setCustomPhonesRaw(e.target.value)}
                        className="input-field py-2 text-xs resize-none"
                      />
                      <span className="text-[9px] text-neutral-400">Ensure numbers contain country codes or are standard 10 digits (India).</span>
                    </div>
                  )}

                  {targetType === 'all' && (
                    <div className="p-3 bg-amber-50 border border-amber-200 text-amber-800 rounded-lg flex items-start gap-2.5 text-xs animate-fadeIn">
                      <AlertCircle className="h-4.5 w-4.5 text-amber-600 shrink-0 mt-0.5" />
                      <span>This will fetch all parents from all active student profiles in the database and enqueue a broadcast. Use with caution.</span>
                    </div>
                  )}
                </div>

                {/* Submit button */}
                <button
                  type="button"
                  onClick={handleBroadcast}
                  className="w-full btn-primary text-sm py-2.5 flex items-center justify-center gap-2 mt-4"
                  disabled={broadcastMutation.isPending}
                >
                  {broadcastMutation.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                  Send Broadcast Announcement
                </button>
              </div>
            )}

            {!selectedTemplate && (
              <div className="flex flex-col items-center justify-center py-12 text-neutral-400">
                <MessageSquare className="h-10 w-10 text-neutral-300 mb-2" />
                <p className="text-xs">Select a template on the left to configure and trigger a broadcast announcement.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
