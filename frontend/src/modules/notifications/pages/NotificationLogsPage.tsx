import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  MessageSquare,
  Loader2,
  ChevronLeft,
  ChevronRight,
  AlertTriangle,
  XCircle,
  CheckCircle2,
  RefreshCcw,
} from 'lucide-react';

import { notificationsApi } from '../api/notificationsApi';
import { CustomSelect } from '../../../components/CustomSelect';

export function NotificationLogsPage() {
  const [page, setPage] = useState<number>(1);
  const [statusFilter, setStatusFilter] = useState<string>('');
  const perPage = 20;

  // Query
  const { data: logsRes, isLoading, error, refetch, isFetching } = useQuery({
    queryKey: ['notification-logs', page, statusFilter],
    queryFn: () => notificationsApi.listLogs(page, perPage, statusFilter || undefined),
  });

  const logs = logsRes?.data || [];
  const pagination = logsRes?.pagination || { page: 1, per_page: 20, total: 0, pages: 1 };

  const handleStatusChange = (val: string) => {
    setStatusFilter(val);
    setPage(1); // Reset page on filter change
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'sent':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <CheckCircle2 className="h-3 w-3" />
            Sent
          </span>
        );
      case 'failed':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-red-50 text-red-700 border border-red-200">
            <XCircle className="h-3 w-3" />
            Failed
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200 animate-pulse">
            <AlertTriangle className="h-3 w-3 animate-spin" />
            Pending
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-neutral-200 pb-4">
        <div>
          <h2 className="text-2xl font-bold font-display text-neutral-900 flex items-center gap-2">
            <MessageSquare className="h-6 w-6 text-primary" />
            Delivery Ledger & Logs
          </h2>
          <p className="text-sm text-neutral-500 font-sans">
            Track and monitor the real-time delivery status of all WhatsApp and notification broadcasts.
          </p>
        </div>
        
        {/* Actions */}
        <button
          onClick={() => refetch()}
          disabled={isFetching}
          className="btn-secondary text-xs py-2 px-3.5 flex items-center gap-1.5 self-start md:self-auto"
        >
          <RefreshCcw className={`h-3.5 w-3.5 ${isFetching ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Filter panel */}
      <div className="card py-4 flex flex-col sm:flex-row items-center gap-4">
        <div className="w-full sm:w-60">
          <label className="text-[10px] font-bold uppercase text-neutral-500 block mb-1">Filter by Status</label>
          <CustomSelect
            value={statusFilter}
            onChange={handleStatusChange}
            placeholder="All Delivery Statuses"
            options={[
              { value: '', label: 'All Statuses' },
              { value: 'sent', label: 'Sent' },
              { value: 'failed', label: 'Failed' },
              { value: 'pending', label: 'Pending' },
            ]}
          />
        </div>
        <div className="text-xs text-neutral-400 sm:ml-auto self-end sm:self-center">
          Showing <span className="font-semibold text-neutral-700">{logs.length}</span> logs (Total: {pagination.total})
        </div>
      </div>

      {/* Table List */}
      <div className="card p-0 overflow-hidden">
        {isLoading ? (
          <div className="flex justify-center items-center py-20">
            <Loader2 className="h-8 w-8 text-primary animate-spin" />
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center py-16 text-red-500 gap-2">
            <AlertTriangle className="h-8 w-8" />
            <p className="text-sm font-semibold">Failed to load dispatch logs.</p>
          </div>
        ) : logs.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-neutral-400 gap-2">
            <MessageSquare className="h-10 w-10 text-neutral-200" />
            <p className="text-xs">No notifications dispatch records found matching selection.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-neutral-50 border-b border-neutral-100">
                  <th className="px-5 py-3.5 text-[10px] font-bold uppercase text-neutral-500">Recipient</th>
                  <th className="px-5 py-3.5 text-[10px] font-bold uppercase text-neutral-500">Phone</th>
                  <th className="px-5 py-3.5 text-[10px] font-bold uppercase text-neutral-500 w-1/3">Message Body</th>
                  <th className="px-5 py-3.5 text-[10px] font-bold uppercase text-neutral-500">Sender</th>
                  <th className="px-5 py-3.5 text-[10px] font-bold uppercase text-neutral-500">Date/Time</th>
                  <th className="px-5 py-3.5 text-[10px] font-bold uppercase text-neutral-500">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-150">
                {logs.map((log) => (
                  <tr key={log.id} className="hover:bg-neutral-50/50 transition">
                    <td className="px-5 py-4 text-xs font-semibold text-neutral-900">{log.recipient_name}</td>
                    <td className="px-5 py-4 text-xs text-neutral-600 font-mono">{log.recipient_phone}</td>
                    <td className="px-5 py-4 text-xs text-neutral-700 font-sans leading-relaxed">
                      <div>
                        {log.message_body}
                        {log.error_message && (
                          <div className="mt-1 text-[10px] text-red-600 font-sans font-medium bg-red-50/50 p-1.5 rounded border border-red-100 flex items-start gap-1">
                            <XCircle className="h-3 w-3 shrink-0 mt-0.5" />
                            <span>{log.error_message}</span>
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-5 py-4 text-xs text-neutral-500 font-medium">
                      {log.sender_name || 'System Auto'}
                    </td>
                    <td className="px-5 py-4 text-xs text-neutral-500">
                      {new Date(log.created_at).toLocaleString('en-IN', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                        hour12: true
                      })}
                    </td>
                    <td className="px-5 py-4 text-xs">
                      {getStatusBadge(log.status)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pagination controls */}
      {pagination.pages > 1 && (
        <div className="flex items-center justify-between border-t border-neutral-200 pt-4">
          <button
            onClick={() => setPage(p => Math.max(p - 1, 1))}
            disabled={page === 1}
            className="btn-secondary py-1.5 px-3 text-xs flex items-center gap-1 disabled:opacity-50"
          >
            <ChevronLeft className="h-4 w-4" />
            Previous
          </button>
          
          <span className="text-xs text-neutral-500 font-medium">
            Page <span className="font-semibold text-neutral-900">{page}</span> of {pagination.pages}
          </span>

          <button
            onClick={() => setPage(p => Math.min(p + 1, pagination.pages))}
            disabled={page === pagination.pages}
            className="btn-secondary py-1.5 px-3 text-xs flex items-center gap-1 disabled:opacity-50"
          >
            Next
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      )}
    </div>
  );
}
