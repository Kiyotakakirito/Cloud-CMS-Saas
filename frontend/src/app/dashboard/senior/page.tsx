"use client";

import DashboardLayout from "@/components/DashboardLayout";
import Link from "next/link";

export default function SeniorDashboard() {
  return (
    <DashboardLayout allowedRoles={["senior_worker"]}>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Senior Worker Dashboard</h1>
          <p className="text-slate-500 mt-1">Oversee customers and view reports.</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          <Link href="/dashboard/customers" className="flex items-center gap-3 p-6 rounded-2xl bg-white shadow-sm border border-slate-100 hover:border-purple-300 hover:shadow-md transition">
            <div className="w-12 h-12 flex items-center justify-center bg-purple-100 text-purple-600 rounded-xl text-2xl">👥</div>
            <div>
              <div className="font-semibold text-slate-800">Customers</div>
              <div className="text-sm text-slate-500">View all customers</div>
            </div>
          </Link>
          <Link href="/dashboard/reports" className="flex items-center gap-3 p-6 rounded-2xl bg-white shadow-sm border border-slate-100 hover:border-purple-300 hover:shadow-md transition">
            <div className="w-12 h-12 flex items-center justify-center bg-blue-100 text-blue-600 rounded-xl text-2xl">📊</div>
            <div>
              <div className="font-semibold text-slate-800">Reports</div>
              <div className="text-sm text-slate-500">View customer reports</div>
            </div>
          </Link>
        </div>
      </div>
    </DashboardLayout>
  );
}
