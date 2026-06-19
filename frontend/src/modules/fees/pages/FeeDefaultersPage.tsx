import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { 
  Users, 
  Search, 
  MessageSquare, 
  ChevronRight, 
  Loader2, 
  AlertCircle,
  IndianRupee,
  ShieldCheck,
  Link2,
  Copy,
  ExternalLink,
  X,
  Check
} from 'lucide-react';
import { feesApi, FeeDefaulter } from '../api/feesApi';

interface FeeDefaultersPageProps {
  onCollectClick: (studentId: string) => void;
}

export function FeeDefaultersPage({ onCollectClick }: FeeDefaultersPageProps) {
  const [sendingReminderId, setSendingReminderId] = useState<string | null>(null);
  
  // Link generation states
  const [selectedLinkDefaulter, setSelectedLinkDefaulter] = useState<FeeDefaulter | null>(null);
  const [generatedLink, setGeneratedLink] = useState('');
  const [isGeneratingLink, setIsGeneratingLink] = useState(false);
  const [copied, setCopied] = useState(false);

  // Fetch defaulters list
  const { data: defaulters = [], isLoading, error } = useQuery({
    queryKey: ['fee-defaulters'],
    queryFn: feesApi.getDefaulters,
  });

  const handleWhatsAppReminder = async (defaulter: FeeDefaulter) => {
    setSendingReminderId(defaulter.student_id);
    try {
      const res = await feesApi.sendWhatsAppReminder(defaulter.student_id);
      alert(res.message || `WhatsApp payment reminder triggered for ${defaulter.first_name}'s parent!`);
    } catch (err: any) {
      console.error(err);
      const errDetail = err.response?.data?.detail || 'Failed to trigger WhatsApp reminder. Please check configuration.';
      alert(`Error: ${errDetail}`);
    } finally {
      setSendingReminderId(null);
    }
  };

  const handleGenerateLink = async (defaulter: FeeDefaulter) => {
    setSelectedLinkDefaulter(defaulter);
    setIsGeneratingLink(true);
    setGeneratedLink('');
    setCopied(false);
    try {
      const res = await feesApi.generatePaymentLink(defaulter.student_id);
      if (res.payment_url) {
        setGeneratedLink(res.payment_url);
      } else {
        alert('Failed to obtain payment link.');
      }
    } catch (err: any) {
      console.error(err);
      alert('Error generating payment link: ' + (err.response?.data?.detail || err.message));
    } finally {
      setIsGeneratingLink(false);
    }
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(generatedLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const getShareMessage = (defaulter: FeeDefaulter) => {
    return `Greetings from Skolr Administration. This is to inform you that your ward, ${defaulter.first_name} ${defaulter.last_name}, has an outstanding fee balance of ₹${defaulter.outstanding_balance.toLocaleString()}. Kindly clear the dues by paying securely online here: ${generatedLink}`;
  };

  const handleCopyShareMessage = (defaulter: FeeDefaulter) => {
    navigator.clipboard.writeText(getShareMessage(defaulter));
    alert('Message copied to clipboard! You can paste and send it to the parent.');
  };

  const [searchTerm, setSearchTerm] = useState('');

  const filteredDefaulters = defaulters.filter((d: FeeDefaulter) => {
    const fullName = `${d.first_name} ${d.last_name}`.toLowerCase();
    const admNum = d.admission_number.toLowerCase();
    const classStr = `${d.class_name} ${d.class_section}`.toLowerCase();
    const query = searchTerm.toLowerCase();
    return fullName.includes(query) || admNum.includes(query) || classStr.includes(query);
  });

  // Totals calculations
  const totalOutstanding = filteredDefaulters.reduce((acc, d) => acc + d.outstanding_balance, 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="page-header">
        <div>
          <h2 className="text-2xl font-bold font-display text-neutral-900">Defaulters List</h2>
          <p className="text-sm text-neutral-500">Monitor and contact parents of students with outstanding balances.</p>
        </div>
      </div>

      {/* Aggregate Banner */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="card flex items-center gap-4 bg-gradient-to-br from-rose-500/5 to-rose-600/5 hover:border-rose-500/20 transition duration-200">
          <div className="p-3.5 bg-rose-500/10 rounded-xl text-rose-600 shrink-0">
            <IndianRupee className="h-6 w-6" />
          </div>
          <div>
            <div className="text-2xl font-bold text-neutral-900 tracking-tight">₹{totalOutstanding.toLocaleString()}</div>
            <div className="text-xs font-semibold text-neutral-500 uppercase tracking-wide">Total Outstanding Balance</div>
          </div>
        </div>

        <div className="card flex items-center gap-4 bg-gradient-to-br from-amber-500/5 to-amber-600/5 hover:border-amber-500/20 transition duration-200">
          <div className="p-3.5 bg-amber-500/10 rounded-xl text-amber-600 shrink-0">
            <Users className="h-6 w-6" />
          </div>
          <div>
            <div className="text-2xl font-bold text-neutral-900 tracking-tight">{filteredDefaulters.length}</div>
            <div className="text-xs font-semibold text-neutral-500 uppercase tracking-wide">Defaulter Students</div>
          </div>
        </div>

        <div className="card flex items-center gap-4 bg-gradient-to-br from-emerald-500/5 to-emerald-600/5 hover:border-emerald-500/20 transition duration-200">
          <div className="p-3.5 bg-emerald-500/10 rounded-xl text-emerald-600 shrink-0">
            <ShieldCheck className="h-6 w-6" />
          </div>
          <div>
            <div className="text-2xl font-bold text-neutral-900 tracking-tight">Active</div>
            <div className="text-xs font-semibold text-neutral-500 uppercase tracking-wide">Ledger Monitoring</div>
          </div>
        </div>
      </div>

      {/* Toolbar / Search */}
      <div className="card flex flex-col sm:flex-row items-center justify-between gap-4 py-4">
        <div className="relative flex-1 max-w-md w-full">
          <Search className="absolute left-3 top-3 h-4.5 w-4.5 text-neutral-400" />
          <input
            type="text"
            placeholder="Search defaulter name, adm no, or class..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="input-field pl-10"
          />
        </div>
      </div>

      {/* Main Defaulters Roster */}
      <div className="card p-0 overflow-hidden">
        {error && (
          <div className="bg-red-50 text-danger border-b border-red-200 px-6 py-4 flex items-center gap-3">
            <AlertCircle className="h-5 w-5" />
            <span className="text-sm font-medium">Failed to load outstanding ledger. Is server running?</span>
          </div>
        )}

        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20 space-y-3">
            <Loader2 className="h-10 w-10 text-primary animate-spin" />
            <span className="text-sm text-neutral-500 font-medium">Loading defaulters list...</span>
          </div>
        ) : filteredDefaulters.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center space-y-3 text-neutral-500">
            <ShieldCheck className="h-12 w-12 text-emerald-500" />
            <h4 className="font-semibold text-neutral-800 text-lg">All Cleared!</h4>
            <p className="text-sm text-neutral-550 max-w-sm mx-auto">
              There are no active students with outstanding dues currently on the system records.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-neutral-50 border-b border-neutral-200 text-xs font-semibold text-neutral-500 uppercase tracking-wider">
                  <th className="px-6 py-4">Student</th>
                  <th className="px-6 py-4">Class</th>
                  <th className="px-6 py-4">Parent Contact</th>
                  <th className="px-6 py-4">Applicable</th>
                  <th className="px-6 py-4">Paid</th>
                  <th className="px-6 py-4 text-rose-600">Outstanding</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-150 text-sm">
                {filteredDefaulters.map((defaulter) => (
                  <tr key={defaulter.student_id} className="hover:bg-neutral-50/50 transition">
                    <td className="px-6 py-4">
                      <div className="font-semibold text-neutral-900">
                        {defaulter.first_name} {defaulter.last_name}
                      </div>
                      <div className="text-xs text-neutral-500 font-mono">
                        {defaulter.admission_number}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-neutral-600 font-medium">
                      Class {defaulter.class_name} ({defaulter.class_section})
                    </td>
                    <td className="px-6 py-4 text-neutral-600 font-mono">
                      {defaulter.parent_mobile}
                    </td>
                    <td className="px-6 py-4 text-neutral-700 font-semibold">
                      ₹{defaulter.total_applicable.toLocaleString()}
                    </td>
                    <td className="px-6 py-4 text-emerald-700 font-semibold">
                      ₹{defaulter.total_paid.toLocaleString()}
                    </td>
                    <td className="px-6 py-4 text-rose-600 font-bold">
                      ₹{defaulter.outstanding_balance.toLocaleString()}
                    </td>
                    <td className="px-6 py-4 text-right space-x-2">
                      <button
                        onClick={() => handleWhatsAppReminder(defaulter)}
                        disabled={sendingReminderId !== null}
                        className="text-neutral-500 hover:text-emerald-600 p-1.5 hover:bg-neutral-100 rounded-lg transition disabled:opacity-50"
                        title="Send SMS/WhatsApp reminder alert"
                      >
                        {sendingReminderId === defaulter.student_id ? (
                          <Loader2 className="h-4.5 w-4.5 animate-spin text-emerald-600" />
                        ) : (
                          <MessageSquare className="h-4.5 w-4.5" />
                        )}
                      </button>
                      <button
                        onClick={() => handleGenerateLink(defaulter)}
                        className="text-neutral-500 hover:text-blue-600 p-1.5 hover:bg-neutral-100 rounded-lg transition"
                        title="Generate Online Payment Link"
                      >
                        <Link2 className="h-4.5 w-4.5" />
                      </button>
                      <button
                        onClick={() => onCollectClick(defaulter.student_id)}
                        className="btn-secondary py-1 px-2.5 text-xs flex inline-flex items-center gap-1 hover:bg-primary hover:text-white hover:border-primary"
                      >
                        Collect <ChevronRight className="h-3 w-3" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Payment Link Modal Overlay */}
      {selectedLinkDefaulter && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 backdrop-blur-sm p-4 animate-fadeIn">
          <div className="bg-white border border-neutral-250 rounded-2xl max-w-md w-full p-6 shadow-xl space-y-5 relative">
            <button 
              onClick={() => setSelectedLinkDefaulter(null)}
              className="absolute top-4 right-4 text-neutral-450 hover:text-neutral-700 transition"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="space-y-1">
              <h3 className="text-lg font-bold font-display text-neutral-900">Online Payment Link</h3>
              <p className="text-xs text-neutral-550">Generate and copy the payment checkout link for parent sharing.</p>
            </div>

            <div className="bg-neutral-50 border border-neutral-100 p-3.5 rounded-xl text-xs space-y-2">
              <div className="flex justify-between">
                <span className="text-neutral-500">Student:</span>
                <strong className="text-neutral-850">{selectedLinkDefaulter.first_name} {selectedLinkDefaulter.last_name}</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-500">Outstanding:</span>
                <strong className="text-rose-600">₹{selectedLinkDefaulter.outstanding_balance.toLocaleString()}</strong>
              </div>
            </div>

            {isGeneratingLink ? (
              <div className="flex flex-col items-center justify-center py-6 space-y-2">
                <Loader2 className="h-8 w-8 text-primary animate-spin" />
                <span className="text-xs text-neutral-500 font-medium">Requesting Gateway Link...</span>
              </div>
            ) : generatedLink ? (
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-neutral-500">Payment URL</label>
                  <div className="flex gap-2">
                    <input 
                      type="text" 
                      readOnly 
                      value={generatedLink}
                      className="w-full bg-white border border-neutral-300 rounded-lg px-3 py-1.5 text-xs text-neutral-800 focus:outline-none"
                    />
                    <button 
                      onClick={handleCopyLink}
                      className="btn-secondary py-1.5 px-3 flex items-center gap-1 text-xs whitespace-nowrap"
                    >
                      {copied ? <Check className="h-3.5 w-3.5 text-emerald-650" /> : <Copy className="h-3.5 w-3.5" />}
                      <span>{copied ? 'Copied' : 'Copy'}</span>
                    </button>
                  </div>
                </div>

                <div className="space-y-2 pt-2 border-t border-neutral-150">
                  <button 
                    onClick={() => handleCopyShareMessage(selectedLinkDefaulter)}
                    className="w-full btn-primary text-xs py-2 flex items-center justify-center gap-1.5"
                  >
                    <MessageSquare className="h-4 w-4" /> Copy Message for Parent
                  </button>
                  
                  <a 
                    href={generatedLink}
                    target="_blank"
                    rel="noreferrer"
                    className="w-full btn-secondary text-xs py-2 flex items-center justify-center gap-1.5 hover:bg-neutral-100"
                  >
                    <ExternalLink className="h-4 w-4" /> Open Payment Page
                  </a>
                </div>
              </div>
            ) : (
              <div className="text-center py-4 text-xs text-danger font-medium">
                Failed to resolve dynamic payment credentials.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
