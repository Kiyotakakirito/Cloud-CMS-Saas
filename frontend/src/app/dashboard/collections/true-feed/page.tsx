"use client";

import { useState, useEffect } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { api, API_ENDPOINTS } from "@/lib/api";
import { 
  Search, 
  Calendar, 
  User, 
  Hash, 
  CreditCard, 
  ArrowUpRight, 
  ArrowDownLeft, 
  Clock, 
  CheckCircle2, 
  AlertCircle,
  TrendingUp,
  MessageSquareQuote
} from "lucide-react";
import Link from "next/link";

type CollectionItem = {
  id: string;
  amount: number;
  date: string;
  method: string;
  type: string;
  customer: {
    id: number;
    customer_id: string;
    full_name: string;
    phone_number: string;
    card_number: string;
  };
  invoice_status: string;
  ref: string;
};

export default function TrueFeedPage() {
  const [collections, setCollections] = useState<CollectionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const fetchCollections = async () => {
    try {
      setLoading(true);
      const response = await api.get<CollectionItem[]>(API_ENDPOINTS.BILLING.COLLECTIONS_ALL, {
          params: { search }
      });
      if (response.data) {
        setCollections(response.data);
      }
    } catch (err) {
      console.error("Failed to fetch collections", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCollections();
  }, [search]);

  return (
    <DashboardLayout allowedRoles={["owner"]}>
      <div className="space-y-8 pb-20 max-w-5xl mx-auto">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
           <div>
             <h1 className="text-4xl font-black text-slate-800 tracking-tighter flex items-center gap-3">
                <TrendingUp className="text-indigo-600" size={36} /> True Feed
             </h1>
             <p className="text-slate-500 mt-2 font-medium text-sm">Chronological financial story of your shop collections and credits.</p>
           </div>
           <div className="relative w-full md:w-96">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
              <input 
                type="text" 
                placeholder="Search subscriber or card..." 
                className="w-full pl-12 pr-4 py-3 rounded-2xl bg-white border border-slate-100 shadow-sm focus:ring-2 focus:ring-indigo-500 font-bold text-slate-700 outline-none transition-all"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
           </div>
        </div>

        {/* Timeline Feed */}
        <div className="space-y-6 relative before:absolute before:left-[27px] before:top-4 before:bottom-0 before:w-0.5 before:bg-slate-100">
           {loading ? (
              <div className="p-20 text-center animate-pulse text-slate-300 font-black">SCANNING FEED...</div>
           ) : collections.length === 0 ? (
              <div className="p-20 text-center bg-white rounded-[40px] border-2 border-dashed border-slate-100">
                 <p className="text-slate-400 font-black uppercase tracking-widest">No activity found in the feed.</p>
              </div>
           ) : (
              collections.map((item, idx) => (
                 <div key={item.id} className="relative pl-16 group">
                    {/* Timeline Node */}
                    <div className={`absolute left-0 top-1 w-14 h-14 rounded-2xl flex items-center justify-center shadow-lg transition-transform group-hover:scale-110 z-10 ${
                       item.type === 'Payment' ? 'bg-emerald-600 text-white shadow-emerald-200' : 'bg-rose-500 text-white shadow-rose-200'
                    }`}>
                       {item.type === 'Payment' ? <ArrowDownLeft size={24} /> : <ArrowUpRight size={24} />}
                    </div>

                    {/* Content Card */}
                    <div className="bg-white p-8 rounded-[36px] shadow-sm border border-slate-100 hover:shadow-xl hover:border-indigo-100 transition-all">
                       <div className="flex flex-col md:flex-row justify-between gap-6">
                          <div className="flex-1 space-y-4">
                             <div className="flex items-center gap-3">
                                <span className={`text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full ${
                                   item.type === 'Payment' ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'
                                }`}>
                                   {item.type === 'Payment' ? 'CASH IN' : 'CREDIT OUT'}
                                </span>
                                <div className="text-[10px] text-slate-400 font-bold flex items-center gap-1">
                                   <Clock size={12} /> {new Date(item.date).toLocaleString()}
                                </div>
                             </div>

                             <div className="space-y-1">
                                <h3 className="text-xl font-black text-slate-800 tracking-tighter leading-tight">
                                   {item.type === 'Credit Recharge' ? (
                                      <>Not Paid Renewal for <span className="text-indigo-600">{item.customer.full_name}</span></>
                                   ) : item.ref ? (
                                      <>Payment received for <span className="text-indigo-600">{item.customer.full_name}</span> as settlement for previous Not Paid Renewal <span className="text-slate-400">({item.ref})</span></>
                                   ) : (
                                      <>Direct Collection from <span className="text-indigo-600">{item.customer.full_name}</span></>
                                   )}
                                </h3>
                                <div className="flex items-center gap-2 text-xs text-slate-400 font-medium">
                                   <Hash size={12}/> {item.customer.customer_id} • <CreditCard size={12}/> {item.customer.card_number}
                                </div>
                             </div>

                             {item.type === 'Payment' && (
                                <div className="flex items-center gap-2 text-[10px] font-black text-emerald-600 bg-emerald-50 w-fit px-3 py-1 rounded-lg border border-emerald-100">
                                   <CheckCircle2 size={12} /> VERIFIED {item.method.toUpperCase()}
                                </div>
                             )}
                          </div>

                          <div className="text-right flex flex-col justify-between items-end min-w-[150px]">
                             <div>
                                <div className={`text-3xl font-black tracking-tighter ${item.type === 'Payment' ? 'text-emerald-600' : 'text-rose-600'}`}>
                                   ₹{item.amount.toLocaleString()}
                                </div>
                                <div className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{item.ref}</div>
                             </div>
                             
                             <Link 
                                href={`/dashboard/customers/${item.customer.id}${item.type === 'Credit Recharge' ? '?settle=true' : ''}`}
                                className="mt-4 inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-indigo-600 hover:text-indigo-700 transition-colors"
                             >
                                {item.type === 'Credit Recharge' ? 'Settle Now' : 'Subscriber Profile'} <ArrowDownLeft size={14} />
                             </Link>
                          </div>
                       </div>
                    </div>
                 </div>
              ))
           )}
        </div>

        {/* Legend/Info */}
        <div className="bg-indigo-50/50 p-8 rounded-[40px] border border-indigo-100 flex items-start gap-4">
           <MessageSquareQuote className="text-indigo-400 mt-1" size={24} />
           <div>
              <h4 className="font-black text-indigo-900 uppercase tracking-tighter text-sm">About True Feed</h4>
              <p className="text-indigo-700/70 text-xs font-medium leading-relaxed mt-1">
                 This is a storytelling feed. It records every time you give credit and every time that credit is paid back. 
                 When a "Not Paid Renewal" is eventually cleared, a new record appears here to show the exact settlement event.
              </p>
           </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
