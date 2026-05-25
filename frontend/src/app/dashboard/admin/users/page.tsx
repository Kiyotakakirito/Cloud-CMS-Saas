"use client";

import { useState, useEffect, useCallback } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { UserInfo, ROLE_LABELS, ROLE_COLORS } from "@/lib/auth";
import { api } from "@/lib/api";
import { LoadingSpinner } from "@/components/ui/loading";

export default function UsersPage() {
  const [users, setUsers] = useState<UserInfo[]>([]);
  const [owners, setOwners] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [ownerFilter, setOwnerFilter] = useState<string>("all");
  
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isResetPasswordOpen, setIsResetPasswordOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserInfo | null>(null);
  const [newPassword, setNewPassword] = useState("");
  
  const initialNewUser = {
    email: "",
    full_name: "",
    password: "",
    role: "worker",
    tenant_id: "0",
    is_active: true
  };
  const [newUser, setNewUser] = useState(initialNewUser);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params: any = {};
      if (ownerFilter !== "all") params.tenant_id = ownerFilter;
      
      const response = await api.get<UserInfo[]>("/users/", { params });
      if (response.data) {
        setUsers(response.data);
      } else {
        setUsers([]);
      }
    } catch (err) {
      setError("Could not load users.");
    } finally {
      setLoading(false);
    }
  }, [ownerFilter]);

  const fetchOwners = useCallback(async () => {
    try {
      const res = await api.get("/tenants/");
      if (res.data) setOwners(res.data);
    } catch (err) {
      console.error(err);
    }
  }, []);

  useEffect(() => {
    fetchOwners();
    fetchUsers();
  }, [fetchUsers, fetchOwners]);

  const filteredUsers = users.filter(user => {
    const searchStr = searchTerm.toLowerCase();
    const matchesSearch = user.email.toLowerCase().includes(searchStr) ||
                         (user.full_name || "").toLowerCase().includes(searchStr);
    const matchesRole = roleFilter === "all" || user.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  const handleCreateUser = async () => {
    if (!newUser.email.includes(".") || !newUser.email.includes("@")) {
      alert("Please enter a valid email address (e.g. user@example.com)");
      return;
    }
    try {
      const payload = {
        ...newUser,
        tenant_id: newUser.tenant_id === "0" ? null : parseInt(newUser.tenant_id)
      };
      const response = await api.post("/users/create/", payload);

      if (response.error) throw new Error(response.error);

      setIsCreateDialogOpen(false);
      setNewUser(initialNewUser);
      fetchUsers();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to create user");
    }
  };

  const handleUpdateUser = async () => {
    if (!selectedUser) return;
    try {
      const response = await api.put(`/users/${selectedUser.id}/`, {
        full_name: selectedUser.full_name,
        role: selectedUser.role,
        is_active: (selectedUser as any).is_active,
        tenant_id: String(selectedUser.tenant_id) === "0" ? null : parseInt(selectedUser.tenant_id as any)
      });
      if (response.error) throw new Error(response.error);
      setIsEditDialogOpen(false);
      fetchUsers();
    } catch (err) {
      alert("Failed to update user");
    }
  };

  const handleResetPassword = async () => {
    if (!selectedUser || !newPassword) return;
    try {
      const response = await api.post(`/users/${selectedUser.id}/reset-password/`, { password: newPassword });
      if (response.error) throw new Error(response.error);
      setIsResetPasswordOpen(false);
      setNewPassword("");
      alert("Password has been force-reset.");
    } catch (err) {
      alert("Failed to reset password");
    }
  };

  const handleDeleteUser = async (user: UserInfo) => {
    const isOwner = user.role === "owner" && user.tenant_id;
    let confirmMsg = "Are you sure? This is permanent.";
    if (isOwner) {
      confirmMsg = "Warning: This user is a Shop Owner. Purging them will remove their account but NOT their shop. To remove the entire shop, use 'Manage Owners' instead. Continue?";
    }

    if (!confirm(confirmMsg)) return;
    try {
      await api.delete(`/users/${user.id}/`);
      fetchUsers();
    } catch (err) {
      alert("Failed to delete user");
    }
  };

  return (
    <DashboardLayout allowedRoles={["admin"]}>
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-slate-800">Global User Control</h1>
            <p className="text-slate-500 font-medium">Full sovereignty over every platform account.</p>
          </div>
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-blue-600 hover:bg-blue-700 shadow-md">Create Platform User</Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle>Add New User</DialogTitle>
                <DialogDescription>Create a global admin or assign a user to a specific shop.</DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                   <div className="space-y-1.5">
                     <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Email Address</label>
                     <Input value={newUser.email} onChange={(e) => setNewUser({ ...newUser, email: e.target.value })} placeholder="email@example.com" />
                   </div>
                   <div className="space-y-1.5">
                     <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Full Name</label>
                     <Input value={newUser.full_name} onChange={(e) => setNewUser({ ...newUser, full_name: e.target.value })} placeholder="John Doe" />
                   </div>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Login Password</label>
                  <Input type="password" value={newUser.password} onChange={(e) => setNewUser({ ...newUser, password: e.target.value })} placeholder="Min 6 characters" />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Platform Role</label>
                    <Select value={newUser.role} onValueChange={(v) => setNewUser({ ...newUser, role: v })}>
                      <SelectTrigger className="bg-white"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="admin">Administrator</SelectItem>
                        <SelectItem value="owner">Shop Owner</SelectItem>
                        <SelectItem value="senior_worker">Senior Tech</SelectItem>
                        <SelectItem value="worker">Worker</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Assign to Shop</label>
                    <Select value={newUser.tenant_id} onValueChange={(v) => setNewUser({ ...newUser, tenant_id: v })}>
                      <SelectTrigger className="bg-white"><SelectValue placeholder="Select Business" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="0">None (Platform Wide)</SelectItem>
                        {owners.map(o => <SelectItem key={o.id} value={o.id.toString()}>{o.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <Button onClick={handleCreateUser} className="w-full bg-blue-600 hover:bg-blue-700 h-11 mt-4">Create Account</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
          <Input 
            placeholder="Search by name/email..." 
            value={searchTerm} 
            onChange={(e) => setSearchTerm(e.target.value)} 
            className="bg-slate-50 border-none"
          />
          <Select value={roleFilter} onValueChange={setRoleFilter}>
            <SelectTrigger className="bg-slate-50 border-none"><SelectValue placeholder="Filter Role" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Roles</SelectItem>
              <SelectItem value="admin">Administrators</SelectItem>
              <SelectItem value="owner">Shop Owners</SelectItem>
              <SelectItem value="worker">Workers</SelectItem>
            </SelectContent>
          </Select>
          <Select value={ownerFilter} onValueChange={setOwnerFilter}>
            <SelectTrigger className="bg-slate-50 border-none"><SelectValue placeholder="Filter Shop" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Businesses</SelectItem>
              {owners.map(o => <SelectItem key={o.id} value={o.id.toString()}>{o.name}</SelectItem>)}
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={fetchUsers} className="border-slate-200">Refresh List</Button>
        </div>

        <div className="border rounded-2xl bg-white shadow-sm overflow-hidden border-slate-100">
          {loading ? (
            <div className="p-20 text-center flex flex-col items-center gap-3">
              <LoadingSpinner />
              <p className="text-slate-400 text-sm font-medium">Synchronizing accounts...</p>
            </div>
          ) : error ? (
            <div className="p-20 text-center text-red-500 font-medium">{error}</div>
          ) : filteredUsers.length === 0 ? (
            <div className="p-20 text-center">
              <div className="text-4xl mb-4">🔍</div>
              <h3 className="text-lg font-semibold text-slate-700">No users found</h3>
              <p className="text-slate-500">Adjust your filters or add a new member.</p>
            </div>
          ) : (
            <Table>
              <TableHeader className="bg-slate-50">
                <TableRow className="hover:bg-transparent">
                  <TableHead className="font-bold py-4 pl-6 text-slate-700">User Identity</TableHead>
                  <TableHead className="font-bold text-slate-700">Business / Shop</TableHead>
                  <TableHead className="font-bold text-slate-700">Platform Role</TableHead>
                  <TableHead className="font-bold text-slate-700">Status</TableHead>
                  <TableHead className="text-right font-bold pr-6 text-slate-700">Management</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUsers.map((u) => (
                  <TableRow key={u.id} className="hover:bg-slate-50/50 transition-colors border-slate-50">
                    <TableCell className="pl-6 py-4">
                      <div className="font-bold text-slate-800">{u.full_name || "Anonymous User"}</div>
                      <div className="text-xs text-slate-500 font-medium">{u.email}</div>
                    </TableCell>
                    <TableCell>
                      {u.tenant_id ? (
                        <Badge variant="outline" className="font-semibold text-slate-600 border-slate-200 bg-white">
                          {owners.find(o => o.id === u.tenant_id)?.name || `Shop #${u.tenant_id}`}
                        </Badge>
                      ) : (
                        <span className="text-xs text-slate-400 italic">Platform Wide</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge className={`${ROLE_COLORS[u.role]} border-none px-3 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider`}>
                        {ROLE_LABELS[u.role]}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1.5">
                        <div className={`w-2 h-2 rounded-full ${u.is_active ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.4)]' : 'bg-slate-300'}`}></div>
                        <span className={`text-sm font-semibold ${u.is_active ? 'text-green-700' : 'text-slate-500'}`}>
                          {u.is_active ? "Active" : "Locked"}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right pr-6 space-x-1">
                      <Button variant="ghost" size="sm" className="h-8 px-2 text-slate-600 hover:text-blue-600 font-bold text-[11px] uppercase tracking-tighter" onClick={() => { setSelectedUser(u); setIsResetPasswordOpen(true); }}>
                        Reset Key
                      </Button>
                      <Button variant="ghost" size="sm" className="h-8 px-2 text-slate-600 hover:text-blue-600 font-bold text-[11px] uppercase tracking-tighter" onClick={() => { setSelectedUser(u); setIsEditDialogOpen(true); }}>
                        Edit
                      </Button>
                      <Button variant="ghost" size="sm" className="h-8 px-2 text-red-500 hover:bg-red-50 font-bold text-[11px] uppercase tracking-tighter" onClick={() => handleDeleteUser(u)}>
                        Purge
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>

        {/* Override Security Dialog */}
        <Dialog open={isResetPasswordOpen} onOpenChange={setIsResetPasswordOpen}>
          <DialogContent className="sm:max-w-[400px]">
             <DialogHeader>
                <DialogTitle className="text-red-600">Security Override</DialogTitle>
                <DialogDescription>Set a new master password for <strong>{selectedUser?.email}</strong>. This bypasses their current login.</DialogDescription>
             </DialogHeader>
             <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-600 uppercase">New Master Password</label>
                  <Input type="password" placeholder="Minimum 6 characters" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
                </div>
                <Button onClick={handleResetPassword} className="w-full bg-red-600 hover:bg-red-700 text-white h-11" disabled={newPassword.length < 6}>
                  Force Update Credentials
                </Button>
             </div>
          </DialogContent>
        </Dialog>
        
        {/* Edit Profile Dialog */}
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent className="sm:max-w-[450px]">
            <DialogHeader>
              <DialogTitle className="text-slate-800 font-bold">Edit Account Control</DialogTitle>
              <DialogDescription>Modify permissions and profile metadata.</DialogDescription>
            </DialogHeader>
            {selectedUser && (
              <div className="space-y-5 py-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-500 uppercase">User Full Name</label>
                  <Input value={selectedUser.full_name || ""} onChange={(e) => setSelectedUser({...selectedUser, full_name: e.target.value})} placeholder="Display name" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-500 uppercase">Current Role</label>
                    <Select value={selectedUser.role} onValueChange={(v) => setSelectedUser({...selectedUser, role: v as any})}>
                      <SelectTrigger className="bg-slate-50 border-none"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="admin">Admin</SelectItem>
                        <SelectItem value="owner">Owner</SelectItem>
                        <SelectItem value="worker">Worker</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-500 uppercase">Reassign Shop</label>
                    <Select value={(selectedUser.tenant_id || "0").toString()} onValueChange={(v) => setSelectedUser({...selectedUser, tenant_id: v === "0" ? null : parseInt(v)})}>
                      <SelectTrigger className="bg-slate-50 border-none"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="0">Platform Wide</SelectItem>
                        {owners.map(o => <SelectItem key={o.id} value={o.id.toString()}>{o.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-4 bg-slate-50 rounded-2xl border border-slate-100">
                  <input 
                    type="checkbox" 
                    id="edit_is_active"
                    checked={selectedUser.is_active} 
                    onChange={(e) => setSelectedUser({...selectedUser, is_active: e.target.checked})}
                    className="w-5 h-5 rounded border-slate-300 text-blue-600"
                  />
                  <label htmlFor="edit_is_active" className="text-sm font-bold text-slate-700">Account Active (Clear Lock)</label>
                </div>
                <Button onClick={handleUpdateUser} className="w-full bg-blue-600 hover:bg-blue-700 h-11 shadow-sm font-bold">Apply Changes</Button>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
