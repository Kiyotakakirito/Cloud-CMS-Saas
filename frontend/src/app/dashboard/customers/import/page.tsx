"use client";

import { useState, useRef } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { api, API_ENDPOINTS } from "@/lib/api";
import { getToken } from "@/lib/auth";
import { 
  FileUp, 
  Upload, 
  CheckCircle2, 
  AlertCircle, 
  Trash2, 
  ChevronRight, 
  FileSpreadsheet, 
  Info, 
  ArrowLeft,
  Loader2,
  Table,
  Check
} from "lucide-react";
import Link from "next/link";

interface ImportRow {
  door_number: string;
  name: string;
  card_number: string;
  phone_number?: string;
  provider_tag?: string;
  area?: string;
  status_import: 'pending' | 'new' | 'duplicate' | 'error';
  error_message?: string;
}

interface PreviewResponse {
  total_rows: number;
  valid_rows: number;
  error_rows: number;
  duplicate_rows: number;
  data: ImportRow[];
}

export default function BulkImportPage() {
  const [step, setStep] = useState(1); // 1: Upload, 2: Preview, 3: Success
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [preview, setPreview] = useState<PreviewResponse | null>(null);
  const [error, setError] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (selected) {
      if (selected.name.endsWith('.csv') || selected.name.endsWith('.xlsx')) {
        setFile(selected);
        setError("");
      } else {
        setError("Unsupported file format. Please use .csv or .xlsx");
        setFile(null);
      }
    }
  };

  const handleUpload = async () => {
    if (!file) return;
    setLoading(true);
    setError("");
    
    try {
      const formData = new FormData();
      formData.append("file", file);

      // We use fetch directly here because api.post expects JSON, but we need multi-part
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1'}${API_ENDPOINTS.CUSTOMERS.IMPORT}preview/`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${getToken() || ''}`
        },
        body: formData
      });

      if (!response.ok) {
          const errData = await response.json();
          throw new Error(errData.detail || "Failed to process file");
      }

      const data = await response.json();
      setPreview(data);
      setStep(2);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleConfirm = async () => {
    if (!preview) return;
    setLoading(true);
    try {
      const response = await api.post(`${API_ENDPOINTS.CUSTOMERS.IMPORT}confirm/`, {
        data: preview.data
      });
      if (response.data) {
        setStep(3);
      } else {
        throw new Error(response.error || "Import failed. Please check for duplicate card numbers.");
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const reset = () => {
    setStep(1);
    setFile(null);
    setPreview(null);
    setError("");
  };

  const handleDownloadTemplate = () => {
    const headers = ["Name", "Door No", "Card Number", "Phone", "Area", "Provider Tag", "Expiry Date"];
    const sampleData = [
      ["John Doe", "1-23/K", "1234567890", "9876543210", "K", "CABLE", "2026-06-25"],
      ["Jane Smith", "45-A/Ta", "STB00112233", "9988776655", "Ta", "FIBER", "2026-07-10"]
    ];
    
    const csvContent = [
      headers.join(","),
      ...sampleData.map(row => row.join(","))
    ].join("\n");

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", "subscriber_import_template.csv");
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <DashboardLayout allowedRoles={["owner", "admin"]}>
      <div className="max-w-6xl mx-auto space-y-8 pb-20">
        
        {/* Breadcrumbs */}
        <div className="flex items-center gap-3 text-sm font-bold">
           <Link href="/dashboard/customers" className="text-slate-400 hover:text-blue-600 transition-colors">Subscribers</Link>
           <ChevronRight size={14} className="text-slate-300" />
           <span className="text-slate-800">Bulk Import</span>
        </div>

        {/* Header */}
        <div className="flex justify-between items-end">
           <div>
             <h1 className="text-4xl font-black text-slate-800 tracking-tighter flex items-center gap-4">
                <FileUp className="text-blue-600" size={36} /> Subscriber Bulk Importer
             </h1>
             <p className="text-slate-500 mt-2 font-medium">Onboard hundreds of customers instantly via Excel or CSV files.</p>
           </div>
           {step === 2 && (
               <button onClick={reset} className="px-6 py-3 bg-slate-100 text-slate-500 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-200 transition-all flex items-center gap-2">
                  <ArrowLeft size={14} /> Back to Upload
               </button>
           )}
        </div>

        {/* STEP 1: UPLOAD */}
        {step === 1 && (
           <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="lg:col-span-2 space-y-8">
                 <div 
                    onClick={() => fileInputRef.current?.click()}
                    className={`border-4 border-dashed rounded-[48px] p-20 flex flex-col items-center justify-center text-center transition-all cursor-pointer group ${
                       file ? 'border-emerald-200 bg-emerald-50/30' : 'border-slate-100 bg-white hover:border-blue-200 hover:bg-blue-50/10'
                    }`}
                 >
                    <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" accept=".csv,.xlsx" />
                    <div className={`w-24 h-24 rounded-[32px] flex items-center justify-center mb-8 shadow-xl transition-transform group-hover:scale-110 ${
                       file ? 'bg-emerald-600 text-white shadow-emerald-200' : 'bg-blue-600 text-white shadow-blue-200'
                    }`}>
                       {loading ? <Loader2 size={40} className="animate-spin" /> : <Upload size={40} />}
                    </div>

                    {file ? (
                       <div className="space-y-2">
                          <h3 className="text-2xl font-black text-slate-800 tracking-tight">{file.name}</h3>
                          <p className="text-emerald-600 font-bold uppercase tracking-widest text-[10px]">File Ready for Analysis</p>
                          <button onClick={(e) => { e.stopPropagation(); setFile(null); }} className="text-rose-500 text-[10px] font-black uppercase mt-4 hover:underline">Remove File</button>
                       </div>
                    ) : (
                       <div className="space-y-2">
                          <h3 className="text-2xl font-black text-slate-800 tracking-tight italic">Drop your data file here</h3>
                          <p className="text-slate-400 font-medium">Supports Microsoft Excel (.xlsx) and CSV formats.</p>
                       </div>
                    )}
                 </div>

                 {error && (
                    <div className="bg-rose-50 border border-rose-100 p-6 rounded-[32px] flex items-center gap-4 text-rose-700 animate-in shake duration-500">
                       <AlertCircle size={24} />
                       <p className="font-black uppercase tracking-tighter text-sm">{error}</p>
                    </div>
                 )}

                 <div className="flex justify-end">
                    <button 
                       disabled={!file || loading}
                       onClick={handleUpload}
                       className="px-12 py-6 bg-slate-900 text-white rounded-[32px] font-black uppercase tracking-[0.2em] text-xs shadow-2xl hover:bg-blue-600 disabled:opacity-50 transition-all flex items-center gap-4 active:scale-95"
                    >
                       {loading ? 'Analyzing Data...' : 'Start Pre-Import Analysis'}
                       {!loading && <ChevronRight size={18} />}
                    </button>
                 </div>
              </div>

              <div className="space-y-6">
                 <div className="bg-white p-8 rounded-[40px] shadow-sm border border-slate-100">
                    <h4 className="font-black text-slate-800 uppercase tracking-tighter mb-6 flex items-center gap-2">
                       <Info size={18} className="text-blue-600" /> Instructions
                    </h4>
                    <ul className="space-y-4">
                       <li className="flex gap-4">
                          <div className="w-6 h-6 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center text-[10px] font-black flex-shrink-0">1</div>
                          <p className="text-xs font-medium text-slate-500 leading-relaxed">Ensure your file has headers like <span className="font-bold text-slate-700">Name, Door No, Card Number</span>.</p>
                       </li>
                       <li className="flex gap-4">
                          <div className="w-6 h-6 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center text-[10px] font-black flex-shrink-0">2</div>
                          <p className="text-xs font-medium text-slate-500 leading-relaxed">The system will automatically extract areas (e.g. K, Ta, Y) from door numbers.</p>
                       </li>
                       <li className="flex gap-4">
                          <div className="w-6 h-6 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center text-[10px] font-black flex-shrink-0">3</div>
                          <p className="text-xs font-medium text-slate-500 leading-relaxed">Duplicate card numbers will be highlighted and skipped automatically.</p>
                       </li>
                    </ul>
                 </div>

                 <div className="bg-blue-50 p-8 rounded-[40px] border border-blue-100">
                    <FileSpreadsheet size={32} className="text-blue-400 mb-4" />
                    <h4 className="font-black text-blue-900 uppercase tracking-tighter text-sm mb-2">Need a Template?</h4>
                    <p className="text-blue-700/70 text-[10px] font-bold leading-relaxed mb-6 uppercase tracking-wider">Download our pre-formatted template to ensure 100% successful import.</p>
                    <button 
                      onClick={handleDownloadTemplate}
                      className="w-full py-4 bg-white text-blue-600 rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-sm hover:shadow-md transition-all"
                    >
                      Download Template
                    </button>
                 </div>
              </div>
           </div>
        )}

        {/* STEP 2: PREVIEW */}
        {step === 2 && preview && (
           <div className="space-y-8">
              {/* Summary Stats */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                 <div className="bg-white p-6 rounded-[32px] border border-slate-100 shadow-sm text-center">
                    <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Total Found</div>
                    <div className="text-3xl font-black text-slate-800 tracking-tighter">{preview.total_rows}</div>
                 </div>
                 <div className="bg-emerald-50 p-6 rounded-[32px] border border-emerald-100 shadow-sm text-center">
                    <div className="text-[10px] font-black text-emerald-600 uppercase tracking-widest mb-1">Valid (New)</div>
                    <div className="text-3xl font-black text-emerald-700 tracking-tighter">{preview.valid_rows}</div>
                 </div>
                 <div className="bg-amber-50 p-6 rounded-[32px] border border-amber-100 shadow-sm text-center">
                    <div className="text-[10px] font-black text-amber-600 uppercase tracking-widest mb-1">Duplicates</div>
                    <div className="text-3xl font-black text-amber-700 tracking-tighter">{preview.duplicate_rows}</div>
                 </div>
                 <div className="bg-rose-50 p-6 rounded-[32px] border border-rose-100 shadow-sm text-center">
                    <div className="text-[10px] font-black text-rose-600 uppercase tracking-widest mb-1">Errors</div>
                    <div className="text-3xl font-black text-rose-700 tracking-tighter">{preview.error_rows}</div>
                 </div>
              </div>

              {/* Data Table */}
              <div className="bg-white rounded-[48px] shadow-xl border border-slate-100 overflow-hidden">
                 <div className="p-8 border-b border-slate-50 bg-slate-50/30 flex justify-between items-center">
                    <h3 className="font-black text-slate-800 uppercase tracking-widest text-xs flex items-center gap-3">
                       <Table size={18} className="text-blue-600" /> Data Preview List
                    </h3>
                    <div className="text-[9px] font-black text-slate-400 uppercase italic">Verify all details before final commit</div>
                 </div>
                 <div className="overflow-x-auto max-h-[500px] custom-scrollbar">
                    <table className="w-full text-left">
                       <thead className="bg-white border-b border-slate-50 sticky top-0 z-10">
                          <tr>
                             <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Status</th>
                             <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Customer Name</th>
                             <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Address / Card</th>
                             <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Issues</th>
                          </tr>
                       </thead>
                       <tbody className="divide-y divide-slate-50">
                          {preview.data.map((row: any, i: number) => (
                             <tr key={i} className="hover:bg-slate-50/50 transition-colors">
                                <td className="px-8 py-6">
                                   <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-tighter ${
                                      row.status_import === 'new' ? 'bg-emerald-100 text-emerald-700' :
                                      row.status_import === 'duplicate' ? 'bg-amber-100 text-amber-700' :
                                      'bg-rose-100 text-rose-700'
                                   }`}>
                                      {row.status_import}
                                   </span>
                                </td>
                                <td className="px-8 py-6">
                                   <div className="font-black text-slate-800 tracking-tighter">{row.name || 'MISSING NAME'}</div>
                                   <div className="text-[10px] text-slate-400 font-bold">{row.phone_number || 'No Phone'}</div>
                                </td>
                                <td className="px-8 py-6">
                                   <div className="text-xs font-bold text-slate-600">{row.door_number}</div>
                                   <div className="text-[10px] text-slate-400 font-black uppercase tracking-widest flex items-center gap-2">
                                      STB: <span className="text-slate-800">{row.card_number}</span>
                                      {row.area && <span className="bg-blue-50 text-blue-600 px-2 rounded">AREA: {row.area}</span>}
                                   </div>
                                </td>
                                <td className="px-8 py-6">
                                   {row.error_message ? (
                                      <p className="text-rose-500 text-[10px] font-black uppercase leading-tight italic">{row.error_message}</p>
                                   ) : (
                                      <div className="flex items-center gap-1 text-emerald-500 font-bold text-[10px] uppercase">
                                         <CheckCircle2 size={12} /> Ready
                                      </div>
                                   )}
                                </td>
                             </tr>
                          ))}
                       </tbody>
                    </table>
                 </div>
              </div>

              {/* Actions */}
              <div className="flex justify-between items-center p-10 bg-slate-900 rounded-[48px] shadow-2xl">
                 <div className="flex items-center gap-4 text-white">
                    <div className="w-12 h-12 rounded-2xl bg-white/10 flex items-center justify-center text-emerald-400 shadow-inner">
                       <Check size={24} />
                    </div>
                    <div>
                       <h4 className="font-black text-xl tracking-tighter">Ready to Onboard {preview.valid_rows} Customers?</h4>
                       <p className="text-white/40 text-[10px] font-bold uppercase tracking-widest">Duplicates and errors will be ignored automatically.</p>
                    </div>
                 </div>
                 <div className="flex gap-4">
                    <button onClick={reset} className="px-10 py-5 bg-white/5 text-white/50 rounded-3xl text-xs font-black uppercase tracking-widest hover:bg-white/10 transition-all">Cancel</button>
                    <button 
                       disabled={loading || preview.valid_rows === 0}
                       onClick={handleConfirm}
                       className="px-12 py-5 bg-emerald-500 text-white rounded-[32px] font-black uppercase tracking-[0.2em] text-xs shadow-xl shadow-emerald-500/20 hover:bg-emerald-400 flex items-center gap-4 transition-all"
                    >
                       {loading ? 'Processing Commit...' : 'Finalize Import'}
                       {!loading && <ChevronRight size={18} />}
                    </button>
                 </div>
              </div>
           </div>
        )}

        {/* STEP 3: SUCCESS */}
        {step === 3 && (
           <div className="bg-white rounded-[56px] shadow-2xl p-20 text-center space-y-10 animate-in zoom-in duration-500">
              <div className="w-32 h-32 rounded-[48px] bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto shadow-xl shadow-emerald-100 group">
                 <CheckCircle2 size={64} className="group-hover:scale-110 transition-transform" />
              </div>
              <div className="space-y-4">
                 <h2 className="text-5xl font-black text-slate-800 tracking-tighter">Import Complete!</h2>
                 <p className="text-slate-400 text-lg font-medium max-w-md mx-auto">Successfully added <span className="text-slate-800 font-black">{preview?.valid_rows}</span> new subscribers to your database.</p>
              </div>
              <div className="pt-6 flex justify-center gap-4">
                 <Link href="/dashboard/customers" className="px-10 py-5 bg-slate-900 text-white rounded-[28px] text-xs font-black uppercase tracking-widest shadow-xl hover:bg-blue-600 transition-all">Go to Subscribers</Link>
                 <button onClick={reset} className="px-10 py-5 bg-slate-100 text-slate-500 rounded-[28px] text-xs font-black uppercase tracking-widest hover:bg-slate-200 transition-all">Import More</button>
              </div>
           </div>
        )}

      </div>
    </DashboardLayout>
  );
}
