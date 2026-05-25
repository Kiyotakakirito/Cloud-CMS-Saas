"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, UploadCloud, CheckCircle2 } from "lucide-react";
import { getToken } from "@/lib/auth";

interface ImportModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export default function ImportModal({ isOpen, onClose }: ImportModalProps) {
    const [file, setFile] = useState<File | null>(null);
    const [uploading, setUploading] = useState(false);
    const [previewData, setPreviewData] = useState<any>(null);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            setFile(e.target.files[0]);
        }
    };

    const handlePreview = async () => {
        if (!file) return;
        setUploading(true);

        const formData = new FormData();
        formData.append("file", file);

        try {
            const token = getToken();
            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1"}/customers/import/preview`, {
                method: "POST",
                headers: { Authorization: `Bearer ${token}` },
                body: formData,
            });
            const data = await res.json();
            setPreviewData(data);
        } catch (error) {
            console.error("Failed to preview import", error);
        } finally {
            setUploading(false);
        }
    };

    const handleConfirm = async () => {
        if (!previewData) return;
        setUploading(true);

        try {
            const token = getToken();
            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1"}/customers/import/confirm`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({ data: previewData.data }),
            });

            if (res.ok) {
                onClose();
                // Trigger generic refresh here
                window.location.reload();
            }
        } catch (error) {
            console.error("Failed to confirm import", error);
        } finally {
            setUploading(false);
        }
    };

    const handleDownloadTemplate = () => {
        // Generate dummy CSV
        const csvContent = "data:text/csv;charset=utf-8,Door No,Name,Card Number,Phone,Cable Operator\nK-3/1,Ramesh Babu,12345678,9876543210,siti cable";
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", "customer_import_template.csv");
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden flex flex-col">
                <DialogHeader>
                    <DialogTitle>Bulk Import Customers</DialogTitle>
                    <DialogDescription className="sr-only">
                        Upload an Excel or CSV file to bulk import customer records.
                    </DialogDescription>
                </DialogHeader>

                {!previewData ? (
                    <div className="flex flex-col items-center justify-center p-8 border-2 border-dashed rounded-lg bg-gray-50">
                        <UploadCloud className="h-10 w-10 text-gray-400 mb-4" />
                        <h3 className="text-lg font-medium mb-2">Upload Excel or CSV File</h3>
                        <p className="text-sm text-gray-500 mb-6 text-center">
                            Make sure your file has columns like Door No, Name, Card Number, Phone, and Operator.
                        </p>
                        <input
                            type="file"
                            accept=".csv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel"
                            onChange={handleFileChange}
                            className="mb-4 text-sm max-w-xs"
                        />
                        <div className="flex gap-4">
                            <Button onClick={handleDownloadTemplate} variant="outline" size="sm">Download Template</Button>
                            <Button onClick={handlePreview} disabled={!file || uploading}>
                                {uploading ? "Parsing..." : "Preview Data"}
                            </Button>
                        </div>
                    </div>
                ) : (
                    <div className="flex flex-col flex-1 overflow-hidden">
                        <div className="flex gap-4 mb-4">
                            <div className="bg-blue-50 text-blue-700 px-4 py-2 rounded-md flex items-center gap-2">
                                <span className="font-bold">{previewData.total_rows}</span> Total
                            </div>
                            <div className="bg-green-50 text-green-700 px-4 py-2 rounded-md flex items-center gap-2">
                                <CheckCircle2 className="h-4 w-4" /> <span className="font-bold">{previewData.valid_rows}</span> Valid
                            </div>
                            <div className="bg-yellow-50 text-yellow-700 px-4 py-2 rounded-md flex items-center gap-2">
                                <AlertCircle className="h-4 w-4" /> <span className="font-bold">{previewData.duplicate_rows}</span> Duplicates
                            </div>
                            <div className="bg-red-50 text-red-700 px-4 py-2 rounded-md flex items-center gap-2">
                                <AlertCircle className="h-4 w-4" /> <span className="font-bold">{previewData.error_rows}</span> Errors
                            </div>
                        </div>

                        <div className="overflow-auto border rounded-md relative flex-1">
                            <Table>
                                <TableHeader className="sticky top-0 bg-white shadow-sm z-10">
                                    <TableRow>
                                        <TableHead>Status</TableHead>
                                        <TableHead>Area (Auto)</TableHead>
                                        <TableHead>Door No.</TableHead>
                                        <TableHead>Name</TableHead>
                                        <TableHead>Card No.</TableHead>
                                        <TableHead>Phone</TableHead>
                                        <TableHead>Issues</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {previewData.data.slice(0, 100).map((row: any, i: number) => (
                                        <TableRow key={i} className={
                                            row.status_import === "new" ? "" :
                                                row.status_import === "duplicate" ? "bg-yellow-50/50" : "bg-red-50/50"
                                        }>
                                            <TableCell>
                                                <Badge variant={
                                                    row.status_import === 'new' ? 'default' :
                                                        row.status_import === 'duplicate' ? 'outline' : 'destructive'
                                                }>
                                                    {row.status_import}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="font-medium text-blue-600">{row.area || "-"}</TableCell>
                                            <TableCell>{row.door_number}</TableCell>
                                            <TableCell>{row.name}</TableCell>
                                            <TableCell>{row.card_number}</TableCell>
                                            <TableCell>{row.phone_number}</TableCell>
                                            <TableCell className="text-red-600 text-xs max-w-[200px] truncate" title={row.error_message}>
                                                {row.error_message || "-"}
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                        {previewData.total_rows > 100 && (
                            <div className="text-xs text-center p-2 text-gray-500">Showing first 100 rows only</div>
                        )}

                        <DialogFooter className="mt-4 pt-4 border-t">
                            <Button variant="outline" onClick={() => setPreviewData(null)}>Cancel</Button>
                            <Button onClick={handleConfirm} disabled={uploading || previewData.valid_rows === 0}>
                                {uploading ? "Importing..." : `Confirm Import (${previewData.valid_rows})`}
                            </Button>
                        </DialogFooter>
                    </div>
                )}
            </DialogContent>
        </Dialog>
    );
}
