import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  Search, 
  User, 
  IndianRupee, 
  Printer, 
  Loader2, 
  AlertCircle,
  FileText,
  CheckCircle,
  Plus
} from 'lucide-react';
import { feesApi, FeeTransactionCreateData } from '../api/feesApi';
import { studentApi } from '../../students/api/studentApi';

interface FeeCollectPageProps {
  preSelectedStudentId?: string;
  onClearPreSelection?: () => void;
}

export function FeeCollectPage({ preSelectedStudentId, onClearPreSelection }: FeeCollectPageProps) {
  const queryClient = useQueryClient();
  
  // Search state
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStudentId, setSelectedStudentId] = useState<string>(preSelectedStudentId || '');
  
  // Assign structure state
  const [selectedStructureId, setSelectedStructureId] = useState('');

  // Payment form state
  const [amountPaid, setAmountPaid] = useState('');
  const [paymentMode, setPaymentMode] = useState<'cash' | 'upi' | 'bank_transfer' | 'card'>('upi');
  const [txnRef, setTxnRef] = useState('');
  const [remarks, setRemarks] = useState('');

  // Auto sync if preselected ID changes
  useEffect(() => {
    if (preSelectedStudentId) {
      setSelectedStudentId(preSelectedStudentId);
    }
  }, [preSelectedStudentId]);

  // Query: Student list for search lookup
  const { data: studentsResponse, isLoading: isLoadingSearch } = useQuery({
    queryKey: ['students-collection-lookup', searchTerm],
    queryFn: () => studentApi.list({ search: searchTerm, per_page: 5 }),
    enabled: searchTerm.length >= 2,
  });

  const searchResults = studentsResponse?.data || [];

  // Query: Student details (account & transactions)
  const { data: studentDetails, isLoading: isLoadingDetails } = useQuery({
    queryKey: ['student-fee-details', selectedStudentId],
    queryFn: () => feesApi.getStudentDetails(selectedStudentId),
    enabled: !!selectedStudentId,
  });

  // Query: Standard structures (in case we need to assign one)
  const { data: structures = [], isLoading: isLoadingStructures } = useQuery({
    queryKey: ['fee-structures'],
    queryFn: feesApi.getStructures,
    enabled: !!selectedStudentId && !studentDetails?.account,
  });

  // Query: Details of selected student metadata
  const { data: studentProfile } = useQuery({
    queryKey: ['student-profile-fee-view', selectedStudentId],
    queryFn: () => studentApi.get(selectedStudentId),
    enabled: !!selectedStudentId,
  });

  // Mutations
  const assignMutation = useMutation({
    mutationFn: (data: { studentId: string; structureId: string }) => 
      feesApi.assignStructure(data.studentId, data.structureId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['student-fee-details'] });
      alert('Fee structure assigned successfully!');
    },
    onError: () => alert('Failed to assign fee structure.')
  });

  const recordPaymentMutation = useMutation({
    mutationFn: (data: FeeTransactionCreateData) => feesApi.recordPayment(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['student-fee-details'] });
      setAmountPaid('');
      setTxnRef('');
      setRemarks('');
      alert('Payment logged successfully!');
    },
    onError: (err: any) => {
      const msg = err.response?.data?.detail || 'Failed to log payment transaction';
      alert(msg);
    }
  });

  const handleAssignStructure = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStudentId || !selectedStructureId) return;
    assignMutation.mutate({ studentId: selectedStudentId, structureId: selectedStructureId });
  };

  const handleRecordPaymentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStudentId) return;
    
    const amt = parseFloat(amountPaid);
    if (isNaN(amt) || amt <= 0) {
      alert('Please enter a valid amount greater than 0.');
      return;
    }

    recordPaymentMutation.mutate({
      student_id: selectedStudentId,
      amount_paid: amt,
      payment_mode: paymentMode,
      transaction_reference: txnRef || undefined,
      remarks: remarks || undefined
    });
  };

  const handlePrintReceipt = (transactionId: string) => {
    const receiptUrl = feesApi.getReceiptUrl(transactionId);
    const printWindow = window.open(receiptUrl, '_blank');
    if (!printWindow || printWindow.closed || typeof printWindow.closed === 'undefined') {
      alert('Popup Blocker Detected! Please enable browser popups for this site to open and print the receipt PDF.');
    }
  };

  const account = studentDetails?.account;
  const transactions = studentDetails?.transactions || [];
  const outstanding = account ? account.outstanding_balance : 0;
  const activeStudentName = studentProfile?.data 
    ? `${studentProfile.data.first_name} ${studentProfile.data.last_name}` 
    : '';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="page-header">
        <div>
          <h2 className="text-2xl font-bold font-display text-neutral-900">Record Fee Collection</h2>
          <p className="text-sm text-neutral-500 font-sans">Collect payments, link fee accounts, and print transaction receipts.</p>
        </div>
        {selectedStudentId && (
          <button
            onClick={() => {
              setSelectedStudentId('');
              setSearchTerm('');
              if (onClearPreSelection) onClearPreSelection();
            }}
            className="btn-secondary text-xs"
          >
            Clear Selected Student
          </button>
        )}
      </div>

      {/* 1. Student Finder Search Area */}
      {!selectedStudentId && (
        <div className="card max-w-2xl mx-auto space-y-4 py-8">
          <div className="text-center space-y-1">
            <h3 className="section-title text-base font-bold">Search Student Billing Profile</h3>
            <p className="text-xs text-neutral-500">Type at least 2 letters of student name or admission number to query.</p>
          </div>

          <div className="relative max-w-md mx-auto w-full">
            <Search className="absolute left-3 top-3 h-4.5 w-4.5 text-neutral-450" />
            <input
              type="text"
              placeholder="e.g. Aarav Patel or ADM2025001"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="input-field pl-10"
            />

            {isLoadingSearch && (
              <div className="absolute right-3 top-3.5">
                <Loader2 className="h-4 w-4 animate-spin text-neutral-400" />
              </div>
            )}
          </div>

          {/* Quick results autocomplete list */}
          {searchResults.length > 0 && (
            <div className="max-w-md mx-auto border border-neutral-100 rounded-lg overflow-hidden divide-y divide-neutral-100 shadow-sm bg-neutral-50">
              {searchResults.map((s: any) => (
                <button
                  key={s.id}
                  onClick={() => setSelectedStudentId(s.id)}
                  className="w-full px-4 py-3 text-left hover:bg-white flex items-center justify-between transition group"
                >
                  <div>
                    <div className="font-semibold text-neutral-800 text-sm group-hover:text-primary transition">
                      {s.first_name} {s.last_name}
                    </div>
                    <div className="text-[10px] text-neutral-500 font-mono">
                      Adm No: {s.admission_number}
                    </div>
                  </div>
                  <span className="text-xs font-bold text-neutral-450 group-hover:text-primary transition">Select Profile &rarr;</span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Details Container */}
      {selectedStudentId && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Column 1 & 2: Dues breakdown and log payment */}
          <div className="lg:col-span-2 space-y-6">
            {/* Student Ledger Profile summary card */}
            <div className="card space-y-4">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-neutral-100 rounded-xl text-neutral-700">
                  <User className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="section-title text-base font-bold">{activeStudentName || 'Student Billing Profile'}</h3>
                  <p className="text-xs text-neutral-550 font-medium">
                    Admission No: <strong className="font-mono text-neutral-850">{studentProfile?.data?.admission_number}</strong>
                  </p>
                </div>
              </div>

              {isLoadingDetails ? (
                <div className="flex items-center justify-center py-6">
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                </div>
              ) : !account ? (
                // 2. Assign Fee Structure option if student has no fee linked
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-5 space-y-4 text-amber-900">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
                    <div>
                      <h4 className="font-bold text-sm">No Fee Structure Linked</h4>
                      <p className="text-xs text-amber-800 mt-1">
                        This student doesn't have an active fee structure assigned yet. You must associate a payment group to trigger school ledgers billing.
                      </p>
                    </div>
                  </div>

                  <form onSubmit={handleAssignStructure} className="flex gap-2 max-w-md">
                    <select
                      value={selectedStructureId}
                      onChange={(e) => setSelectedStructureId(e.target.value)}
                      disabled={isLoadingStructures}
                      className="input-field bg-white text-xs py-1.5"
                      required
                    >
                      <option value="">Select structure template...</option>
                      {structures.map((s: any) => (
                        <option key={s.id} value={s.id}>
                          {s.name} (₹{s.items.reduce((acc: number, i: any) => acc + i.amount, 0).toLocaleString()})
                        </option>
                      ))}
                    </select>
                    <button
                      type="submit"
                      disabled={assignMutation.isPending || !selectedStructureId}
                      className="btn-primary py-1.5 px-3 text-xs shrink-0 flex items-center gap-1"
                    >
                      {assignMutation.isPending && <Loader2 className="h-3 w-3 animate-spin" />}
                      <Plus className="h-3 w-3" /> Link Structure
                    </button>
                  </form>
                </div>
              ) : (
                // 3. Display active fee accounts card details
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 bg-neutral-50 p-4 rounded-xl border border-neutral-100">
                  <div>
                    <div className="text-[10px] uppercase font-bold text-neutral-450 mb-1">Fee Plan Structure</div>
                    <div className="text-xs font-bold text-neutral-800 truncate">{account.fee_structure?.name}</div>
                  </div>
                  <div>
                    <div className="text-[10px] uppercase font-bold text-neutral-450 mb-1">Applicable Dues</div>
                    <div className="text-sm font-bold text-neutral-800">₹{account.total_applicable.toLocaleString()}</div>
                  </div>
                  <div>
                    <div className="text-[10px] uppercase font-bold text-neutral-450 mb-1">Amount Paid</div>
                    <div className="text-sm font-bold text-emerald-700">₹{account.total_paid.toLocaleString()}</div>
                  </div>
                  <div>
                    <div className="text-[10px] uppercase font-bold text-neutral-450 mb-1">Outstanding Balance</div>
                    <div className="text-sm font-extrabold text-rose-600">₹{outstanding.toLocaleString()}</div>
                  </div>
                </div>
              )}
            </div>

            {/* Collection Payment Recording Form */}
            {account && outstanding > 0 && (
              <div className="card space-y-4">
                <h3 className="section-title text-base font-bold flex items-center gap-2">
                  <IndianRupee className="h-5 w-5 text-neutral-600" /> Collect Dues Payment
                </h3>

                <form onSubmit={handleRecordPaymentSubmit} className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold uppercase text-neutral-500 mb-1.5">Collection Amount (₹)</label>
                      <input
                        type="number"
                        min="1"
                        max={outstanding}
                        placeholder={`Max ₹${outstanding}`}
                        value={amountPaid}
                        onChange={(e) => setAmountPaid(e.target.value)}
                        className="input-field"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold uppercase text-neutral-500 mb-1.5">Payment Method</label>
                      <select
                        value={paymentMode}
                        onChange={(e) => setPaymentMode(e.target.value as any)}
                        className="input-field bg-white"
                        required
                      >
                        <option value="upi">UPI (GPay / PhonePe / Paytm)</option>
                        <option value="cash">Cash In Hand</option>
                        <option value="bank_transfer">Direct Bank Transfer (IMPS/NEFT)</option>
                        <option value="card">Credit / Debit Card</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold uppercase text-neutral-500 mb-1.5">Transaction ID / Reference (Optional)</label>
                      <input
                        type="text"
                        placeholder="e.g. UPI transaction hash code"
                        value={txnRef}
                        onChange={(e) => setTxnRef(e.target.value)}
                        className="input-field"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold uppercase text-neutral-500 mb-1.5">Remarks / Installment Dues (Optional)</label>
                      <input
                        type="text"
                        placeholder="e.g. Quarter 1 Tuition fee installment"
                        value={remarks}
                        onChange={(e) => setRemarks(e.target.value)}
                        className="input-field"
                      />
                    </div>
                  </div>

                  <div className="flex justify-end pt-2">
                    <button
                      type="submit"
                      disabled={recordPaymentMutation.isPending}
                      className="btn-primary flex items-center gap-2"
                    >
                      {recordPaymentMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                      Record Collection
                    </button>
                  </div>
                </form>
              </div>
            )}

            {account && outstanding === 0 && (
              <div className="bg-emerald-50 border border-emerald-250 rounded-xl p-5 flex items-center gap-3 text-emerald-800">
                <CheckCircle className="h-6 w-6 text-emerald-600 shrink-0" />
                <span className="text-sm font-semibold">Fully Settled: The student has completely paid all applicable structure fee dues. No outstanding amount exists.</span>
              </div>
            )}
          </div>

          {/* Column 3: Transaction logs history */}
          <div className="card space-y-4">
            <h3 className="section-title text-base font-bold flex items-center gap-2">
              <FileText className="h-5 w-5 text-neutral-500" /> Receipt Ledger History
            </h3>

            {transactions.length === 0 ? (
              <div className="text-center py-10 text-neutral-450 text-xs">
                No past transactions recorded for this student account.
              </div>
            ) : (
              <div className="space-y-3 max-h-[420px] overflow-y-auto pr-1">
                {transactions.map((t) => (
                  <div key={t.id} className="border border-neutral-100 rounded-lg p-3 bg-neutral-50/50 hover:bg-white transition duration-150 relative group">
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="font-semibold text-neutral-900 text-xs sm:text-sm">
                          ₹{t.amount_paid.toLocaleString()}
                        </div>
                        <div className="text-[10px] text-neutral-500 font-mono mt-0.5">
                          {t.receipt_number} | {t.payment_mode.toUpperCase()}
                        </div>
                        <div className="text-[9px] text-neutral-400 mt-1">
                          Date: {new Date(t.payment_date).toLocaleDateString()}
                        </div>
                      </div>
                      
                      <button
                        onClick={() => handlePrintReceipt(t.id)}
                        className="p-1.5 text-neutral-400 hover:text-primary hover:bg-neutral-100 rounded-lg transition"
                        title="Print / Save PDF Receipt"
                      >
                        <Printer className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
