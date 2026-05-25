"use client";

import { useState, useEffect } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { getToken } from "@/lib/auth";
import { api, API_ENDPOINTS } from "@/lib/api";
import { Trash2, Edit3, Plus, X, Save, Loader2 } from "lucide-react";

type BillingPlan = {
  id: number;
  name: string;
  base_price: number;
  cgst_rate: number;
  sgst_rate: number;
  total_price: number;
  is_active: number;
};

export default function BillingPlansPage() {
  const [plans, setPlans] = useState<BillingPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editingPlan, setEditingPlan] = useState<BillingPlan | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    base_price: 0,
    cgst_rate: 0,
    sgst_rate: 0,
  });

  const fetchPlans = async () => {
    try {
      const response = await api.get<BillingPlan[]>(API_ENDPOINTS.BILLING.PLANS);
      if (response.data) {
        setPlans(response.data);
      }
    } catch (err) {
      console.error("Failed to fetch plans", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPlans();
  }, []);

  const openEditModal = (plan: BillingPlan) => {
    setEditingPlan(plan);
    setFormData({
      name: plan.name,
      base_price: plan.base_price,
      cgst_rate: 0,
      sgst_rate: 0,
    });
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingPlan(null);
    setFormData({ name: "", base_price: 0, cgst_rate: 0, sgst_rate: 0 });
  };

  const handleSavePlan = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingPlan) {
        // Update
        const response = await api.put(`${API_ENDPOINTS.BILLING.PLANS}${editingPlan.id}/`, formData);
        if (response.error) throw new Error(response.error);
      } else {
        // Create
        const payload = { ...formData, cgst_rate: 0, sgst_rate: 0 };
        const response = await api.post(API_ENDPOINTS.BILLING.PLANS, payload);
        if (response.error) throw new Error(response.error);
      }
      
      closeModal();
      fetchPlans();
    } catch (err) {
      console.error(err);
      alert("Failed to save plan");
    }
  };

  const handleDeletePlan = async (id: number) => {
    if (!confirm("Are you sure you want to deactivate this plan? This will hide it from the active list.")) return;
    try {
      const response = await api.delete(`${API_ENDPOINTS.BILLING.PLANS}${id}/`);
      if (response.error) throw new Error(response.error);
      fetchPlans();
    } catch (err) {
      console.error(err);
      alert("Failed to delete plan");
    }
  };

  return (
    <DashboardLayout allowedRoles={["admin", "owner", "senior_worker"]}>
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-black text-slate-800 tracking-tighter flex items-center gap-3">
            <Plus className="text-blue-600" size={28} /> Billing Plans
          </h1>
          <p className="text-slate-500 mt-1 font-medium">Manage broadband and cable pricing plans.</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="bg-blue-600 text-white px-6 py-3 rounded-2xl font-black uppercase tracking-widest text-xs flex items-center gap-2 hover:bg-blue-700 transition shadow-lg shadow-blue-200"
        >
          <Plus size={16} /> Create New Plan
        </button>
      </div>

      <div className="bg-white rounded-[40px] shadow-xl border border-slate-100 overflow-hidden">
        {loading ? (
          <div className="p-20 text-center animate-pulse text-slate-300 font-bold">LOADING PLANS...</div>
        ) : plans.length === 0 ? (
          <div className="p-20 text-center font-bold text-slate-400">No billing plans found. Create one to get started.</div>
        ) : (
          <table className="w-full text-left">
            <thead className="bg-slate-50/50">
              <tr>
                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Plan Identity</th>
                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Total Price (Inc. Tax)</th>
                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Status</th>
                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 text-sm">
              {plans.map((plan) => (
                <tr key={plan.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-8 py-6">
                     <div className="font-black text-slate-800 tracking-tighter text-lg">{plan.name}</div>
                     <div className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">ID: #{plan.id.toString().padStart(3, '0')}</div>
                  </td>
                  <td className="px-8 py-6">
                     <div className="text-xl font-black text-blue-600">₹{plan.total_price.toLocaleString()}</div>
                     <div className="text-[9px] text-slate-400 font-bold uppercase italic tracking-tighter">Tax Inclusive</div>
                  </td>
                  <td className="px-8 py-6">
                    <span className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-tighter ${plan.is_active ? "bg-emerald-50 text-emerald-600" : "bg-rose-50 text-rose-600"}`}>
                      {plan.is_active ? "Active" : "Archived"}
                    </span>
                  </td>
                  <td className="px-8 py-6 text-right space-x-3">
                     <button 
                       onClick={() => openEditModal(plan)}
                       className="p-3 bg-blue-50 text-blue-600 rounded-2xl hover:bg-blue-600 hover:text-white transition-all shadow-sm"
                       title="Edit Plan"
                     >
                        <Edit3 size={18} />
                     </button>
                     <button 
                       onClick={() => handleDeletePlan(plan.id)}
                       className="p-3 bg-rose-50 text-rose-600 rounded-2xl hover:bg-rose-600 hover:text-white transition-all shadow-sm"
                       title="Delete Plan"
                     >
                        <Trash2 size={18} />
                     </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-300">
          <div className="bg-white rounded-[48px] shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-300">
            <div className="p-8 pb-4 flex justify-between items-center">
              <h2 className="text-2xl font-black text-slate-800 tracking-tighter">
                {editingPlan ? "Modify Plan" : "Create New Plan"}
              </h2>
              <button onClick={closeModal} className="p-2 hover:bg-slate-50 rounded-full text-slate-400 transition-colors">
                 <X size={24} />
              </button>
            </div>

            <form onSubmit={handleSavePlan} className="p-8 pt-4 space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Plan Name</label>
                <input
                  type="text"
                  required
                  className="w-full bg-slate-50 border border-slate-100 rounded-2xl p-4 font-bold text-slate-700 focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g. 100Mbps Fiber"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Total Plan Price (₹)</label>
                <input
                  type="number"
                  required
                  className="w-full bg-slate-50 border border-slate-100 rounded-2xl p-4 font-bold text-slate-700 focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                  value={formData.base_price}
                  onChange={(e) => setFormData({ ...formData, base_price: parseFloat(e.target.value) || 0 })}
                />
                <p className="text-[9px] text-slate-400 mt-1 uppercase font-bold tracking-widest italic ml-1">Note: Treat as final amount (Tax Incl.)</p>
              </div>

              <div className="bg-blue-50 p-6 rounded-[32px] border border-blue-100/50">
                 <div className="flex justify-between items-center">
                    <span className="text-[10px] font-black text-blue-400 uppercase tracking-widest">Final Price</span>
                    <span className="text-3xl font-black text-blue-700 tracking-tighter">₹{formData.base_price.toLocaleString()}</span>
                 </div>
              </div>

              <div className="flex gap-4 pt-4">
                <button
                  type="button"
                  onClick={closeModal}
                  className="flex-1 py-4 bg-slate-100 text-slate-500 rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-slate-200 transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className={`flex-[2] py-4 rounded-2xl text-xs font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-all shadow-lg ${isSubmitting ? 'bg-slate-400 text-white' : 'bg-blue-600 text-white hover:bg-blue-700 shadow-blue-200'}`}
                >
                  {isSubmitting ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />} 
                  {isSubmitting ? "Processing..." : (editingPlan ? "Apply Changes" : "Create Plan")}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
