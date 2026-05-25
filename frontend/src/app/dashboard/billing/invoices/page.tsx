"use client";

import { useState, useEffect } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { LoadingTable } from "@/components/ui/loading";
import { useNotify } from "@/components/ui/notifications";
import { api, API_ENDPOINTS } from "@/lib/api";

type Invoice = {
  id: number;
  invoice_number: string;
  customer_id: number;
  billing_cycle: string;
  total_amount: number;
  issue_date: string;
  due_date: string;
  status: string;
};

export default function InvoicesPage() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const notify = useNotify();

  // Payment modal state
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [paymentMethod, setPaymentMethod] = useState("Cash");

  const fetchInvoices = async () => {
    try {
      setLoading(true);
      const response = await api.get<Invoice[]>(API_ENDPOINTS.BILLING.INVOICES);

      if (response.data) {
        setInvoices(response.data);
      } else if (response.error) {
        notify.error("Error", "Failed to load invoices");
      }
    } catch (error) {
      notify.error("Error", "Failed to load invoices");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInvoices();
  }, []);

  const handleGenerateMonthly = async () => {
    if (!confirm("This will generate invoices for all active customers. Proceed?")) return;
    setGenerating(true);
    try {
      const response = await api.post(
        `${API_ENDPOINTS.BILLING.INVOICES}/generate-monthly`,
        {}
      );

      if (response.data) {
        notify.success("Success", response.data.message || "Invoices generated successfully");
        fetchInvoices();
      } else if (response.error) {
        notify.error("Error", response.error);
      }
    } catch (error: any) {
      notify.error("Error", error.message || "Failed to generate invoices");
    } finally {
      setGenerating(false);
    }
  };

  const handleRecordPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedInvoice) return;

    try {
      const response = await api.post(API_ENDPOINTS.BILLING.PAYMENTS, {
        invoice_id: selectedInvoice.id,
        customer_id: selectedInvoice.customer_id,
        amount: selectedInvoice.total_amount,
        payment_method: paymentMethod,
        status: "Success"
      });

      if (response.data) {
        notify.success("Success", "Payment recorded successfully");
        setShowPaymentModal(false);
        fetchInvoices();
      } else if (response.error) {
        notify.error("Error", response.error);
      }
    } catch (error: any) {
      notify.error("Error", error.message || "Failed to record payment");
    }
  };

  return (
    <DashboardLayout allowedRoles={["admin", "owner", "senior_worker", "worker"]}>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Invoices & Payments</h1>
          <p className="text-gray-500 mt-1">Manage billing cycles and collect payments.</p>
        </div>
        <button
          onClick={handleGenerateMonthly}
          disabled={generating}
          className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition disabled:opacity-50"
        >
          {generating ? "Generating..." : "⚡ Generate Monthly Invoices"}
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-500">Loading invoices...</div>
        ) : invoices.length === 0 ? (
          <div className="p-8 text-center text-gray-500 flex flex-col items-center">
            <span className="text-4xl mb-3">🧾</span>
            <p>No invoices found. Generate monthly invoices to start collecting payments.</p>
          </div>
        ) : (
          <table className="w-full">
            <thead className="bg-gray-50 text-left text-sm font-semibold text-gray-600">
              <tr>
                <th className="px-6 py-4">Invoice #</th>
                <th className="px-6 py-4">Cycle</th>
                <th className="px-6 py-4">Cust ID</th>
                <th className="px-6 py-4">Total Amount</th>
                <th className="px-6 py-4">Due Date</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-sm text-gray-700">
              {invoices.map((inv) => (
                <tr key={inv.id} className="hover:bg-gray-50/50">
                  <td className="px-6 py-4 font-mono font-medium text-slate-800">{inv.invoice_number}</td>
                  <td className="px-6 py-4">{inv.billing_cycle}</td>
                  <td className="px-6 py-4">#{inv.customer_id}</td>
                  <td className="px-6 py-4 font-bold">₹{inv.total_amount.toFixed(2)}</td>
                  <td className="px-6 py-4">{inv.due_date}</td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      inv.status === "Paid" ? "bg-green-100 text-green-700" : 
                      inv.status === "Overdue" ? "bg-red-100 text-red-700" : 
                      "bg-amber-100 text-amber-700"
                    }`}>
                      {inv.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    {inv.status !== "Paid" && (
                      <button 
                        onClick={() => { setSelectedInvoice(inv); setShowPaymentModal(true); }}
                        className="text-indigo-600 font-medium hover:text-indigo-800"
                      >
                        Collect Payment
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {showPaymentModal && selectedInvoice && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-xl w-full max-w-md shadow-2xl">
            <h2 className="text-xl font-bold mb-4 text-slate-800">Record Payment</h2>
            
            <div className="mb-4 p-4 bg-slate-50 border border-slate-100 rounded-lg">
               <p className="text-sm text-slate-500">Invoice: {selectedInvoice.invoice_number}</p>
               <p className="text-sm text-slate-500">Customer ID: #{selectedInvoice.customer_id}</p>
               <p className="text-xl font-bold text-slate-800 mt-2">Amount Due: ₹{selectedInvoice.total_amount.toFixed(2)}</p>
            </div>

            <form onSubmit={handleRecordPayment} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Payment Method</label>
                <select 
                  className="w-full border border-slate-200 rounded-lg p-2.5 outline-none focus:ring-2 focus:ring-indigo-500"
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                >
                  <option value="Cash">Cash</option>
                  <option value="UPI">UPI</option>
                  <option value="Credit Card">Credit Card</option>
                  <option value="Net Banking">Net Banking</option>
                </select>
              </div>

              <div className="flex justify-end gap-3 mt-6 pt-4 border-t">
                <button
                  type="button"
                  onClick={() => setShowPaymentModal(false)}
                  className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-medium shadow-sm transition"
                >
                  Confirm Payment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
