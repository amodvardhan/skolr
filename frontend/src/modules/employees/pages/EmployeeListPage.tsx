import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { 
  Plus, 
  Search, 
  Eye, 
  Trash2, 
  Loader2,
  AlertCircle,
  Users,
  Briefcase
} from 'lucide-react';

import { employeesApi, EmployeeFilters } from '../api/employeesApi';
import { CustomSelect } from '../../../components/CustomSelect';
import { confirm } from '../../../stores/useConfirmStore';

interface EmployeeListPageProps {
  onAddClick: () => void;
  onViewDetails: (id: string) => void;
}

export function EmployeeListPage({ onAddClick, onViewDetails }: EmployeeListPageProps) {
  const [filters, setFilters] = useState<EmployeeFilters>({
    page: 1,
    per_page: 10,
    search: '',
  });

  // Query employee list from API
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['employees', filters],
    queryFn: () => employeesApi.list(filters),
    staleTime: 15000,
  });

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFilters(prev => ({
      ...prev,
      search: e.target.value,
      page: 1
    }));
  };

  const handlePageChange = (newPage: number) => {
    setFilters(prev => ({ ...prev, page: newPage }));
  };

  const handleDelete = async (id: string) => {
    if (await confirm('Are you sure you want to deactivate and remove this employee from active rosters?', { type: 'danger', title: 'Deactivate Employee Record' })) {
      try {
        await employeesApi.delete(id);
        alert('Employee record deactivated.');
        refetch();
      } catch (err) {
        console.error(err);
        alert('Failed to delete employee record');
      }
    }
  };


  const employeesList = data?.data || [];
  const pagination = data?.pagination || { page: 1, per_page: 10, total: 0, pages: 1 };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="page-header">
        <div>
          <h2 className="text-2xl font-bold font-display text-neutral-900">Staff & Employee Directory</h2>
          <p className="text-sm text-neutral-500 font-sans">Manage profiles, departments, system roles, and login credentials.</p>
        </div>
        <button
          onClick={onAddClick}
          className="btn-primary flex items-center gap-2"
        >
          <Plus className="h-4 w-4" />
          Onboard Employee
        </button>
      </div>

      {/* Roster Aggregate Totals */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div className="card flex items-center gap-4 bg-gradient-to-br from-blue-500/5 to-blue-600/5 hover:border-blue-500/20 transition duration-200">
          <div className="p-3.5 bg-blue-500/10 rounded-xl text-blue-600 shrink-0">
            <Users className="h-6 w-6" />
          </div>
          <div>
            <div className="text-2xl font-bold text-neutral-900 tracking-tight">{pagination.total}</div>
            <div className="text-xs font-semibold text-neutral-500 uppercase tracking-wide">Total Registered Staff</div>
          </div>
        </div>

        <div className="card flex items-center gap-4 bg-gradient-to-br from-purple-500/5 to-purple-600/5 hover:border-purple-500/20 transition duration-200">
          <div className="p-3.5 bg-purple-500/10 rounded-xl text-purple-600 shrink-0">
            <Briefcase className="h-6 w-6" />
          </div>
          <div>
            <div className="text-2xl font-bold text-neutral-900 tracking-tight">
              {employeesList.filter(e => e.designation.toLowerCase() === 'teacher').length} Active
            </div>
            <div className="text-xs font-semibold text-neutral-500 uppercase tracking-wide">Teaching Faculty</div>
          </div>
        </div>
      </div>

      {/* Filters & Search Bar */}
      <div className="card flex flex-col md:flex-row md:items-center justify-between gap-4 py-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-3 h-4.5 w-4.5 text-neutral-450" />
          <input
            type="text"
            placeholder="Search by code, name, or email..."
            value={filters.search}
            onChange={handleSearchChange}
            className="input-field pl-10"
          />
        </div>
        
        <div className="flex flex-col sm:flex-row gap-3 min-w-[320px]">
          <CustomSelect
            value={filters.department || ''}
            onChange={(val) => setFilters(p => ({ ...p, department: val || undefined, page: 1 }))}
            options={[
              { value: '', label: 'All Departments' },
              { value: 'Academics', label: 'Academics' },
              { value: 'Administration', label: 'Administration' },
              { value: 'Finance', label: 'Finance' },
              { value: 'Support', label: 'Support Services' },
            ]}
          />
          <CustomSelect
            value={filters.status || ''}
            onChange={(val) => setFilters(p => ({ ...p, status: val || undefined, page: 1 }))}
            options={[
              { value: '', label: 'All Statuses' },
              { value: 'active', label: 'Active' },
              { value: 'inactive', label: 'Inactive' },
            ]}
          />
        </div>
      </div>

      {/* Roster Table Section */}
      <div className="card p-0 overflow-hidden">
        {error && (
          <div className="bg-red-50 border-b border-red-200 text-red-700 px-6 py-4 flex items-center gap-3">
            <AlertCircle className="h-5 w-5 text-red-500" />
            <span>Failed to load employee records. Is backend server connected?</span>
          </div>
        )}

        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20 space-y-3">
            <Loader2 className="h-10 w-10 text-primary animate-spin" />
            <span className="text-sm text-neutral-500 font-medium animate-pulse">Loading roster directory...</span>
          </div>
        ) : employeesList.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center space-y-4">
            <div className="p-4 bg-slate-100 rounded-full text-neutral-500">
              <Users className="h-10 w-10" />
            </div>
            <div className="space-y-1">
              <h4 className="font-semibold text-neutral-800 text-lg">No Employees Registered</h4>
              <p className="text-sm text-neutral-550 max-w-sm">
                No active employee records match your filters. Click Onboard Employee to register a team member.
              </p>
            </div>
            <button
              onClick={onAddClick}
              className="btn-secondary"
            >
              Onboard First Employee
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-neutral-50 border-b border-neutral-200 text-xs font-semibold text-neutral-500 uppercase tracking-wider">
                  <th className="px-6 py-4">Employee Code</th>
                  <th className="px-6 py-4">Full Name</th>
                  <th className="px-6 py-4">Department</th>
                  <th className="px-6 py-4">Designation</th>
                  <th className="px-6 py-4">Contact info</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4">Credentials Link</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-150 text-sm">
                {employeesList.map((employee: any) => (
                  <tr key={employee.id} className="hover:bg-neutral-50/50 transition">
                    <td className="px-6 py-4 font-mono font-medium text-neutral-700">
                      {employee.employee_code}
                    </td>
                    <td className="px-6 py-4 font-semibold text-neutral-900">
                      {employee.first_name} {employee.last_name}
                    </td>
                    <td className="px-6 py-4 text-neutral-600 font-semibold text-xs">
                      {employee.department}
                    </td>
                    <td className="px-6 py-4 text-neutral-600">
                      {employee.designation}
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-neutral-800">{employee.email}</div>
                      <div className="text-xs text-neutral-500 font-mono">{employee.mobile}</div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold uppercase ${
                        employee.status === 'active' 
                          ? 'bg-green-50 text-green-700 border border-green-200' 
                          : 'bg-neutral-100 text-neutral-700 border border-neutral-200'
                      }`}>
                        {employee.status}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      {employee.user_id ? (
                        <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-800 px-2 py-0.5 rounded-md text-[10px] font-bold border border-emerald-200">
                          Active Login
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 bg-amber-50 text-amber-800 px-2 py-0.5 rounded-md text-[10px] font-bold border border-amber-200">
                          Unlinked
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right space-x-2">
                      <button
                        onClick={() => onViewDetails(employee.id)}
                        className="text-neutral-500 hover:text-primary p-1.5 hover:bg-neutral-100 rounded-lg transition"
                        title="View Profile"
                      >
                        <Eye className="h-4.5 w-4.5" />
                      </button>
                      <button
                        onClick={() => handleDelete(employee.id)}
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
        {employeesList.length > 0 && (
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
