"use client";
import { useState } from "react";
import { Search } from "lucide-react";

export default function ITActRuleBook() {
  const [query, setQuery] = useState("");
  const [result, setResult] = useState<string[]>([]);

  const handleSearch = () => {
    const text = query.toLowerCase();
    const found = [];
    if (text.includes("hack") || text.includes("access")) found.push("Section 66: Computer Related Offenses (Hacking)");
    if (text.includes("fake profile") || text.includes("impersonat")) found.push("Section 66D: Cheating by personation using computer resource");
    if (text.includes("obscene") || text.includes("porn")) found.push("Section 67: Publishing or transmitting obscene material");
    setResult(found.length > 0 ? found : ["No exact match found. Please refer to the manual index."]);
  };

  return (
    <div className="max-w-3xl bg-white p-8 rounded-xl shadow-sm border border-slate-200">
      <h1 className="text-2xl font-bold mb-6 text-slate-800">IT Act 2000 Rule Book & Crime Matcher</h1>
      <p className="text-slate-600 mb-6">Describe the cyber crime to find applicable IT Act 2000 sections.</p>
      
      <div className="flex gap-2 mb-8">
        <input 
          type="text" 
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="flex-1 p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          placeholder="e.g., Suspect hacked into a bank server..."
        />
        <button onClick={handleSearch} className="bg-slate-800 text-white px-6 py-3 rounded-lg flex items-center gap-2 hover:bg-slate-900">
          <Search size={18} /> Match Section
        </button>
      </div>

      {result.length > 0 && (
        <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg">
          <h2 className="font-bold text-slate-700 mb-2">Applicable Sections:</h2>
          <ul className="list-disc pl-5 space-y-1 text-blue-700 font-medium">
            {result.map((res, i) => <li key={i}>{res}</li>)}
          </ul>
        </div>
      )}
    </div>
  );
}