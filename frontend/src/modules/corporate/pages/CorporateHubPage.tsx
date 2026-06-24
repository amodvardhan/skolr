import { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Building2,
  Sparkles,
  Users,
  GraduationCap,
  IndianRupee,
  CalendarCheck,
  RefreshCw,
  Send,
  AlertCircle,
  ChevronRight,
  Bot,
  BrainCircuit,
  Loader2,
  Table
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  PieChart,
  Pie,
  Cell
} from 'recharts';

import { api } from '../../../lib/api';
import { toast } from '../../../stores/useToastStore';

interface BranchStats {
  school_id: string;
  school_name: string;
  subdomain: string;
  chain_id: string | null;
  student_count: number;
  teacher_count: number;

  total_revenue: number;
  avg_attendance_rate: number;
  last_synced: string;
}

interface ChatMessage {
  sender: 'user' | 'ai';
  text: string;
  timestamp: Date;
}

const COLORS = ['#1E40AF', '#3B82F6', '#F59E0B', '#10B981', '#EF4444', '#8B5CF6', '#EC4899'];

// Direct Markdown-to-HTML parser for professional chatbot formatting
function formatMarkdown(text: string) {
  return text
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    .split('\n')
    .map((line) => {
      const trimmed = line.trim();
      if (trimmed.startsWith('- ')) {
        return `<li class="ml-4 list-disc text-neutral-700 py-0.5">${trimmed.substring(2)}</li>`;
      }
      if (trimmed.startsWith('* ')) {
        return `<li class="ml-4 list-disc text-neutral-700 py-0.5">${trimmed.substring(2)}</li>`;
      }
      if (trimmed === '') {
        return '<br/>';
      }
      return `<p class="text-neutral-700 py-0.5 leading-relaxed">${line}</p>`;
    })
    .join('');
}

