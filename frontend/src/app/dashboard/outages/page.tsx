"use client";

import { useState, useEffect } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { getToken } from "@/lib/auth";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";

type Outage = {
  id: number;
  area: string;
  service_type: string;
  description: string;
  status: string;
  created_at: string;
};

export default function OutagesPage() {
  const [outages, setOutages] = useState<Outage[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [formData, setFormData] = useState({
    area: "",
    service_type: "Internet",
    description: "",
  });

  const fetchOutages = async () => {
    try {
      const token = getToken();
      const res = await fetch(`${API_BASE}/ticketing/outages`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        setOutages(await res.json());
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOutages();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const token = getToken();
      const res = await fetch(`${API_BASE}/ticketing/outages`, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}` 
        },
        body: JSON.stringify(formData)
      });
      if (!res.ok) throw new Error("Failed to declare outage");
      
      const data = await res.json();
      alert(data.message); // Shows SMS dispatch message
      
      setShowCreateModal(false);
      fetchOutages();
    } catch (err) {
      alert("Error declaring outage.");
    }
  };

  const markResolved = async (outageId: number) => {
    try {
      const token = getToken();
      const res = await fetch(`${API_BASE}/ticketing/outages/${outageId}`, {
        method: "PATCH",
        headers: { 
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}` 
        },
        body: JSON.stringify({ status: "Resolved" })
      });
      if (res.ok) {
        fetchOutages();
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <DashboardLayout allowedRoles={["admin", "owner", "senior_worker"]}>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            🚨 Active Outages
          </h1>
          <p className="text-gray-500 mt-1">Manage network outages and notify affected customers instantly.</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition shadow-sm font-medium"
        >
          Declare Outage
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-500">Loading outages...</div>
        ) : outages.length === 0 ? (
          <div className="p-8 text-center text-gray-500 flex flex-col items-center">
            <span className="text-4xl mb-3">✅</span>
            <p>No active network outages reported. All systems go!</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 text-sm text-gray-700">
              {outages.map((outage) => (
                <div key={outage.id} className={`p-5 rounded-xl border ${outage.status === "Active" ? "bg-red-50 border-red-100" : "bg-slate-50 border-slate-200"}`}>
                  <div className="flex justify-between items-start mb-2">
                    <h3 className={`font-bold text-lg ${outage.status === "Active" ? "text-red-700" : "text-slate-700"}`}>
                      {outage.area}
                    </h3>
                    <span className={`px-2 py-1 rounded-full text-xs font-bold ${outage.status === "Active" ? "bg-red-200 text-red-800" : "bg-slate-200 text-slate-600"}`}>
                      {outage.status}
                    </span>
                  </div>
                  <p className="text-slate-600 mb-1"><strong>Service:</strong> {outage.service_type}</p>
                  <p className="text-slate-600 mb-3"><strong>Details:</strong> {outage.description}</p>
                  
                  <div className="flex justify-between items-center border-t border-black/5 pt-3 mt-3">
                    <span className="text-xs text-slate-500">Declared on {outage.created_at}</span>
                    {outage.status === "Active" && (
                      <button 
                        onClick={() => markResolved(outage.id)}
                        className="text-indigo-600 hover:text-indigo-800 font-bold text-sm"
                      >
                        ✓ Mark Resolved
                      </button>
                    )}
                  </div>
                </div>
              ))}
          </div>
        )}
      </div>

      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-xl w-full max-w-md">
            <h2 className="text-xl font-bold mb-1 text-red-600">Declare Area Outage</h2>
            <p className="text-sm text-slate-500 mb-4">This will send an SMS to all customers in the affected area.</p>
            
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Affected Area</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. North Point Sector 4"
                  className="w-full border rounded-lg p-2 outline-none focus:ring-2 focus:ring-red-500"
                  value={formData.area}
                  onChange={(e) => setFormData({ ...formData, area: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Service Type</label>
                <select
                  className="w-full border rounded-lg p-2 outline-none focus:ring-2 focus:ring-red-500"
                  value={formData.service_type}
                  onChange={(e) => setFormData({ ...formData, service_type: e.target.value })}
                >
                  <option>Internet</option>
                  <option>Cable</option>
                  <option>Both</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Description / ETA</label>
                <textarea
                  required
                  rows={3}
                  placeholder="Fiber cut. ETA to fix: 3 hours."
                  className="w-full border rounded-lg p-2 outline-none focus:ring-2 focus:ring-red-500"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                />
              </div>

              <div className="flex justify-end space-x-3 mt-6 pt-4 border-t">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 text-slate-600 hover:bg-slate-50 rounded-lg transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 font-bold"
                >
                  Declare Outage & Notify
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
