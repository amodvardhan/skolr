import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  IndianRupee,
  TrendingUp,
  CreditCard,
  Search,
  FileDown,
  Loader2,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  Filter,
  BarChart2
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  PieChart,
  Pie,
  Cell
} from 'recharts';

import { feesApi } from '../api/feesApi';

const PAYMENT_MODE_COLORS: Record<string, string> = {
  UPI: '#10B981',           // Emerald
  CASH: '#F59E0B',          // Amber
  CARD: '#3B82F6',          // Blue
  BANK_TRANSFER: '#8B5CF6', // Purple
  UNKNOWN: '#94A3B8'        // Slate
};

export function FeeDashboardPage() {
  // State for Ledger list
  const [page, setPage] = useState<number>(1);
  const [searchVal, setSearchVal] = useState<string>('');
  const [debouncedSearch, setDebouncedSearch] = useState<string>('');
  const [modeFilter, setModeFilter] = useState<string>('');

  // Debounce search input
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchVal);
      setPage(1); // reset to first page on search
    }, 400);
    return () => clearTimeout(handler);
  }, [searchVal]);

  // Queries
  const { data: analyticsRes, isLoading: loadingAnalytics, error: analyticsError } = useQuery({
    queryKey: ['fees-analytics'],
    queryFn: feesApi.getAnalytics,
  });

  const { data: ledgerRes, isLoading: loadingLedger, isFetching: fetchingLedger } = useQuery({
    queryKey: ['fees-ledger', page, modeFilter, debouncedSearch],
    queryFn: () => feesApi.getTransactionsLedger({
      page,
      per_page: 8,
      payment_mode: modeFilter || undefined,
      search: debouncedSearch || undefined
    }),
  });

  const analytics = analyticsRes?.data;
  const ledger = ledgerRes?.data;
  const pagination = ledgerRes?.pagination;

  // Format data for Pie/Donut Chart
  const pieData = analytics?.payment_modes.map(item => ({
    name: item.mode,
    value: item.amount,
    count: item.count
  })) || [];

  return (
    <div className="space-y-6">
      {/* Overview Cards */}
      {loadingAnalytics ? (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-28 bg-neutral-200 animate-pulse rounded-xl"></div>
          ))}
        </div>
      ) : analyticsError ? (
        <div className="bg-red-50 border border-red-250 text-red-800 p-4 rounded-xl flex items-center gap-2 text-sm">
          <AlertCircle className="h-5 w-5 text-red-600" />
          <span>Failed to load fees analytics data. Please check connection.</span>
        </div>
      ) : analytics ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 animate-fadeIn">
          {/* Card 1: Total Applicable */}
          <div className="card flex flex-col justify-between p-5 bg-gradient-to-br from-indigo-50/50 to-neutral-50/20 hover:shadow-md transition">
            <div className="flex justify-between items-start">
              <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">Total Expected Dues</span>
              <div className="p-1.5 bg-indigo-50 text-indigo-600 rounded-lg">
                <IndianRupee className="h-4 w-4" />
              </div>
            </div>
            <div className="mt-4">
              <h3 className="text-2xl font-extrabold text-neutral-900 font-display">
                ₹{analytics.summary.total_applicable.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
              </h3>
              <p className="text-[10px] text-neutral-500 mt-1 font-sans">
                Accumulated school fees assigned
              </p>
            </div>
          </div>

          {/* Card 2: Total Collected */}
          <div className="card flex flex-col justify-between p-5 bg-gradient-to-br from-emerald-50/50 to-neutral-50/20 hover:shadow-md transition">
            <div className="flex justify-between items-start">
              <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">Total Collected</span>
              <div className="p-1.5 bg-emerald-50 text-emerald-600 rounded-lg">
                <TrendingUp className="h-4 w-4" />
              </div>
            </div>
            <div className="mt-4">
              <h3 className="text-2xl font-extrabold text-neutral-900 font-display">
                ₹{analytics.summary.total_collected.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
              </h3>
              <p className="text-[10px] text-neutral-500 mt-1 font-sans">
                Net credited to school account
              </p>
            </div>
          </div>

          {/* Card 3: Total Outstanding */}
          <div className="card flex flex-col justify-between p-5 bg-gradient-to-br from-rose-50/50 to-neutral-50/20 hover:shadow-md transition">
            <div className="flex justify-between items-start">
              <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">Outstanding Dues</span>
              <div className="p-1.5 bg-rose-50 text-rose-600 rounded-lg">
                <AlertCircle className="h-4 w-4" />
              </div>
            </div>
            <div className="mt-4">
              <h3 className="text-2xl font-extrabold text-rose-600 font-display">
                ₹{analytics.summary.total_outstanding.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
              </h3>
              <p className="text-[10px] text-neutral-500 mt-1 font-sans">
                Unpaid student fee balances
              </p>
            </div>
          </div>

          {/* Card 4: Collection Rate */}
          <div className="card flex flex-col justify-between p-5 hover:shadow-md transition">
            <div className="flex justify-between items-start">
              <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">Collection Progress</span>
              <div className="p-1.5 bg-amber-50 text-amber-600 rounded-lg">
                <BarChart2 className="h-4 w-4" />
              </div>
            </div>
            <div className="mt-4 space-y-2">
              <h3 className="text-2xl font-extrabold text-neutral-900 font-display">
                {analytics.summary.collection_rate}%
              </h3>
              {/* Progress Bar */}
              <div className="w-full bg-neutral-100 rounded-full h-2">
                <div
                  className="bg-emerald-500 h-2 rounded-full transition-all duration-500"
                  style={{ width: `${analytics.summary.collection_rate}%` }}
                ></div>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {/* Visual Analytics Row */}
      {!loadingAnalytics && analytics && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Monthly Collections Trend */}
          <div className="card p-5 lg:col-span-2 space-y-4">
            <div>
              <h4 className="text-sm font-bold text-neutral-800 font-display">Monthly Collection Revenue Trend</h4>
              <p className="text-xs text-neutral-400 mt-0.5">Summary of payment transactions credited over time</p>
            </div>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                  data={analytics.monthly_collections}
                  margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                >
                  <defs>
                    <linearGradient id="colorAmount" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.2}/>
                      <stop offset="95%" stopColor="#3B82F6" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                  <XAxis
                    dataKey="month"
                    stroke="#94A3B8"
                    fontSize={10}
                    tickLine={false}
                  />
                  <YAxis
                    stroke="#94A3B8"
                    fontSize={10}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(val) => `₹${val >= 1000 ? (val / 1000).toFixed(0) + 'k' : val}`}
                  />
                  <Tooltip
                    contentStyle={{ borderRadius: '8px', border: '1px solid #E2E8F0', fontFamily: 'Inter' }}
                    formatter={(value) => [`₹${Number(value || 0).toLocaleString('en-IN')}`, 'Amount Collected']}
                  />
                  <Area
                    type="monotone"
                    dataKey="amount"
                    stroke="#3B82F6"
                    strokeWidth={2.5}
                    fillOpacity={1}
                    fill="url(#colorAmount)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Payment Methods Distribution */}
          <div className="card p-5 space-y-4">
            <div>
              <h4 className="text-sm font-bold text-neutral-800 font-display">Payment Mode Breakdown</h4>
              <p className="text-xs text-neutral-400 mt-0.5">Share of cash, card, bank, and UPI channels</p>
            </div>
            <div className="h-56 relative flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={75}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {pieData.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={PAYMENT_MODE_COLORS[entry.name] || PAYMENT_MODE_COLORS.UNKNOWN}
                      />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ borderRadius: '8px', border: '1px solid #E2E8F0', fontFamily: 'Inter' }}
                    formatter={(value) => [`₹${Number(value || 0).toLocaleString('en-IN')}`, 'Revenue']}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute flex flex-col items-center justify-center pointer-events-none">
                <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">Total</span>
                <span className="text-lg font-bold text-neutral-900 font-display">
                  ₹{analytics.summary.total_collected.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                </span>
              </div>
            </div>
            {/* Legend Indicators */}
            <div className="grid grid-cols-2 gap-x-2 gap-y-1.5 pt-2 border-t border-neutral-100">
              {pieData.map((item, i) => (
                <div key={i} className="flex items-center gap-1.5 text-xs text-neutral-600">
                  <span
                    className="h-2.5 w-2.5 rounded-full shrink-0"
                    style={{ backgroundColor: PAYMENT_MODE_COLORS[item.name] || PAYMENT_MODE_COLORS.UNKNOWN }}
                  ></span>
                  <span className="truncate">{item.name} ({item.count})</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Class Section Performances & Details */}
      {!loadingAnalytics && analytics && (
        <div className="card p-5 space-y-4">
          <div>
            <h4 className="text-sm font-bold text-neutral-800 font-display">Class-wise Collection Analysis</h4>
            <p className="text-xs text-neutral-400 mt-0.5">Financial dues progress grouped by class roster sections</p>
          </div>
          <div className="overflow-x-auto border border-neutral-200 rounded-xl">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-neutral-50 text-xs font-bold border-b border-neutral-200 text-neutral-600">
                  <th className="p-3">Class Section</th>
                  <th className="p-3 text-right">Expected Dues</th>
                  <th className="p-3 text-right">Collected</th>
                  <th className="p-3 text-right">Discounts</th>
                  <th className="p-3 text-right">Outstanding Balance</th>
                  <th className="p-3 text-center w-1/4">Collection Rate</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-150 text-sm">
                {analytics.class_collections.map((c, idx) => (
                  <tr key={idx} className="hover:bg-neutral-50/50">
                    <td className="p-3 font-semibold text-neutral-900">
                      {c.class_name} - {c.section}
                    </td>
                    <td className="p-3 text-right font-medium text-neutral-700">
                      ₹{c.expected.toLocaleString('en-IN')}
                    </td>
                    <td className="p-3 text-right font-semibold text-emerald-600">
                      ₹{c.collected.toLocaleString('en-IN')}
                    </td>
                    <td className="p-3 text-right text-neutral-500">
                      ₹{c.discount.toLocaleString('en-IN')}
                    </td>
                    <td className="p-3 text-right font-bold text-rose-600">
                      ₹{c.outstanding.toLocaleString('en-IN')}
                    </td>
                    <td className="p-3">
                      <div className="flex items-center gap-2 justify-center">
                        <span className="text-xs font-bold text-neutral-600 w-10 text-right">{c.collection_rate}%</span>
                        <div className="w-24 bg-neutral-100 rounded-full h-1.5 shrink-0">
                          <div
                            className={`h-1.5 rounded-full ${
                              c.collection_rate >= 80 ? 'bg-emerald-500' : c.collection_rate >= 50 ? 'bg-amber-500' : 'bg-red-500'
                            }`}
                            style={{ width: `${c.collection_rate}%` }}
                          ></div>
                        </div>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Global Transaction Ledger */}
      <div className="card p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h4 className="text-sm font-bold text-neutral-800 font-display">Transaction Receipts History Ledger</h4>
            <p className="text-xs text-neutral-400 mt-0.5">Chronological record of school payments and receipt logs</p>
          </div>
          
          {/* Filters Bar */}
          <div className="flex flex-col sm:flex-row items-center gap-2">
            {/* Search Input */}
            <div className="relative w-full sm:w-60">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-neutral-400" />
              <input
                type="text"
                placeholder="Search Receipt, Student..."
                value={searchVal}
                onChange={(e) => setSearchVal(e.target.value)}
                className="input-field pl-9 py-1.5 text-xs"
              />
            </div>

            {/* Payment Mode Selector */}
            <div className="relative w-full sm:w-40">
              <Filter className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-neutral-400" />
              <select
                value={modeFilter}
                onChange={(e) => {
                  setModeFilter(e.target.value);
                  setPage(1);
                }}
                className="input-field pl-9 pr-6 py-1.5 text-xs appearance-none bg-none font-semibold text-neutral-600"
              >
                <option value="">All Payment Modes</option>
                <option value="cash">CASH</option>
                <option value="upi">UPI</option>
                <option value="card">CARD</option>
                <option value="bank_transfer">BANK TRANSFER</option>
              </select>
            </div>
          </div>
        </div>

        {/* Ledger Table */}
        {loadingLedger ? (
          <div className="flex justify-center items-center py-20">
            <Loader2 className="h-6 w-6 text-primary animate-spin" />
          </div>
        ) : !ledger || ledger.length === 0 ? (
          <div className="text-center py-12 border border-dashed border-neutral-200 rounded-xl bg-neutral-50/50">
            <CreditCard className="h-8 w-8 text-neutral-300 mx-auto mb-2" />
            <p className="text-sm font-semibold text-neutral-600 font-display">No transaction records found</p>
            <p className="text-xs text-neutral-400 mt-1">Try modifying your search or payment mode filters</p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="overflow-x-auto border border-neutral-200 rounded-xl">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-neutral-50 text-xs font-bold border-b border-neutral-200 text-neutral-600">
                    <th className="p-3">Receipt Number</th>
                    <th className="p-3">Student Name</th>
                    <th className="p-3">Admission No</th>
                    <th className="p-3">Class</th>
                    <th className="p-3 text-right">Amount Paid</th>
                    <th className="p-3 text-center">Payment Date</th>
                    <th className="p-3 text-center">Mode</th>
                    <th className="p-3 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-150 text-sm">
                  {ledger.map((txn) => (
                    <tr key={txn.id} className="hover:bg-neutral-50/50 transition">
                      <td className="p-3 font-mono text-xs font-bold text-neutral-900">{txn.receipt_number}</td>
                      <td className="p-3 font-semibold text-neutral-800">
                        {txn.student_first_name} {txn.student_last_name}
                      </td>
                      <td className="p-3 text-neutral-500 font-mono text-xs">{txn.student_admission_number}</td>
                      <td className="p-3 text-neutral-600">
                        {txn.class_name} - {txn.class_section}
                      </td>
                      <td className="p-3 text-right font-bold text-neutral-800">
                        ₹{txn.amount_paid.toLocaleString('en-IN')}
                      </td>
                      <td className="p-3 text-center text-neutral-500 text-xs">
                        {new Date(txn.payment_date).toLocaleDateString('en-IN', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric'
                        })}
                      </td>
                      <td className="p-3 text-center">
                        <span
                          className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border"
                          style={{
                            backgroundColor: `${PAYMENT_MODE_COLORS[txn.payment_mode.toUpperCase()] || PAYMENT_MODE_COLORS.UNKNOWN}15`,
                            color: PAYMENT_MODE_COLORS[txn.payment_mode.toUpperCase()] || PAYMENT_MODE_COLORS.UNKNOWN,
                            borderColor: `${PAYMENT_MODE_COLORS[txn.payment_mode.toUpperCase()] || PAYMENT_MODE_COLORS.UNKNOWN}30`
                          }}
                        >
                          {txn.payment_mode}
                        </span>
                      </td>
                      <td className="p-3 text-center">
                        <a
                          href={feesApi.getReceiptUrl(txn.id)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center justify-center p-1.5 bg-neutral-50 border border-neutral-250 text-neutral-600 hover:text-primary hover:border-primary-light rounded-lg transition"
                          title="Download Invoice Receipt PDF"
                        >
                          <FileDown className="h-4 w-4" />
                        </a>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            {pagination && pagination.pages > 1 && (
              <div className="flex items-center justify-between pt-2">
                <span className="text-xs text-neutral-500 font-sans">
                  Showing Page <strong className="text-neutral-800">{page}</strong> of <strong className="text-neutral-800">{pagination.pages}</strong> ({pagination.total} records total)
                </span>
                
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                    disabled={page === 1 || fetchingLedger}
                    className="p-1.5 border border-neutral-250 hover:bg-neutral-50 disabled:opacity-50 rounded-lg text-neutral-600 transition"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => setPage(p => Math.min(pagination.pages, p + 1))}
                    disabled={page === pagination.pages || fetchingLedger}
                    className="p-1.5 border border-neutral-250 hover:bg-neutral-50 disabled:opacity-50 rounded-lg text-neutral-600 transition"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
