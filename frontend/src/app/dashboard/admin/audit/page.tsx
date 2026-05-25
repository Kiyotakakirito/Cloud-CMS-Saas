"use client";

import { useState, useEffect, useCallback } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { api } from "@/lib/api";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { LoadingSpinner } from "@/components/ui/loading";
import { Button } from "@/components/ui/button";

interface AuditLog {
  id: number;
  created_at: string;
  action: string;
  resource: string;
  user_profiles?: {
    full_name: string;
    email: string;
  };
  tenants?: {
    name: string;
  };
  details: any;
  ip_address: string;
}

export default function AuditLogsPage() {
  const [logs, setAuditLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [owners, setOwners] = useState<any[]>([]);
  const [selectedOwner, setSelectedOwner] = useState<string>("all");

  const fetchLogs = useCallback(async (tenantId?: string) => {
    setLoading(true);
    try {
      const params: any = {};
      if (tenantId && tenantId !== "all") params.tenant_id = tenantId;
      
      const res = await api.get<AuditLog[]>("/audit/", { params });
      if (res.data) setAuditLogs(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    async function init() {
      const ownersRes = await api.get("/tenants/");
      if (ownersRes.data) setOwners(ownersRes.data);
      fetchLogs();
    }
    init();
  }, [fetchLogs]);

  const handleOwnerChange = (val: string) => {
    setSelectedOwner(val);
    fetchLogs(val);
  };

  const getActionColor = (action: string) => {
    if (action.includes("DELETE") || action.includes("PURGE")) return "text-red-600 bg-red-50";
    if (action.includes("CREATE")) return "text-green-600 bg-green-50";
    if (action.includes("UPDATE") || action.includes("RESET")) return "text-blue-600 bg-blue-50";
    return "text-slate-600 bg-slate-50";
  };

  return (
    <DashboardLayout allowedRoles={["admin"]}>
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-slate-800">Platform Audit Logs</h1>
            <p className="text-slate-500 font-medium">Global activity trail for security and compliance.</p>
          </div>

          <div className="flex items-center gap-3">
            <Select value={selectedOwner} onValueChange={handleOwnerChange}>
              <SelectTrigger className="w-full md:w-64 bg-white border-slate-200">
                <SelectValue placeholder="Filter by Business" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Platform Activity</SelectItem>
                {owners.map((o) => (
                  <SelectItem key={o.id} value={o.id.toString()}>{o.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button variant="outline" size="icon" onClick={() => fetchLogs(selectedOwner)} className="bg-white">
               <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
            </Button>
          </div>
        </div>

        <div className="border rounded-2xl bg-white shadow-sm overflow-hidden border-slate-100">
          {loading ? (
            <div className="p-20 text-center flex flex-col items-center gap-3">
               <LoadingSpinner />
               <p className="text-slate-400 text-sm">Decrypting activity logs...</p>
            </div>
          ) : logs.length === 0 ? (
            <div className="p-20 text-center">
              <div className="text-4xl mb-4">📭</div>
              <h3 className="text-lg font-semibold text-slate-700">No logs found</h3>
              <p className="text-slate-500">Events will appear here as users perform actions.</p>
            </div>
          ) : (
            <Table>
              <TableHeader className="bg-slate-50">
                <TableRow>
                  <TableHead className="font-bold py-4 pl-6 text-slate-700">Event Time</TableHead>
                  <TableHead className="font-bold text-slate-700">Actor</TableHead>
                  <TableHead className="font-bold text-slate-700">Organization</TableHead>
                  <TableHead className="font-bold text-slate-700">Operation</TableHead>
                  <TableHead className="font-bold text-slate-700">Resource</TableHead>
                  <TableHead className="text-right font-bold pr-6 text-slate-700">Connectivity</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {logs.map((log) => (
                  <TableRow key={log.id} className="text-sm hover:bg-slate-50/50 transition-colors border-slate-50">
                    <TableCell className="pl-6 py-4 text-slate-500 font-medium">
                      {new Date(log.created_at).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                    </TableCell>
                    <TableCell>
                      <div className="font-bold text-slate-700">{log.user_profiles?.full_name || "System Process"}</div>
                      <div className="text-[10px] text-slate-400 font-mono">{log.user_profiles?.email || "internal-service"}</div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="font-semibold text-[10px] border-slate-200 text-slate-500">
                        {log.tenants?.name || "PLATFORM"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <span className={`px-2 py-0.5 rounded-md font-bold text-[9px] tracking-tight uppercase ${getActionColor(log.action)}`}>
                        {log.action}
                      </span>
                    </TableCell>
                    <TableCell className="text-slate-600 font-medium">{log.resource} <span className="text-[10px] text-slate-300">#{log.id}</span></TableCell>
                    <TableCell className="text-right pr-6">
                      <span className="text-[10px] text-slate-400 font-mono bg-slate-50 px-2 py-0.5 rounded border border-slate-100">{log.ip_address || "hidden-internal"}</span>
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
