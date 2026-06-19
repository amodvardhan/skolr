import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  Plus, 
  Trash2, 
  Loader2, 
  Layers, 
  PlusCircle,
  X
} from 'lucide-react';
import { feesApi, FeeHeadCreateData, FeeStructureCreateData, FeeStructureItemCreateData } from '../api/feesApi';
import { studentApi } from '../../students/api/studentApi';

export function FeeStructurePage() {
  const queryClient = useQueryClient();
  const [activeSubTab, setActiveSubTab] = useState<'structures' | 'heads'>('structures');
  
  // Create Fee Head Dialog State
  const [showHeadModal, setShowHeadModal] = useState(false);
  const [newHeadName, setNewHeadName] = useState('');
  const [newHeadDesc, setNewHeadDesc] = useState('');

  // Create Fee Structure Form State
  const [showStructureForm, setShowStructureForm] = useState(false);
  const [structureName, setStructureName] = useState('');
  const [selectedAYId, setSelectedAYId] = useState('');
  const [structureItems, setStructureItems] = useState<FeeStructureItemCreateData[]>([
    { fee_head_id: '', amount: 0, frequency: 'monthly' }
  ]);

  // Queries
  const { data: feeHeads = [], isLoading: isLoadingHeads } = useQuery({
    queryKey: ['fee-heads'],
    queryFn: feesApi.getHeads,
  });

  const { data: structures = [], isLoading: isLoadingStructures } = useQuery({
    queryKey: ['fee-structures'],
    queryFn: feesApi.getStructures,
  });

  const { data: academicYears = [], isLoading: isLoadingAY } = useQuery({
    queryKey: ['academic-years'],
    queryFn: studentApi.academicYears,
  });

  // Automatically select default academic year
  if (academicYears.length > 0 && !selectedAYId) {
    const current = academicYears.find((ay: any) => ay.is_current);
    setSelectedAYId(current?.id || academicYears[0].id);
  }

  // Mutations
  const createHeadMutation = useMutation({
    mutationFn: (data: FeeHeadCreateData) => feesApi.createHead(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fee-heads'] });
      setShowHeadModal(false);
      setNewHeadName('');
      setNewHeadDesc('');
      alert('Fee head created successfully!');
    },
    onError: () => alert('Failed to create fee head.')
  });

  const createStructureMutation = useMutation({
    mutationFn: (data: FeeStructureCreateData) => feesApi.createStructure(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fee-structures'] });
      setShowStructureForm(false);
      setStructureName('');
      setStructureItems([{ fee_head_id: '', amount: 0, frequency: 'monthly' }]);
      alert('Fee structure created successfully!');
    },
    onError: (err: any) => {
      const msg = err.response?.data?.detail || 'Failed to create fee structure';
      alert(msg);
    }
  });

  const handleAddHeadSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newHeadName) return;
    createHeadMutation.mutate({ name: newHeadName, description: newHeadDesc || undefined });
  };

  const handleAddStructureItem = () => {
    setStructureItems(prev => [...prev, { fee_head_id: '', amount: 0, frequency: 'monthly' }]);
  };

  const handleRemoveStructureItem = (index: number) => {
    setStructureItems(prev => prev.filter((_, i) => i !== index));
  };

  const handleStructureItemChange = (index: number, field: keyof FeeStructureItemCreateData, value: any) => {
    const updated = [...structureItems];
    updated[index] = {
      ...updated[index],
      [field]: field === 'amount' ? parseFloat(value) || 0 : value
    };
    setStructureItems(updated);
  };

  const handleStructureSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!structureName || !selectedAYId) {
      alert('Please fill out the structure name and select academic year.');
      return;
    }
    
    // Validate items
    const invalidItem = structureItems.find(item => !item.fee_head_id || item.amount <= 0);
    if (invalidItem) {
      alert('Please select a fee head and enter a valid amount greater than 0 for all items.');
      return;
    }

    createStructureMutation.mutate({
      name: structureName,
      academic_year_id: selectedAYId,
      items: structureItems
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="page-header">
        <div>
          <h2 className="text-2xl font-bold font-display text-neutral-900">Fees Configurator</h2>
          <p className="text-sm text-neutral-500">Define fee categories and custom payment structures.</p>
        </div>
        <div className="flex gap-2">
          {activeSubTab === 'structures' ? (
            <button
              onClick={() => setShowStructureForm(true)}
              className="btn-primary flex items-center gap-2"
            >
              <Plus className="h-4 w-4" /> Create Structure
            </button>
          ) : (
            <button
              onClick={() => setShowHeadModal(true)}
              className="btn-primary flex items-center gap-2"
            >
              <Plus className="h-4 w-4" /> Create Fee Head
            </button>
          )}
        </div>
      </div>

      {/* Tabs Switcher */}
      <div className="flex border-b border-neutral-200 gap-6">
        <button
          onClick={() => {
            setActiveSubTab('structures');
            setShowStructureForm(false);
          }}
          className={`pb-3 text-sm font-semibold border-b-2 px-1 transition duration-150 ${
            activeSubTab === 'structures'
              ? 'border-primary text-primary'
              : 'border-transparent text-neutral-500 hover:text-neutral-900'
          }`}
        >
          Fee Structures
        </button>
        <button
          onClick={() => {
            setActiveSubTab('heads');
            setShowStructureForm(false);
          }}
          className={`pb-3 text-sm font-semibold border-b-2 px-1 transition duration-150 ${
            activeSubTab === 'heads'
              ? 'border-primary text-primary'
              : 'border-transparent text-neutral-500 hover:text-neutral-900'
          }`}
        >
          Fee Heads (Categories)
        </button>
      </div>

      {/* Fee Structure Form View */}
      {showStructureForm && (
        <div className="card space-y-6">
          <div className="flex items-center justify-between border-b border-neutral-100 pb-3">
            <h3 className="section-title text-base">New Fee Structure Template</h3>
            <button 
              onClick={() => setShowStructureForm(false)}
              className="p-1 hover:bg-neutral-100 rounded-lg text-neutral-550 transition"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <form onSubmit={handleStructureSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold uppercase text-neutral-500 mb-1.5">Structure Name</label>
                <input
                  type="text"
                  placeholder="e.g. Class 5 Standard Annual Dues"
                  value={structureName}
                  onChange={(e) => setStructureName(e.target.value)}
                  className="input-field"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase text-neutral-500 mb-1.5">Academic Year</label>
                <select
                  value={selectedAYId}
                  onChange={(e) => setSelectedAYId(e.target.value)}
                  disabled={isLoadingAY}
                  className="input-field bg-white"
                  required
                >
                  {isLoadingAY ? (
                    <option>Loading years...</option>
                  ) : (
                    academicYears.map((ay: any) => (
                      <option key={ay.id} value={ay.id}>
                        {ay.name} {ay.is_current ? '(Current)' : ''}
                      </option>
                    ))
                  )}
                </select>
              </div>
            </div>

            {/* Structure items list */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase text-neutral-500">Applicable Fee Items</span>
                <button
                  type="button"
                  onClick={handleAddStructureItem}
                  className="text-xs text-primary hover:text-primary-light font-semibold flex items-center gap-1"
                >
                  <PlusCircle className="h-3.5 w-3.5" /> Add Fee Category
                </button>
              </div>

              <div className="space-y-3.5">
                {structureItems.map((item, index) => (
                  <div key={index} className="flex flex-col sm:flex-row gap-3 items-end sm:items-center bg-neutral-50 p-3 rounded-lg border border-neutral-100 relative">
                    <div className="flex-1 w-full">
                      <label className="block text-[10px] font-bold uppercase text-neutral-400 mb-1">Fee Category</label>
                      <select
                        value={item.fee_head_id}
                        onChange={(e) => handleStructureItemChange(index, 'fee_head_id', e.target.value)}
                        className="input-field bg-white py-1.5"
                        required
                      >
                        <option value="">Select Category</option>
                        {feeHeads.map((fh: any) => (
                          <option key={fh.id} value={fh.id}>
                            {fh.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="w-full sm:w-1/4">
                      <label className="block text-[10px] font-bold uppercase text-neutral-400 mb-1">Amount (₹)</label>
                      <input
                        type="number"
                        min="0"
                        placeholder="Amount"
                        value={item.amount || ''}
                        onChange={(e) => handleStructureItemChange(index, 'amount', e.target.value)}
                        className="input-field py-1.5"
                        required
                      />
                    </div>

                    <div className="w-full sm:w-1/4">
                      <label className="block text-[10px] font-bold uppercase text-neutral-400 mb-1">Billing Frequency</label>
                      <select
                        value={item.frequency}
                        onChange={(e) => handleStructureItemChange(index, 'frequency', e.target.value)}
                        className="input-field bg-white py-1.5"
                        required
                      >
                        <option value="monthly">Monthly</option>
                        <option value="quarterly">Quarterly</option>
                        <option value="yearly">Yearly</option>
                        <option value="one_time">One-time Admission</option>
                      </select>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleRemoveStructureItem(index)}
                      disabled={structureItems.length <= 1}
                      className="p-2 text-neutral-450 hover:text-danger rounded-lg transition shrink-0 disabled:opacity-30"
                      title="Remove category"
                    >
                      <Trash2 className="h-4.5 w-4.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex gap-3 pt-3 justify-end">
              <button
                type="button"
                onClick={() => setShowStructureForm(false)}
                className="btn-secondary"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={createStructureMutation.isPending}
                className="btn-primary flex items-center gap-2"
              >
                {createStructureMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                Save Structure Template
              </button>
            </div>
          </form>
        </div>
      )}

      {/* List Views */}
      {activeSubTab === 'structures' && !showStructureForm && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {isLoadingStructures ? (
            <div className="col-span-full flex flex-col items-center justify-center py-20 space-y-3">
              <Loader2 className="h-10 w-10 text-primary animate-spin" />
              <span className="text-sm text-neutral-500 font-medium">Loading templates...</span>
            </div>
          ) : structures.length === 0 ? (
            <div className="col-span-full card py-16 text-center text-neutral-500 space-y-4">
              <Layers className="h-12 w-12 mx-auto text-neutral-300" />
              <h4 className="font-semibold text-neutral-800 text-lg">No Structures Configured</h4>
              <p className="text-sm text-neutral-550 max-w-sm mx-auto">
                Define standard groups of fees templates that can be easily linked to student billing accounts.
              </p>
              <button
                onClick={() => setShowStructureForm(true)}
                className="btn-secondary"
              >
                Add First Structure Template
              </button>
            </div>
          ) : (
            structures.map((s: any) => {
              const totalSum = s.items.reduce((acc: number, item: any) => acc + item.amount, 0);
              return (
                <div key={s.id} className="card flex flex-col justify-between border-neutral-200/80 shadow-sm hover:shadow-md transition duration-200">
                  <div className="space-y-4">
                    <div className="flex items-start justify-between">
                      <div className="space-y-0.5">
                        <h4 className="font-bold text-neutral-900 text-base">{s.name}</h4>
                        <span className="inline-flex text-[10px] font-bold bg-neutral-100 text-neutral-600 px-2 py-0.5 rounded-full">
                          AY {academicYears.find((ay: any) => ay.id === s.academic_year_id)?.name || '2025-26'}
                        </span>
                      </div>
                      <div className="text-right">
                        <div className="text-lg font-extrabold text-neutral-900">₹{totalSum.toLocaleString()}</div>
                        <div className="text-[10px] text-neutral-450 uppercase font-semibold">Total Dues</div>
                      </div>
                    </div>

                    <div className="border-t border-neutral-100 pt-3">
                      <div className="text-xs font-bold uppercase text-neutral-400 mb-2">Item Breakdown</div>
                      <ul className="space-y-2 max-h-36 overflow-y-auto pr-1">
                        {s.items.map((item: any) => (
                          <li key={item.id} className="flex justify-between items-center text-xs font-medium text-neutral-600 bg-neutral-50 p-1.5 rounded border border-neutral-100/40">
                            <span>{item.fee_head?.name || 'Category'}</span>
                            <span className="font-semibold text-neutral-800">
                              ₹{item.amount.toLocaleString()} <span className="text-[10px] text-neutral-450 font-normal">({item.frequency})</span>
                            </span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {activeSubTab === 'heads' && (
        <div className="card p-0 overflow-hidden">
          {isLoadingHeads ? (
            <div className="flex flex-col items-center justify-center py-20 space-y-3">
              <Loader2 className="h-10 w-10 text-primary animate-spin" />
              <span className="text-sm text-neutral-500 font-medium">Loading categories...</span>
            </div>
          ) : feeHeads.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center space-y-3">
              <Layers className="h-10 w-10 text-neutral-300" />
              <h4 className="font-semibold text-neutral-850">No Dues Categories Defined</h4>
              <p className="text-sm text-neutral-500 max-w-sm">Create individual heads like Tuition, Lab, or Bus Fees first.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-neutral-50 border-b border-neutral-200 text-xs font-semibold text-neutral-500 uppercase tracking-wider">
                    <th className="px-6 py-4 w-1/3">Category Name</th>
                    <th className="px-6 py-4">Description</th>
                    <th className="px-6 py-4 w-1/4">Date Created</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-150 text-sm">
                  {feeHeads.map((fh: any) => (
                    <tr key={fh.id} className="hover:bg-neutral-50/40 transition">
                      <td className="px-6 py-4 font-semibold text-neutral-900">
                        {fh.name}
                      </td>
                      <td className="px-6 py-4 text-neutral-550 font-medium">
                        {fh.description || 'No description provided'}
                      </td>
                      <td className="px-6 py-4 text-neutral-600 font-mono">
                        {new Date(fh.created_at).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Create Fee Head Modal Dialog */}
      {showHeadModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl border border-neutral-100 max-w-md w-full overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="px-6 py-4 border-b border-neutral-100 flex items-center justify-between bg-neutral-50/50">
              <h3 className="font-bold text-neutral-900">Create Fee Head Category</h3>
              <button 
                onClick={() => setShowHeadModal(false)}
                className="p-1 hover:bg-neutral-100 rounded-lg text-neutral-500 transition"
              >
                <X className="h-4.5 w-4.5" />
              </button>
            </div>
            
            <form onSubmit={handleAddHeadSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase text-neutral-500 mb-1.5">Category Name</label>
                <input
                  type="text"
                  placeholder="e.g. Tuition Fee"
                  value={newHeadName}
                  onChange={(e) => setNewHeadName(e.target.value)}
                  className="input-field"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase text-neutral-500 mb-1.5">Description</label>
                <textarea
                  placeholder="e.g. Monthly standard instruction fee charges"
                  value={newHeadDesc}
                  onChange={(e) => setNewHeadDesc(e.target.value)}
                  className="input-field h-20 resize-none"
                />
              </div>

              <div className="flex gap-3 justify-end pt-2">
                <button
                  type="button"
                  onClick={() => setShowHeadModal(false)}
                  className="btn-secondary"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createHeadMutation.isPending}
                  className="btn-primary flex items-center gap-2"
                >
                  {createHeadMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                  Create Category
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
