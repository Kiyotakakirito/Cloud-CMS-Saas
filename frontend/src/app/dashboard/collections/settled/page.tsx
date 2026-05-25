"use client";

import { useState, useEffect } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { api, API_ENDPOINTS } from "@/lib/api";
import { CheckCircle, Calendar, User, IndianRupee } from "lucide-react";

export default function SettledCollectionsPage() {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchSettled() {
      try {
        setLoading(true);
        // Settled = Invoices that are fully cleared
        const response = await api.get(API_ENDPOINTS.BILLING.COLLECTIONS_SETTLED);
        if (response.data) setData(response.data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    fetchSettled();
  }, []);

  return (
    <DashboardLayout allowedRoles={["owner"]}>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Settled Collections</h1>
          <p className="text-slate-500 text-sm">List of all successfully processed payments.</p>
        </div>

        <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100">
                <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase">Customer ID</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase">Amount</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase">Method</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase">Date</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {loading ? (
                <tr><td colSpan={5} className="text-center py-10 animate-pulse">Loading...</td></tr>
              ) : data.map((item) => (
                <tr key={item.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="font-bold text-slate-700">{item.customers?.full_name || "Unknown"}</div>
                    <div className="text-[10px] text-slate-400 font-black uppercase tracking-widest">{item.customers?.card_number || item.customer_id}</div>
                  </td>
                  <td className="px-6 py-4 font-black text-emerald-600">₹{item.amount?.toLocaleString() || "0"}</td>
                  <td className="px-6 py-4 text-sm text-slate-500 font-medium">{item.payment_method}</td>
                  <td className="px-6 py-4 text-xs text-slate-400 font-bold">{item.payment_date ? new Date(item.payment_date).toLocaleDateString() : "N/A"}</td>
                  <td className="px-6 py-4">
                    <span className="flex items-center gap-1 text-emerald-600 text-[10px] font-black uppercase bg-emerald-50 px-3 py-1.5 rounded-xl w-fit border border-emerald-100/50 shadow-sm">
                      <CheckCircle size={12} /> Settled
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </DashboardLayout>
  );
}
