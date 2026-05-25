"use client";

import { useState, useEffect } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { api, API_ENDPOINTS } from "@/lib/api";
import { Store, User, Mail, Shield, Save, CheckCircle2 } from "lucide-react";

export default function ShopProfilePage() {
  const [shop, setShop] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  const fetchShop = async () => {
    try {
      setLoading(true);
      const response = await api.get('/tenants/my-shop/');
      if (response.data) {
        setShop(response.data);
      }
    } catch (err) {
      console.error("Failed to fetch shop details", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchShop();
  }, []);

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSaving(true);
      const response = await api.put('/tenants/my-shop/', { name: shop.name });
      if (response.data) {
        setMessage("Shop profile updated successfully!");
        setTimeout(() => setMessage(""), 3000);
      }
    } catch (err) {
       console.error(err);
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <DashboardLayout allowedRoles={["owner", "admin"]}><div className="p-20 text-center animate-pulse font-black text-slate-300">LOADING PROFILE...</div></DashboardLayout>;

  return (
    <DashboardLayout allowedRoles={["owner", "admin"]}>
      <div className="max-w-2xl mx-auto space-y-8 pb-20">
        <div>
          <h1 className="text-3xl font-black text-slate-800 tracking-tighter flex items-center gap-4">
            <Store className="text-blue-600" size={32} /> Shop Profile
          </h1>
          <p className="text-slate-500 mt-2 font-medium">Manage your shop identity and public details.</p>
        </div>

        {message && (
            <div className="p-4 bg-emerald-50 text-emerald-700 border border-emerald-100 rounded-2xl flex items-center gap-3 animate-in fade-in slide-in-from-top-2">
                <CheckCircle2 size={20} />
                <span className="font-bold text-sm">{message}</span>
            </div>
        )}

        <form onSubmit={handleUpdate} className="bg-white rounded-[40px] shadow-xl border border-slate-100 overflow-hidden">
           <div className="p-10 space-y-8">
              <div className="grid grid-cols-1 gap-6">
                 <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Shop Display Name</label>
                    <div className="relative">
                       <Store className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                       <input 
                         type="text" 
                         className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                         value={shop?.name || ""}
                         onChange={(e) => setShop({...shop, name: e.target.value})}
                         required
                       />
                    </div>
                 </div>

                 <div className="space-y-2 opacity-60 cursor-not-allowed">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Shop Slug (URL Identifier)</label>
                    <div className="relative">
                       <Shield className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                       <input 
                         type="text" 
                         className="w-full pl-12 pr-4 py-4 bg-slate-100 border border-slate-200 rounded-2xl text-sm font-bold cursor-not-allowed"
                         value={shop?.slug || ""}
                         readOnly
                       />
                    </div>
                    <p className="text-[9px] text-slate-400 font-bold ml-1 uppercase">Slug cannot be changed after creation.</p>
                 </div>
              </div>

              <div className="h-px bg-slate-50"></div>

              <div className="flex items-center gap-4 bg-blue-50/50 p-6 rounded-3xl border border-blue-100/50">
                 <div className="w-12 h-12 rounded-2xl bg-blue-600 flex items-center justify-center text-white shadow-lg shadow-blue-200"><User size={24} /></div>
                 <div>
                    <h4 className="font-black text-slate-800 tracking-tighter">Owner Verification</h4>
                    <p className="text-[11px] text-slate-500 font-medium italic">Managed by Platform Administrator</p>
                 </div>
              </div>
           </div>

           <div className="bg-slate-50 p-6 flex justify-end">
              <button 
                type="submit"
                disabled={saving}
                className="px-8 py-4 bg-slate-900 text-white rounded-2xl text-xs font-black uppercase tracking-widest flex items-center gap-3 hover:bg-slate-800 disabled:opacity-50 transition-all shadow-lg shadow-slate-200"
              >
                {saving ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> : <Save size={16} />}
                {saving ? "Saving..." : "Update Shop Profile"}
              </button>
           </div>
        </form>

        <div className="bg-rose-50 rounded-[32px] p-8 border border-rose-100">
           <h4 className="font-black text-rose-900 uppercase tracking-tighter text-sm mb-2">Danger Zone</h4>
           <p className="text-rose-700 text-xs font-medium leading-relaxed mb-6">
              Closing your shop will permanently delete all subscriber data, invoices, and collection records. This action cannot be undone.
           </p>
           <button className="px-6 py-3 bg-rose-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-rose-700 transition-colors">
              Request Shop Deletion
           </button>
        </div>
      </div>
    </DashboardLayout>
  );
}