export function CorporateHubPage() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'overview' | 'chat'>('overview');
  const [chatInput, setChatInput] = useState('');
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [isGeminiMissing, setIsGeminiMissing] = useState(false);
  const [isChatting, setIsChatting] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Queries
  const { data: statsRes, isLoading: loadingStats, error: statsError } = useQuery({
    queryKey: ['corporate-stats'],
    queryFn: async () => {
      const res = await api.get('/corporate/stats');
      return res.data;
    },
  });

  const branchList: BranchStats[] = statsRes?.data || [];

  // Mutations
  const syncMutation = useMutation({
    mutationFn: async () => {
      const res = await api.post('/corporate/sync');
      return res.data;
    },
    onSuccess: (data) => {
      queryClient.setQueryData(['corporate-stats'], data);
      toast.success('Corporate network analytics synced in real-time!');
    },
    onError: () => {
      toast.error('Failed to sync corporate branch data.');
    },
  });

  const chatMutation = useMutation({
    mutationFn: async (message: string) => {
      const res = await api.post('/corporate/chat', { message });
      return res.data;
    },
    onSuccess: (data) => {
      setChatHistory((prev) => [
        ...prev,
        { sender: 'ai', text: data.response, timestamp: new Date() }
      ]);
    },
    onError: (err: any) => {
      const detail = err.response?.data?.detail;
      if (detail === 'GEMINI_API_KEY_MISSING') {
        setIsGeminiMissing(true);
      } else {
        toast.error(detail || 'Failed to query the AI assistant.');
      }
    },
    onSettled: () => {
      setIsChatting(false);
    }
  });

  // Autoscroll chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatHistory, isChatting]);

  // Aggregated KPI Stats calculation
  const totalBranches = branchList.length;
  const totalStudents = branchList.reduce((acc, b) => acc + (b.student_count || 0), 0);
  const totalTeachers = branchList.reduce((acc, b) => acc + (b.teacher_count || 0), 0);
  const totalRevenue = branchList.reduce((acc, b) => acc + (b.total_revenue || 0), 0);
  const avgAttendance = totalBranches > 0 
    ? branchList.reduce((acc, b) => acc + (b.avg_attendance_rate || 100), 0) / totalBranches 
    : 100;

  const handleSendChat = (textToSend?: string) => {
    const message = textToSend || chatInput;
    if (!message.trim()) return;

    setChatHistory((prev) => [
      ...prev,
      { sender: 'user', text: message, timestamp: new Date() }
    ]);
    setChatInput('');
    setIsChatting(true);
    chatMutation.mutate(message);
  };

  const handleSuggestionClick = (query: string) => {
    handleSendChat(query);
  };

  const formattedLastSynced = () => {
    if (branchList.length === 0) return 'Never';
    const dates = branchList.map(b => new Date(b.last_synced).getTime());
    const latestDate = new Date(Math.max(...dates));
    return latestDate.toLocaleTimeString('en-IN', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  return (
    <div className="space-y-6">
      {/* Upper header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-neutral-250 pb-5">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
            <Building2 className="h-6 w-6 text-primary animate-pulse" />
            Corporate Hub
          </h1>
          <p className="text-sm text-neutral-500">
            Unified multischool metrics, branch performance comparisons, and AI natural language data search.
          </p>
        </div>
        <div className="flex items-center gap-3 self-start md:self-auto shrink-0">
          <span className="text-xs bg-slate-100 border border-neutral-200 text-neutral-600 font-semibold px-3 py-1.5 rounded-full flex items-center gap-1.5 shadow-sm">
            <span className="h-2 w-2 bg-emerald-500 rounded-full animate-pulse"></span>
            Last Synced: {formattedLastSynced()}
          </span>
          <button
            onClick={() => syncMutation.mutate()}
            disabled={syncMutation.isPending || loadingStats}
            className="bg-primary hover:bg-blue-700 active:bg-blue-800 text-white font-bold py-2 px-4 rounded-xl flex items-center gap-2 text-xs shadow-sm transition disabled:opacity-50"
          >
            <RefreshCw className={`h-4.5 w-4.5 ${syncMutation.isPending ? 'animate-spin' : ''}`} />
            <span>Refresh Now</span>
          </button>
        </div>
      </div>

      {/* Tabs Menu navigation */}
      <div className="flex border-b border-neutral-200 gap-6">
        <button
          onClick={() => setActiveTab('overview')}
          className={`pb-3 text-sm font-semibold border-b-2 px-1 transition duration-150 flex items-center gap-2 ${
            activeTab === 'overview'
              ? 'border-primary text-primary'
              : 'border-transparent text-neutral-500 hover:text-neutral-900'
          }`}
        >
          <Table className="h-4 w-4" />
          Analytics Dashboard
        </button>
        <button
          onClick={() => setActiveTab('chat')}
          className={`pb-3 text-sm font-semibold border-b-2 px-1 transition duration-150 flex items-center gap-2 ${
            activeTab === 'chat'
              ? 'border-primary text-primary'
              : 'border-transparent text-neutral-500 hover:text-neutral-900'
          }`}
        >
          <Sparkles className="h-4 w-4 text-amber-500 animate-pulse" />
          AI Chat Analytics
        </button>
      </div>

      {/* Renders Tab Content */}
      {activeTab === 'overview' ? (
        <div className="space-y-8 animate-fadeIn">
          {/* KPI Summary Cards */}
          {loadingStats ? (
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="h-28 bg-neutral-200 animate-pulse rounded-2xl"></div>
              ))}
            </div>
          ) : statsError ? (
            <div className="bg-red-50 border border-red-200 text-red-800 p-4 rounded-2xl flex items-center gap-2.5 text-sm">
              <AlertCircle className="h-5 w-5 text-red-600" />
              <span>Failed to load central corporate statistics. Please ensure you are logged in with correct network credentials.</span>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
              {/* Card 1: Total branches */}
              <div className="card flex flex-col justify-between p-5 bg-gradient-to-br from-indigo-50/50 to-neutral-50/20 hover:shadow-md transition">
                <div className="flex justify-between items-start">
                  <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider block">School Branches</span>
                  <div className="p-1.5 bg-indigo-50 text-indigo-600 rounded-lg">
                    <Building2 className="h-4.5 w-4.5" />
                  </div>
                </div>
                <div className="mt-4">
                  <h3 className="text-2xl font-extrabold text-neutral-900 font-display">{totalBranches}</h3>
                  <p className="text-[10px] text-neutral-500 mt-1">Active campuses registered</p>
                </div>
              </div>

              {/* Card 2: Total students */}
              <div className="card flex flex-col justify-between p-5 bg-gradient-to-br from-blue-50/50 to-neutral-50/20 hover:shadow-md transition">
                <div className="flex justify-between items-start">
                  <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider block">Total Students</span>
                  <div className="p-1.5 bg-blue-50 text-blue-600 rounded-lg">
                    <Users className="h-4.5 w-4.5" />
                  </div>
                </div>
                <div className="mt-4">
                  <h3 className="text-2xl font-extrabold text-neutral-900 font-display">{totalStudents.toLocaleString('en-IN')}</h3>
                  <p className="text-[10px] text-neutral-500 mt-1">Cumulative enrolled student body</p>
                </div>
              </div>

              {/* Card 3: Total active staff */}
              <div className="card flex flex-col justify-between p-5 bg-gradient-to-br from-purple-50/50 to-neutral-50/20 hover:shadow-md transition">
                <div className="flex justify-between items-start">
                  <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider block">Active Teachers</span>
                  <div className="p-1.5 bg-purple-50 text-purple-600 rounded-lg">
                    <GraduationCap className="h-4.5 w-4.5" />
                  </div>
                </div>
                <div className="mt-4">
                  <h3 className="text-2xl font-extrabold text-neutral-900 font-display">{totalTeachers.toLocaleString('en-IN')}</h3>
                  <p className="text-[10px] text-neutral-500 mt-1">Aggregated academic educators</p>
                </div>
              </div>

              {/* Card 4: Total Revenue */}
              <div className="card flex flex-col justify-between p-5 bg-gradient-to-br from-emerald-50/50 to-neutral-50/20 hover:shadow-md transition">
                <div className="flex justify-between items-start">
                  <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider block">Network Revenue</span>
                  <div className="p-1.5 bg-emerald-50 text-emerald-600 rounded-lg">
                    <IndianRupee className="h-4.5 w-4.5" />
                  </div>
                </div>
                <div className="mt-4">
                  <h3 className="text-2xl font-extrabold text-neutral-900 font-display">
                    ₹{totalRevenue.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                  </h3>
                  <p className="text-[10px] text-neutral-500 mt-1">Total collected fee receipts</p>
                </div>
              </div>

              {/* Card 5: Average Attendance rate */}
              <div className="card flex flex-col justify-between p-5 bg-gradient-to-br from-amber-50/50 to-neutral-50/20 hover:shadow-md transition">
                <div className="flex justify-between items-start">
                  <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider block">Avg Attendance</span>
                  <div className="p-1.5 bg-amber-50 text-amber-600 rounded-lg">
                    <CalendarCheck className="h-4.5 w-4.5" />
                  </div>
                </div>
                <div className="mt-4">
                  <h3 className="text-2xl font-extrabold text-neutral-900 font-display">{avgAttendance.toFixed(1)}%</h3>
                  <p className="text-[10px] text-neutral-500 mt-1">Weighted network attendance</p>
                </div>
              </div>
            </div>
          )}

          {/* Recharts Charts Visualization panels */}
          {!loadingStats && branchList.length > 0 && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Financial Revenue Comparison Chart */}
              <div className="card p-5 lg:col-span-2 space-y-4">
                <div>
                  <h4 className="text-sm font-bold text-neutral-800 font-display">Revenue Breakdown by Branch</h4>
                  <p className="text-xs text-neutral-400 mt-0.5">Real-time comparison of collected financial fees</p>
                </div>
                <div className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={branchList} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                      <XAxis dataKey="school_name" stroke="#94A3B8" fontSize={10} tickLine={false} />
                      <YAxis
                        stroke="#94A3B8"
                        fontSize={10}
                        tickLine={false}
                        axisLine={false}
                        tickFormatter={(val) => `₹${val >= 1000 ? (val / 1000).toFixed(0) + 'k' : val}`}
                      />
                      <Tooltip
                        contentStyle={{ borderRadius: '12px', border: '1px solid #E2E8F0', fontFamily: 'Inter' }}
                        formatter={(val) => [`₹${Number(val).toLocaleString('en-IN')}`, 'Revenue Collected']}
                      />
                      <Bar dataKey="total_revenue" fill="#1E40AF" radius={[6, 6, 0, 0]} maxBarSize={45} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Student body distribution share chart */}
              <div className="card p-5 space-y-4">
                <div>
                  <h4 className="text-sm font-bold text-neutral-800 font-display">Student Distribution</h4>
                  <p className="text-xs text-neutral-400 mt-0.5">Student capacity share per school campus</p>
                </div>
                <div className="h-56 relative flex items-center justify-center">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={branchList}
                        cx="50%"
                        cy="50%"
                        innerRadius={55}
                        outerRadius={75}
                        paddingAngle={3}
                        dataKey="student_count"
                        nameKey="school_name"
                      >
                        {branchList.map((_, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{ borderRadius: '12px', border: '1px solid #E2E8F0', fontFamily: 'Inter' }}
                        formatter={(val) => [`${val} Students`, 'Enrolled Roster']}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="absolute flex flex-col items-center justify-center pointer-events-none">
                    <span className="text-[9px] font-bold text-neutral-400 uppercase tracking-wider">Total Network</span>
                    <span className="text-base font-bold text-neutral-900 font-display">
                      {totalStudents}
                    </span>
                  </div>
                </div>
                {/* Legend list */}
                <div className="grid grid-cols-2 gap-x-2 gap-y-1.5 pt-2 border-t border-neutral-100 max-h-[70px] overflow-y-auto">
                  {branchList.map((branch, i) => (
                    <div key={i} className="flex items-center gap-1.5 text-[11px] text-neutral-600">
                      <span
                        className="h-2.5 w-2.5 rounded-full shrink-0"
                        style={{ backgroundColor: COLORS[i % COLORS.length] }}
                      ></span>
                      <span className="truncate">{branch.school_name} ({branch.student_count})</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Branch list analysis table */}
          {!loadingStats && (
            <div className="card p-5 space-y-4">
              <div>
                <h4 className="text-sm font-bold text-neutral-800 font-display">Active Campus Performance Index</h4>
                <p className="text-xs text-neutral-400 mt-0.5">Aggregated metrics status overview by physical site branches</p>
              </div>

              {branchList.length === 0 ? (
                <div className="text-center py-12 border border-dashed border-neutral-200 rounded-2xl bg-neutral-50/50">
                  <Building2 className="h-8 w-8 text-neutral-300 mx-auto mb-2" />
                  <p className="text-sm font-semibold text-neutral-600 font-display">No branches connected</p>
                  <p className="text-xs text-neutral-400 mt-1">Please ensure your school branches are registered under this chain_id.</p>
                </div>
              ) : (
                <div className="overflow-x-auto border border-neutral-200 rounded-xl">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-neutral-50 text-xs font-bold border-b border-neutral-200 text-neutral-600">
                        <th className="p-3">Branch Name</th>
                        <th className="p-3">Subdomain Address</th>
                        <th className="p-3 text-right">Student Enrolled</th>
                        <th className="p-3 text-right">Active Educators</th>
                        <th className="p-3 text-right">Cumulative Revenue</th>
                        <th className="p-3 text-center">Avg Attendance</th>
                        <th className="p-3 text-center">Last Sync Time</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-150 text-sm">
                      {branchList.map((b) => (
                        <tr key={b.school_id} className="hover:bg-neutral-50/40 transition">
                          <td className="p-3 font-semibold text-neutral-900">{b.school_name}</td>
                          <td className="p-3 text-primary font-mono text-xs select-all">
                            {b.subdomain}.skolr.in
                          </td>
                          <td className="p-3 text-right font-medium text-neutral-700">{b.student_count}</td>
                          <td className="p-3 text-right font-medium text-neutral-700">{b.teacher_count}</td>
                          <td className="p-3 text-right font-bold text-emerald-600">
                            ₹{b.total_revenue.toLocaleString('en-IN', { minimumFractionDigits: 0 })}
                          </td>
                          <td className="p-3">
                            <div className="flex items-center gap-1.5 justify-center">
                              <span className={`px-2 py-0.5 rounded text-xs font-semibold ${
                                b.avg_attendance_rate >= 90 ? 'bg-emerald-50 text-emerald-700 border border-emerald-250' :
                                b.avg_attendance_rate >= 75 ? 'bg-amber-50 text-amber-700 border border-amber-250' :
                                'bg-rose-50 text-rose-700 border border-rose-250'
                              }`}>
                                {b.avg_attendance_rate.toFixed(1)}%
                              </span>
                            </div>
                          </td>
                          <td className="p-3 text-center text-xs text-neutral-500 font-sans">
                            {new Date(b.last_synced).toLocaleTimeString('en-IN', {
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>
      ) : (
        /* Chat assistant Tab */
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 h-[calc(100vh-230px)] max-h-[680px]">
          {/* Suggestions sidebar panel */}
          <div className="lg:col-span-1 flex flex-col gap-4">
            <div className="card p-4 space-y-3.5 bg-gradient-to-br from-indigo-50/30 to-neutral-50 flex-1 border border-indigo-100 rounded-2xl">
              <div className="flex items-center gap-2 text-indigo-800">
                <BrainCircuit className="h-5 w-5 animate-pulse" />
                <h4 className="text-xs font-extrabold uppercase tracking-wide">Suggested Queries</h4>
              </div>
              <p className="text-[11px] text-neutral-500">
                Click any prompt below to query AI Analytics across all network campuses:
              </p>
              
              <div className="flex flex-col gap-2 pt-2">
                {[
                  "Which branch has the highest revenue?",
                  "What is the total student count across all branches?",
                  "Compare teacher counts across all locations",
                  "Which campus has the lowest attendance rate?"
                ].map((query, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleSuggestionClick(query)}
                    disabled={isChatting || isGeminiMissing}
                    className="text-left bg-white hover:bg-neutral-50 active:bg-neutral-100 border border-neutral-200/80 p-2.5 rounded-xl text-xs font-medium text-neutral-700 hover:text-primary transition shadow-sm flex items-start gap-1.5 disabled:opacity-50"
                  >
                    <ChevronRight className="h-4 w-4 shrink-0 text-amber-500 mt-0.5" />
                    <span>{query}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Core chatbot container */}
          <div className="lg:col-span-3 card flex flex-col h-full overflow-hidden p-0 border border-neutral-200 shadow-lg rounded-2xl">
            {isGeminiMissing ? (
              /* Fallback Setup Card */
              <div className="flex-1 flex flex-col items-center justify-center text-center p-8 max-w-xl mx-auto space-y-5 animate-fadeIn">
                <div className="h-16 w-16 bg-gradient-to-tr from-amber-50 to-amber-100 text-amber-600 rounded-full flex items-center justify-center shadow-inner border border-amber-200 animate-pulse">
                  <Bot className="h-9 w-9" />
                </div>
                <div className="space-y-2">
                  <h3 className="text-lg font-extrabold text-neutral-800 font-display">Enable AI Chat Analytics</h3>
                  <p className="text-sm text-neutral-500 leading-relaxed">
                    Query your school network statistics using simple natural language chat commands powered by Google Gemini 1.5 Flash.
                  </p>
                </div>

                <div className="w-full bg-slate-550 border border-neutral-250/70 p-4 rounded-xl text-left text-xs font-mono space-y-3 bg-neutral-900 text-slate-200 shadow-md">
                  <span className="text-[10px] font-bold text-amber-400 block tracking-wider uppercase">Setup Instructions:</span>
                  <p className="text-slate-400">Add the following API key environment variable in your backend configuration:</p>
                  <div className="bg-neutral-950 p-2.5 rounded-lg text-amber-200 border border-neutral-800/80 break-all select-all">
                    GEMINI_API_KEY=AIzaSy...your-actual-key...
                  </div>
                  <p className="text-neutral-500 text-[10px] leading-relaxed">
                    * After setting the variable in the backend `.env` file, restart the server instance to activate the smart analytics assistant.
                  </p>
                </div>
              </div>
            ) : (
              /* Conversational chat console */
              <div className="flex-1 flex flex-col h-full bg-slate-50/25">
                {/* Chat window Header */}
                <div className="h-14 border-b border-neutral-200 px-5 flex items-center justify-between bg-white shadow-sm shrink-0">
                  <div className="flex items-center gap-2">
                    <div className="h-8 w-8 rounded-full bg-indigo-50 border border-indigo-200 flex items-center justify-center text-indigo-600">
                      <Bot className="h-5 w-5" />
                    </div>
                    <div>
                      <span className="font-bold text-sm text-neutral-850 font-display block leading-none">Skolr AI Assistant</span>
                      <span className="text-[10px] text-emerald-600 font-bold block mt-0.5">Online RAG Intelligence</span>
                    </div>
                  </div>
                </div>

                {/* Messages List Area */}
                <div className="flex-1 overflow-y-auto p-5 space-y-4 min-h-0 bg-slate-50/40">
                  {chatHistory.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-neutral-400 max-w-sm mx-auto text-center space-y-3.5">
                      <BrainCircuit className="h-10 w-10 text-neutral-300" />
                      <div className="space-y-1">
                        <p className="text-sm font-bold text-neutral-600 font-display">Chain Analytics Assistant</p>
                        <p className="text-xs text-neutral-450 leading-relaxed">
                          Ask me comparative questions about student numbers, teacher ratios, and school revenue collections across your campuses.
                        </p>
                      </div>
                    </div>
                  ) : (
                    chatHistory.map((msg, i) => (
                      <div
                        key={i}
                        className={`flex gap-3 max-w-[85%] ${
                          msg.sender === 'user' ? 'ml-auto flex-row-reverse' : ''
                        }`}
                      >
                        {/* Avatar */}
                        <div className={`h-8.5 w-8.5 rounded-full shrink-0 flex items-center justify-center text-xs font-bold border shadow-sm ${
                          msg.sender === 'user'
                            ? 'bg-primary text-white border-primary-light'
                            : 'bg-indigo-50 text-indigo-600 border-indigo-200'
                        }`}>
                          {msg.sender === 'user' ? 'U' : <Bot className="h-4.5 w-4.5" />}
                        </div>

                        {/* Speech Bubble */}
                        <div className={`p-4 rounded-2xl shadow-sm text-sm space-y-1 ${
                          msg.sender === 'user'
                            ? 'bg-primary text-white rounded-tr-none'
                            : 'bg-white text-neutral-800 border border-neutral-200/80 rounded-tl-none'
                        }`}>
                          {msg.sender === 'user' ? (
                            <p className="leading-relaxed whitespace-pre-wrap">{msg.text}</p>
                          ) : (
                            <div 
                              className="prose prose-sm max-w-none text-neutral-800"
                              dangerouslySetInnerHTML={{ __html: formatMarkdown(msg.text) }}
                            />
                          )}
                          <span className={`text-[9px] block text-right mt-1.5 font-medium ${
                            msg.sender === 'user' ? 'text-blue-200' : 'text-neutral-400'
                          }`}>
                            {msg.timestamp.toLocaleTimeString('en-IN', {
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </span>
                        </div>
                      </div>
                    ))
                  )}

                  {/* Thinking Loader indicator bubble */}
                  {isChatting && (
                    <div className="flex gap-3 max-w-[80%] animate-pulse">
                      <div className="h-8.5 w-8.5 rounded-full shrink-0 flex items-center justify-center bg-indigo-50 text-indigo-600 border border-indigo-200 shadow-sm">
                        <Bot className="h-4.5 w-4.5 animate-spin" />
                      </div>
                      <div className="p-3.5 bg-white text-neutral-400 border border-neutral-200/80 rounded-2xl rounded-tl-none flex items-center gap-2 text-xs font-medium">
                        <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />
                        <span>AI Assistant is compiling statistics and thinking...</span>
                      </div>
                    </div>
                  )}
                  <div ref={chatEndRef} />
                </div>

                {/* Input Text Form panel */}
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    handleSendChat();
                  }}
                  className="h-16 border-t border-neutral-200 px-4 bg-white flex items-center gap-3 shrink-0"
                >
                  <input
                    type="text"
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    placeholder="e.g. Compare Patna and Nalanda branches..."
                    disabled={isChatting}
                    className="flex-1 input-field py-2 bg-neutral-50/50 focus:bg-white text-sm"
                  />
                  <button
                    type="submit"
                    disabled={!chatInput.trim() || isChatting}
                    className="bg-primary hover:bg-blue-700 active:bg-blue-800 text-white font-bold p-2.5 rounded-xl shadow-sm transition disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
                  >
                    <Send className="h-4.5 w-4.5" />
                  </button>
                </form>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
