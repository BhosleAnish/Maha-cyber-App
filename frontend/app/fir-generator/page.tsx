"use client";
import { useState } from "react";

export default function FIRGenerator() {
  const [description, setDescription] = useState("");
  const [suggestions, setSuggestions] = useState<string[]>([]);

  // Simulating the FastAPI backend call
  const analyzeText = (text: string) => {
    setDescription(text);
    const textLower = text.toLowerCase();
    const newSuggestions = [];
    
    if (textLower.includes("digital arrest") || textLower.includes("extort")) {
      newSuggestions.push("BNS 308: Extortion");
    }
    if (textLower.includes("fake app") || textLower.includes("trading fraud")) {
      newSuggestions.push("BNS 318(4): Cheating / Inducing delivery of property");
      newSuggestions.push("IT Act 66D: Cheating by personation");
    }
    setSuggestions(newSuggestions);
  };

  return (
    <div className="max-w-4xl bg-white p-8 rounded-xl shadow-sm border border-slate-200">
      <h1 className="text-2xl font-bold mb-6 text-slate-800">CCTNS Intelligent FIR Generator</h1>
      
      <form className="space-y-6">
        <div className="grid grid-cols-2 gap-4">
          <div>
             <label className="block text-sm font-medium mb-1">Complainant Name</label>
             <input type="text" className="w-full p-2 border rounded-md" />
          </div>
          <div>
             <label className="block text-sm font-medium mb-1">Police Station</label>
             <select className="w-full p-2 border rounded-md">
               <option>Cyber Police Station, BKC, Mumbai</option>
               <option>Cyber Police Station, Shivajinagar, Pune</option>
             </select>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Brief Facts of the Case</label>
          <textarea 
            rows={6} 
            value={description}
            onChange={(e) => analyzeText(e.target.value)}
            className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            placeholder="E.g., The complainant received a WhatsApp call claiming to be from CBI, placing them under 'digital arrest'..."
          />
        </div>

        {/* AI Suggestions Box */}
        {suggestions.length > 0 && (
          <div className="p-5 bg-blue-50 border-l-4 border-blue-600 rounded-r-lg shadow-sm animate-in fade-in">
            <h3 className="text-sm font-bold text-blue-900 mb-3">⚖️ AI Suggested Legal Sections:</h3>
            <div className="flex flex-wrap gap-2">
              {suggestions.map((sec, idx) => (
                <span key={idx} className="bg-blue-100 text-blue-800 text-xs font-semibold px-3 py-1.5 rounded-md border border-blue-200">
                  {sec}
                </span>
              ))}
            </div>
            <p className="text-xs text-blue-600 mt-3">* Verify sections against the latest BNS manual before generating final FIR.</p>
          </div>
        )}

        <button type="button" className="w-full bg-slate-900 text-white py-3 rounded-lg font-bold hover:bg-slate-800 transition-colors">
          Generate Official CCTNS Draft
        </button>
      </form>
    </div>
  );
}