"use client";

import { useState, useEffect, useCallback, useMemo, Suspense } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import DashboardLayout from "@/components/DashboardLayout";
import { api, API_ENDPOINTS, clearApiCache } from "@/lib/api";
import { getUser, hasPermission } from "@/lib/auth";
import Link from "next/link";
import { 
  User, 
  Phone, 
  MapPin, 
  CreditCard, 
  Calendar, 
  Box as BoxIcon, 
  Package, 
  TrendingDown, 
  History, 
  RefreshCcw, 
  Settings, 
  FileText,
  Plus,
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  Info,
  Hash,
  Mail,
  X,
  UserPlus,
  Zap,
  ArrowUpCircle,
  MoreVertical,
  Banknote,
  Percent,
  Check,
  Search,
  Filter as FilterIcon,
  ArrowDownCircle,
  Download,
  Clock,
  ArrowUpRight,
  ArrowDownLeft,
  RotateCcw,
  CalendarDays,
  XCircle,
  Loader2
} from "lucide-react";

interface CustomerProfile {
  customer: any;
  billing: {
    outstanding: number;
    last_payment: any;
    invoices: any[];
    payments: any[];
  };
}

export default function CustomerProfilePage() {
  return (
    <Suspense fallback={<div className="p-20 text-center font-black animate-pulse">BOOTING PROFILE...</div>}>
      <CustomerProfileContent />
    </Suspense>
  );
}

