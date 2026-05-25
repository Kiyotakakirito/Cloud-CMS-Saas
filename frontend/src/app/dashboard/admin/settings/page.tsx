"use client";

import { useState, useEffect } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { api } from "@/lib/api";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useNotify } from "@/components/ui/notifications";

interface Setting {
  key: string;
  value: any;
  description: string;
}

export default function SystemSettingsPage() {
  const [settings, setSettings] = useState<Setting[]>([]);
  const [loading, setLoading] = useState(true);
  const notify = useNotify();

  useEffect(() => {
    async function fetchSettings() {
      try {
        const res = await api.get<Setting[]>("/settings");
        if (res.data) setSettings(res.data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    fetchSettings();
  }, []);

  const handleUpdate = async (key: string, newValue: any) => {
    try {
      const res = await api.put(`/settings/${key}`, { value: newValue });
      if (res.data) {
        setSettings(prev => prev.map(s => s.key === key ? { ...s, value: newValue } : s));
        notify.success("Success", `${key} updated successfully.`);
      }
    } catch (err) {
      notify.error("Error", "Failed to update setting.");
    }
  };

  return (
    <DashboardLayout allowedRoles={["admin"]}>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Platform Configuration</h1>
          <p className="text-slate-500">Global rules and environment parameters for the entire SaaS.</p>
        </div>

        {loading ? (
          <div className="p-12 text-center text-slate-400">Loading configurations...</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {settings.map((s) => (
              <Card key={s.key} className="border-slate-200 shadow-sm">
                <CardHeader>
                  <CardTitle className="text-sm font-bold uppercase tracking-wider text-slate-600">{s.key.replace(/_/g, ' ')}</CardTitle>
                  <CardDescription>{s.description}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {typeof s.value === 'boolean' ? (
                    <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl">
                       <input 
                         type="checkbox" 
                         checked={s.value} 
                         onChange={(e) => handleUpdate(s.key, e.target.checked)}
                         className="w-5 h-5 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                       />
                       <span className="text-sm font-semibold text-slate-700">{s.value ? "Enabled" : "Disabled"}</span>
                    </div>
                  ) : (
                    <div className="flex gap-2">
                      <Input 
                        defaultValue={s.value} 
                        id={`input-${s.key}`}
                        className="flex-1"
                      />
                      <Button 
                        size="sm"
                        onClick={() => {
                          const input = document.getElementById(`input-${s.key}`) as HTMLInputElement;
                          handleUpdate(s.key, input.value);
                        }}
                      >
                        Update
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
