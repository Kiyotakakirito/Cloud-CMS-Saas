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
import { Switch } from "@/components/ui/switch";
import { useForm } from "@/lib/hooks/useForm";
import { billingPlanSchema, type BillingPlanFormData } from "@/lib/hooks/useForm";
import { useNotify } from "@/components/ui/notifications";
import { api, API_ENDPOINTS } from "@/lib/api";

interface BillingPlanFormProps {
  isOpen: boolean;
  onClose: () => void;
  plan?: any;
}

export function BillingPlanForm({ isOpen, onClose, plan }: BillingPlanFormProps) {
  const notify = useNotify();
  const [isLoading, setIsLoading] = useState(false);

  const { register, onSubmit, formState, reset } = useForm<BillingPlanFormData>({
    schema: billingPlanSchema as any,
    defaultValues: {
      name: plan?.name || "",
      description: plan?.description || "",
      price: plan?.price || 0,
      speed_mbps: plan?.speed_mbps || 100,
      data_limit_gb: plan?.data_limit_gb || null,
      is_active: plan?.is_active ?? true,
    },
    onSubmit: async (data) => {
      setIsLoading(true);
      try {
        if (plan) {
          // Update existing plan
          const response = await api.put(
            API_ENDPOINTS.BILLING.PLANS + `/${plan.id}`,
            data
          );

          if (response.data) {
            notify.success("Success", "Billing plan updated successfully");
            onClose();
          } else if (response.error) {
            throw new Error(response.error);
          }
        } else {
          // Create new plan
          const response = await api.post(API_ENDPOINTS.BILLING.PLANS, data);

          if (response.data) {
            notify.success("Success", "Billing plan created successfully");
            onClose();
          } else if (response.error) {
            throw new Error(response.error);
          }
        }
      } catch (error: any) {
        notify.error("Error", error.message || "Failed to save billing plan");
      } finally {
        setIsLoading(false);
      }
    },
  });

  const handleClose = () => {
    reset();
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            {plan ? "Edit Billing Plan" : "Create Billing Plan"}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <Label htmlFor="name">Plan Name*</Label>
            <Input
              id="name"
              {...register("name")}
              placeholder="e.g., Basic Plan"
            />
            {formState.errors.name && (
              <p className="text-sm text-red-600">{formState.errors.name.message}</p>
            )}
          </div>

          <div>
            <Label htmlFor="description">Description</Label>
            <textarea
              id="description"
              className="flex min-h-[80px] w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm ring-offset-white placeholder:text-slate-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-950 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              {...register("description")}
              placeholder="Plan description"
              rows={3}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="price">Monthly Price (₹)*</Label>
              <Input
                id="price"
                type="number"
                step="0.01"
                min="0"
                {...register("price", { valueAsNumber: true })}
              />
              {formState.errors.price && (
                <p className="text-sm text-red-600">{formState.errors.price.message}</p>
            )}
            </div>

            <div>
              <Label htmlFor="speed_mbps">Speed (Mbps)*</Label>
              <Input
                id="speed_mbps"
                type="number"
                min="1"
                {...register("speed_mbps", { valueAsNumber: true })}
              />
              {formState.errors.speed_mbps && (
                <p className="text-sm text-red-600">{formState.errors.speed_mbps.message}</p>
              )}
            </div>
          </div>

          <div>
            <Label htmlFor="data_limit_gb">Data Limit (GB)</Label>
            <Input
              id="data_limit_gb"
              type="number"
              min="0"
              placeholder="Leave empty for unlimited"
              {...register("data_limit_gb", { valueAsNumber: true })}
            />
          </div>

          <div className="flex items-center space-x-2">
            <Switch
              id="is_active"
              checked={formState.defaultValues?.is_active}
              onCheckedChange={(checked) =>
                register("is_active").onChange({
                  target: { value: checked, name: "is_active" },
                })
              }
            />
            <Label htmlFor="is_active">Active Plan</Label>
          </div>

          <div className="flex justify-end space-x-3 pt-4">
            <Button type="button" variant="outline" onClick={handleClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? "Saving..." : plan ? "Update Plan" : "Create Plan"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
