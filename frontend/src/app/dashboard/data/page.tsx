"use client";

import { useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { api, API_ENDPOINTS } from "@/lib/api";
import { Database, Download, FileSpreadsheet, ShieldAlert, CheckCircle2, AlertCircle, FileUp, Upload, Calendar } from "lucide-react";
import Link from "next/link";

export default function DataManagement() {
  const [loading, setLoading] = useState<string | null>(null);
  const [targetDate, setTargetDate] = useState(new Date().toISOString().split('T')[0]);
  const [message, setMessage] = useState<{type: 'success' | 'error', text: string} | null>(null);

  const downloadCSV = async (endpoint: string, filename: string, params: any = {}) => {
    try {
      setLoading(filename);
      const response = await api.get<any[]>(endpoint, { params });
      if (response.data && response.data.length > 0) {
        const data = response.data;
        const headers = Object.keys(data[0]);
        const csvContent = [
          headers.join(','),
          ...data.map(row => headers.map(header => {
            const val = row[header];
            if (val === null || val === undefined) return '""';
            return typeof val === 'string' ? `"${val.replace(/"/g, '""')}"` : val;
          }).join(','))
        ].join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement("a");
        const url = URL.createObjectURL(blob);
        link.setAttribute("href", url);
        const dateStr = params.target_date || new Date().toISOString().split('T')[0];
        link.setAttribute("download", `${filename}_${dateStr}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        setMessage({ type: 'success', text: `${filename} exported successfully!` });
      } else {
        setMessage({ type: 'error', text: `No data found to export for ${filename} on this date.` });
      }
    } catch (err) {
      console.error(err);
      setMessage({ type: 'error', text: `Failed to export ${filename}.` });
    } finally {
      setLoading(null);
      setTimeout(() => setMessage(null), 3000);
    }
  };

  return (
    <DashboardLayout allowedRoles={["owner", "admin"]}>
      <div className="max-w-4xl mx-auto space-y-8 pb-20">
        <div>
          <h1 className="text-3xl font-black text-slate-800 tracking-tighter flex items-center gap-4">
            <Database className="text-blue-600" size={32} /> Data Management
          </h1>
          <p className="text-slate-500 mt-2 font-medium text-sm italic">Export your shop data for accounting, backups, or daily reports.</p>
        </div>

        {message && (
            <div className={`p-4 rounded-2xl flex items-center gap-3 animate-in fade-in slide-in-from-top-4 border-2 ${
                message.type === 'success' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 'bg-rose-50 text-rose-700 border-rose-100'
            }`}>
                {message.type === 'success' ? <CheckCircle2 size={20} /> : <AlertCircle size={20} />}
                <span className="font-bold text-sm uppercase tracking-tighter">{message.text}</span>
            </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
           
           {/* Daily Collection Card (NEW) */}
           <div className="bg-white p-8 rounded-[40px] shadow-sm border-2 border-indigo-100 hover:shadow-xl transition-all duration-300 relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:scale-110 transition-transform">
                    <Calendar size={80} />
                </div>
                <div className="w-14 h-14 rounded-2xl bg-indigo-50 flex items-center justify-center mb-6">
                    <Download className="text-indigo-600" />
                </div>
                <h3 className="text-xl font-black text-slate-800 tracking-tighter mb-2">Daily Collection Report</h3>
                <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest mb-6 leading-relaxed">Download all payments (Cash/Online) for a specific date.</p>
                
                <div className="space-y-4">
                    <div className="flex flex-col gap-1.5">
                        <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Report Date</label>
                        <input 
                            type="date" 
                            className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl font-bold text-slate-700 outline-none focus:bg-white focus:border-indigo-400 transition-all"
                            value={targetDate}
                            onChange={(e) => setTargetDate(e.target.value)}
                        />
                    </div>
                    <button 
                        onClick={() => downloadCSV(API_ENDPOINTS.BILLING.EXPORT_COLLECTIONS, 'daily_collection', { target_date: targetDate })}
                        disabled={loading === 'daily_collection'}
                        className="w-full py-4 bg-indigo-600 text-white rounded-2xl text-xs font-black uppercase tracking-widest flex items-center justify-center gap-3 hover:bg-indigo-700 disabled:opacity-50 transition-all shadow-lg shadow-indigo-100"
                    >
                        {loading === 'daily_collection' ? (
                            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                        ) : (
                            <Download size={16} />
                        )}
                        Download Report
                    </button>
                </div>
           </div>

           {/* Import Card */}
           <div className="bg-white p-8 rounded-[40px] shadow-sm border border-slate-100 hover:shadow-xl transition-all duration-300 group">
                <div className="w-14 h-14 rounded-2xl bg-blue-50 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                    <FileUp className="text-blue-600" />
                </div>
                <h3 className="text-xl font-black text-slate-800 tracking-tighter mb-2">Bulk Import Subscribers</h3>
                <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest mb-8 leading-relaxed">Upload CSV or Excel files to onboard hundreds of customers at once.</p>
                <Link 
                    href="/dashboard/customers/import"
                    className="w-full py-4 bg-blue-600 text-white rounded-2xl text-xs font-black uppercase tracking-widest flex items-center justify-center gap-3 hover:bg-blue-700 transition-all"
                >
                    <Upload size={16} /> Open Importer
                </Link>
           </div>

           {/* Export Card 1 */}
           <ExportCard 
             title="Customer Database" 
             description="Complete list of all subscribers with contact details and current status."
             icon={<FileSpreadsheet className="text-emerald-600" />}
             onExport={() => downloadCSV(API_ENDPOINTS.CUSTOMERS.LIST, 'customers')}
             isLoading={loading === 'customers'}
           />

           {/* Export Card 2 */}
           <ExportCard 
             title="Billing & Invoices" 
             description="Detailed record of all invoices generated, amounts, and payment status."
             icon={<Download className="text-blue-600" />}
             onExport={() => downloadCSV(API_ENDPOINTS.BILLING.INVOICES.split('?')[0], 'invoices')}
             isLoading={loading === 'invoices'}
           />
        </div>

        <div className="bg-amber-50 rounded-[40px] p-10 border border-amber-100 mt-10">
           <div className="flex items-start gap-6">
              <div className="p-4 bg-amber-100 rounded-3xl text-amber-600 shadow-inner"><ShieldAlert size={28} /></div>
              <div>
                 <h4 className="font-black text-amber-900 uppercase tracking-tighter text-sm italic">Security Advisory</h4>
                 <p className="text-amber-700 text-xs mt-2 font-medium leading-relaxed">
                    CSV exports contain PII (Personally Identifiable Information) of your subscribers. 
                    Ensure you handle these files securely and do not share them with unauthorized personnel. 
                    All data exports are logged in the <Link href="/dashboard/audit" className="underline font-black">Audit Trail</Link> for security tracking.
                 </p>
              </div>
           </div>
        </div>
      </div>
    </DashboardLayout>
  );
}

function ExportCard({ title, description, icon, onExport, isLoading }: any) {
    return (
        <div className="bg-white p-8 rounded-[40px] shadow-sm border border-slate-100 hover:shadow-xl transition-all duration-300 group">
            <div className="w-14 h-14 rounded-2xl bg-slate-50 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">{icon}</div>
            <h3 className="text-xl font-black text-slate-800 tracking-tighter mb-2">{title}</h3>
            <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest mb-8 leading-relaxed">{description}</p>
            <button 
                onClick={onExport}
                disabled={isLoading}
                className="w-full py-4 bg-slate-900 text-white rounded-2xl text-xs font-black uppercase tracking-widest flex items-center justify-center gap-3 hover:bg-slate-800 disabled:opacity-50 transition-all shadow-lg shadow-slate-100"
            >
                {isLoading ? (
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                ) : (
                    <Download size={16} />
                )}
                {isLoading ? 'Preparing...' : 'Export to CSV'}
            </button>
        </div>
    );
}