function CustomerProfileContent() {
  const params = useParams();
  const searchParams = useSearchParams();
  const id = params?.id;
  const router = useRouter();
  const user = getUser();
  
  const [profile, setProfile] = useState<CustomerProfile | null>(null);
  const [plans, setPlans] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Ledger States
  const [ledgerSearch, setLedgerSearch] = useState("");
  const [ledgerType, setLedgerType] = useState("all"); 
  const [dateFilter, setDateFilter] = useState("");

  // Modal States
  const [showRenewModal, setShowRenewModal] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showChargeModal, setShowChargeModal] = useState(false);
  const [showClearanceModal, setShowClearanceModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState<any>(null);
  const [resultPopup, setResultPopup] = useState<{type: 'success' | 'fail', message: string} | null>(null);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  
  // Renewal State
  const [renewType, setRenewType] = useState<"with_payment" | "without_payment">("with_payment");
  const [renewCycles, setRenewCycles] = useState("1");
  const [renewAmount, setRenewAmount] = useState("");
  const [renewDiscount, setRenewDiscount] = useState("0");
  const [paymentMethod, setPaymentMethod] = useState("Cash");

  // Clearance State
  const [clearAmount, setClearAmount] = useState("");
  const [clearMethod, setClearMethod] = useState("Cash");

  // Charge State
  const [chargeAmount, setChargeAmount] = useState("");
  const [chargeDesc, setChargeDesc] = useState("Additional Charge");

  // Profile Edit State
  const [editField, setEditField] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");

  const fetchProfile = useCallback(async () => {
    if (!id) return;
    try {
      clearApiCache();
      const response = await api.get<CustomerProfile>(API_ENDPOINTS.CUSTOMERS.PROFILE(id as string));
      if (response.data) {
        setProfile(response.data);
        const base = response.data.customer.billing_plans?.total_price || 0;
        if (!showRenewModal) {
            setRenewAmount((base * parseInt(renewCycles || "1")).toString());
        }
        if (!showClearanceModal) {
            setClearAmount(response.data.billing.outstanding.toString());
        }
      }
      const planRes = await api.get(API_ENDPOINTS.BILLING.PLANS);
      if (planRes.data) setPlans(planRes.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [id, showClearanceModal, showRenewModal, renewCycles]);

  useEffect(() => {
    fetchProfile();
  }, [id]);

  useEffect(() => {
    if (searchParams.get('settle') === 'true' && profile && profile.billing.outstanding > 0 && hasPermission(user, "settle_payment")) {
      setShowClearanceModal(true);
    }
  }, [searchParams, profile, user]);

  useEffect(() => {
    if (profile?.customer?.billing_plans?.total_price) {
        const base = profile.customer.billing_plans.total_price;
        const cycleInt = parseInt(renewCycles) || 1;
        setRenewAmount((base * cycleInt).toString());
    }
  }, [renewCycles, profile?.customer?.billing_plans?.total_price]);

  // Human Readable Expiry Duration
  const expiryDuration = useMemo(() => {
     if (!profile?.customer?.subscription_end_date) return "No active plan";
     const expiry = new Date(profile.customer.subscription_end_date);
     const today = new Date();
     const diffTime = expiry.getTime() - today.getTime();
     const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
     
     if (diffDays < 0) return `${Math.abs(diffDays)} days expired`;
     const months = Math.floor(diffDays / 30);
     const days = diffDays % 30;
     
     let parts = [];
     if (months > 0) parts.push(`${months} ${months === 1 ? 'month' : 'months'}`);
     if (days > 0) parts.push(`${days} ${days === 1 ? 'day' : 'days'}`);
     return parts.length > 0 ? parts.join(" ") + " left" : "Expires today";
  }, [profile]);

  // Advance Tracker
  const advanceSummary = useMemo(() => {
     if (!profile) return { amount: 0, months: 0 };
     const totalBilled = profile.billing.invoices.reduce((sum, inv) => sum + inv.total_amount, 0);
     const totalPaid = profile.billing.payments.reduce((sum, pay) => sum + pay.amount, 0);
     const diff = totalPaid - totalBilled;
     if (diff <= 0) return { amount: 0, months: 0 };
     const planPrice = profile.customer.billing_plans?.total_price || 1;
     return { amount: diff, months: (diff / planPrice).toFixed(1) };
  }, [profile]);

  // Unified Ledger with MERGED ROWS for a "Clean Statement"
  const unifiedLedger = useMemo(() => {
    if (!profile) return [];
    
    const { invoices, payments } = profile.billing;
    const entries: any[] = [];
    
    const paymentMap: Record<number, any[]> = {};
    const unlinkedPayments: any[] = [];
    
    payments.forEach(p => {
      if (p.invoice_id) {
        if (!paymentMap[p.invoice_id]) paymentMap[p.invoice_id] = [];
        paymentMap[p.invoice_id].push(p);
      } else {
        unlinkedPayments.push(p);
      }
    });

    invoices.forEach(inv => {
      const linkedPays = paymentMap[inv.id] || [];
      const totalPaid = linkedPays.reduce((sum, p) => sum + p.amount, 0);
      
      let displayDate = inv.created_at;
      if (linkedPays.length > 0) {
          const sortedPays = [...linkedPays].sort((a, b) => new Date(b.payment_date).getTime() - new Date(a.payment_date).getTime());
          displayDate = sortedPays[0].payment_date;
      }
      
      entries.push({
        ledgerKey: `inv-${inv.id}`,
        origId: inv.id,
        date: displayDate,
        type: 'Bill',
        ledgerType: 'invoice',
        subtype: inv.invoice_number.startsWith('RNW') ? (inv.status === 'Paid' ? 'Paid Renewal' : 'Credit Renewal') : (inv.invoice_number.startsWith('MAN') ? 'Manual Charge' : 'System Bill'),
        ref: inv.invoice_number,
        debit: inv.total_amount,
        credit: totalPaid,
        status: inv.status,
        notes: inv.notes || (inv.invoice_number.startsWith('RNW') ? "Monthly Subscription" : "Service Charge"),
        rawDate: new Date(displayDate).getTime(),
        isMerged: linkedPays.length > 0,
        linkedPaymentIds: linkedPays.map(p => p.id)
      });
    });

    unlinkedPayments.forEach(pay => {
      entries.push({
        ledgerKey: `pay-${pay.id}`,
        origId: pay.id,
        date: pay.payment_date,
        type: 'Collection',
        ledgerType: 'payment',
        subtype: `${pay.payment_method} Payment`,
        ref: `PAY-${pay.id.toString().padStart(4, '0')}`,
        debit: 0,
        credit: pay.amount,
        status: 'Confirmed',
        notes: `Direct Payment (Unlinked)`,
        rawDate: new Date(pay.payment_date).getTime(),
        isMerged: false
      });
    });
    
    let sortedAsc = entries.sort((a, b) => a.rawDate - b.rawDate);
    let runningBalance = 0;
    const withBalance = sortedAsc.map(e => {
      runningBalance += (e.debit - e.credit);
      return { ...e, balance: runningBalance };
    });
    
    let final = withBalance.sort((a, b) => b.rawDate - a.rawDate);
    
    return final.filter(e => {
        const matchesSearch = e.ref.toLowerCase().includes(ledgerSearch.toLowerCase()) || e.notes.toLowerCase().includes(ledgerSearch.toLowerCase());
        const matchesType = ledgerType === 'all' || e.ledgerType === ledgerType;
        const matchesDate = !dateFilter || e.date.startsWith(dateFilter);
        return matchesSearch && matchesType && matchesDate;
    });
  }, [profile, ledgerSearch, ledgerType, dateFilter]);

  const handleRetract = async (type: string, id: number, item?: any) => {
    const msg = item?.linkedPaymentIds?.length 
      ? `Confirm Retract? This will undo the Bill AND the linked Cash Collections.`
      : `Confirm Retract? This will undo the transaction and update the audit log.`;
      
    if (!confirm(msg)) return;
    try {
      setIsSubmitting(true);
      const response = await api.post(API_ENDPOINTS.BILLING.RETRACT(type, id), {});
      if (response.error) {
        setResultPopup({ type: 'fail', message: response.error });
      } else {
        setResultPopup({ type: 'success', message: 'Transaction retracted successfully.' });
        fetchProfile();
      }
    } catch (err: any) {
       setResultPopup({ type: 'fail', message: err.message || 'Retract failed.' });
    } finally {
        setIsSubmitting(false);
    }
  };

  const handleUpdateField = async (field: string, value: any) => {
    try {
      setIsSubmitting(true);
      const finalValue = field === 'plan_id' ? parseInt(value) : value;
      const updateUrl = API_ENDPOINTS.CUSTOMERS.PROFILE(id as string).replace('/profile/', '/');
      const response = await api.put(updateUrl, { [field]: finalValue });
      if (response.data) {
        setResultPopup({ type: 'success', message: 'Profile updated successfully.' });
        setShowProfileModal(false);
        fetchProfile();
      }
    } catch (err) {
      setResultPopup({ type: 'fail', message: 'Update failed.' });
    } finally {
        setIsSubmitting(false);
    }
  };

  const handleManualCharge = async () => {
    try {
      setIsSubmitting(true);
      const response = await api.post(`${API_ENDPOINTS.BILLING.INVOICES}manual/`, {
        customer_id: parseInt(id as string),
        amount: parseFloat(chargeAmount),
        description: chargeDesc
      });
      if (response.data) {
        setResultPopup({ type: 'success', message: 'Charge recorded successfully.' });
        setShowChargeModal(false);
        fetchProfile();
      }
    } catch (err) {
      setResultPopup({ type: 'fail', message: 'Failed to record charge.' });
    } finally {
        setIsSubmitting(false);
    }
  };

  const handleClearBalance = async () => {
     try {
       setIsSubmitting(true);
       const response = await api.post(API_ENDPOINTS.BILLING.CLEAR_OUTSTANDING, {
         customer_id: parseInt(id as string),
         amount: parseFloat(clearAmount),
         payment_method: clearMethod
       });
       if (response.data) {
         setResultPopup({ type: 'success', message: response.data.message });
         setShowClearanceModal(false);
         fetchProfile();
       }
     } catch (err) {
       setResultPopup({ type: 'fail', message: 'Clearance failed.' });
     } finally {
        setIsSubmitting(false);
     }
  };

  const handleRenew = async () => {
    if (renewType === "without_payment") {
        if (!confirm("Confirm Credit Renewal? This will extend the subscriber's date but they will still owe you the payment amount.")) return;
    }

    try {
      setIsSubmitting(true);
      const response = await api.post(API_ENDPOINTS.BILLING.RENEW, {
        customer_id: parseInt(id as string),
        cycles: parseInt(renewCycles),
        with_payment: renewType === "with_payment",
        amount: parseFloat(renewAmount),
        discount: parseFloat(renewDiscount),
        payment_method: paymentMethod
      });
      if (response.data) {
        setResultPopup({ type: 'success', message: 'Subscription renewed successfully!' });
        setShowRenewModal(false);
        fetchProfile();
      }
    } catch (err) {
      setResultPopup({ type: 'fail', message: 'Renewal failed.' });
    } finally {
        setIsSubmitting(false);
    }
  };

  if (loading && !profile) return <DashboardLayout allowedRoles={["owner", "admin", "senior_worker", "worker"]}><div className="flex items-center justify-center min-h-[60vh]"><div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div></div></DashboardLayout>;
  if (!profile) return <DashboardLayout allowedRoles={["owner", "admin", "senior_worker", "worker"]}><div className="text-center py-20 bg-white rounded-3xl shadow-sm font-black">Customer Not Found</div></DashboardLayout>;

  const { customer, billing } = profile;

  return (
    <DashboardLayout allowedRoles={["owner", "admin", "senior_worker", "worker"]}>
      <div className="space-y-6 max-w-6xl mx-auto pb-20">
        
        {/* Top Operational Bar */}
        <div className="flex justify-between items-center bg-white p-4 rounded-2xl shadow-sm border border-slate-100 overflow-x-auto">
           <div className="flex gap-2 min-w-max">
              {hasPermission(user, "edit_subscriber") && (
                <>
                  <button onClick={() => { setEditField("area"); setEditValue(customer.area || ""); setShowProfileModal(true); }} className="px-4 py-2 bg-slate-50 hover:bg-slate-100 rounded-xl text-xs font-bold text-slate-600 border border-slate-100 uppercase tracking-tighter">Area</button>
                  <button onClick={() => { setEditField("door_number"); setEditValue(customer.door_number || ""); setShowProfileModal(true); }} className="px-4 py-2 bg-slate-50 hover:bg-slate-100 rounded-xl text-xs font-bold text-slate-600 border border-slate-100 uppercase tracking-tighter">Address</button>
                  <button onClick={() => { setEditField("customer_id"); setEditValue(customer.customer_id || ""); setShowProfileModal(true); }} className="px-4 py-2 bg-slate-50 hover:bg-slate-100 rounded-xl text-xs font-bold text-slate-600 border border-slate-100 uppercase tracking-tighter">ID</button>
                  <button onClick={() => { setEditField("phone_number"); setEditValue(customer.phone_number || ""); setShowProfileModal(true); }} className="px-4 py-2 bg-slate-50 hover:bg-slate-100 rounded-xl text-xs font-bold text-slate-600 border border-slate-100 uppercase tracking-tighter">Mobile</button>
                </>
              )}
           </div>
           <button className="px-4 py-2 bg-blue-50 text-blue-600 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-blue-100 ml-4 whitespace-nowrap">KYC Docs</button>
        </div>

        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between gap-6 items-start">
          <div className="flex items-center gap-6">
             <div className="w-24 h-24 rounded-[40px] bg-gradient-to-br from-blue-600 to-indigo-800 flex items-center justify-center text-white text-4xl font-black shadow-2xl">{customer.full_name.charAt(0)}</div>
             <div>
               <div className="flex flex-wrap items-center gap-3">
                 <h1 className="text-4xl font-black text-slate-800 tracking-tighter leading-none">{customer.full_name}</h1>
                 <span className={`px-4 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${customer.status === 'Active' ? 'bg-green-100 text-green-700 shadow-sm shadow-green-100' : 'bg-rose-100 text-rose-700 shadow-sm shadow-rose-100'}`}>{customer.status}</span>
               </div>
               <div className="text-slate-400 text-sm font-bold flex flex-wrap items-center gap-5 mt-2">
                 <span className="flex items-center gap-2 bg-slate-100/50 px-3 py-1.5 rounded-xl"><Hash size={14} className="text-blue-500" /> {customer.customer_id}</span>
                 <span className="flex items-center gap-2 bg-slate-100/50 px-3 py-1.5 rounded-xl"><Phone size={14} className="text-emerald-500" /> {customer.phone_number}</span>
               </div>
             </div>
          </div>
          <div className="flex gap-3 w-full md:w-auto relative">
             {hasPermission(user, "renew_subscription") && (
                <button onClick={() => { setRenewType("with_payment"); setShowRenewModal(true); }} className="flex-1 md:flex-none flex items-center justify-center gap-2 bg-blue-600 text-white px-8 py-5 rounded-[28px] font-black uppercase tracking-widest text-xs hover:bg-blue-700 shadow-xl shadow-blue-600/30">Renew Subscriber</button>
             )}
             <button onClick={() => setIsDropdownOpen(!isDropdownOpen)} className="p-5 bg-white border border-slate-200 rounded-[28px] text-slate-600 hover:bg-slate-50 shadow-sm"><Settings size={22} /></button>
             {isDropdownOpen && (
               <div className="absolute right-0 top-full mt-4 w-72 bg-white rounded-[32px] shadow-2xl border border-slate-100 z-50 overflow-hidden">
                  <div className="divide-y divide-slate-50">
                    {hasPermission(user, "record_charge") && (
                        <button onClick={() => { setShowChargeModal(true); setIsDropdownOpen(false); }} className="w-full text-left px-6 py-5 text-xs font-black text-slate-600 hover:bg-slate-50 flex items-center gap-4 transition-colors"><FileText size={20} className="text-blue-500" /> Record Addl. Charge</button>
                    )}
                    {hasPermission(user, "edit_subscriber") && (
                        <>
                            <button onClick={() => { setEditField("plan_id"); setEditValue(customer.plan_id?.toString() || ""); setShowProfileModal(true); setIsDropdownOpen(false); }} className="w-full text-left px-6 py-5 text-xs font-black text-slate-600 hover:bg-slate-50 flex items-center gap-4 transition-colors"><Package size={20} className="text-indigo-500" /> Change Subscription</button>
                            <button onClick={() => { setEditField("card_number"); setEditValue(customer.card_number || ""); setShowProfileModal(true); setIsDropdownOpen(false); }} className="w-full text-left px-6 py-5 text-xs font-black text-slate-600 hover:bg-slate-50 flex items-center gap-4 transition-colors"><BoxIcon size={20} className="text-amber-500" /> Hardware Details</button>
                        </>
                    )}
                    <button onClick={() => { setEditField("notes"); setEditValue(customer.notes || ""); setShowProfileModal(true); setIsDropdownOpen(false); }} className="w-full text-left px-6 py-5 text-xs font-black text-slate-600 hover:bg-slate-50 flex items-center gap-4 transition-colors"><Zap size={20} className="text-slate-400" /> Internal Notes</button>
                  </div>
               </div>
             )}
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
           <div onClick={() => hasPermission(user, "settle_payment") && setShowClearanceModal(true)} className={`${hasPermission(user, "settle_payment") ? 'cursor-pointer' : 'cursor-default'}`}>
                <ProfileStatCard label="Due Amount" value={`₹${billing.outstanding.toLocaleString()}`} icon={<AlertTriangle size={20} />} color="rose" subtext={hasPermission(user, "settle_payment") ? "Click to settle" : "Immediate Debt"} />
           </div>
           <ProfileStatCard label="Advance Hold" value={`₹${advanceSummary.amount.toLocaleString()}`} icon={<ArrowDownCircle size={20} />} color="emerald" subtext={`${advanceSummary.months} months`} />
           <ProfileStatCard label="Expiry Date" value={customer.subscription_end_date ? new Date(customer.subscription_end_date).toLocaleDateString() : "Never"} icon={<Calendar size={20} />} color="blue" subtext={expiryDuration} />
           <ProfileStatCard label="Rate" value={`₹${(customer.billing_plans?.total_price || 0).toLocaleString()}`} icon={<Package size={20} />} color="blue" subtext="Monthly Tariff" />
           <ProfileStatCard label="Box ID" value={customer.door_number} icon={<BoxIcon size={20} />} color="amber" subtext={customer.card_number} />
        </div>

        {/* LEDGER */}
        <div className="bg-white rounded-[48px] shadow-xl border border-slate-100 overflow-hidden mt-10">
           <div className="p-10 border-b border-slate-50 flex flex-col lg:flex-row justify-between gap-6 items-center">
              <div>
                 <h2 className="text-2xl font-black text-slate-800 flex items-center gap-4 uppercase tracking-tighter"><History size={28} className="text-blue-600" /> Ledger Statement</h2>
                 <p className="text-slate-400 text-[10px] font-black mt-1 uppercase tracking-widest">Latest First • Running Balance</p>
              </div>
              <div className="flex flex-1 max-w-3xl gap-3 w-full">
                 <div className="relative flex-1">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                    <input type="text" placeholder="Search ref..." className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold" value={ledgerSearch} onChange={(e) => setLedgerSearch(e.target.value)} />
                 </div>
                 <input type="date" className="px-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl text-xs font-black text-slate-500" value={dateFilter} onChange={(e) => setDateFilter(e.target.value)} />
                 <select className="px-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl text-[10px] font-black text-slate-500 uppercase" value={ledgerType} onChange={(e) => setLedgerType(e.target.value)}>
                    <option value="all">ALL</option>
                    <option value="invoice">BILLS</option>
                    <option value="payment">CASH</option>
                 </select>
              </div>
           </div>
           <div className="overflow-x-auto">
              <table className="w-full text-left">
                 <thead className="bg-slate-50/50">
                    <tr><th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase">Date</th><th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase">Details</th><th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase text-right">Bill (Dr)</th><th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase text-right">Paid (Cr)</th><th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase text-right">Total Balance</th><th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase text-center">Undo</th></tr>
                 </thead>
                 <tbody className="divide-y divide-slate-50">
                    {unifiedLedger.map((item: any) => (
                       <tr key={item.ledgerKey} onClick={() => setShowDetailModal(item)} className="hover:bg-blue-50/30 transition-all cursor-pointer group">
                          <td className="px-8 py-5">
                             <div className="text-sm font-bold text-slate-700">{new Date(item.date).toLocaleDateString()}</div>
                             <div className="text-[10px] text-slate-400 font-black uppercase">{new Date(item.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                          </td>
                          <td className="px-8 py-5">
                             <div className="text-[10px] font-black text-slate-400 uppercase">{item.subtype}</div>
                             <div className="text-sm font-black text-slate-800 tracking-tighter">{item.ref}</div>
                          </td>
                          <td className="px-8 py-5 text-right font-black text-rose-600">{item.debit > 0 ? `₹${item.debit.toLocaleString()}` : '-'}</td>
                          <td className="px-8 py-5 text-right font-black text-emerald-600">{item.credit > 0 ? `₹${item.credit.toLocaleString()}` : '-'}</td>
                          <td className="px-8 py-5 text-right font-black text-slate-800">
                             ₹{Math.abs(item.balance).toLocaleString()} {item.balance > 0 ? '(Due)' : item.balance < 0 ? '(Adv)' : ''}
                          </td>
                          <td className="px-8 py-5 text-center">
                             {hasPermission(user, "retract_transaction") && (
                                <button onClick={(e) => { e.stopPropagation(); handleRetract(item.ledgerType, item.origId, item); }} className="p-2 text-slate-200 hover:text-rose-600 transition-colors"><RotateCcw size={16}/></button>
                             )}
                          </td>
                       </tr>
                    ))}
                 </tbody>
              </table>
           </div>
        </div>
      </div>

      {/* RENEW MODAL */}
      {showRenewModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-md">
           <div className="bg-white rounded-[56px] w-full max-w-lg shadow-2xl overflow-hidden animate-in zoom-in duration-300">
              <div className="p-12 pb-0 flex justify-between items-start">
                 <div>
                    <div className="w-16 h-16 rounded-3xl bg-blue-50 flex items-center justify-center text-blue-600 mb-6"><RefreshCcw size={32} /></div>
                    <h3 className="text-3xl font-black text-slate-800 tracking-tighter">Subscriber Renewal</h3>
                 </div>
                 <button onClick={() => setShowRenewModal(false)} className="p-4 text-slate-300 hover:text-slate-900 transition-colors"><X size={28} /></button>
              </div>
              <div className="p-12 pt-10 space-y-10">
                 <div className="grid grid-cols-2 gap-4 p-2 bg-slate-100 rounded-[32px]">
                    <button onClick={() => setRenewType("with_payment")} className={`py-5 rounded-[24px] text-xs font-black uppercase transition-all ${renewType === 'with_payment' ? 'bg-white text-blue-600 shadow-2xl' : 'text-slate-400'}`}>Full Payment</button>
                    <button onClick={() => setRenewType("without_payment")} className={`py-5 rounded-[24px] text-xs font-black uppercase transition-all ${renewType === 'without_payment' ? 'bg-white text-rose-600 shadow-2xl' : 'text-slate-400'}`}>On Credit</button>
                 </div>
                 <div className="space-y-6">
                    <div className="grid grid-cols-2 gap-6">
                       <div className="space-y-3">
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Month Cycle</label>
                          <input type="number" className="w-full p-5 rounded-3xl border-2 border-slate-100 font-black text-lg text-slate-700 outline-none focus:border-blue-400" value={renewCycles} onChange={(e) => setRenewCycles(e.target.value)} />
                       </div>
                       <div className="space-y-3">
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Total Amount (₹)</label>
                          <input type="number" className="w-full p-5 rounded-3xl border-2 border-slate-100 font-black text-lg text-slate-700 outline-none focus:border-blue-400" value={renewAmount} onChange={(e) => setRenewAmount(e.target.value)} />
                       </div>
                    </div>
                    {renewType === "with_payment" && (
                       <select className="w-full p-5 rounded-3xl border-2 border-slate-100 font-black text-sm text-slate-700 bg-slate-50 outline-none focus:bg-white focus:border-blue-400" value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)}>
                          <option value="Cash">💵 Cash Collection</option>
                          <option value="Online">📱 Online / UPI</option>
                       </select>
                    )}
                 </div>
                 <button 
                    disabled={isSubmitting}
                    onClick={handleRenew} 
                    className={`w-full py-7 rounded-[32px] text-white text-sm font-black uppercase tracking-[0.25em] shadow-2xl flex items-center justify-center gap-3 transition-all ${isSubmitting ? 'bg-slate-400' : (renewType === 'with_payment' ? 'bg-blue-600' : 'bg-rose-600')}`}
                 >
                    {isSubmitting ? <Loader2 className="animate-spin" size={20} /> : <CheckCircle2 size={20} />}
                    {isSubmitting ? 'Processing...' : 'Confirm Renewal'}
                 </button>
              </div>
           </div>
        </div>
      )}

      {/* CLEARANCE MODAL */}
      {showClearanceModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-md">
           <div className="bg-white rounded-[56px] w-full max-w-md shadow-2xl overflow-hidden animate-in zoom-in duration-300">
              <div className="p-10 pb-0 flex justify-between items-center">
                 <h3 className="text-2xl font-black text-slate-800 tracking-tighter italic">Settle Balance</h3>
                 <button onClick={() => setShowClearanceModal(false)} className="text-slate-300"><X size={28}/></button>
              </div>
              <div className="p-10 space-y-8">
                  <div className="p-6 bg-rose-50 rounded-3xl border-2 border-rose-100 flex items-center gap-5">
                     <div className="w-12 h-12 rounded-2xl bg-rose-600 flex items-center justify-center text-white"><AlertTriangle size={24} /></div>
                     <div><div className="text-[10px] font-black text-rose-400 uppercase leading-none mb-1">Debt</div><div className="text-2xl font-black text-rose-700 tracking-tighter">₹{billing.outstanding.toLocaleString()}</div></div>
                  </div>
                  <div className="space-y-6">
                     <input type="number" className="w-full p-5 rounded-3xl border-2 border-slate-100 font-black text-xl text-slate-700 focus:border-blue-400 outline-none" value={clearAmount} onChange={(e) => setClearAmount(e.target.value)} placeholder="Amount Received" />
                     <select className="w-full p-5 rounded-3xl border-2 border-slate-100 font-black text-sm text-slate-700 bg-slate-50 outline-none" value={clearMethod} onChange={(e) => setClearMethod(e.target.value)}>
                        <option value="Cash">Cash Collection</option>
                        <option value="Online">Online / UPI</option>
                     </select>
                  </div>
                  <button 
                    disabled={isSubmitting}
                    onClick={handleClearBalance} 
                    className={`w-full py-6 rounded-[32px] text-xs font-black uppercase shadow-xl transition-all flex items-center justify-center gap-3 ${isSubmitting ? 'bg-slate-400 text-white' : 'bg-emerald-600 text-white hover:bg-emerald-700'}`}
                  >
                    {isSubmitting ? <Loader2 className="animate-spin" size={18} /> : <Banknote size={18} />}
                    {isSubmitting ? 'Recording...' : 'Settle Balance'}
                  </button>
              </div>
           </div>
        </div>
      )}

      {/* POPUP NOTIFICATION */}
      {resultPopup && (
         <div className="fixed bottom-10 left-1/2 -translate-x-1/2 z-[200] animate-in slide-in-from-bottom-10 duration-500">
            <div className={`px-10 py-5 rounded-[32px] shadow-2xl flex items-center gap-4 text-white font-black uppercase tracking-widest text-xs ${resultPopup.type === 'success' ? 'bg-emerald-600' : 'bg-rose-600'}`}>
               {resultPopup.type === 'success' ? <CheckCircle2 size={24}/> : <XCircle size={24}/>}
               {resultPopup.message}
               <button onClick={() => setResultPopup(null)} className="ml-4 opacity-50 hover:opacity-100"><X size={18}/></button>
            </div>
         </div>
      )}

      {/* DETAIL MODAL */}
      {showDetailModal && (
         <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-md">
            <div className="bg-white rounded-[48px] w-full max-w-sm shadow-2xl overflow-hidden p-10 text-center animate-in zoom-in duration-300">
               <div className={`w-20 h-20 rounded-[32px] mx-auto flex items-center justify-center mb-6 ${showDetailModal.type === 'Bill' ? 'bg-rose-50 text-rose-600' : 'bg-emerald-50 text-emerald-600'}`}>
                  {showDetailModal.type === 'Bill' ? <ArrowUpCircle size={32}/> : <ArrowDownCircle size={32}/>}
               </div>
               <h3 className="text-2xl font-black text-slate-800 tracking-tighter mb-2">{showDetailModal.subtype}</h3>
               <div className="text-4xl font-black text-slate-900 mb-8 tracking-tighter">₹{Math.max(showDetailModal.debit, showDetailModal.credit).toLocaleString()}</div>
               <div className="space-y-4 text-left bg-slate-50 p-6 rounded-3xl mb-8">
                  <div className="flex justify-between"><span className="text-[10px] font-black text-slate-400 uppercase">Ref #</span><span className="text-sm font-black text-slate-700">{showDetailModal.ref}</span></div>
                  <div className="flex justify-between"><span className="text-[10px] font-black text-slate-400 uppercase">Date</span><span className="text-sm font-black text-slate-700">{new Date(showDetailModal.date).toLocaleString()}</span></div>
                  <div className="flex justify-between"><span className="text-[10px] font-black text-slate-400 uppercase">Type</span><span className="text-sm font-black text-slate-700">{showDetailModal.type}</span></div>
               </div>
               <button onClick={() => setShowDetailModal(null)} className="w-full py-5 bg-slate-900 text-white rounded-[24px] text-xs font-black uppercase">Close Details</button>
            </div>
         </div>
      )}

      {/* CHARGE MODAL */}
      {showChargeModal && (
         <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-md">
            <div className="bg-white rounded-[56px] w-full max-w-md shadow-2xl overflow-hidden animate-in zoom-in duration-500">
               <div className="p-10 pb-0 flex justify-between items-center">
                  <h3 className="text-2xl font-black text-slate-800 tracking-tighter italic leading-none">Record Charge</h3>
                  <button onClick={() => setShowChargeModal(false)} className="text-slate-300 hover:text-slate-900 transition-colors"><X size={28}/></button>
               </div>
               <div className="p-10 space-y-6">
                  <input type="number" className="w-full p-5 rounded-3xl border-2 border-slate-100 font-black text-xl text-slate-700 focus:border-blue-400 outline-none" value={chargeAmount} onChange={(e) => setChargeAmount(e.target.value)} placeholder="Amount (₹)" />
                  <input type="text" className="w-full p-5 rounded-3xl border-2 border-slate-100 font-bold text-slate-700 focus:border-blue-400 outline-none" value={chargeDesc} onChange={(e) => setChargeDesc(e.target.value)} placeholder="Reason" />
                  <button 
                    disabled={isSubmitting}
                    onClick={handleManualCharge} 
                    className={`w-full py-6 rounded-[32px] text-xs font-black uppercase shadow-xl transition-all flex items-center justify-center gap-3 active:scale-95 mt-4 ${isSubmitting ? 'bg-slate-400 text-white' : 'bg-blue-600 text-white hover:bg-blue-700'}`}
                 >
                    {isSubmitting ? <Loader2 className="animate-spin" size={18} /> : <FileText size={18} />}
                    {isSubmitting ? 'Generating...' : 'Generate Entry'}
                 </button>
               </div>
            </div>
         </div>
      )}

      {/* UPDATE MODAL */}
      {showProfileModal && (
         <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-md">
            <div className="bg-white rounded-[56px] w-full max-w-md shadow-2xl overflow-hidden">
               <div className="p-10 pb-0 flex justify-between items-center">
                  <h3 className="text-2xl font-black text-slate-800 tracking-tighter italic leading-none">Modify {editField?.replace(/_/g, ' ').toUpperCase()}</h3>
                  <button onClick={() => setShowProfileModal(false)} className="text-slate-300 hover:text-slate-900 transition-colors"><X size={28}/></button>
               </div>
               <div className="p-10 space-y-8">
                  <div className="space-y-3">
                     {editField === 'plan_id' ? (
                        <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                           {plans.map(p => (
                              <button key={p.id} onClick={() => setEditValue(p.id.toString())} className={`w-full p-5 rounded-3xl border-2 text-left transition-all ${editValue === p.id.toString() ? 'border-blue-600 bg-blue-50/50 shadow-lg' : 'border-slate-100 hover:border-blue-200'}`}>
                                 <div className="flex justify-between items-center"><span className="font-black text-slate-800">{p.name}</span><span className="text-lg font-black text-blue-600">₹{p.total_price}</span></div>
                              </button>
                           ))}
                        </div>
                     ) : editField === 'notes' ? (
                        <textarea className="w-full p-6 rounded-[32px] border-2 border-slate-100 font-bold text-slate-700 bg-slate-50 focus:bg-white focus:border-blue-400 outline-none min-h-[160px]" value={editValue} onChange={(e) => setEditValue(e.target.value)} />
                     ) : (
                        <input type="text" className="w-full p-6 rounded-[32px] border-2 border-slate-100 font-black text-xl text-slate-700 bg-slate-50 focus:bg-white focus:border-blue-400 outline-none" value={editValue} onChange={(e) => setEditValue(e.target.value)} />
                     )}
                  </div>
                  <button 
                    disabled={isSubmitting}
                    onClick={() => handleUpdateField(editField!, editValue)} 
                    className={`w-full py-6 rounded-[32px] text-xs font-black uppercase shadow-xl transition-all flex items-center justify-center gap-3 ${isSubmitting ? 'bg-slate-400 text-white' : 'bg-slate-900 text-white hover:bg-black'}`}
                  >
                    {isSubmitting ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}
                    {isSubmitting ? 'Saving...' : 'Save Update'}
                  </button>
               </div>
            </div>
         </div>
      )}
    </DashboardLayout>
  );
}

function ProfileStatCard({ label, value, icon, color, subtext }: any) {
  const colors: any = { blue: "bg-blue-50 text-blue-600 shadow-blue-50", rose: "bg-rose-50 text-rose-600 shadow-rose-50", emerald: "bg-emerald-50 text-emerald-600 shadow-emerald-50", amber: "bg-amber-50 text-amber-600 shadow-amber-50" };
  return (
    <div className="bg-white p-8 rounded-[48px] border border-slate-100 shadow-sm hover:shadow-2xl transition-all duration-500 group">
      <div className={`w-14 h-14 rounded-[20px] flex items-center justify-center mb-6 shadow-inner ${colors[color]}`}>{icon}</div>
      <div className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1">{label}</div>
      <div className="text-2xl font-black text-slate-800 truncate tracking-tighter leading-none">{value}</div>
      <div className="text-[10px] font-bold text-slate-400 mt-3 flex items-center gap-1 opacity-70 group-hover:opacity-100 transition-opacity"><Info size={12} /> {subtext}</div>
    </div>
  );
}
