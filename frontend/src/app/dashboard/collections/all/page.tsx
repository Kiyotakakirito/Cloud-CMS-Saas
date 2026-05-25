"use client";
import { useState, useEffect } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { api, API_ENDPOINTS } from "@/lib/api";
import Link from "next/link";
import { 
  Search, 
  Filter, 
  Plus, 
  FileText, 
  MoreVertical, 
  Calendar, 
  User, 
  Phone, 
  Hash, 
  Box as BoxIcon,
  CreditCard,
  Wallet,
  TrendingUp
} from "lucide-react";

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
    door_number: string;
  };
  invoice_status: string;
  ref: string;
};

export default function AllCollectionsPage() {
  const [activeTab, setActiveTab] = useState<"all" | "recharge" | "outstanding">("all");
  const [collections, setCollections] = useState<CollectionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [metrics, setMetrics] = useState<any>(null);

  const fetchCollections = async () => {
    try {
      setLoading(true);
      const response = await api.get<CollectionItem[]>(API_ENDPOINTS.BILLING.COLLECTIONS_ALL, {
          params: { search }
      });
      if (response.data) {
        setCollections(response.data);
      }

      const mResponse = await api.get(API_ENDPOINTS.ANALYTICS.OWNER_METRICS);
      if (mResponse.data) {
        setMetrics(mResponse.data);
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

  // Tab filtering in frontend for instant speed
  const filteredCollections = collections.filter(item => {
      if (activeTab === 'all') return true;
      if (activeTab === 'recharge') return item.type === 'Payment';
      if (activeTab === 'outstanding') return item.type === 'Credit Recharge';
      return true;
  });

  return (
    <DashboardLayout allowedRoles={["owner"]}>
      <div className="space-y-6 pb-20">
        {/* Header */}
        <div className="flex justify-between items-center">
           <div>
             <h1 className="text-3xl font-black text-slate-800 tracking-tighter flex items-center gap-3">
                <Wallet className="text-blue-600" size={32} /> Ledger Feed
             </h1>
             <p className="text-slate-500 mt-1 font-medium text-sm italic">Live stream of cash collections and credit recharges.</p>
           </div>
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
        </div>

        {/* Tabs */}
        <div className="flex gap-2 p-1.5 bg-slate-100 rounded-[24px] w-fit border border-slate-200/50">
          <button 
            onClick={() => setActiveTab("all")}
            className={`px-8 py-3 rounded-[18px] text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === "all" ? "bg-white text-blue-600 shadow-md scale-105" : "text-slate-400 hover:text-slate-600"}`}
          >
            FEED (ALL)
          </button>
          <button 
            onClick={() => setActiveTab("recharge")}
            className={`px-8 py-3 rounded-[18px] text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === "recharge" ? "bg-white text-blue-600 shadow-md scale-105" : "text-slate-400 hover:text-slate-600"}`}
          >
            CASH RECHARGES
          </button>
          <button 
            onClick={() => setActiveTab("outstanding")}
            className={`px-8 py-3 rounded-[18px] text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === "outstanding" ? "bg-white text-blue-600 shadow-md scale-105" : "text-slate-400 hover:text-slate-600"}`}
          >
            CREDIT RECHARGES
          </button>
        </div>

        {/* Table */}
        <div className="bg-white rounded-[40px] shadow-xl border border-slate-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/50 border-b border-slate-100">
                  <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Subscriber Info</th>
                  <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Entry Detail</th>
                  <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Amount</th>
                  <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Reference</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {loading ? (
                   [1,2,3].map(i => <tr key={i} className="animate-pulse"><td colSpan={4} className="px-8 py-10 h-24 bg-slate-50/10"></td></tr>)
                ) : filteredCollections.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-8 py-20 text-center font-bold text-slate-400">No matching entries found in this period.</td>
                  </tr>
                ) : (
                  filteredCollections.map((item) => (
                    <tr key={item.id} className="hover:bg-blue-50/30 transition-colors group">
                      <td className="px-8 py-6">
                        <div className="flex items-center gap-4">
                          <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-lg font-black ${item.type === 'Payment' ? 'bg-emerald-50 text-emerald-600 shadow-sm border border-emerald-100/50' : 'bg-rose-50 text-rose-600 shadow-sm border border-rose-100/50'}`}>
                            {item.customer.full_name.charAt(0)}
                          </div>
                          <div>
                            <div className="text-base font-black text-slate-800 tracking-tighter">{item.customer.full_name}</div>
                            <div className="text-[10px] text-slate-400 font-bold uppercase tracking-widest flex items-center gap-2">
                               <Hash size={10}/> {item.customer.customer_id} • <CreditCard size={10}/> {item.customer.card_number}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-8 py-6">
                         <div className="space-y-1">
                            <span className={`px-2 py-1 rounded-lg text-[9px] font-black uppercase ${item.type === 'Payment' ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
                               {item.type}
                            </span>
                            <div className="text-xs text-slate-500 font-bold flex items-center gap-1.5 mt-1">
                               <Calendar size={12} className="text-slate-300" /> {new Date(item.date).toLocaleString()}
                            </div>
                            <div className="text-[10px] text-slate-400 font-medium">via {item.method}</div>
                         </div>
                      </td>
                      <td className="px-8 py-6">
                         <div>
                            <div className={`text-xl font-black tracking-tighter ${item.type === 'Payment' ? 'text-emerald-600' : 'text-rose-600'}`}>
                               ₹{item.amount.toLocaleString()}
                            </div>
                            <div className="text-[9px] text-slate-400 font-bold uppercase italic">{item.invoice_status === 'Paid' ? 'Fully Settled' : 'Unpaid (Due)'}</div>
                         </div>
                      </td>
                      <td className="px-8 py-6 text-right">
                        <div className="inline-flex flex-col items-end gap-2">
                            <div className="text-xs font-black text-slate-500 uppercase tracking-widest">{item.ref}</div>
                            {item.type === 'Credit Recharge' ? (
                                <Link 
                                    href={`/dashboard/customers/${item.customer.id}?settle=true`}
                                    className="bg-slate-900 text-white text-[9px] font-black uppercase tracking-widest px-4 py-2 rounded-xl hover:bg-blue-600 transition-all shadow-md"
                                >
                                    Settle Bill
                                </Link>
                            ) : (
                                <Link 
                                    href={`/dashboard/customers/${item.customer.id}`}
                                    className="text-[9px] font-black text-blue-600 uppercase hover:underline"
                                >
                                    View Profile
                                </Link>
                            )}
                        </div>
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
