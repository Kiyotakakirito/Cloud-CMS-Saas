"use client";

import { useState, useEffect } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { api } from "@/lib/api";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface RevenueBreakdown {
  tenant_id: number;
  owner_name: string;
  paid_revenue: number;
  pending_revenue: number;
  paid_revenue_formatted: string;
  pending_revenue_formatted: string;
}

interface RevenueTrackerData {
  total_platform_revenue: number;
  total_platform_revenue_formatted: string;
  owner_breakdown: RevenueBreakdown[];
}

export default function RevenueTrackerPage() {
  const [data, setData] = useState<RevenueTrackerData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        const res = await api.get<RevenueTrackerData>("/analytics/revenue-tracker");
        if (res.data) setData(res.data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  return (
    <DashboardLayout allowedRoles={["admin"]}>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Platform Revenue Tracker</h1>
          <p className="text-slate-500">Monitor financial performance across all businesses.</p>
        </div>

        {loading ? (
          <div className="p-12 text-center text-slate-500">Calculating revenue data...</div>
        ) : data ? (
          <>
            <Card className="bg-blue-600 text-white border-none shadow-lg">
              <CardHeader className="pb-2">
                <CardTitle className="text-blue-100 text-sm font-medium uppercase tracking-wider">Total Gross Platform Revenue</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-4xl font-bold">{data.total_platform_revenue_formatted}</div>
                <p className="text-blue-200 text-xs mt-1">Cumulative across {data.owner_breakdown.length} businesses</p>
              </CardContent>
            </Card>

            <div className="border rounded-xl bg-white shadow-sm overflow-hidden">
              <Table>
                <TableHeader className="bg-slate-50">
                  <TableRow>
                    <TableHead>Business / Owner Name</TableHead>
                    <TableHead className="text-right">Paid Revenue</TableHead>
                    <TableHead className="text-right">Pending Revenue</TableHead>
                    <TableHead className="text-center">Health</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.owner_breakdown.map((row) => (
                    <TableRow key={row.tenant_id} className="hover:bg-slate-50 transition">
                      <TableCell className="font-semibold text-slate-700">{row.owner_name}</TableCell>
                      <TableCell className="text-right font-bold text-green-600">{row.paid_revenue_formatted}</TableCell>
                      <TableCell className="text-right font-medium text-amber-600">{row.pending_revenue_formatted}</TableCell>
                      <TableCell className="text-center">
                        <Badge className={row.paid_revenue > row.pending_revenue ? "bg-green-100 text-green-700 hover:bg-green-100" : "bg-amber-100 text-amber-700 hover:bg-amber-100"}>
                          {row.paid_revenue > row.pending_revenue ? "Healthy" : "Attention"}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </>
        ) : (
          <div className="p-12 text-center text-red-500">Failed to load revenue data.</div>
        )}
      </div>
    </DashboardLayout>
  );
}
