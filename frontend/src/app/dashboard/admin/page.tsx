"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import DashboardLayout from "@/components/DashboardLayout";
import { LoadingSpinner } from "@/components/ui/loading";
import { useNotify } from "@/components/ui/notifications";
import { api, API_ENDPOINTS } from "@/lib/api";

interface AdminStats {
  role: string;
  platform_overview: {
    total_tenants: number;
    active_tenants: number;
    inactive_tenants: number;
    total_users: number;
    active_users: number;
    total_customers: number;
    active_customers: number;
  };
  financial_overview: {
    monthly_revenue: number;
    weekly_revenue: number;
    monthly_revenue_formatted: string;
    weekly_revenue_formatted: string;
    pending_invoices: number;
    paid_invoices: number;
  };
  user_breakdown: {
    admin_users: number;
    owner_users: number;
    worker_users: number;
  };
  support_overview: {
    open_tickets: number;
    total_tickets: number;
  };
  recent_activity: {
    recent_payments: number;
    recent_users: number;
  };
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const notify = useNotify();

  useEffect(() => {
    async function fetchStats() {
      try {
        const response = await api.get<AdminStats>(API_ENDPOINTS.ANALYTICS.DASHBOARD);

        if (response.data) {
          setStats(response.data);
        } else if (response.error) {
          notify.error("Error", "Failed to load dashboard stats");
        }
      } catch (error) {
        notify.error("Error", "Failed to load dashboard stats");
      }
    }
    fetchStats();
  }, []);

  const displayStats = [
    {
      label: "Total Owners / Shops",
      value: stats ? stats.platform_overview.total_tenants.toString() : "-",
      icon: "🏢",
      color: "bg-blue-50 text-blue-700",
      trend: stats ? `${stats.platform_overview.active_tenants} active` : "-"
    },
    {
      label: "Platform Users",
      value: stats ? stats.platform_overview.total_users.toString() : "-",
      icon: "👥",
      color: "bg-green-50 text-green-700",
      trend: stats ? `${stats.platform_overview.active_users} active` : "-"
    },
    {
      label: "Gross Platform Revenue",
      value: stats ? stats.financial_overview.monthly_revenue_formatted : "-",
      icon: "💰",
      color: "bg-amber-50 text-amber-700",
      trend: stats ? `${stats.financial_overview.weekly_revenue_formatted} this week` : "-"
    },
  ];

  const actions = [
    { label: "Manage Owners",       icon: "🏢", desc: "Add, edit, disable shops", href: "/dashboard/admin/tenants" },
    { label: "User Management",     icon: "👥", desc: "Global user control", href: "/dashboard/admin/users" },
    { label: "Revenue Tracker",     icon: "📈", desc: "Monitor owner revenue", href: "/dashboard/admin/revenue" },
    { label: "Platform Analytics",  icon: "📊", desc: "Owner-specific insights", href: "/dashboard/admin/analytics" },
    { label: "Audit Logs",          icon: "📋", desc: "Track platform events", href: "/dashboard/admin/audit" },
    { label: "System Settings",     icon: "⚙️", desc: "Global configuration", href: "/dashboard/admin/settings" },
  ];

  return (
    <DashboardLayout allowedRoles={["admin"]}>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Super-Admin Control Panel</h1>
          <p className="text-slate-500 mt-1">Full platform sovereignty — monitoring every owner and business.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {displayStats.map((s) => (
            <div key={s.label} className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
              <div className="flex items-center justify-between mb-3">
                <div className={`inline-flex items-center justify-center w-12 h-12 rounded-xl text-2xl ${s.color}`}>
                  {s.icon}
                </div>
                {stats && (
                  <div className="text-xs font-medium text-slate-400 bg-slate-50 px-2 py-1 rounded-full">
                    {s.trend}
                  </div>
                )}
              </div>
              <div className="text-3xl font-bold text-slate-800">{s.value}</div>
              <div className="text-sm font-medium text-slate-500 mt-1">{s.label}</div>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* User Breakdown Card */}
          <div className="lg:col-span-1 bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
            <h2 className="font-semibold text-slate-700 mb-4">User Distribution</h2>
            {stats ? (
              <div className="space-y-4">
                <div className="flex justify-between items-center p-3 bg-slate-50 rounded-xl">
                  <span className="text-slate-600 font-medium text-sm">Global Administrators</span>
                  <span className="font-bold text-blue-600 bg-blue-100 px-2 py-0.5 rounded text-xs">{stats.user_breakdown.admin_users}</span>
                </div>
                <div className="flex justify-between items-center p-3 bg-slate-50 rounded-xl">
                  <span className="text-slate-600 font-medium text-sm">Shop Owners</span>
                  <span className="font-bold text-purple-600 bg-purple-100 px-2 py-0.5 rounded text-xs">{stats.user_breakdown.owner_users}</span>
                </div>
                <div className="flex justify-between items-center p-3 bg-slate-50 rounded-xl">
                  <span className="text-slate-600 font-medium text-sm">Field Workers</span>
                  <span className="font-bold text-green-600 bg-green-100 px-2 py-0.5 rounded text-xs">{stats.user_breakdown.worker_users}</span>
                </div>
              </div>
            ) : (
              <div className="text-slate-400">Loading platform data...</div>
            )}
          </div>

          <div className="lg:col-span-2 bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
            <h2 className="font-semibold text-slate-700 mb-4">Master Control Actions</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {actions.map((action) => (
                <Link key={action.label} href={action.href} className="flex items-center gap-4 p-4 rounded-xl border border-slate-200 hover:border-blue-400 hover:bg-blue-50 transition text-left group">
                  <span className="text-3xl grayscale group-hover:grayscale-0 transition">{action.icon}</span>
                  <div>
                    <div className="font-bold text-slate-700 group-hover:text-blue-700">{action.label}</div>
                    <div className="text-xs text-slate-500">{action.desc}</div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
