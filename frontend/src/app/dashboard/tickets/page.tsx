"use client";

import { useState, useEffect } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { useNotify } from "@/components/ui/notifications";
import { api, API_ENDPOINTS } from "@/lib/api";

type Ticket = {
  id: number;
  customer_id: number;
  customer_name: string;
  customer_area: string;
  issue_type: string;
  description: string;
  status: string;
  assigned_worker_id: number | null;
  worker_name: string;
  created_at: string;
};

export default function TicketsPage() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const notify = useNotify();

  // Modals Data
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [formData, setFormData] = useState({
    customer_id: "",
    issue_type: "Internet Down",
    description: "",
  });

  const fetchTickets = async () => {
    try {
      setLoading(true);
      const response = await api.get<Ticket[]>(API_ENDPOINTS.TICKETS.LIST);

      if (response.data) {
        setTickets(response.data);
      } else if (response.error) {
        notify.error("Error", "Failed to load tickets");
      }
    } catch (error) {
      notify.error("Error", "Failed to load tickets");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTickets();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const response = await api.post(API_ENDPOINTS.TICKETS.CREATE, {
        customer_id: parseInt(formData.customer_id),
        issue_type: formData.issue_type,
        description: formData.description
      });

      if (response.data) {
        notify.success("Success", "Ticket created successfully");
        setShowCreateModal(false);
        fetchTickets();
      } else if (response.error) {
        notify.error("Error", response.error);
      }
    } catch (error: any) {
      notify.error("Error", error.message || "Please verify the Customer ID is correct");
    }
  };

  const updateStatus = async (ticketId: number, newStatus: string) => {
    try {
      const response = await api.patch(API_ENDPOINTS.TICKETS.UPDATE(ticketId), {
        status: newStatus
      });

      if (response.data) {
        notify.success("Success", "Ticket status updated");
        fetchTickets();
      } else if (response.error) {
        notify.error("Error", response.error);
      }
    } catch (error: any) {
      notify.error("Error", error.message || "Failed to update ticket status");
    }
  };

  return (
    <DashboardLayout allowedRoles={["admin", "owner", "senior_worker", "worker"]}>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Support Tickets</h1>
          <p className="text-gray-500 mt-1">Manage field operations and customer complaints.</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition"
        >
          + Open Ticket
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Kanban Columns */}
        {["Open", "In Progress", "Resolved"].map((status) => (
          <div key={status} className="bg-slate-50 rounded-xl p-4 min-h-[500px] border border-slate-200">
            <h2 className="font-bold text-slate-700 mb-4 flex justify-between items-center">
              {status}
              <span className="bg-slate-200 text-slate-600 px-2 py-0.5 rounded-full text-xs">
                {tickets.filter(t => t.status === status).length}
              </span>
            </h2>
            
            <div className="space-y-4">
              {tickets.filter(t => t.status === status).map(ticket => (
                <div key={ticket.id} className="bg-white p-4 rounded-lg shadow-sm border border-slate-100">
                  <div className="flex justify-between items-start mb-2">
                    <span className="text-xs font-bold text-indigo-600 bg-indigo-50 px-2 py-1 rounded">
                      #{ticket.id} • {ticket.issue_type}
                    </span>
                    <span className="text-xs text-slate-400">{ticket.created_at}</span>
                  </div>
                  <h3 className="font-bold text-slate-800">{ticket.customer_name}</h3>
                  <p className="text-sm text-slate-500 mb-3">{ticket.customer_area}</p>
                  <p className="text-sm text-slate-700 bg-slate-50 p-2 rounded mb-3">"{ticket.description}"</p>
                  
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-slate-500">👷 {ticket.worker_name}</span>
                    
                    <div className="space-x-2">
                      {status === "Open" && (
                        <button onClick={() => updateStatus(ticket.id, "In Progress")} className="text-blue-600 hover:text-blue-800 font-bold">Start</button>
                      )}
                      {status === "In Progress" && (
                        <button onClick={() => updateStatus(ticket.id, "Resolved")} className="text-green-600 hover:text-green-800 font-bold">Resolve</button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
              {tickets.filter(t => t.status === status).length === 0 && !loading && (
                <div className="text-center text-slate-400 text-sm py-8 border-2 border-dashed border-slate-200 rounded-lg">
                  No {status.toLowerCase()} tickets
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-xl w-full max-w-md">
            <h2 className="text-xl font-bold mb-4">Open New Ticket</h2>
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Customer ID</label>
                <input
                  type="number"
                  required
                  className="w-full border rounded-lg p-2 outline-none focus:ring-2 focus:ring-indigo-500"
                  value={formData.customer_id}
                  onChange={(e) => setFormData({ ...formData, customer_id: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Issue Type</label>
                <select
                  className="w-full border rounded-lg p-2 outline-none focus:ring-2 focus:ring-indigo-500"
                  value={formData.issue_type}
                  onChange={(e) => setFormData({ ...formData, issue_type: e.target.value })}
                >
                  <option>Internet Down</option>
                  <option>Cable No Signal</option>
                  <option>Poor Speed</option>
                  <option>Wire Cut</option>
                  <option>Billing Issue</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea
                  required
                  rows={3}
                  className="w-full border rounded-lg p-2 outline-none focus:ring-2 focus:ring-indigo-500"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                />
              </div>

              <div className="flex justify-end space-x-3 mt-6">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 text-slate-600 hover:bg-slate-50 rounded-lg transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
                >
                  Create Ticket
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
