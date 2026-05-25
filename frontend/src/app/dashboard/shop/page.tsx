"use client";

import DashboardLayout from "@/components/DashboardLayout";
import Link from "next/link";
import { useEffect, useState } from "react";
import { api, API_ENDPOINTS } from "@/lib/api";
import { getUser, hasPermission } from "@/lib/auth";
import { 
  Users, 
  Wallet, 
  CalendarClock, 
  AlertCircle, 
  UserPlus, 
  Network, 
  IndianRupee, 
  Ticket,
  ChevronRight,
  TrendingUp,
  CreditCard,
  Banknote,
  LayoutDashboard,
  Zap,
  Loader2
} from "lucide-react";

interface CollectionStats {
  due: number;
  collected: number;
  online: number;
  offline: number;
}

interface ExpiryItem {
  name: string;
  expiry_date: string;
  days_left?: number;
  days_passed?: number;
}

interface StaffPerformance {
  worker_name: string;
  collected: number;
  tx_count: number;
}

interface OwnerMetrics {
  collections_today: CollectionStats;
  collections_month: CollectionStats;
  expiry_report: ExpiryItem[];
  expired_report: ExpiryItem[];
  subscribers: { today: number; month: number };
  connections: { active: number; inactive: number; total: number };
  financials: { outstanding: number; advance: number };
  tickets: { open: number; closed: number; canceled: number };
  staff_performance: StaffPerformance[];
}

