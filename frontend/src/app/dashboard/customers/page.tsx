"use client";

import { useState, useEffect, useCallback } from "react";
import { Plus, Search, Eye, Filter, Trash2, Calendar, Phone, Hash, Box as BoxIcon, CreditCard, User, FileUp, Clock } from "lucide-react";
import DashboardLayout from "@/components/DashboardLayout";
import { api, API_ENDPOINTS } from "@/lib/api";
import Link from "next/link";

interface Customer {
  id: number;
  customer_id: string;
  full_name: string;
  door_number: string;
  card_number: string;
  phone_number: string | null;
  area: string | null;
  status: string;
  subscription_end_date: string | null;
}

export default function AllSubscribersPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterBy, setFilterBy] = useState("all");

  const fetchCustomers = useCallback(async () => {
    try {
      setLoading(true);
      const params: any = {};
      if (searchTerm) {
        params.search = searchTerm;
        params.filter_by = filterBy;
      }
      
      const response = await api.get<Customer[]>(API_ENDPOINTS.CUSTOMERS.LIST, { params });
      if (response.data) {
        setCustomers(response.data);
      }
    } catch (err) {
      console.error("Failed to fetch customers", err);
    } finally {
      setLoading(false);
    }
  }, [searchTerm, filterBy]);

  useEffect(() => {
    const timeout = setTimeout(fetchCustomers, searchTerm ? 400 : 0);
    return () => clearTimeout(timeout);
  }, [fetchCustomers]);

  const handleDeleteCustomer = async (id: number) => {
    if (!confirm("Are you sure you want to delete this subscriber?")) return;
    try {
      await api.delete(API_ENDPOINTS.CUSTOMERS.DELETE(id));
      fetchCustomers();
    } catch (err) {
      alert("Failed to delete customer");
    }
  };

  return (
    <DashboardLayout allowedRoles={["owner", "admin"]}>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-slate-800">All Subscribers</h1>
            <p className="text-slate-500 text-sm">Manage and monitor all shop connections.</p>
          </div>
          <div className="flex gap-3">
            <Link 
                href="/dashboard/customers/import"
                className="flex items-center gap-2 bg-white border border-slate-200 text-slate-600 px-4 py-2 rounded-xl font-bold hover:bg-slate-50 transition-all shadow-sm"
            >
                <FileUp size={18} /> Bulk Import
            </Link>
            <Link 
                href="/dashboard/customers/create"
                className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-xl font-bold hover:bg-blue-700 transition-colors shadow-lg shadow-blue-600/20"
            >
                <Plus size={18} /> Add Subscriber
            </Link>
          </div>
        </div>

        {/* Search & Filter Bar */}
        <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 flex flex-col md:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input 
              type="text" 
              placeholder="Search subscribers..." 
              className="w-full pl-10 pr-4 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="flex gap-2">
            <select 
              className="px-4 py-2 rounded-xl border border-slate-200 bg-white text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={filterBy}
              onChange={(e) => setFilterBy(e.target.value)}
            >
              <option value="all">All Filters</option>
              <option value="customer_id">Customer ID</option>
              <option value="name">Name</option>
              <option value="mobile">Mobile</option>
              <option value="email">Email ID</option>
              <option value="stb">STB Number</option>
              <option value="box">Box Number</option>
            </select>
          </div>
        </div>

        {/* Subscribers Table */}
        <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/50 border-b border-slate-100">
                  <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Subscriber Details</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Connection Info</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Expiry / Recharge</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {loading ? (
                  [1,2,3,4,5].map(i => (
                    <tr key={i} className="animate-pulse">
                      <td colSpan={5} className="px-6 py-8 h-20 bg-slate-50/10"></td>
                    </tr>
                  ))
                ) : customers.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-10 text-center text-slate-400">No subscribers found matching your criteria.</td>
                  </tr>
                ) : (
                  customers.map((c) => (
                    <tr key={c.id} className="hover:bg-slate-50/50 transition-colors group">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600 font-bold">
                            {c.full_name.charAt(0)}
                          </div>
                          <div>
                            <div className="text-sm font-bold text-slate-700">{c.full_name}</div>
                            <div className="text-[10px] text-slate-400 flex items-center gap-1">
                              <Phone size={10} /> {c.phone_number || "No Phone"}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="space-y-1">
                          <div className="text-[10px] font-bold text-slate-400 uppercase flex items-center gap-1">
                            <Hash size={10} /> ID: <span className="text-slate-600">{c.customer_id}</span>
                          </div>
                          <div className="text-[10px] font-bold text-slate-400 uppercase flex items-center gap-1">
                            <BoxIcon size={10} /> Box: <span className="text-slate-600">{c.door_number}</span>
                          </div>
                          <div className="text-[10px] font-bold text-slate-400 uppercase flex items-center gap-1">
                            <CreditCard size={10} /> STB: <span className="text-slate-600">{c.card_number}</span>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="space-y-1">
                            {c.subscription_end_date ? (
                               <>
                                 <div className={`text-xs font-black uppercase tracking-tighter ${
                                    new Date(c.subscription_end_date) < new Date() ? 'text-rose-600' : 
                                    (new Date(c.subscription_end_date).getTime() - new Date().getTime()) / (1000*60*60*24) < 3 ? 'text-amber-600' : 'text-slate-600'
                                 }`}>
                                    {new Date(c.subscription_end_date).toLocaleDateString()}
                                 </div>
                                 <div className="text-[9px] font-bold text-slate-400 flex items-center gap-1">
                                    <Clock size={10} /> 
                                    {(() => {
                                        const diff = Math.ceil((new Date(c.subscription_end_date).getTime() - new Date().getTime()) / (1000*60*60*24));
                                        if (diff < 0) return `${Math.abs(diff)} days overdue`;
                                        if (diff === 0) return "Expires today";
                                        return `${diff} days left`;
                                    })()}
                                 </div>
                               </>
                            ) : (
                               <div className="text-[10px] text-slate-300 italic font-medium tracking-widest uppercase">No Date Set</div>
                            )}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                         {(() => {
                            const diff = c.subscription_end_date ? Math.ceil((new Date(c.subscription_end_date).getTime() - new Date().getTime()) / (1000*60*60*24)) : 999;
                            if (diff < 0) return <span className="px-3 py-1 rounded-lg text-[9px] font-black uppercase bg-rose-50 text-rose-600 border border-rose-100 shadow-sm">Overdue</span>;
                            if (diff === 0) return <span className="px-3 py-1 rounded-lg text-[9px] font-black uppercase bg-amber-50 text-amber-600 border border-amber-100 shadow-sm animate-pulse">Expiring Today</span>;
                            if (diff < 4) return <span className="px-3 py-1 rounded-lg text-[9px] font-black uppercase bg-orange-50 text-orange-600 border border-orange-100 shadow-sm">Due Soon</span>;
                            return <span className="px-3 py-1 rounded-lg text-[9px] font-black uppercase bg-emerald-50 text-emerald-600 border border-emerald-100 shadow-sm">Active</span>;
                         })()}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex justify-end gap-2">
                           <Link 
                            href={`/dashboard/customers/${c.id}`}
                            className="p-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-600 hover:text-white transition-all shadow-sm group-hover:scale-105"
                            title="View Details"
                           >
                             <Eye size={16} />
                           </Link>
                           <button 
                            onClick={() => handleDeleteCustomer(c.id)}
                            className="p-2 bg-rose-50 text-rose-600 rounded-lg hover:bg-rose-600 hover:text-white transition-all shadow-sm"
                            title="Delete"
                           >
                             <Trash2 size={16} />
                           </button>
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
