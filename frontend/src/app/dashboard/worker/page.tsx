"use client";

import DashboardLayout from "@/components/DashboardLayout";
import Link from "next/link";
import { useEffect, useState } from "react";
import { fetchMe, User } from "@/lib/auth";

export default function WorkerDashboard() {
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    fetchMe().then(setUser);
  }, []);

  return (
    <DashboardLayout allowedRoles={["worker"]}>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Worker Dashboard</h1>
          <p className="text-slate-500 mt-1">Welcome back, {user?.full_name || "Agent"}.</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          <Link href="/dashboard/customers" className="flex items-center gap-3 p-6 rounded-2xl bg-white shadow-sm border border-slate-100 hover:border-green-300 hover:shadow-md transition">
            <div className="w-12 h-12 flex items-center justify-center bg-green-100 text-green-600 rounded-xl text-2xl">🔍</div>
            <div>
              <div className="font-semibold text-slate-800">Find Customers</div>
              <div className="text-sm text-slate-500">Search and update</div>
            </div>
          </Link>
          <Link href="/dashboard/payments/new" className="flex items-center gap-3 p-6 rounded-2xl bg-white shadow-sm border border-slate-100 hover:border-green-300 hover:shadow-md transition">
            <div className="w-12 h-12 flex items-center justify-center bg-emerald-100 text-emerald-600 rounded-xl text-2xl">💵</div>
            <div>
              <div className="font-semibold text-slate-800">Record Payment</div>
              <div className="text-sm text-slate-500">Log a new payment</div>
            </div>
          </Link>
        </div>
      </div>
    </DashboardLayout>
  );
}
