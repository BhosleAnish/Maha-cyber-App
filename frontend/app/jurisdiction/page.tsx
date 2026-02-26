"use client";
import { useSearchParams } from "next/navigation";

export default function JurisdictionPage() {
  const params = useSearchParams();
  const station = params.get("station");

  return (
    <div className="max-w-3xl mx-auto p-10 bg-white rounded-xl shadow-md">
      <h1 className="text-2xl font-bold mb-6">
        FIR Successfully Registered
      </h1>

      <p className="text-lg">
        This case falls under the jurisdiction of:
      </p>

      <div className="mt-4 p-4 bg-blue-50 border-l-4 border-blue-600 rounded-md">
        <strong>{station}</strong>
      </div>

      <p className="mt-6 text-sm text-gray-600">
        The concerned Cyber Police Station will initiate investigation as per CCTNS protocol.
      </p>
    </div>
  );
}
