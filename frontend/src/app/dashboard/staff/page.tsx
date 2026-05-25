"use client";

import { useState, useEffect } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { api, API_ENDPOINTS } from "@/lib/api";
import { 
  UserCog, 
  ShieldCheck, 
  X, 
  ChevronRight, 
  LayoutDashboard, 
  Users, 
  Wallet, 
  Ticket, 
  Database, 
  History, 
  Trash2, 
  Save,
  Check,
  Plus,
  Loader2
} from "lucide-react";

type PermissionSet = Record<string, boolean>;

type Staff = {
  id: string;
  full_name: string;
  email: string;
  role: string;
  is_active: boolean;
  permissions: PermissionSet;
};

const DEFAULT_PERMISSIONS: PermissionSet = {
  // Dashboard
  "view_dashboard": true,
  "view_today_collection": true,
  "view_monthly_collection": false,
  "view_expiry_reports": true,
  "view_growth_metrics": false,
  "view_financial_status": false,
  
  // Subscribers
  "view_subscribers": true,
  "create_subscriber": true,
  "edit_subscriber": false,
  "delete_subscriber": false,
  
  // Billing Actions
  "renew_subscription": true,
  "settle_payment": true,
  "record_charge": false,
  "retract_transaction": false,
  
  // Modules
  "view_plans": true,
  "manage_plans": false,
  "view_collections": true,
  "view_audit_logs": false,
  "view_data_manager": false,
  "manage_staff": false
};

const PERMISSION_GROUPS = [
  {
    name: "Dashboard & Analytics",
    icon: <LayoutDashboard size={16} />,
    keys: [
      { key: "view_dashboard", label: "Access Dashboard" },
      { key: "view_today_collection", label: "See Today's Collection" },
      { key: "view_monthly_collection", label: "See Monthly Targets" },
      { key: "view_expiry_reports", label: "See Expiry Lists" },
      { key: "view_growth_metrics", label: "See Growth Stats" },
      { key: "view_financial_status", label: "See Advance/Outstanding" },
    ]
  },
  {
    name: "Subscriber Management",
    icon: <Users size={16} />,
    keys: [
      { key: "view_subscribers", label: "View Subscriber List" },
      { key: "create_subscriber", label: "Onboard New Customers" },
      { key: "edit_subscriber", label: "Modify Profile Details" },
      { key: "delete_subscriber", label: "Move to Recycle Bin" },
    ]
  },
  {
    name: "Financial Operations",
    icon: <Wallet size={16} />,
    keys: [
      { key: "renew_subscription", label: "Perform Renewals" },
      { key: "settle_payment", label: "Collect Outstanding Cash" },
      { key: "record_charge", label: "Add Extra Service Charges" },
      { key: "retract_transaction", label: "Undo/Retract Payments" },
      { key: "view_collections", label: "Access Collection Feeds" },
    ]
  },
  {
    name: "Admin & Settings",
    icon: <UserCog size={16} />,
    keys: [
      { key: "view_plans", label: "View Packs/Plans" },
      { key: "manage_plans", label: "Modify Pricing Plans" },
      { key: "view_audit_logs", label: "See Activity Audit Trail" },
      { key: "view_data_manager", label: "Export Shop Data (CSV)" },
      { key: "manage_staff", label: "Manage Other Employees" },
    ]
  }
];

