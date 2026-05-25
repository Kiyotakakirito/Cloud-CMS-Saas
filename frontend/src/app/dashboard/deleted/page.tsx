"use client";

import { useState, useEffect } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { api, API_ENDPOINTS } from "@/lib/api";
import { Trash2, RotateCcw, User, Search, ShieldAlert, CheckCircle2 } from "lucide-react";

export default function DeletedEntriesPage() {
  const [customers, setCustomers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [message, setMessage] = useState("");

  const fetchDeleted = async () => {
    try {
      setLoading(true);
      // include_deleted=true and status=Deleted
      const response = await api.get(`/customers/?include_deleted=true&status=Deleted`);
      if (response.data) {
        setCustomers(response.data);
      }
    } catch (err) {
      console.error("Failed to fetch deleted entries", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDeleted();
  }, []);

  const handleRestore = async (id: number) => {
    if (!confirm("Restore this subscriber?")) return;
    try {
      const response = await api.post(`/customers/${id}/restore/`, {});
      if (response.data) {
        setMessage("Subscriber restored successfully!");
        fetchDeleted();
        setTimeout(() => setMessage(""), 3000);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handlePurge = async (id: number) => {
    if (!confirm("PERMANENT PURGE? This cannot be undone.")) return;
    try {
      // DELETE with permanent=true
      await api.delete(`/customers/${id}/?permanent=true`);
      setMessage("Subscriber purged permanently.");
      fetchDeleted();
      setTimeout(() => setMessage(""), 3000);
    } catch (err: any) {
       alert(err.message || "Only admins can purge records permanently.");
    }
  };

  const filtered = customers.filter(c => 
    c.full_name.toLowerCase().includes(search.toLowerCase()) || 
    c.card_number.includes(search)
  );

  return (
    <DashboardLayout allowedRoles={["owner", "admin"]}>
      <div className="max-w-5xl mx-auto space-y-6 pb-20">
        <div>
          <h1 className="text-3xl font-black text-slate-800 tracking-tighter flex items-center gap-4">
            <Trash2 className="text-rose-600" size={32} /> Recycle Bin
          </h1>
          <p className="text-slate-500 mt-2 font-medium">Subscribers deleted within the last 30 days are held here before permanent purge.</p>
        </div>

        {message && (
            <div className="p-4 bg-emerald-50 text-emerald-700 border border-emerald-100 rounded-2xl flex items-center gap-3 animate-in fade-in slide-in-from-top-2">
                <CheckCircle2 size={20} />
                <span className="font-bold text-sm">{message}</span>
            </div>
        )}

        <div className="bg-white p-4 rounded-3xl shadow-sm border border-slate-100 flex items-center">
           <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
              <input 
                type="text" 
                placeholder="Search deleted subscribers..." 
                className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
           </div>
        </div>

        <div className="bg-white rounded-[40px] shadow-xl border border-slate-100 overflow-hidden">
           <table className="w-full text-left">
              <thead className="bg-slate-50/50">
                 <tr>
                    <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Subscriber</th>
                    <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Card / Area</th>
                    <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Actions</th>
                 </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                 {loading ? (
                    <tr><td colSpan={3} className="p-20 text-center animate-pulse text-slate-300 font-bold">SCANNING RECYCLE BIN...</td></tr>
                 ) : filtered.length === 0 ? (
                    <tr><td colSpan={3} className="p-20 text-center font-bold text-slate-400">Recycle bin is empty.</td></tr>
                 ) : (
                    filtered.map((c) => (
                       <tr key={c.id} className="hover:bg-slate-50/50 transition-colors">
                          <td className="px-8 py-6">
                             <div className="flex items-center gap-4">
                                <div className="w-10 h-10 rounded-2xl bg-rose-50 flex items-center justify-center text-rose-400 font-black"><User size={20} /></div>
                                <div>
                                   <div className="text-sm font-black text-slate-800 tracking-tighter">{c.full_name}</div>
                                   <div className="text-[10px] text-slate-400 font-medium">Deleted recently</div>
                                </div>
                             </div>
                          </td>
                          <td className="px-8 py-6">
                             <div className="text-xs font-bold text-slate-600">{c.card_number}</div>
                             <div className="text-[10px] text-slate-400 font-black uppercase tracking-widest">{c.area}</div>
                          </td>
                          <td className="px-8 py-6 text-right space-x-3">
                             <button 
                               onClick={() => handleRestore(c.id)}
                               className="p-3 bg-blue-50 text-blue-600 rounded-2xl hover:bg-blue-600 hover:text-white transition-all shadow-sm"
                               title="Restore"
                             >
                                <RotateCcw size={18} />
                             </button>
                             <button 
                               onClick={() => handlePurge(c.id)}
                               className="p-3 bg-rose-50 text-rose-600 rounded-2xl hover:bg-rose-600 hover:text-white transition-all shadow-sm"
                               title="Purge Permanently"
                             >
                                <Trash2 size={18} />
                             </button>
                          </td>
                       </tr>
                    ))
                 )}
              </tbody>
           </table>
        </div>

        <div className="bg-amber-50 rounded-[32px] p-8 border border-amber-100 flex items-start gap-4">
           <ShieldAlert className="text-amber-600 mt-1" size={24} />
           <div>
              <h4 className="font-black text-amber-900 uppercase tracking-tighter text-sm">Purge Policy</h4>
              <p className="text-amber-700 text-xs mt-1 font-medium leading-relaxed">
                 Restoring a subscriber will reactivate their account with their last known billing cycle. 
                 Permanent purging removes all history and is only available to **Shop Administrators**.
              </p>
           </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
