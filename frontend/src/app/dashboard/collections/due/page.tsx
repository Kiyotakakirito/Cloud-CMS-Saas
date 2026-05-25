"use client";

import { useState, useEffect } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { api, API_ENDPOINTS } from "@/lib/api";
import { AlertCircle, Calendar, User, IndianRupee, ArrowRight, Search, Hash, Phone, CreditCard, Wallet } from "lucide-react";
import Link from "next/link";

export default function CollectionDuePage() {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    async function fetchDue() {
      try {
        setLoading(true);
        // Due = Invoices that are Pending
        const response = await api.get(API_ENDPOINTS.BILLING.COLLECTIONS_OUTSTANDING);
        if (response.data) setData(response.data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    fetchDue();
  }, []);

  const filteredData = data.filter(item => 
    item.customers?.full_name?.toLowerCase().includes(search.toLowerCase()) ||
    item.customers?.customer_id?.toLowerCase().includes(search.toLowerCase()) ||
    item.customers?.card_number?.includes(search)
  );

  return (
    <DashboardLayout allowedRoles={["owner"]}>
      <div className="space-y-6 pb-20">
        <div>
          <h1 className="text-3xl font-black text-slate-800 tracking-tighter flex items-center gap-3">
             <AlertCircle className="text-rose-600" size={32} /> Collection Due
          </h1>
          <p className="text-slate-500 mt-1 font-medium text-sm italic">Immediate attention required: Pending bills and unpaid recharges.</p>
        </div>

        {/* Search Bar */}
        <div className="bg-white p-4 rounded-[32px] shadow-sm border border-slate-100 flex items-center gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={20} />
            <input 
              type="text" 
              placeholder="Search by name, ID or card number..." 
              className="w-full pl-12 pr-4 py-4 rounded-2xl bg-slate-50 border-none focus:ring-2 focus:ring-blue-500 font-bold text-slate-700 transition-all outline-none"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="hidden md:flex bg-rose-50 text-rose-600 px-6 py-4 rounded-2xl items-center gap-3 border border-rose-100/50">
             <Wallet size={20} />
             <div className="flex flex-col">
                <span className="text-[9px] font-black uppercase tracking-widest leading-none">Total Due</span>
                <span className="text-lg font-black tracking-tighter">₹{filteredData.reduce((sum, i) => sum + i.total_amount, 0).toLocaleString()}</span>
             </div>
          </div>
        </div>

        <div className="bg-white rounded-[40px] shadow-xl border border-slate-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/50 border-b border-slate-100">
                  <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Subscriber</th>
                  <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Bill Details</th>
                  <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Amount Due</th>
                  <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {loading ? (
                  [1,2,3].map(i => <tr key={i} className="animate-pulse"><td colSpan={4} className="px-8 py-10 h-24 bg-slate-50/10"></td></tr>)
                ) : filteredData.length === 0 ? (
                  <tr><td colSpan={4} className="px-8 py-20 text-center font-bold text-slate-400 uppercase tracking-widest">No outstanding collections found.</td></tr>
                ) : filteredData.map((item) => (
                  <tr key={item.id} className="hover:bg-rose-50/30 transition-colors group">
                    <td className="px-8 py-6">
                       <div className="flex items-center gap-4">
                          <div className="w-12 h-12 rounded-2xl bg-rose-50 flex items-center justify-center text-rose-600 font-black text-lg border border-rose-100/50">
                             {item.customers?.full_name?.charAt(0) || "?"}
                          </div>
                          <div>
                             <div className="text-base font-black text-slate-800 tracking-tighter">{item.customers?.full_name || "Unknown"}</div>
                             <div className="text-[10px] text-slate-400 font-bold uppercase tracking-widest flex items-center gap-2">
                                <Hash size={10}/> {item.customers?.customer_id} • <CreditCard size={10}/> {item.customers?.card_number}
                             </div>
                          </div>
                       </div>
                    </td>
                    <td className="px-8 py-6">
                       <div className="space-y-1">
                          <div className="text-xs font-black text-slate-600 uppercase tracking-tighter">{item.billing_cycle}</div>
                          <div className="text-[10px] text-slate-400 font-medium flex items-center gap-1.5">
                             <Calendar size={12} className="text-slate-300" /> Due: {new Date(item.due_date).toLocaleDateString()}
                          </div>
                          <div className="text-[9px] font-black text-rose-500 uppercase tracking-widest">Ref: {item.invoice_number}</div>
                       </div>
                    </td>
                    <td className="px-8 py-6">
                       <div className="text-2xl font-black text-rose-600 tracking-tighter">
                          ₹{item.total_amount?.toLocaleString() || "0"}
                       </div>
                       <div className="text-[9px] text-slate-400 font-bold uppercase italic">Immediate Payment Pending</div>
                    </td>
                    <td className="px-8 py-6 text-right">
                      <Link 
                        href={`/dashboard/customers/${item.customers?.id}?settle=true`}
                        className="inline-flex items-center gap-2 bg-slate-900 text-white text-[10px] font-black uppercase tracking-widest px-6 py-3 rounded-2xl hover:bg-blue-600 transition-all shadow-lg shadow-slate-200"
                      >
                        Settle Payment <ArrowRight size={14} />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