export default function OwnerDashboard() {
  const [metrics, setMetrics] = useState<OwnerMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const user = getUser();

  const handleBulkBilling = async () => {
    if (!confirm("Start Monthly Billing? This will generate invoices for all Active subscribers for the current month. This cannot be undone.")) return;
    
    try {
      setIsSubmitting(true);
      const response = await api.post(API_ENDPOINTS.BILLING.GENERATE_INVOICES, {});
      if (response.data) {
        alert(response.data.message || "Billing successful!");
        // Refresh metrics
        const mRes = await api.get(API_ENDPOINTS.ANALYTICS.OWNER_METRICS);
        if (mRes.data) setMetrics(mRes.data);
      }
    } catch (err) {
      alert("Billing process failed. Please check audit logs.");
    } finally {
      setIsSubmitting(false);
    }
  };

  useEffect(() => {
    async function fetchMetrics() {
      try {
        const response = await api.get(API_ENDPOINTS.ANALYTICS.OWNER_METRICS);
        if (response.data) {
          setMetrics(response.data);
        }
      } catch (err) {
        console.error("Failed to fetch owner metrics", err);
      } finally {
        setLoading(false);
      }
    }
    fetchMetrics();
  }, []);

  return (
    <DashboardLayout allowedRoles={["owner", "senior_worker", "worker"]}>
      <div className="space-y-6 pb-10">
        <div className="flex justify-between items-end">
          <div>
            <h1 className="text-2xl font-bold text-slate-800 tracking-tighter flex items-center gap-2">
               <LayoutDashboard className="text-blue-600" size={24} /> Shop Command Center
            </h1>
            <p className="text-slate-500 mt-1 font-medium">Real-time overview of your business performance.</p>
          </div>
          <div className="hidden sm:block text-[10px] font-black uppercase tracking-widest text-slate-400 bg-white px-4 py-2 rounded-xl border border-slate-100 shadow-sm">
            {new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}
          </div>
        </div>

        {/* 8-Box Metrics Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          
          {/* Box 1: Today's Collection */}
          {hasPermission(user, "view_today_collection") && (
            <MetricBox title="Today's Collections" icon={<Wallet className="text-blue-600" />} loading={loading}>
               <div className="space-y-3">
                 <div className="flex justify-between items-center">
                   <span className="text-slate-400 text-sm">Total Due</span>
                   <span className="font-bold text-slate-700">₹{metrics?.collections_today?.due?.toLocaleString() || '0'}</span>
                 </div>
                 <div className="h-px bg-slate-50"></div>
                 <div className="grid grid-cols-2 gap-2">
                   <div className="bg-green-50/50 p-2 rounded-lg">
                     <div className="text-[10px] text-green-600 font-bold uppercase">Collected</div>
                     <div className="text-sm font-bold text-green-700">₹{metrics?.collections_today?.collected?.toLocaleString() || '0'}</div>
                   </div>
                   <div className="bg-blue-50/50 p-2 rounded-lg">
                     <div className="text-[10px] text-blue-600 font-bold uppercase">Online</div>
                     <div className="text-sm font-bold text-blue-700">₹{metrics?.collections_today?.online?.toLocaleString() || '0'}</div>
                   </div>
                 </div>
                 <div className="text-[10px] text-slate-400 flex items-center gap-1">
                   <Banknote size={10} /> Cash: ₹{metrics?.collections_today?.offline?.toLocaleString() || '0'}
                 </div>
               </div>
            </MetricBox>
          )}

          {/* Box 2: Month's Collection */}
          {hasPermission(user, "view_monthly_collection") && (
            <MetricBox title="Monthly Collections" icon={<IndianRupee className="text-emerald-600" />} loading={loading}>
               <div className="space-y-3">
                 <div className="flex justify-between items-center">
                   <span className="text-slate-400 text-sm">Target</span>
                   <span className="font-bold text-slate-700">₹{metrics?.collections_month?.due?.toLocaleString() || '0'}</span>
                 </div>
                 <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                   <div 
                     className="bg-emerald-500 h-full transition-all duration-1000" 
                     style={{ width: `${Math.min(100, (metrics?.collections_month?.collected || 0) / (metrics?.collections_month?.due || 1) * 100)}%` }}
                   ></div>
                 </div>
                 <div className="grid grid-cols-2 gap-2">
                   <div className="p-1">
                     <div className="text-[10px] text-slate-400 font-bold uppercase">Online</div>
                     <div className="text-sm font-bold text-blue-700">₹{metrics?.collections_month?.online?.toLocaleString() || '0'}</div>
                   </div>
                   <div className="p-1">
                     <div className="text-[10px] text-slate-400 font-bold uppercase">Offline</div>
                     <div className="text-sm font-bold text-blue-700">₹{metrics?.collections_month?.offline?.toLocaleString() || '0'}</div>
                   </div>
                 </div>
               </div>
            </MetricBox>
          )}

          {/* Box 3: Expiry Report */}
          {hasPermission(user, "view_expiry_reports") && (
            <MetricBox title="Expiring Soon (7d)" icon={<CalendarClock className="text-amber-600" />} loading={loading}>
               <div className="space-y-2 max-h-[120px] overflow-y-auto pr-1 custom-scrollbar">
                 {metrics?.expiry_report?.length ? metrics.expiry_report.map((item, i) => (
                   <div key={i} className="flex justify-between items-center p-2 bg-slate-50 rounded-lg group hover:bg-amber-50 transition-colors">
                     <div className="min-w-0 flex-1">
                       <div className="text-xs font-bold text-slate-700 truncate">{item.name}</div>
                       <div className="text-[10px] text-amber-600 font-medium">{item.days_left} days left</div>
                     </div>
                     <button className="p-1 text-slate-400 hover:text-amber-600 transition-colors">
                       <ChevronRight size={14} />
                     </button>
                   </div>
                 )) : (
                   <div className="text-center py-4 text-xs text-slate-400">No upcoming expiries</div>
                 )}
               </div>
            </MetricBox>
          )}

          {/* Box 4: Expired Report */}
          {hasPermission(user, "view_expiry_reports") && (
            <MetricBox title="Expired Accounts" icon={<AlertCircle className="text-rose-600" />} loading={loading}>
               <div className="space-y-2 max-h-[120px] overflow-y-auto pr-1 custom-scrollbar">
                 {metrics?.expired_report?.length ? metrics.expired_report.map((item, i) => (
                   <div key={i} className="flex justify-between items-center p-2 bg-slate-50 rounded-lg hover:bg-rose-50 transition-colors group">
                     <div className="min-w-0 flex-1">
                       <div className="text-xs font-bold text-slate-700 truncate">{item.name}</div>
                       <div className="text-[10px] text-rose-500 font-medium">{item.days_passed} days ago</div>
                     </div>
                     <button className="px-2 py-1 bg-rose-100 text-rose-600 text-[9px] font-bold rounded uppercase opacity-0 group-hover:opacity-100 transition-opacity">
                       Recharge
                     </button>
                   </div>
                 )) : (
                   <div className="text-center py-4 text-xs text-slate-400">Clean slate! No expired accounts.</div>
                 )}
               </div>
            </MetricBox>
          )}

          {/* Box 5: Subscriber Growth */}
          {hasPermission(user, "view_growth_metrics") && (
            <MetricBox title="Subscriber Growth" icon={<UserPlus className="text-indigo-600" />} loading={loading}>
               <div className="flex items-center justify-around h-24">
                 <div className="text-center">
                   <div className="text-3xl font-black text-slate-800">{metrics?.subscribers?.today || 0}</div>
                   <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Today</div>
                 </div>
                 <div className="w-px h-10 bg-slate-100"></div>
                 <div className="text-center">
                   <div className="text-3xl font-black text-indigo-600">{metrics?.subscribers?.month || 0}</div>
                   <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">This Month</div>
                 </div>
               </div>
            </MetricBox>
          )}

          {/* Box 6: Total Connections */}
          {hasPermission(user, "view_connections") && (
            <MetricBox title="Network Pulse" icon={<Network className="text-cyan-600" />} loading={loading}>
               <div className="space-y-4 pt-2">
                 <div className="flex items-end justify-between">
                   <div className="text-3xl font-black text-slate-800">{metrics?.connections?.total || 0}</div>
                   <div className="text-[10px] text-cyan-600 font-bold flex items-center gap-1 mb-1">
                     <TrendingUp size={12} /> Total Connections
                   </div>
                 </div>
                 <div className="grid grid-cols-2 gap-4">
                   <div>
                     <div className="text-xs font-bold text-emerald-600">{metrics?.connections?.active || 0}</div>
                     <div className="text-[10px] text-slate-400 uppercase font-bold">Active</div>
                   </div>
                   <div>
                     <div className="text-xs font-bold text-slate-400">{metrics?.connections?.inactive || 0}</div>
                     <div className="text-[10px] text-slate-400 uppercase font-bold">Inactive</div>
                   </div>
                 </div>
               </div>
            </MetricBox>
          )}

          {/* Box 7: Financial Status */}
          {hasPermission(user, "view_financial_status") && (
            <MetricBox title="Financial Status" icon={<CreditCard className="text-purple-600" />} loading={loading}>
               <div className="space-y-4">
                 <div className="p-3 bg-rose-50 rounded-xl border border-rose-100">
                   <div className="text-[10px] text-rose-600 font-bold uppercase">Outstanding</div>
                   <div className="text-xl font-black text-rose-700">₹{metrics?.financials?.outstanding?.toLocaleString() || '0'}</div>
                 </div>
                 <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-100">
                   <div className="text-[10px] text-emerald-600 font-bold uppercase">Advance Payment</div>
                   <div className="text-xl font-black text-emerald-700">₹{metrics?.financials?.advance?.toLocaleString() || '0'}</div>
                 </div>
               </div>
            </MetricBox>
          )}

          {/* Box 8: Ticketing Today */}
          {hasPermission(user, "view_tickets") && (
            <MetricBox title="Support Overview" icon={<Ticket className="text-orange-600" />} loading={loading}>
               <div className="grid grid-cols-3 gap-2 h-24 items-center">
                 <div className="text-center">
                   <div className="text-xl font-black text-orange-600">{metrics?.tickets?.open || 0}</div>
                   <div className="text-[9px] text-slate-400 font-bold uppercase">Open</div>
                 </div>
                 <div className="text-center">
                   <div className="text-xl font-black text-emerald-600">{metrics?.tickets?.closed || 0}</div>
                   <div className="text-[9px] text-slate-400 font-bold uppercase">Closed</div>
                 </div>
                 <div className="text-center">
                   <div className="text-xl font-black text-rose-400">{metrics?.tickets?.canceled || 0}</div>
                   <div className="text-[9px] text-slate-400 font-bold uppercase">Cxl</div>
                 </div>
               </div>
            </MetricBox>
          )}

        </div>

        {/* Quick Admin Actions (NEW) */}
        {hasPermission(user, "manage_plans") && (
          <div className="bg-slate-900 rounded-[48px] p-10 shadow-2xl flex flex-col md:flex-row justify-between items-center gap-6">
             <div className="flex items-center gap-6">
                <div className="w-16 h-16 rounded-3xl bg-white/10 flex items-center justify-center text-blue-400">
                   <TrendingUp size={32} />
                </div>
                <div>
                   <h2 className="text-2xl font-black text-white tracking-tighter uppercase">Monthly Billing Cycle</h2>
                   <p className="text-white/40 text-[10px] font-black uppercase tracking-widest">Generate invoices for all active subscribers for {new Date().toLocaleString('default', { month: 'long' })}.</p>
                </div>
             </div>
             <button 
                onClick={handleBulkBilling}
                disabled={isSubmitting}
                className={`px-10 py-5 rounded-[32px] font-black uppercase tracking-[0.2em] text-xs shadow-xl transition-all flex items-center gap-3 active:scale-95 ${isSubmitting ? 'bg-slate-400 text-white' : 'bg-blue-600 text-white hover:bg-blue-500 shadow-blue-500/20'}`}
             >
                {isSubmitting ? <Loader2 className="animate-spin" size={18} /> : <Zap size={18} />}
                {isSubmitting ? "Generating..." : "Start Billing Run"}
             </button>
          </div>
        )}

        {/* Quick Actions & Navigation */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
            <h2 className="font-bold text-slate-700 mb-6 flex items-center gap-2 text-[10px] font-black uppercase tracking-widest">
              <TrendingUp size={18} className="text-blue-500" />
              Operational Shortcuts
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {hasPermission(user, "view_subscribers") && (
                <Link href="/dashboard/customers" className="flex flex-col items-center justify-center p-6 rounded-[32px] border border-slate-50 bg-slate-50/30 hover:border-blue-200 hover:bg-blue-50/50 transition-all group">
                  <div className="w-12 h-12 rounded-2xl bg-white flex items-center justify-center text-blue-600 mb-3 group-hover:scale-110 transition-transform shadow-sm">
                    <Users size={24} />
                  </div>
                  <span className="font-black text-slate-800 text-[10px] uppercase tracking-tighter">Subscribers</span>
                </Link>
              )}
              
              {hasPermission(user, "manage_staff") && (
                <Link href="/dashboard/staff" className="flex flex-col items-center justify-center p-6 rounded-[32px] border border-slate-50 bg-slate-50/30 hover:border-teal-200 hover:bg-teal-50/50 transition-all group">
                  <div className="w-12 h-12 rounded-2xl bg-white flex items-center justify-center text-teal-600 mb-3 group-hover:scale-110 transition-transform shadow-sm">
                    <UserPlus size={24} />
                  </div>
                  <span className="font-black text-slate-800 text-[10px] uppercase tracking-tighter">Manage Staff</span>
                </Link>
              )}

              {hasPermission(user, "view_plans") && (
                <Link href="/dashboard/billing/plans" className="flex flex-col items-center justify-center p-6 rounded-[32px] border border-slate-50 bg-slate-50/30 hover:border-indigo-200 hover:bg-indigo-50/50 transition-all group">
                  <div className="w-12 h-12 rounded-2xl bg-white flex items-center justify-center text-indigo-600 mb-3 group-hover:scale-110 transition-transform shadow-sm">
                    <CreditCard size={24} />
                  </div>
                  <span className="font-black text-slate-800 text-[10px] uppercase tracking-tighter">Pricing Plans</span>
                </Link>
              )}
            </div>
          </div>

          <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-[40px] p-8 text-white shadow-xl relative overflow-hidden group">
             <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:rotate-12 transition-transform">
               <Network size={120} />
             </div>
             <h2 className="font-black text-xl mb-2 relative z-10 tracking-tighter">Network Alerts</h2>
             <p className="text-slate-400 text-[10px] font-medium mb-6 relative z-10 uppercase tracking-widest">Broadcast maintenance updates.</p>
             <Link href="/dashboard/outages" className="inline-flex items-center gap-2 bg-white/10 hover:bg-white/20 px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all backdrop-blur-sm relative z-10">
               Broadcast Alert <ChevronRight size={16} />
             </Link>
          </div>
        </div>

        {/* Staff Collections Section */}
        {hasPermission(user, "manage_staff") && (
          <div className="bg-white rounded-[48px] p-10 shadow-sm border border-slate-100">
            <div className="flex justify-between items-center mb-8">
                <div>
                  <h2 className="text-2xl font-black text-slate-800 tracking-tighter uppercase">Daily Staff Reconciliation</h2>
                  <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest">Verify cash collected by field staff.</p>
                </div>
                <div className="px-6 py-3 bg-emerald-50 text-emerald-600 rounded-2xl text-[10px] font-black uppercase tracking-widest border border-emerald-100">
                  Today's Total: ₹{metrics?.collections_today?.collected?.toLocaleString() || '0'}
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {metrics?.staff_performance?.length ? metrics.staff_performance.map((staff, i) => (
                  <div key={i} className="flex items-center justify-between p-6 rounded-[32px] bg-slate-50 border border-slate-100 hover:border-blue-200 transition-all">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-2xl bg-white flex items-center justify-center text-slate-400 border border-slate-100 shadow-sm font-black uppercase text-sm">
                        {staff.worker_name.charAt(0)}
                      </div>
                      <div>
                        <div className="font-black text-slate-800 tracking-tighter">{staff.worker_name}</div>
                        <div className="text-[10px] text-slate-400 font-bold uppercase">{staff.tx_count} Collections</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-black text-blue-600">₹{staff.collected.toLocaleString()}</div>
                      <div className="text-[9px] text-slate-400 font-black uppercase tracking-widest">In Hand</div>
                    </div>
                  </div>
                )) : (
                  <div className="lg:col-span-3 py-10 text-center border-2 border-dashed border-slate-100 rounded-[32px]">
                    <p className="text-slate-400 font-bold text-[10px] uppercase tracking-widest">No staff collections recorded today yet.</p>
                  </div>
                )}
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}

function MetricBox({ title, icon, children, loading }: any) {
  return (
    <div className="bg-white rounded-[40px] p-8 shadow-sm border border-slate-100 hover:shadow-xl transition-all relative overflow-hidden group">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-3 bg-slate-50 rounded-2xl group-hover:scale-110 transition-transform">
          {icon}
        </div>
        <h3 className="font-black text-slate-500 text-[10px] uppercase tracking-widest">{title}</h3>
      </div>
      {loading ? (
        <div className="space-y-3">
          <div className="h-6 w-3/4 bg-slate-50 animate-pulse rounded-xl"></div>
          <div className="h-10 w-full bg-slate-50 animate-pulse rounded-xl"></div>
        </div>
      ) : (
        children
      )}
    </div>
  );
}
