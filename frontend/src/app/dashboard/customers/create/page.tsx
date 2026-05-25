"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import DashboardLayout from "@/components/DashboardLayout";
import { api, API_ENDPOINTS } from "@/lib/api";
import { 
  User, 
  MapPin, 
  Box as BoxIcon, 
  Package, 
  CreditCard, 
  ChevronRight, 
  ChevronLeft,
  CheckCircle2,
  Phone,
  Mail,
  Hash,
  Plus,
  Loader2
} from "lucide-react";

export default function CreateSubscriberPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [plans, setPlans] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const [formData, setFormData] = useState({
    full_name: "",
    phone_number: "",
    email: "",
    area: "",
    door_number: "",
    street: "",
    card_number: "",
    box_number: "",
    service_type: "Cable",
    plan_id: "",
    payment_method: "Cash",
    initial_payment: "0"
  });

  useEffect(() => {
    async function fetchPlans() {
      const response = await api.get(API_ENDPOINTS.BILLING.PLANS);
      if (response.data) setPlans(response.data);
    }
    fetchPlans();
  }, []);

  const handleNext = () => setStep(s => s + 1);
  const handleBack = () => setStep(s => s - 1);

  const handleSubmit = async () => {
    try {
      if (!formData.full_name || !formData.door_number || !formData.card_number) {
        alert("Please complete all mandatory fields: Name, Door Number, and STB Number.");
        return;
      }

      setLoading(true);
      // 1. Create Customer
      const customerPayload: any = {
        full_name: formData.full_name,
        phone_number: formData.phone_number.trim() || null,
        door_number: formData.door_number.trim(),
        area: formData.area.trim() || null,
        card_number: formData.card_number.trim(),
        service_type: formData.service_type,
        status: "Active",
      };

      if (formData.plan_id) {
          customerPayload.plan_id = parseInt(formData.plan_id);
      }

      const response = await api.post(API_ENDPOINTS.CUSTOMERS.CREATE, customerPayload);
      
      if (response.data) {
        const customer = response.data;
        
        // 2. If initial payment > 0, generate invoice and record payment
        const initialAmt = parseFloat(formData.initial_payment);
        if (!isNaN(initialAmt) && initialAmt > 0) {
           // Create a manual invoice for this first payment
           const invRes = await api.post(API_ENDPOINTS.BILLING.CREATE_SINGLE_INVOICE(customer.id), {});
           if (invRes.data) {
              await api.post(API_ENDPOINTS.BILLING.RECORD_PAYMENT, {
                 invoice_id: invRes.data.id,
                 customer_id: customer.id,
                 amount: initialAmt,
                 payment_method: formData.payment_method
              });
           }
        }

        alert("Subscriber created and onboarded successfully!");
        router.push("/dashboard/customers");
      } else {
        console.error("Creation Error:", response);
        let errorMsg = "Validation failed. Please check all fields.";
        if (response.error) {
          errorMsg = typeof response.error === 'object' ? JSON.stringify(response.error) : response.error;
        }
        alert("Error: " + errorMsg);
      }
    } catch (err: any) {
      alert("Failed to create subscriber: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const renderStep = () => {
    switch(step) {
      case 1:
        return (
          <div className="space-y-4 animate-in slide-in-from-right duration-300">
             <h2 className="text-xl font-black text-slate-800 flex items-center gap-2"><User className="text-blue-500" /> General Information</h2>
             <div className="space-y-4">
                <InputField label="Full Name" placeholder="e.g. John Doe" value={formData.full_name} onChange={(v: string) => setFormData({...formData, full_name: v})} icon={<User size={16}/>} />
                <InputField label="Phone Number" placeholder="e.g. 9876543210" value={formData.phone_number} onChange={(v: string) => setFormData({...formData, phone_number: v})} icon={<Phone size={16}/>} />
                <InputField label="Email Address" placeholder="e.g. john@example.com" value={formData.email} onChange={(v: string) => setFormData({...formData, email: v})} icon={<Mail size={16}/>} />
             </div>
          </div>
        );
      case 2:
        return (
          <div className="space-y-4 animate-in slide-in-from-right duration-300">
             <h2 className="text-xl font-black text-slate-800 flex items-center gap-2"><MapPin className="text-rose-500" /> Address Details</h2>
             <div className="space-y-4">
                <InputField label="Area / Locality" placeholder="e.g. Bank Colony" value={formData.area} onChange={(v: string) => setFormData({...formData, area: v})} icon={<MapPin size={16}/>} />
                <InputField label="Door / House Number" placeholder="e.g. 12-3-4" value={formData.door_number} onChange={(v: string) => setFormData({...formData, door_number: v})} icon={<Hash size={16}/>} />
                <InputField label="Street / Landmark" placeholder="e.g. Near Water Tank" value={formData.street} onChange={(v: string) => setFormData({...formData, street: v})} icon={<MapPin size={16}/>} />
             </div>
          </div>
        );
      case 3:
        return (
          <div className="space-y-4 animate-in slide-in-from-right duration-300">
             <h2 className="text-xl font-black text-slate-800 flex items-center gap-2"><BoxIcon className="text-amber-500" /> Connection Details</h2>
             <div className="space-y-4">
                <InputField label="STB / Card Number" placeholder="12 digit unique ID" value={formData.card_number} onChange={(v: string) => setFormData({...formData, card_number: v})} icon={<CreditCard size={16}/>} />
                <InputField label="Box ID / Hardware ID" placeholder="Manufacturer ID" value={formData.box_number} onChange={(v: string) => setFormData({...formData, box_number: v})} icon={<BoxIcon size={16}/>} />
                <div className="space-y-1.5">
                   <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Service Type</label>
                   <select 
                    className="w-full p-4 rounded-2xl border border-slate-200 font-bold text-slate-700 bg-white"
                    value={formData.service_type}
                    onChange={(e) => setFormData({...formData, service_type: e.target.value})}
                   >
                      <option value="Cable">Cable TV</option>
                      <option value="Internet">High-Speed Internet</option>
                      <option value="Combo">Combo Pack</option>
                   </select>
                </div>
             </div>
          </div>
        );
      case 4:
        return (
          <div className="space-y-4 animate-in slide-in-from-right duration-300">
             <h2 className="text-xl font-black text-slate-800 flex items-center gap-2"><Package className="text-emerald-500" /> Pack Details</h2>
             <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Select Billing Plan</label>
                <div className="grid grid-cols-1 gap-3">
                   {plans.map(plan => (
                      <button 
                        key={plan.id}
                        onClick={() => setFormData({...formData, plan_id: plan.id.toString()})}
                        className={`p-5 rounded-3xl border-2 text-left transition-all ${formData.plan_id === plan.id.toString() ? 'border-blue-600 bg-blue-50/50 shadow-lg' : 'border-slate-100 hover:border-blue-200'}`}
                      >
                         <div className="flex justify-between items-center mb-1">
                            <span className="font-black text-slate-800">{plan.name}</span>
                            <span className="text-lg font-black text-blue-600">₹{plan.total_price}</span>
                         </div>
                         <div className="text-xs text-slate-400 font-medium italic">Tax Inclusive</div>
                      </button>
                   ))}
                </div>
             </div>
          </div>
        );
      case 5:
        return (
          <div className="space-y-4 animate-in slide-in-from-right duration-300">
             <h2 className="text-xl font-black text-slate-800 flex items-center gap-2"><CreditCard className="text-purple-500" /> Initial Payment</h2>
             <div className="space-y-4">
                <InputField label="Amount Received" placeholder="₹ 0.00" value={formData.initial_payment} onChange={(v: string) => setFormData({...formData, initial_payment: v})} icon={<CreditCard size={16}/>} />
                <div className="space-y-1.5">
                   <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Payment Method</label>
                   <select 
                    className="w-full p-4 rounded-2xl border border-slate-200 font-bold text-slate-700 bg-white"
                    value={formData.payment_method}
                    onChange={(e) => setFormData({...formData, payment_method: e.target.value})}
                   >
                      <option value="Cash">Cash Payment</option>
                      <option value="Online">Online / UPI</option>
                      <option value="Credit Card">Credit Card</option>
                   </select>
                </div>
                <div className="p-6 bg-slate-50 rounded-[40px] border border-slate-100 flex items-center gap-4 mt-6">
                   <div className="w-12 h-12 rounded-2xl bg-green-100 flex items-center justify-center text-green-600">
                      <CheckCircle2 size={24} />
                   </div>
                   <div>
                      <div className="text-sm font-black text-slate-800">Ready to go!</div>
                      <div className="text-xs text-slate-400 font-medium">Verify all details before clicking create.</div>
                   </div>
                </div>
             </div>
          </div>
        );
    }
  };

  return (
    <DashboardLayout allowedRoles={["owner", "senior_worker", "worker"]}>
       <div className="max-w-2xl mx-auto space-y-8 pb-20">
          
          {/* Header */}
          <div className="text-center">
             <div className="inline-flex p-3 bg-blue-50 rounded-3xl text-blue-600 mb-4">
                <Plus size={32} />
             </div>
             <h1 className="text-4xl font-black text-slate-800 tracking-tighter">Onboard Subscriber</h1>
             <p className="text-slate-500 font-medium mt-1">Complete the 5-step wizard to create a new connection.</p>
          </div>

          {/* Progress Indicator */}
          <div className="flex justify-between px-2">
             {[1,2,3,4,5].map(i => (
                <div key={i} className={`h-2 rounded-full transition-all duration-500 ${step >= i ? 'bg-blue-600 w-16' : 'bg-slate-100 w-8'}`}></div>
             ))}
          </div>

          {/* Form Content */}
          <div className="bg-white p-10 rounded-[48px] shadow-xl border border-slate-50 min-h-[400px] flex flex-col">
             <div className="flex-1">
                {renderStep()}
             </div>

             <div className="flex justify-between items-center mt-10 pt-8 border-t border-slate-50">
                {step > 1 ? (
                   <button onClick={handleBack} className="flex items-center gap-2 text-slate-400 font-black uppercase tracking-widest text-xs hover:text-slate-600 transition-colors">
                      <ChevronLeft size={16} /> Back
                   </button>
                ) : <div></div>}

                {step < 5 ? (
                   <button 
                    onClick={handleNext} 
                    className="flex items-center gap-2 bg-slate-800 text-white px-8 py-4 rounded-3xl font-black uppercase tracking-widest text-xs hover:bg-slate-900 transition-all shadow-lg shadow-slate-200"
                   >
                      Continue <ChevronRight size={16} />
                   </button>
                ) : (
                   <button 
                    onClick={handleSubmit}
                    disabled={loading}
                    className={`flex items-center gap-2 px-10 py-5 rounded-[28px] font-black uppercase tracking-widest text-xs transition-all shadow-xl disabled:opacity-50 ${loading ? 'bg-slate-400 text-white' : 'bg-blue-600 text-white hover:bg-blue-700 shadow-blue-200'}`}
                   >
                      {loading ? <Loader2 className="animate-spin" size={16} /> : <CheckCircle2 size={16} />} 
                      {loading ? "Creating..." : "Create Subscriber"}
                   </button>
                )}
             </div>
          </div>
       </div>
    </DashboardLayout>
  );
}

function InputField({ label, placeholder, value, onChange, icon }: any) {
  return (
    <div className="space-y-1.5">
       <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">{label}</label>
       <div className="relative">
          <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300">{icon}</div>
          <input 
            type="text" 
            placeholder={placeholder} 
            className="w-full pl-12 pr-4 py-4 rounded-2xl border border-slate-100 bg-slate-50/30 focus:bg-white focus:border-blue-400 transition-all font-bold text-slate-700 focus:outline-none"
            value={value}
            onChange={(e) => onChange(e.target.value)}
          />
       </div>
    </div>
  );
}
