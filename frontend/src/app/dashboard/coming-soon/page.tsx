"use client";
import DashboardLayout from "@/components/DashboardLayout";
export default function ComingSoon() {
  return (
    <DashboardLayout allowedRoles={["owner", "admin"]}>
      <div className="min-h-[60vh] flex flex-col items-center justify-center space-y-4">
        <div className="text-6xl">🚧</div>
        <h1 className="text-2xl font-bold text-slate-800">Feature Coming Soon</h1>
        <p className="text-slate-500">We are working hard to bring you this module. Stay tuned!</p>
      </div>
    </DashboardLayout>
  );
}
