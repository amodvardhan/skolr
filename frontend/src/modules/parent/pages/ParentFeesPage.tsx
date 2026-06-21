import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { CreditCard, Download, CheckCircle, RefreshCw, Loader2, ArrowRight } from 'lucide-react';
import { parentApi } from '../api/parentApi';
import { useAuthStore } from '../../../stores/authStore';

interface ParentFeesProps {
  studentId: string;
}

export function ParentFeesPage({ studentId }: ParentFeesProps) {
  const { token } = useAuthStore();
  const [paying, setPaying] = useState<boolean>(false);
  const [downloadingReceiptId, setDownloadingReceiptId] = useState<string | null>(null);

  // Query fees account details & transactions
  const { data: feesData, isLoading: feesLoading, refetch, isRefetching } = useQuery({
    queryKey: ['parent_fees', studentId],
    queryFn: () => parentApi.getChildFees(studentId),
    enabled: !!studentId,
  });

  const account = feesData?.account;
  const transactions = feesData?.transactions || [];

  const handlePayOnline = async () => {
    if (!studentId || paying) return;
    setPaying(true);

    try {
      const res = await parentApi.getChildPaymentLink(studentId);
      if (res.success && res.payment_url) {
        // Redirect parent to Razorpay Checkout URL / Sandbox Simulator
        window.location.href = res.payment_url;
      } else {
        alert('Failed to generate payment link. Please contact the school accounts office.');
        setPaying(false);
      }
    } catch (err) {
      alert('Error initiating checkout payment.');
      setPaying(false);
    }
  };

  const handleDownloadReceipt = async (transactionId: string) => {
    if (!transactionId) return;
    setDownloadingReceiptId(transactionId);

    const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api/v1';

    try {
      const response = await fetch(`${apiBaseUrl}/fees/transactions/${transactionId}/receipt`, {
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
        a.download = `receipt-${transactionId}.pdf`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        window.URL.revokeObjectURL(url);
      } else {
        alert('Failed to download PDF invoice receipt.');
      }
    } catch (err) {
      alert('Error downloading transaction receipt.');
    } finally {
      setDownloadingReceiptId(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Title Header Banner */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white p-5 border border-neutral-200 rounded-2xl shadow-sm">
        <div>
          <h2 className="text-base font-bold text-neutral-800 font-display">Fees & Payment Accounts</h2>
          <p className="text-xs text-neutral-500 mt-0.5">Manage school fee settlements and download receipts</p>
        </div>
        <button
          onClick={() => refetch()}
          disabled={feesLoading || isRefetching}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl border border-neutral-200 text-neutral-600 bg-neutral-50 hover:bg-neutral-100 disabled:opacity-50 transition"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${isRefetching ? 'animate-spin' : ''}`} />
          Refresh Account
        </button>
      </div>

      {feesLoading ? (
        <div className="flex flex-col items-center justify-center py-20 space-y-3 bg-white border border-neutral-200 rounded-2xl">
          <span className="border-2 border-primary border-t-transparent w-8 h-8 rounded-full animate-spin"></span>
          <span className="text-xs font-semibold text-neutral-450 font-display">Loading billing ledgers...</span>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
          {/* LEFT PANELS: Billing Status Summary */}
          <div className="lg:col-span-1 space-y-6">
            <div className="card bg-white border border-neutral-200 rounded-2xl p-6 shadow-sm space-y-5">
              <div className="flex justify-between items-center border-b border-neutral-100 pb-3">
                <span className="text-xs font-bold text-neutral-400 uppercase tracking-wider font-display">Dues Summary</span>
                <CreditCard className="h-5 w-5 text-neutral-450" />
              </div>

              <div className="space-y-4">
                <div>
                  <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider block">Outstanding Balance</span>
                  <span className="text-3xl font-black text-rose-600 font-display mt-1 block">
                    ₹{account?.outstanding_balance?.toLocaleString('en-IN') || 0}
                  </span>
                </div>

                <div className="space-y-2 text-xs text-neutral-600 bg-neutral-50 p-4 border border-neutral-100 rounded-xl">
                  <div className="flex justify-between">
                    <span>Applicable Dues:</span>
                    <span className="font-bold text-neutral-800">₹{account?.total_applicable?.toLocaleString('en-IN') || 0}</span>
                  </div>
                  <div className="flex justify-between border-b border-neutral-200/50 pb-2 mb-2">
                    <span>Scholarship Discount:</span>
                    <span className="font-bold text-emerald-600">- ₹{account?.total_discount?.toLocaleString('en-IN') || 0}</span>
                  </div>
                  <div className="flex justify-between text-neutral-850">
                    <span>Net Paid Dues:</span>
                    <span className="font-bold text-neutral-800">₹{account?.total_paid?.toLocaleString('en-IN') || 0}</span>
                  </div>
                </div>

                {account?.outstanding_balance > 0 ? (
                  <button
                    onClick={handlePayOnline}
                    disabled={paying}
                    className="w-full flex items-center justify-center gap-1.5 py-3 bg-primary hover:bg-primary-light text-white text-xs font-bold rounded-xl transition shadow-lg shadow-primary/25 disabled:opacity-50"
                  >
                    {paying ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Redirecting to Gateway...
                      </>
                    ) : (
                      <>
                        Pay Outstanding Fees <ArrowRight className="h-4 w-4" />
                      </>
                    )}
                  </button>
                ) : (
                  <div className="flex items-center gap-2 p-3 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-xl text-xs font-bold">
                    <CheckCircle className="h-4.5 w-4.5" /> All outstanding dues cleared!
                  </div>
                )}
              </div>
            </div>

            {/* Fee structure configurator detail items */}
            {account?.fee_structure && (
              <div className="card bg-white border border-neutral-200 rounded-2xl p-5 shadow-sm space-y-4">
                <div>
                  <h3 className="text-xs font-bold text-neutral-800 font-display">Assigned Structure: {account.fee_structure.name}</h3>
                  <span className="text-[10px] text-neutral-450 font-semibold">Detailed billing components breakdown</span>
                </div>
                <div className="divide-y divide-neutral-100 text-xs font-semibold text-neutral-600">
                  {account.fee_structure.items?.map((item: any) => (
                    <div key={item.id} className="flex justify-between py-2.5">
                      <span className="capitalize">{item.frequency} tuition head</span>
                      <span className="text-neutral-800">₹{item.amount?.toLocaleString('en-IN')}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* RIGHT PANELS: Transactions Ledger */}
          <div className="lg:col-span-2 bg-white border border-neutral-200 rounded-2xl overflow-hidden shadow-sm">
            <div className="px-5 py-4 border-b border-neutral-200">
              <h3 className="text-xs font-bold text-neutral-400 uppercase tracking-wider font-display">Payment Transactions Ledger</h3>
            </div>
            {transactions.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-neutral-50 text-neutral-500 font-bold uppercase border-b border-neutral-200">
                    <tr>
                      <th className="px-5 py-3 font-display">Receipt No.</th>
                      <th className="px-5 py-3 font-display">Amount Paid</th>
                      <th className="px-5 py-3 font-display">Payment Mode</th>
                      <th className="px-5 py-3 font-display">Paid Date</th>
                      <th className="px-5 py-3 font-display">Receipt PDF</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-100 font-medium">
                    {transactions.map((txn: any) => (
                      <tr key={txn.id} className="hover:bg-neutral-50/50 transition">
                        <td className="px-5 py-3.5 font-bold text-neutral-800">{txn.receipt_number}</td>
                        <td className="px-5 py-3.5 font-bold text-neutral-700">₹{txn.amount_paid?.toLocaleString('en-IN')}</td>
                        <td className="px-5 py-3.5 text-neutral-600 capitalize">
                          <span className="px-2 py-0.5 bg-neutral-100 border border-neutral-200 rounded-md text-[10px] font-bold">
                            {txn.payment_mode}
                          </span>
                        </td>
                        <td className="px-5 py-3.5 text-neutral-450">
                          {new Date(txn.payment_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </td>
                        <td className="px-5 py-3.5">
                          <button
                            onClick={() => handleDownloadReceipt(txn.id)}
                            disabled={downloadingReceiptId === txn.id}
                            className="flex items-center gap-1.5 text-[10px] font-bold text-primary hover:underline hover:text-primary-light disabled:opacity-50 transition"
                          >
                            {downloadingReceiptId === txn.id ? (
                              <>
                                <Loader2 className="h-3 w-3 animate-spin" /> downloading...
                              </>
                            ) : (
                              <>
                                <Download className="h-3.5 w-3.5" /> Download Receipt
                              </>
                            )}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-20 text-neutral-450 text-xs font-semibold">
                No past transactions recorded for this billing profile.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
