"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useNotify } from "@/components/ui/notifications";
import { api, API_ENDPOINTS } from "@/lib/api";

interface OutageFormProps {
  isOpen: boolean;
  onClose: () => void;
  outage?: any;
}

export function OutageForm({ isOpen, onClose, outage }: OutageFormProps) {
  const notify = useNotify();
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    title: outage?.title || "",
    description: outage?.description || "",
    affected_area: outage?.affected_area || "",
    severity: outage?.severity || "minor",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      if (outage) {
        // Update existing outage
        const response = await api.patch(`/outages/${outage.id}`, formData);

        if (response.data) {
          notify.success("Success", "Outage updated successfully");
          onClose();
        } else if (response.error) {
          notify.error("Error", response.error);
        }
      } else {
        // Create new outage
        const response = await api.post("/outages", {
          ...formData,
          status: "reported",
          start_time: new Date().toISOString(),
        });

        if (response.data) {
          notify.success("Success", "Outage reported successfully");
          onClose();
        } else if (response.error) {
          notify.error("Error", response.error);
        }
      }
    } catch (error: any) {
      notify.error("Error", error.message || "Failed to save outage");
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            {outage ? "Edit Outage" : "Report Network Outage"}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="title">Title*</Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) => handleInputChange("title", e.target.value)}
              placeholder="e.g., Fiber Cut in Area X"
              required
            />
          </div>

          <div>
            <Label htmlFor="affected_area">Affected Area*</Label>
            <Input
              id="affected_area"
              value={formData.affected_area}
              onChange={(e) => handleInputChange("affected_area", e.target.value)}
              placeholder="e.g., Area K, Sector 5"
              required
            />
          </div>

          <div>
            <Label htmlFor="severity">Severity*</Label>
            <Select
              value={formData.severity}
              onValueChange={(value) => handleInputChange("severity", value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select severity" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="minor">Minor</SelectItem>
                <SelectItem value="major">Major</SelectItem>
                <SelectItem value="critical">Critical</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="description">Description*</Label>
            <textarea
              id="description"
              className="flex min-h-[80px] w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm ring-offset-white placeholder:text-slate-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-950 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              value={formData.description}
              onChange={(e) => handleInputChange("description", e.target.value)}
              placeholder="Describe the outage details, impacted services, and any known causes"
              rows={4}
              required
            />
          </div>

          <div className="flex justify-end space-x-3 pt-4">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? "Saving..." : outage ? "Update Outage" : "Report Outage"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
