import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { 
  Plus, 
  Search, 
  UserPlus, 
  Eye, 
  Trash2, 
  Loader2,
  AlertCircle
} from 'lucide-react';

import { studentApi, StudentFilters } from '../api/studentApi';
import { CustomSelect } from '../../../components/CustomSelect';
import { confirm } from '../../../stores/useConfirmStore';

interface StudentListPageProps {
  onAdmitClick: () => void;
  onViewDetails: (id: string) => void;
}

export function StudentListPage({ onAdmitClick, onViewDetails }: StudentListPageProps) {
  const [filters, setFilters] = useState<StudentFilters>({
    page: 1,
    per_page: 10,
    search: '',
  });

  // Query student list from API
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['students', filters],
    queryFn: () => studentApi.list(filters),
    staleTime: 15000,
  });

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFilters(prev => ({
      ...prev,
      search: e.target.value,
      page: 1 // Reset to first page
    }));
  };

  const handlePageChange = (newPage: number) => {
    setFilters(prev => ({ ...prev, page: newPage }));
  };

  const handleDelete = async (id: string) => {
    if (await confirm('Are you sure you want to delete this student record?', { type: 'danger', title: 'Delete Student Record' })) {
      try {
        await studentApi.delete(id);
        refetch();
      } catch (err) {
        console.error(err);
        alert('Failed to delete student record');
      }
    }
  };


  const studentsList = data?.data || [];
  const pagination = data?.pagination || { page: 1, per_page: 10, total: 0, pages: 1 };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="page-header">
        <div>
          <h2 className="text-2xl font-bold font-display text-neutral-900">Student Directory</h2>
          <p className="text-sm text-neutral-500">Manage student records and admissions.</p>
        </div>
        <button
          onClick={onAdmitClick}
          className="btn-primary flex items-center gap-2"
        >
          <Plus className="h-4 w-4" />
          Admit Student
        </button>
      </div>

      {/* Filters & Search Bar */}
      <div className="card flex flex-col md:flex-row md:items-center justify-between gap-4 py-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-3 h-4.5 w-4.5 text-neutral-400" />
          <input
            type="text"
            placeholder="Search by name or admission number..."
            value={filters.search}
            onChange={handleSearchChange}
            className="input-field pl-10"
          />
        </div>
        
        <div className="flex items-center gap-3 min-w-[160px]">
          <CustomSelect
            value={filters.status || ''}
            onChange={(val) => setFilters(p => ({ ...p, status: val || undefined, page: 1 }))}
            options={[
              { value: '', label: 'All Statuses' },
              { value: 'active', label: 'Active' },
              { value: 'inactive', label: 'Inactive' },
              { value: 'transferred', label: 'Transferred' },
              { value: 'alumni', label: 'Alumni' },
            ]}
          />
        </div>
      </div>

      {/* Table Section */}
      <div className="card p-0 overflow-hidden">
        {error && (
          <div className="bg-red-50 border-b border-red-200 text-red-700 px-6 py-4 flex items-center gap-3">
            <AlertCircle className="h-5 w-5 text-red-500" />
            <span>Failed to load student directory records. Is backend server connected?</span>
          </div>
        )}

        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20 space-y-3">
            <Loader2 className="h-10 w-10 text-primary animate-spin" />
            <span className="text-sm text-neutral-500 font-medium animate-pulse">Loading directory...</span>
          </div>
        ) : studentsList.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center space-y-4">
            <div className="p-4 bg-slate-100 rounded-full text-neutral-500">
              <UserPlus className="h-10 w-10" />
            </div>
            <div className="space-y-1">
              <h4 className="font-semibold text-neutral-800 text-lg">No Students Found</h4>
              <p className="text-sm text-neutral-550 max-w-sm">
                No active student records match your search or filter settings. Click Admit Student to register.
              </p>
            </div>
            <button
              onClick={onAdmitClick}
              className="btn-secondary"
            >
              Admit New Student
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-neutral-50 border-b border-neutral-200 text-xs font-semibold text-neutral-500 uppercase tracking-wider">
                  <th className="px-6 py-4">Admission No</th>
                  <th className="px-6 py-4">Student Name</th>
                  <th className="px-6 py-4">Gender</th>
                  <th className="px-6 py-4">Roll No</th>
                  <th className="px-6 py-4">Admission Date</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-150 text-sm">
                {studentsList.map((student: any) => (
                  <tr key={student.id} className="hover:bg-neutral-50/50 transition">
                    <td className="px-6 py-4 font-mono font-medium text-neutral-700">
                      {student.admission_number}
                    </td>
                    <td className="px-6 py-4 font-semibold text-neutral-900">
                      {student.first_name} {student.last_name}
                    </td>
                    <td className="px-6 py-4 text-neutral-600">
                      {student.gender === 'M' ? 'Male' : student.gender === 'F' ? 'Female' : 'Other'}
                    </td>
                    <td className="px-6 py-4 text-neutral-600">
                      {student.roll_number ?? '-'}
                    </td>
                    <td className="px-6 py-4 text-neutral-600">
                      {new Date(student.admission_date).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold uppercase ${
                        student.status === 'active' 
                          ? 'bg-green-50 text-green-700 border border-green-200' 
                          : 'bg-neutral-100 text-neutral-700 border border-neutral-200'
                      }`}>
                        {student.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right space-x-2">
                      <button
                        onClick={() => onViewDetails(student.id)}
                        className="text-neutral-500 hover:text-primary p-1.5 hover:bg-neutral-100 rounded-lg transition"
                        title="View Profile"
                      >
                        <Eye className="h-4.5 w-4.5" />
                      </button>
                      <button
                        onClick={() => handleDelete(student.id)}
                        className="text-neutral-500 hover:text-danger p-1.5 hover:bg-neutral-100 rounded-lg transition"
                        title="Delete Record"
                      >
                        <Trash2 className="h-4.5 w-4.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Footer */}
        {studentsList.length > 0 && (
          <div className="flex items-center justify-between px-6 py-4 border-t border-neutral-200 bg-neutral-50/50">
            <span className="text-xs text-neutral-500 font-medium">
              Showing Page {pagination.page} of {pagination.pages} ({pagination.total} records total)
            </span>
            <div className="flex gap-2">
              <button
                disabled={pagination.page <= 1}
                onClick={() => handlePageChange(pagination.page - 1)}
                className="btn-secondary py-1 px-3 text-xs disabled:opacity-50"
              >
                Previous
              </button>
              <button
                disabled={pagination.page >= pagination.pages}
                onClick={() => handlePageChange(pagination.page + 1)}
                className="btn-secondary py-1 px-3 text-xs disabled:opacity-50"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
