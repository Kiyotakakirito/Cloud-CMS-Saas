"use client";

import { useState, useEffect } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { api, API_ENDPOINTS } from "@/lib/api";
import { History, User, Activity, Search, Filter, ShieldCheck, Clock } from "lucide-react";

interface AuditLog {
  id: number;
  created_at: string;
  action: string;
  resource: string;
  resource_id: string;
  details: any;
  user_profiles: {
    full_name: string;
    email: string;
  };
}

export default function AuditLogPage() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [actionFilter, setActionFilter] = useState("");

  const fetchLogs = async () => {
    try {
      setLoading(true);
      const url = `${API_ENDPOINTS.AUDIT.LIST}?action=${actionFilter}`;
      const response = await api.get<AuditLog[]>(url);
      if (response.data) {
        setLogs(response.data);
      }
    } catch (err) {
      console.error("Failed to fetch audit logs", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [actionFilter]);

  const filteredLogs = logs.filter(log => 
    log.user_profiles?.full_name?.toLowerCase().includes(search.toLowerCase()) ||
    log.action.toLowerCase().includes(search.toLowerCase()) ||
    log.resource_id?.includes(search)
  );

  return (
    <DashboardLayout allowedRoles={["owner", "admin"]}>
      <div className="space-y-6 max-w-6xl mx-auto pb-10">
        <div className="flex justify-between items-end">
          <div>
            <h1 className="text-2xl font-black text-slate-800 tracking-tighter flex items-center gap-3">
                <History className="text-blue-600" size={28} /> Audit Trail
            </h1>
            <p className="text-slate-500 mt-1">Track every action taken by your staff and yourself.</p>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white p-4 rounded-3xl shadow-sm border border-slate-100 flex flex-col md:flex-row gap-4 items-center">
           <div className="relative flex-1 w-full">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
              <input 
                type="text" 
                placeholder="Search by staff or action..." 
                className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
           </div>
           <div className="flex gap-3 w-full md:w-auto">
              <select 
                className="px-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl text-xs font-black text-slate-500 uppercase flex-1 md:flex-none"
                value={actionFilter}
                onChange={(e) => setActionFilter(e.target.value)}
              >
                 <option value="">ALL ACTIONS</option>
                 <option value="CREATE_CUSTOMER">NEW SUBSCRIBER</option>
                 <option value="UPDATE_CUSTOMER">UPDATE PROFILE</option>
                 <option value="RENEW_SUBSCRIPTION">RENEWAL</option>
                 <option value="RETRACT_TRANSACTION">RETRACT</option>
                 <option value="CREATE_STAFF">STAFF ADDED</option>
              </select>
           </div>
        </div>

        {/* Log List */}
        <div className="bg-white rounded-[40px] shadow-xl border border-slate-100 overflow-hidden">
           <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                 <thead className="bg-slate-50/50">
                    <tr>
                       <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Timestamp</th>
                       <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Staff Member</th>
                       <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Action</th>
                       <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Resource</th>
                       <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Details</th>
                    </tr>
                 </thead>
                 <tbody className="divide-y divide-slate-50">
                    {loading ? (
                       <tr><td colSpan={5} className="p-20 text-center"><div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto"></div></td></tr>
                    ) : filteredLogs.length === 0 ? (
                       <tr><td colSpan={5} className="p-20 text-center font-bold text-slate-400">No logs found matching your criteria.</td></tr>
                    ) : (
                       filteredLogs.map((log) => (
                          <tr key={log.id} className="hover:bg-blue-50/30 transition-colors">
                             <td className="px-8 py-6">
                                <div className="text-sm font-bold text-slate-700">{new Date(log.created_at).toLocaleDateString()}</div>
                                <div className="text-[10px] text-slate-400 font-black flex items-center gap-1"><Clock size={10} /> {new Date(log.created_at).toLocaleTimeString()}</div>
                             </td>
                             <td className="px-8 py-6">
                                <div className="flex items-center gap-3">
                                   <div className="w-10 h-10 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-400 font-black"><User size={20} /></div>
                                   <div>
                                      <div className="text-sm font-black text-slate-800 tracking-tighter">{log.user_profiles?.full_name || "System"}</div>
                                      <div className="text-[10px] text-slate-400 font-medium">{log.user_profiles?.email}</div>
                                   </div>
                                </div>
                             </td>
                             <td className="px-8 py-6">
                                <span className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-tighter ${getActionColor(log.action)}`}>
                                   {log.action.replace(/_/g, ' ')}
                                </span>
                             </td>
                             <td className="px-8 py-6">
                                <div className="text-[10px] text-slate-400 font-black uppercase tracking-widest mb-1">{log.resource}</div>
                                <div className="text-xs font-bold text-slate-600">ID: {log.resource_id || 'N/A'}</div>
                             </td>
                             <td className="px-8 py-6">
                                <pre className="text-[10px] font-medium bg-slate-50 p-2 rounded-lg max-w-xs overflow-x-auto text-slate-500">
                                   {JSON.stringify(log.details, null, 2)}
                                </pre>
                             </td>
                          </tr>
                       ))
                    )}
                 </tbody>
              </table>
           </div>
        </div>
      </div>
    </DashboardLayout>
  );
}

function getActionColor(action: string) {
    if (action.includes('CREATE')) return 'bg-emerald-50 text-emerald-600';
    if (action.includes('DELETE')) return 'bg-rose-50 text-rose-600';
    if (action.includes('RETRACT')) return 'bg-amber-50 text-amber-600';
    if (action.includes('UPDATE')) return 'bg-blue-50 text-blue-600';
    return 'bg-slate-50 text-slate-500';
}