export default function StaffManagementPage() {
  const [staffList, setStaffList] = useState<Staff[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editingPermissions, setEditingPermissions] = useState<Staff | null>(null);
  
  const [formData, setFormData] = useState({
    full_name: "",
    email: "",
    password: "",
    role: "worker",
    permissions: { ...DEFAULT_PERMISSIONS }
  });

  const fetchStaff = async () => {
    try {
      setLoading(true);
      const response = await api.get<Staff[]>(API_ENDPOINTS.STAFF.LIST);
      if (response.data) {
        setStaffList(response.data);
      }
    } catch (err) {
      console.error("Failed to fetch staff", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStaff();
  }, []);

  const handleTogglePermission = (key: string) => {
    if (editingPermissions) {
      setEditingPermissions({
        ...editingPermissions,
        permissions: {
          ...editingPermissions.permissions,
          [key]: !editingPermissions.permissions[key]
        }
      });
    } else {
      setFormData({
        ...formData,
        permissions: {
          ...formData.permissions,
          [key]: !formData.permissions[key]
        }
      });
    }
  };

  const handleSaveStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const response = await api.post(API_ENDPOINTS.STAFF.CREATE, formData);
      if (response.error) throw new Error(response.error);
      
      setShowModal(false);
      setFormData({ 
        full_name: "", 
        email: "", 
        password: "", 
        role: "worker", 
        permissions: { ...DEFAULT_PERMISSIONS } 
      });
      fetchStaff();
    } catch (err: any) {
      alert(err.message || "Failed to create staff");
    }
  };

  const handleUpdatePermissions = async () => {
    if (!editingPermissions) return;
    try {
      const response = await api.put(`${API_ENDPOINTS.STAFF.LIST}${editingPermissions.id}/`, {
        permissions: editingPermissions.permissions
      });
      if (response.error) throw new Error(response.error);
      
      setEditingPermissions(null);
      fetchStaff();
    } catch (err: any) {
      alert(err.message || "Failed to update permissions");
    }
  };

  const handleDeleteStaff = async (id: string) => {
    if (!confirm("Permanently remove this staff member? All their actions will still be logged.")) return;
    try {
      await api.delete(API_ENDPOINTS.STAFF.DELETE(id));
      fetchStaff();
    } catch (err: any) {
      alert(err.message);
    }
  };

  return (
    <DashboardLayout allowedRoles={["admin", "owner"]}>
      <div className="max-w-6xl mx-auto space-y-8 pb-20">
        {/* Header */}
        <div className="flex justify-between items-end">
           <div>
             <h1 className="text-4xl font-black text-slate-800 tracking-tighter flex items-center gap-3">
                <UserCog className="text-teal-600" size={36} /> Team Access
             </h1>
             <p className="text-slate-500 mt-2 font-medium">Configure granular feature permissions for your field workers and seniors.</p>
           </div>
           <button 
             onClick={() => setShowModal(true)}
             className="bg-slate-900 text-white px-8 py-4 rounded-[24px] text-xs font-black uppercase tracking-widest flex items-center gap-3 hover:bg-teal-600 transition-all shadow-xl shadow-slate-200 active:scale-95"
           >
              <Plus size={18} /> Add New Employee
           </button>
        </div>

        {/* Staff List */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
           {loading ? (
              <div className="col-span-full py-20 text-center animate-pulse font-black text-slate-300">INITIALIZING TEAM VIEW...</div>
           ) : staffList.length === 0 ? (
              <div className="col-span-full py-20 text-center bg-white rounded-[40px] border-2 border-dashed border-slate-100 font-bold text-slate-400 uppercase tracking-widest">No employees added yet.</div>
           ) : (
              staffList.map((staff) => (
                 <div key={staff.id} className="bg-white p-8 rounded-[40px] shadow-sm border border-slate-100 hover:shadow-xl transition-all group relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-4">
                       <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-tighter ${
                          staff.role === 'owner' ? 'bg-indigo-50 text-indigo-600' : 'bg-teal-50 text-teal-600'
                       }`}>
                          {staff.role.replace('_', ' ')}
                       </span>
                    </div>

                    <div className="flex items-center gap-5 mb-8">
                       <div className="w-16 h-16 rounded-[24px] bg-slate-50 flex items-center justify-center text-2xl font-black text-slate-400 border border-slate-100 shadow-inner uppercase">
                          {staff.full_name.charAt(0)}
                       </div>
                       <div>
                          <h3 className="text-xl font-black text-slate-800 tracking-tighter leading-tight">{staff.full_name}</h3>
                          <p className="text-xs text-slate-400 font-medium">{staff.email}</p>
                       </div>
                    </div>

                    <div className="space-y-4 pt-4 border-t border-slate-50">
                       <div className="flex justify-between items-center text-[10px] font-black text-slate-400 uppercase tracking-widest">
                          <span>Permissions</span>
                          <span className="text-teal-600 bg-teal-50 px-2 py-0.5 rounded-lg border border-teal-100">
                             {Object.values(staff.permissions || {}).filter(v => v === true).length} ACTIVE
                          </span>
                       </div>

                       <div className="flex gap-2">
                          <button 
                            onClick={() => setEditingPermissions(staff)}
                            className="flex-1 py-3 bg-slate-50 hover:bg-blue-50 text-slate-600 hover:text-blue-600 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all border border-slate-100 hover:border-blue-200 flex items-center justify-center gap-2"
                          >
                             <ShieldCheck size={14} /> Configure
                          </button>
                          {staff.role !== 'owner' && (
                             <button 
                               onClick={() => handleDeleteStaff(staff.id)}
                               className="p-3 bg-slate-50 hover:bg-rose-50 text-slate-300 hover:text-rose-500 rounded-2xl transition-all border border-slate-100 hover:border-rose-100"
                             >
                                <Trash2 size={16} />
                             </button>
                          )}
                       </div>
                    </div>
                 </div>
              ))
           )}
        </div>

        {/* MODAL: ADD STAFF */}
        {showModal && (
           <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-md animate-in fade-in duration-300">
              <div className="bg-white rounded-[56px] w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
                 <div className="p-10 pb-0 flex justify-between items-center">
                    <h2 className="text-3xl font-black text-slate-800 tracking-tighter">Add New Employee</h2>
                    <button onClick={() => setShowModal(false)} className="p-4 text-slate-300 hover:text-slate-900"><X size={32}/></button>
                 </div>

                 <form onSubmit={handleSaveStaff} className="p-10 space-y-8 overflow-y-auto custom-scrollbar flex-1">
                    <div className="grid grid-cols-2 gap-6">
                       <div className="space-y-2">
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Full Name</label>
                          <input required className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl font-bold" value={formData.full_name} onChange={e => setFormData({...formData, full_name: e.target.value})} />
                       </div>
                       <div className="space-y-2">
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Designation / Role</label>
                          <input 
                            required 
                            placeholder="e.g. Area Manager"
                            className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl font-bold outline-none focus:bg-white focus:border-teal-400 transition-all" 
                            value={formData.role} 
                            onChange={e => setFormData({...formData, role: e.target.value})} 
                          />
                       </div>
                       <div className="space-y-2">
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Email</label>
                          <input type="email" required className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl font-bold" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} />
                       </div>
                       <div className="space-y-2">
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Temp Password</label>
                          <input type="password" required minLength={6} className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl font-bold" value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} />
                       </div>
                    </div>

                    <div className="space-y-6 pt-6 border-t border-slate-50">
                       <h3 className="text-sm font-black uppercase tracking-widest text-slate-400 flex items-center gap-3">
                          <ShieldCheck size={18} className="text-teal-600" /> Initial Permissions
                       </h3>
                       <PermissionsGrid 
                          permissions={formData.permissions} 
                          onToggle={handleTogglePermission} 
                       />
                    </div>
                 </form>

                 <div className="p-10 bg-slate-50 flex justify-end">
                    <button 
                       type="submit" 
                       disabled={isSubmitting}
                       onClick={handleSaveStaff} 
                       className={`px-12 py-5 rounded-[32px] font-black uppercase tracking-[0.2em] text-xs shadow-xl flex items-center justify-center gap-3 transition-all ${isSubmitting ? 'bg-slate-400 text-white' : 'bg-teal-600 text-white shadow-teal-200'}`}
                    >
                       {isSubmitting ? <Loader2 size={16} className="animate-spin" /> : <ShieldCheck size={16} />}
                       {isSubmitting ? 'Initializing...' : 'Initialize Account'}
                    </button>
                 </div>
              </div>
           </div>
        )}

        {/* MODAL: MANAGE PERMISSIONS (EXISTING) */}
        {editingPermissions && (
           <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-md animate-in fade-in duration-300">
              <div className="bg-white rounded-[56px] w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
                 <div className="p-10 pb-6 border-b border-slate-50">
                    <div className="flex justify-between items-start">
                       <div>
                          <div className="text-[10px] font-black text-blue-600 uppercase tracking-widest mb-1">Access Control</div>
                          <h2 className="text-3xl font-black text-slate-800 tracking-tighter leading-none">{editingPermissions.full_name}</h2>
                          <p className="text-xs text-slate-400 font-medium mt-1">{editingPermissions.email}</p>
                       </div>
                       <button onClick={() => setEditingPermissions(null)} className="p-2 text-slate-300 hover:text-slate-900"><X size={32}/></button>
                    </div>
                 </div>

                 <div className="p-10 space-y-8 overflow-y-auto custom-scrollbar flex-1 bg-slate-50/30">
                    <PermissionsGrid 
                       permissions={editingPermissions.permissions} 
                       onToggle={handleTogglePermission} 
                    />
                 </div>

                 <div className="p-10 bg-white border-t border-slate-50 flex justify-between items-center">
                    <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest italic flex items-center gap-2">
                       <Check size={16} className="text-emerald-500" /> Auto-saves across shop modules
                    </div>
                    <button 
                      disabled={isSubmitting}
                      onClick={handleUpdatePermissions} 
                      className={`px-12 py-5 rounded-[32px] font-black uppercase tracking-[0.15em] text-xs shadow-xl flex items-center gap-3 transition-all ${isSubmitting ? 'bg-slate-400 text-white' : 'bg-slate-900 text-white hover:bg-blue-600'}`}
                    >
                       {isSubmitting ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />} 
                       {isSubmitting ? 'Updating...' : 'Update Permissions'}
                    </button>
                 </div>
              </div>
           </div>
        )}
      </div>
    </DashboardLayout>
  );
}

function PermissionsGrid({ permissions, onToggle }: { permissions: PermissionSet, onToggle: (key: string) => void }) {
   return (
      <div className="space-y-10">
         {PERMISSION_GROUPS.map((group) => (
            <div key={group.name} className="space-y-4">
               <div className="flex items-center gap-3 text-xs font-black uppercase tracking-widest text-slate-500 bg-white border border-slate-100 w-fit px-4 py-2 rounded-2xl shadow-sm">
                  {group.icon} {group.name}
               </div>
               <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {group.keys.map((p) => {
                     const isActive = permissions[p.key] === true;
                     return (
                        <button
                           key={p.key}
                           type="button"
                           onClick={() => onToggle(p.key)}
                           className={`flex items-center justify-between p-5 rounded-3xl border-2 transition-all text-left ${
                              isActive 
                                ? 'bg-white border-emerald-500 shadow-md shadow-emerald-50 ring-4 ring-emerald-500/5' 
                                : 'bg-slate-50/50 border-slate-100 text-slate-400 grayscale opacity-70 hover:opacity-100 hover:grayscale-0'
                           }`}
                        >
                           <span className={`text-xs font-black uppercase tracking-tighter ${isActive ? 'text-slate-800' : 'text-slate-400'}`}>
                              {p.label}
                           </span>
                           <div className={`w-6 h-6 rounded-lg flex items-center justify-center transition-all ${
                              isActive ? 'bg-emerald-500 text-white' : 'bg-slate-200 text-white'
                           }`}>
                              <Check size={14} strokeWidth={4} />
                           </div>
                        </button>
                     );
                  })}
               </div>
            </div>
         ))}
      </div>
   );
}
