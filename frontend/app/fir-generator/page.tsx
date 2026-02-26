"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function FIRGenerator() {
  const router = useRouter();

  const [formData, setFormData] = useState({
    complainantName: "",
    contactNumber: "",
    address: "",
    crimeDate: "",
    crimeTime: "",
    crimeLocation: "",
    description: ""
  });

  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [assignedStation, setAssignedStation] = useState("");

  const jurisdictionMap: Record<string, string> = {
    "mumbai": "Cyber Police Station, BKC, Mumbai",
    "pune": "Cyber Police Station, Shivajinagar, Pune",
    "nagpur": "Cyber Police Station, Nagpur",
    "nashik": "Cyber Police Station, Nashik"
  };

  const analyzeText = (text: string) => {
    const textLower = text.toLowerCase();
    const newSuggestions = [];

    if (textLower.includes("digital arrest") || textLower.includes("extort")) {
      newSuggestions.push("BNS 308: Extortion");
    }

    if (textLower.includes("fake app") || textLower.includes("trading fraud")) {
      newSuggestions.push("BNS 318(4): Cheating");
      newSuggestions.push("IT Act 66D: Cheating by Personation");
    }

    setSuggestions(newSuggestions);
  };

  const handleChange = (e: any) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });

    if (name === "description") {
      analyzeText(value);
    }
  };

  const handleRegister = () => {
    const location = formData.crimeLocation.toLowerCase();
    let station = "Jurisdiction Not Found - Manual Review Required";

    Object.keys(jurisdictionMap).forEach((key) => {
      if (location.includes(key)) {
        station = jurisdictionMap[key];
      }
    });

    setAssignedStation(station);

    // Redirect after short delay
    setTimeout(() => {
      router.push(`/jurisdiction?station=${encodeURIComponent(station)}`);
    }, 1500);
  };

  return (
  <div className="min-h-screen overflow-y-auto bg-gray-50 py-10">
    <div className="max-w-5xl mx-auto bg-white p-10 rounded-xl shadow-md border border-slate-200 text-black">

      <h1 className="text-3xl font-bold mb-8 text-center text-black">
        FIRST INFORMATION REPORT (FIR)
      </h1>

      <div className="space-y-6">

        {/* Complainant Details */}
        <h2 className="font-semibold text-lg border-b pb-2 text-black">
          Complainant Details
        </h2>

        <input
          type="text"
          name="complainantName"
          placeholder="Full Name"
          className="w-full p-3 border rounded-md text-black"
          onChange={handleChange}
        />

        <input
          type="text"
          name="contactNumber"
          placeholder="Contact Number"
          className="w-full p-3 border rounded-md text-black"
          onChange={handleChange}
        />

        <input
          type="text"
          name="address"
          placeholder="Residential Address"
          className="w-full p-3 border rounded-md text-black"
          onChange={handleChange}
        />

        {/* Crime Details */}
        <h2 className="font-semibold text-lg border-b pb-2 mt-8 text-black">
          Crime Details
        </h2>

        <div className="grid grid-cols-2 gap-4">
          <input
            type="date"
            name="crimeDate"
            className="p-3 border rounded-md text-black"
            onChange={handleChange}
          />
          <input
            type="time"
            name="crimeTime"
            className="p-3 border rounded-md text-black"
            onChange={handleChange}
          />
        </div>

        <input
          type="text"
          name="crimeLocation"
          placeholder="Place of Occurrence (City / District)"
          className="w-full p-3 border rounded-md text-black"
          onChange={handleChange}
        />

        <textarea
          name="description"
          rows={6}
          placeholder="Brief Facts of the Case..."
          className="w-full p-3 border rounded-lg text-black"
          onChange={handleChange}
        />

        {/* AI Suggested Sections */}
        {suggestions.length > 0 && (
          <div className="p-4 bg-blue-50 border-l-4 border-blue-600 rounded-md text-black">
            <h3 className="font-bold mb-2 text-black">
              AI Suggested Legal Sections:
            </h3>
            {suggestions.map((sec, idx) => (
              <div key={idx} className="text-sm text-black">
                • {sec}
              </div>
            ))}
          </div>
        )}

        {/* Register Button */}
        <button
          onClick={handleRegister}
          className="w-full bg-black text-white py-3 rounded-lg font-bold hover:bg-gray-800 transition"
        >
          Register FIR
        </button>

        {/* Assigned Station */}
        {assignedStation && (
          <div className="mt-4 p-4 bg-green-50 border-l-4 border-green-600 rounded-md text-black">
            <p className="font-semibold text-black">
              Case Assigned To:
            </p>
            <p className="text-black">{assignedStation}</p>
          </div>
        )}

      </div>
    </div>
  </div>
);
}