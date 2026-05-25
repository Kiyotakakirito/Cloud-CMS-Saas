"use client";

import { useState, useEffect } from "react";
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
import { getToken } from "@/lib/auth";
import { api, API_ENDPOINTS } from "@/lib/api";

interface Tenant {
  id: number;
  name: string;
  slug: string;
  is_active: boolean;
  created_at: string;
}

export default function TenantsPage() {
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isDetailDialogOpen, setIsDetailDialogOpen] = useState(false);
  const [selectedTenant, setSelectedTenant] = useState<Tenant | null>(null);
  const [tenantStats, setTenantStats] = useState<any>(null);
  
  const initialNewTenant = { 
    name: "", 
    slug: "", 
    is_active: true,
    owner_email: "",
    owner_password: "",
    owner_full_name: ""
  };
  const [newTenant, setNewTenant] = useState(initialNewTenant);
  const [selectedTenants, setSelectedTenants] = useState<number[]>([]);

  const fetchTenants = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await api.get<Tenant[]>(API_ENDPOINTS.TENANTS.LIST);
      if (response.data) {
        setTenants(response.data);
      } else {
        throw new Error(response.error || "Failed to load tenants");
      }
    } catch (err) {
      setError("Could not load tenants. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTenants();
  }, []);

  const handleCreateTenant = async () => {
    try {
      const response = await api.post(API_ENDPOINTS.TENANTS.CREATE, newTenant);

      if (response.error) {
        throw new Error(response.error);
      }

      setIsCreateDialogOpen(false);
      setNewTenant(initialNewTenant);
      fetchTenants(); 
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create tenant");
    }
  };

  const handleDeleteTenant = async (tenantId: number) => {
    if (!confirm("Are you sure you want to delete this tenant? This action cannot be undone.")) {
      return;
    }

    try {
      const response = await api.delete(API_ENDPOINTS.TENANTS.DELETE(tenantId));

      if (response.error) {
        throw new Error(response.error);
      }

      fetchTenants(); 
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete tenant");
    }
  };

  const handleToggleStatus = async (tenantId: number, currentStatus: boolean) => {
    try {
      const response = await api.put(API_ENDPOINTS.TENANTS.UPDATE(tenantId), { is_active: !currentStatus });

      if (response.error) {
        throw new Error(response.error);
      }

      fetchTenants(); 
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update tenant");
    }
  };

  const fetchTenantDetails = async (tenantId: number) => {
    try {
      // Fetch data specifically for this tenant
      const usersRes = await api.get("/users", { params: { tenant_id: tenantId } });
      const customersRes = await api.get(API_ENDPOINTS.CUSTOMERS.LIST, { params: { tenant_id: tenantId } });

      if (usersRes.data && customersRes.data) {
        setTenantStats({
          total_users: usersRes.data.length,
          total_customers: customersRes.data.length,
          active_customers: customersRes.data.filter((c: any) => c.status === "Active").length,
        });
      }
    } catch (err) {
      console.error("Failed to fetch tenant details", err);
    }
  };

  const handleViewDetails = async (tenant: Tenant) => {
    setSelectedTenant(tenant);
    setTenantStats(null);
    setIsDetailDialogOpen(true);
    await fetchTenantDetails(tenant.id);
  };

  const handleBulkActivate = async () => {
    if (selectedTenants.length === 0) return;

    try {
      await Promise.all(
        selectedTenants.map(tenantId =>
          api.put(API_ENDPOINTS.TENANTS.UPDATE(tenantId), { is_active: true })
        )
      );
      fetchTenants();
      setSelectedTenants([]);
    } catch (err) {
      setError("Failed to activate tenants");
    }
  };

  const handleBulkDeactivate = async () => {
    if (selectedTenants.length === 0) return;

    try {
      await Promise.all(
        selectedTenants.map(tenantId =>
          api.put(API_ENDPOINTS.TENANTS.UPDATE(tenantId), { is_active: false })
        )
      );
      fetchTenants();
      setSelectedTenants([]);
    } catch (err) {
      setError("Failed to deactivate tenants");
    }
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedTenants(filteredTenants.map(tenant => tenant.id));
    } else {
      setSelectedTenants([]);
    }
  };

  const handleSelectTenant = (tenantId: number, checked: boolean) => {
    if (checked) {
      setSelectedTenants(prev => [...prev, tenantId]);
    } else {
      setSelectedTenants(prev => prev.filter(id => id !== tenantId));
    }
  };

  const filteredTenants = tenants.filter(tenant =>
    tenant.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    tenant.slug.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <DashboardLayout allowedRoles={["admin"]}>
      <div className="p-8 space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold tracking-tight">Owner Management</h1>
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-blue-600 hover:bg-blue-700">Create New Owner</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create New Owner & Shop</DialogTitle>
                <DialogDescription>
                  Register a new business and their primary administrator account.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Owner Name / Shop Name</label>
                    <Input
                      value={newTenant.name}
                      onChange={(e) => setNewTenant({ ...newTenant, name: e.target.value })}
                      placeholder="e.g. Kirito Shop"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Unique Slug</label>
                    <Input
                      value={newTenant.slug}
                      onChange={(e) => setNewTenant({ ...newTenant, slug: e.target.value.toLowerCase().replace(/\s+/g, '-') })}
                      placeholder="e.g. kirito-shop"
                    />
                  </div>
                </div>

                <div className="border-t pt-4 mt-4">
                  <h3 className="text-sm font-bold text-slate-700 mb-3">Owner Credentials</h3>
                  <div className="space-y-3">
                    <div>
                      <label className="block text-sm font-medium mb-1">Owner Full Name</label>
                      <Input
                        value={newTenant.owner_full_name}
                        onChange={(e) => setNewTenant({ ...newTenant, owner_full_name: e.target.value })}
                        placeholder="Enter owner's real name"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">Owner Email</label>
                      <Input
                        type="email"
                        value={newTenant.owner_email}
                        onChange={(e) => setNewTenant({ ...newTenant, owner_email: e.target.value })}
                        placeholder="owner@example.com"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">Login Password</label>
                      <Input
                        type="password"
                        value={newTenant.owner_password}
                        onChange={(e) => setNewTenant({ ...newTenant, owner_password: e.target.value })}
                        placeholder="Minimum 6 characters"
                      />
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="is_active"
                    checked={newTenant.is_active}
                    onChange={(e) => setNewTenant({ ...newTenant, is_active: e.target.checked })}
                    className="rounded border-gray-300"
                  />
                  <label htmlFor="is_active" className="text-sm font-medium">
                    Active
                  </label>
                </div>
                <Button onClick={handleCreateTenant} className="w-full bg-blue-600 hover:bg-blue-700">
                  Create Owner & Tenant
                </Button>
              </div>
            </DialogContent>
          </Dialog>

          {/* Tenant Detail Dialog */}
          <Dialog open={isDetailDialogOpen} onOpenChange={setIsDetailDialogOpen}>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Owner Details</DialogTitle>
                <DialogDescription>
                  Detailed statistics and management options for this business.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-6">
                {selectedTenant && (
                  <>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-slate-600 mb-1">Owner / Shop Name</label>
                        <p className="text-lg font-semibold text-slate-800">{selectedTenant.name}</p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-600 mb-1">System ID</label>
                        <code className="text-sm bg-slate-100 px-2 py-1 rounded text-slate-700">{selectedTenant.slug}</code>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-600 mb-1">Status</label>
                        <Badge variant={selectedTenant.is_active ? "default" : "secondary"}>
                          {selectedTenant.is_active ? "Active" : "Inactive"}
                        </Badge>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-600 mb-1">Joined Date</label>
                        <p className="text-sm text-slate-600">
                          {new Date(selectedTenant.created_at).toLocaleDateString()}
                        </p>
                      </div>
                    </div>

                    {tenantStats && (
                      <div className="border-t pt-4">
                        <h3 className="font-semibold text-slate-700 mb-3">Business Metrics</h3>
                        <div className="grid grid-cols-3 gap-4">
                          <div className="text-center p-3 bg-blue-50 rounded-lg">
                            <div className="text-2xl font-bold text-blue-600">{tenantStats.total_users}</div>
                            <div className="text-sm text-blue-500">Users</div>
                          </div>
                          <div className="text-center p-3 bg-green-50 rounded-lg">
                            <div className="text-2xl font-bold text-green-600">{tenantStats.total_customers}</div>
                            <div className="text-sm text-green-500">Customers</div>
                          </div>
                          <div className="text-center p-3 bg-purple-50 rounded-lg">
                            <div className="text-2xl font-bold text-purple-600">{tenantStats.active_customers}</div>
                            <div className="text-sm text-purple-500">Active Customers</div>
                          </div>
                        </div>
                      </div>
                    )}

                    <div className="flex gap-2 pt-4">
                      <Button
                        variant="outline"
                        onClick={() => handleToggleStatus(selectedTenant.id, selectedTenant.is_active)}
                      >
                        {selectedTenant.is_active ? "Deactivate" : "Activate"}
                      </Button>
                      <Button
                        variant="destructive"
                        onClick={() => {
                          setIsDetailDialogOpen(false);
                          handleDeleteTenant(selectedTenant.id);
                        }}
                      >
                        Delete Business
                      </Button>
                    </div>
                  </>
                )}
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <div className="flex gap-4 items-center justify-between">
          <div className="relative flex-1 max-w-sm">
            <Input
              placeholder="Search owners..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          {selectedTenants.length > 0 && (
            <div className="flex gap-2">
              <span className="text-sm text-slate-600">
                {selectedTenants.length} selected
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={handleBulkActivate}
              >
                Activate
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleBulkDeactivate}
              >
                Deactivate
              </Button>
            </div>
          )}
        </div>

        <div className="border rounded-lg bg-white overflow-hidden shadow-sm">
          {loading ? (
            <div className="p-8 text-center text-gray-500">Loading owners…</div>
          ) : error ? (
            <div className="p-8 text-center text-red-500">{error}</div>
          ) : filteredTenants.length === 0 ? (
            <div className="p-8 text-center text-gray-400">No owners found.</div>
          ) : (
            <Table>
              <TableHeader className="bg-gray-50">
                <TableRow>
                  <TableHead className="w-12">
                    <input
                      type="checkbox"
                      className="rounded border-gray-300"
                      onChange={(e) => handleSelectAll(e.target.checked)}
                      checked={selectedTenants.length === filteredTenants.length && filteredTenants.length > 0}
                    />
                  </TableHead>
                  <TableHead>Owner / Shop Name</TableHead>
                  <TableHead>System ID</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Joined Date</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredTenants.map((tenant) => (
                  <TableRow key={tenant.id}>
                    <TableCell>
                      <input
                        type="checkbox"
                        className="rounded border-gray-300"
                        checked={selectedTenants.includes(tenant.id)}
                        onChange={(e) => handleSelectTenant(tenant.id, e.target.checked)}
                      />
                    </TableCell>
                    <TableCell className="font-medium">
                      {tenant.name}
                    </TableCell>
                    <TableCell>
                      <code className="text-sm bg-gray-100 px-2 py-1 rounded">
                        {tenant.slug}
                      </code>
                    </TableCell>
                    <TableCell>
                      <Badge variant={tenant.is_active ? "default" : "secondary"}>
                        {tenant.is_active ? "Active" : "Inactive"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {new Date(tenant.created_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="outline"
                        size="sm"
                        className="mr-2"
                        onClick={() => handleViewDetails(tenant)}
                      >
                        View
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="mr-2"
                        onClick={() => handleToggleStatus(tenant.id, tenant.is_active)}
                      >
                        {tenant.is_active ? "Deactivate" : "Activate"}
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => handleDeleteTenant(tenant.id)}
                      >
                        Delete
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
