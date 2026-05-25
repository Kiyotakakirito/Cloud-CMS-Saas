"use client";

import { useEffect, useState, ReactNode } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { getUser, getToken, logout, UserInfo, ROLE_DASHBOARD, ROLE_LABELS, ROLE_COLORS, hasPermission } from "@/lib/auth";
import { 
  Users, 
  LayoutDashboard, 
  Wallet, 
  Package, 
  Ticket, 
  UserCog, 
  Database, 
  User, 
  History, 
  Trash2, 
  ChevronDown, 
  ChevronRight,
  Menu,
  X
} from "lucide-react";
import { api, API_ENDPOINTS } from "@/lib/api";

interface DashboardLayoutProps {
  children: ReactNode;
  allowedRoles: string[];
}

export default function DashboardLayout({ children, allowedRoles }: DashboardLayoutProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<UserInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isCollectionsOpen, setIsCollectionsOpen] = useState(false);
  const [isSubscribersOpen, setIsSubscribersOpen] = useState(false);

  useEffect(() => {
    const token = getToken();
    const storedUser = getUser();

    if (!token || !storedUser) {
      router.replace("/");
      return;
    }

    // Role Bypass for flexible designations
    // Admin stays admin. Everything else checks against shop access.
    const isShopRole = ["owner", "senior_worker", "worker"].includes(storedUser.role);
    const isAllowed = allowedRoles.includes(storedUser.role) || (isShopRole && allowedRoles.includes("owner"));

    if (!isAllowed && storedUser.role !== 'admin') {
      router.replace(ROLE_DASHBOARD[storedUser.role] || "/");
      return;
    }

    setUser(storedUser);
    
    // SYNC USER DATA: Fetch latest permissions/info from server
    async function syncUser() {
        try {
            const response = await api.get(API_ENDPOINTS.AUTH.ME);
            if (response.data) {
                const latestUser = response.data;
                localStorage.setItem('user', JSON.stringify(latestUser));
                setUser(latestUser);
            }
        } catch (err) {
            console.error("Session sync failed", err);
        } finally {
            setLoading(false);
        }
    }
    
    syncUser();
  }, [router, allowedRoles]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-500" />
      </div>
    );
  }

  if (!user) return null;

  const isOwnerLike = ["owner", "senior_worker", "worker"].includes(user.role);

  const navigation: any = {
    owner: [
      { name: "Dashboard", href: "/dashboard/shop", icon: LayoutDashboard, permission: "view_dashboard" },
      { 
        name: "Collections", 
        icon: Wallet,
        dropdown: true,
        isOpen: isCollectionsOpen,
        toggle: () => setIsCollectionsOpen(!isCollectionsOpen),
        permission: "view_collections",
        items: [
          { name: "True Feed", href: "/dashboard/collections/true-feed" },
          { name: "All Collection", href: "/dashboard/collections/all" },
          { name: "Settled Collections", href: "/dashboard/collections/settled" },
          { name: "Collection Due", href: "/dashboard/collections/due" },
        ]
      },
      { name: "Subscribers", href: "/dashboard/customers", icon: Users, permission: "view_subscribers" },
      { name: "Packs/Plans", href: "/dashboard/billing/plans", icon: Package, permission: "view_plans" },
      { name: "Tickets", href: "/dashboard/tickets", icon: Ticket, permission: "view_tickets" },
      { name: "Staff Management", href: "/dashboard/staff", icon: UserCog, permission: "manage_staff" },
      { name: "Data Management", href: "/dashboard/data", icon: Database, permission: "view_data_manager" },
      { name: "Profile", href: "/dashboard/profile", icon: User },
      { name: "Audit Logs", href: "/dashboard/audit", icon: History, permission: "view_audit_logs" },
      { name: "Recycle Bin", href: "/dashboard/deleted", icon: Trash2, permission: "delete_subscriber" },
    ],
    admin: [
      { name: "Dashboard", href: "/dashboard/admin", icon: LayoutDashboard },
      { name: "Tenants", href: "/dashboard/admin/tenants", icon: Database },
      { name: "All Users", href: "/dashboard/admin/users", icon: Users },
      { name: "Audit Logs", href: "/dashboard/admin/audit", icon: History },
    ]
  };

  // If it's a shop role (Owner/Worker/etc), we use the 'owner' menu but filter it
  const menuKey = user.role === 'admin' ? 'admin' : 'owner';
  
  const navItems = (navigation[menuKey] || []).filter((item: any) => {
    if (!item.permission) return true;
    return hasPermission(user, item.permission);
  });

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* Sidebar */}
      <aside className={`${isSidebarOpen ? 'w-64' : 'w-20'} bg-slate-900 text-slate-300 transition-all duration-300 flex flex-col fixed inset-y-0 z-30 shadow-xl`}>
        <div className="h-16 flex items-center justify-between px-4 border-b border-slate-800">
          {isSidebarOpen ? (
             <div className="flex items-center gap-3">
               <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white font-bold">C</div>
               <span className="font-bold text-white text-lg truncate">CMS Portal</span>
             </div>
          ) : (
             <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white font-bold mx-auto">C</div>
          )}
          <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="p-1 hover:bg-slate-800 rounded-lg text-slate-400 lg:hidden">
            <X size={20} />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto py-4 custom-scrollbar">
          <ul className="space-y-1 px-3">
            {navItems.map((item: any) => (
              <li key={item.name}>
                {item.dropdown ? (
                  <div className="space-y-1">
                    <button
                      onClick={item.toggle}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 group
                        ${item.items.some((sub: any) => pathname === sub.href) ? 'text-blue-400 bg-blue-500/10' : 'hover:text-white hover:bg-slate-800'}
                      `}
                    >
                      <item.icon size={20} className={item.items.some((sub: any) => pathname === sub.href) ? 'text-blue-400' : 'group-hover:text-white'} />
                      {isSidebarOpen && (
                        <>
                          <span className="flex-1 text-left font-medium text-sm">{item.name}</span>
                          {item.isOpen ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                        </>
                      )}
                    </button>
                    {isSidebarOpen && item.isOpen && (
                      <ul className="ml-9 space-y-1 py-1">
                        {item.items.map((sub: any) => (
                          <li key={sub.name}>
                            <Link
                              href={sub.href}
                              className={`block px-3 py-2 rounded-lg text-xs font-medium transition-colors
                                ${pathname === sub.href ? 'text-blue-400 bg-blue-500/5' : 'text-slate-500 hover:text-white hover:bg-slate-800'}
                              `}
                            >
                              {sub.name}
                            </Link>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                ) : (
                  <Link
                    href={item.href || "#"}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 group
                      ${pathname === item.href ? 'text-white bg-blue-600 shadow-lg shadow-blue-600/20' : 'hover:text-white hover:bg-slate-800'}
                    `}
                  >
                    <item.icon size={20} className={pathname === item.href ? 'text-white' : 'group-hover:text-white'} />
                    {isSidebarOpen && <span className="font-medium text-sm">{item.name}</span>}
                  </Link>
                )}
              </li>
            ))}
          </ul>
        </nav>

        <div className="p-4 border-t border-slate-800 bg-slate-900/50">
          <div className={`flex items-center ${isSidebarOpen ? 'gap-3' : 'justify-center'} mb-3`}>
             <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center font-bold text-xs text-white uppercase shadow-inner">
               {user.full_name?.charAt(0) || user.email.charAt(0)}
             </div>
             {isSidebarOpen && (
               <div className="flex-1 min-w-0">
                 <div className="text-xs font-bold text-white truncate">{user.full_name || user.email}</div>
                 <div className="text-[10px] text-slate-500 font-bold uppercase tracking-tighter truncate">{user.role.replace('_', ' ')}</div>
               </div>
             )}
          </div>
          <button
            onClick={logout}
            className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors
              ${!isSidebarOpen && 'justify-center'}
            `}
          >
            <X size={18} />
            {isSidebarOpen && <span className="text-xs font-bold uppercase tracking-wider">Logout</span>}
          </button>
        </div>
      </aside>

      <div className={`flex-1 flex flex-col ${isSidebarOpen ? 'ml-64' : 'ml-20'} transition-all duration-300`}>
        <header className="h-16 bg-white border-b border-slate-200 sticky top-0 z-20 flex items-center justify-between px-8 shadow-sm">
          <div className="flex items-center gap-4">
             <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="p-2 hover:bg-slate-100 rounded-xl transition-colors text-slate-500">
               <Menu size={20} />
             </button>
             <nav className="flex items-center gap-2 text-sm text-slate-400">
               <button onClick={() => router.back()} className="hover:text-blue-600 px-2 py-1 rounded-lg transition-colors">Back</button>
               <span>/</span>
               <span className="text-slate-800 font-semibold">{pathname.split('/').pop()?.replace(/-/g, ' ')}</span>
             </nav>
          </div>
          <div className="flex items-center gap-4">
             <div className={`text-xs font-black px-3 py-1 rounded-full uppercase tracking-tighter shadow-sm ${ROLE_COLORS[user.role] || 'bg-slate-100 text-slate-700'}`}>
               {user.role.replace('_', ' ')} Mode
             </div>
          </div>
        </header>

        <main className="p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
