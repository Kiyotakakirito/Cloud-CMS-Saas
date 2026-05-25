"use client";

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { getToken } from "@/lib/auth";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";

interface CustomerFormProps {
    isOpen: boolean;
    onClose: () => void;
    customer?: {
        id: number;
        full_name: string;
        door_number: string;
        card_number: string;
        phone_number: string | null;
        service_type?: string;
        status: string;
    } | null;
}

const defaultForm = {
    full_name: "",
    door_number: "",
    card_number: "",
    phone_number: "",
    service_type: "Cable",
    status: "Active",
};

export default function CustomerForm({ isOpen, onClose, customer }: CustomerFormProps) {
    // BUG-5: reinitialise form whenever the dialog opens or the customer prop changes
    const [formData, setFormData] = useState(defaultForm);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (isOpen) {
            setFormData(
                customer
                    ? {
                        full_name: customer.full_name ?? "",
                        door_number: customer.door_number ?? "",
                        card_number: customer.card_number ?? "",
                        phone_number: customer.phone_number ?? "",
                        service_type: customer.service_type ?? "Cable",
                        status: customer.status ?? "Active",
                    }
                    : defaultForm
            );
            setError(null);
        }
    }, [isOpen, customer]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSelectChange = (name: string, value: string) => {
        setFormData({ ...formData, [name]: value });
    };

    const handleSubmit = async () => {
        setSubmitting(true);
        setError(null);
        // BUG-3: include Authorization header
        const token = getToken();
        // BUG-11: PUT for edit, POST for create
        const url = customer
            ? `${API_BASE}/customers/${customer.id}`
            : `${API_BASE}/customers`;
        const method = customer ? "PUT" : "POST";

        try {
            const res = await fetch(url, {
                method,
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify(formData),
            });

            if (!res.ok) {
                const err = await res.json().catch(() => ({}));
                throw new Error(err.detail || `Request failed (${res.status})`);
            }

            onClose();
        } catch (err: any) {
            setError(err.message || "Something went wrong");
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-md">
                <DialogHeader>
                    <DialogTitle>{customer ? "Edit Customer" : "Add New Customer"}</DialogTitle>
                </DialogHeader>

                <div className="space-y-4 py-4">
                    <div className="space-y-2">
                        <label className="text-sm font-medium">Full Name (Supports Telugu)</label>
                        <Input name="full_name" value={formData.full_name} onChange={handleChange} placeholder="e.g. Ramesh Babu" />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Door No. <span className="text-gray-400 text-xs">(Area Auto-detected)</span></label>
                            <Input name="door_number" value={formData.door_number} onChange={handleChange} placeholder="e.g. K-3/1" />
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium">Box Card Number</label>
                            <Input name="card_number" value={formData.card_number} onChange={handleChange} />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-medium">Phone Number</label>
                        <Input name="phone_number" value={formData.phone_number} onChange={handleChange} placeholder="10-digit number" />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Service Type</label>
                            <Select value={formData.service_type} onValueChange={(v) => handleSelectChange("service_type", v)}>
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="Cable">Cable</SelectItem>
                                    <SelectItem value="Internet">Internet</SelectItem>
                                    <SelectItem value="Combo">Combo</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Status</label>
                            <Select value={formData.status} onValueChange={(v) => handleSelectChange("status", v)}>
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="Active">Active</SelectItem>
                                    <SelectItem value="Inactive">Inactive</SelectItem>
                                    <SelectItem value="Suspended">Suspended</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    {error && (
                        <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded px-3 py-2">{error}</p>
                    )}
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={onClose} disabled={submitting}>Cancel</Button>
                    <Button onClick={handleSubmit} disabled={submitting}>
                        {submitting ? "Saving…" : "Save Customer"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
