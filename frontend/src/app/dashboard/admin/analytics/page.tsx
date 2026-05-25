"use client";

import { useState, useEffect } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { api } from "@/lib/api";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface Owner {
  id: number;
  name: string;
}

interface OwnerStats {
  tenant_id: number;
  stats: {
    total_users: number;
    active_users: number;
    total_customers: number;
    active_customers: number;
    open_tickets: number;
    total_revenue: number;
    revenue_formatted: string;
  };
}

export default function PlatformAnalyticsPage() {
  const [owners, setOwners] = useState<Owner[]>([]);
  const [selectedOwnerId, setSelectedOwnerId] = useState<string | null>(null);
  const [stats, setStats] = useState<OwnerStats | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    async function fetchOwners() {
      const res = await api.get<Owner[]>("/tenants");
      if (res.data) setOwners(res.data);
    }
    fetchOwners();
  }, []);

  const handleOwnerSelect = async (id: string) => {
    setSelectedOwnerId(id);
    setLoading(true);
    try {
      const res = await api.get<OwnerStats>(`/analytics/owner-analytics/${id}`);
      if (res.data) setStats(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <DashboardLayout allowedRoles={["admin"]}>
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Owner Insights</h1>
            <p className="text-slate-500">Drill down into specific business performance.</p>
          </div>
          
          <div className="w-full md:w-64">
            <Select onValueChange={handleOwnerSelect}>
              <SelectTrigger>
                <SelectValue placeholder="Select a Business" />
              </SelectTrigger>
              <SelectContent>
                {owners.map((o) => (
                  <SelectItem key={o.id} value={o.id.toString()}>{o.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {!selectedOwnerId ? (
          <div className="p-20 text-center border-2 border-dashed rounded-3xl bg-slate-50 border-slate-200">
            <div className="text-4xl mb-4">🏢</div>
            <h3 className="text-xl font-semibold text-slate-700">No Business Selected</h3>
            <p className="text-slate-500">Choose a shop from the dropdown above to view their private records.</p>
          </div>
        ) : loading ? (
          <div className="p-20 text-center">
            <div className="animate-pulse flex flex-col items-center">
              <div className="h-4 w-48 bg-slate-200 rounded mb-4"></div>
              <div className="grid grid-cols-3 gap-4 w-full max-w-2xl">
                <div className="h-32 bg-slate-100 rounded-2xl"></div>
                <div className="h-32 bg-slate-100 rounded-2xl"></div>
                <div className="h-32 bg-slate-100 rounded-2xl"></div>
              </div>
            </div>
          </div>
        ) : stats ? (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-slate-500">Business Revenue</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-green-600">{stats.stats.revenue_formatted}</div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-slate-500">Customer Base</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.stats.total_customers}</div>
                  <p className="text-xs text-slate-400">{stats.stats.active_customers} active</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-slate-500">Staff Count</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.stats.total_users}</div>
                  <p className="text-xs text-slate-400">{stats.stats.active_users} active</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-slate-500">Support Load</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-amber-600">{stats.stats.open_tickets}</div>
                  <p className="text-xs text-slate-400">pending resolution</p>
                </CardContent>
              </Card>
            </div>
            
            <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm text-center">
               <div className="text-slate-300 text-6xl mb-4">📉</div>
               <h3 className="text-lg font-bold text-slate-700">Detailed Charting</h3>
               <p className="text-slate-500 max-w-sm mx-auto">Full visual charts for this specific owner are being compiled from their transaction logs.</p>
            </div>
          </div>
        ) : null}
      </div>
    </DashboardLayout>
  );
}
