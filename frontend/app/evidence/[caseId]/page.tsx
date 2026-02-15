"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { Save, FileText, Smartphone, HardDrive, MapPin, User, Calendar, ShieldAlert, Loader2 } from "lucide-react";

// --- Types ---
type EvidenceCategory = "document" | "electronic" | "other";

interface EvidenceItem {
  id: string;
  category: EvidenceCategory;
  collectedDate: string;
  collectedFrom: string;
  location: string;
  documentName?: string;
  deviceType?: string;
  identifyingInfo?: string;
  timestamp: string;
}

export default function EvidencePage() {
  const params = useParams();
  const caseId = params.caseId as string;

  // --- State for the Evidence List ---
  const [evidenceList, setEvidenceList] = useState<EvidenceItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // --- State for the Form ---
  const [category, setCategory] = useState<EvidenceCategory>("electronic");
  const [collectedDate, setCollectedDate] = useState("");
  const [collectedFrom, setCollectedFrom] = useState("");
  const [location, setLocation] = useState("");
  
  // Conditional Form States
  const [documentName, setDocumentName] = useState("");
  const [deviceType, setDeviceType] = useState("Smartphone");
  const [identifyingInfo, setIdentifyingInfo] = useState("");

  // --- Fetch existing evidence on component mount ---
  useEffect(() => {
    const fetchEvidence = async () => {
      try {
        const response = await fetch(`http://localhost:8000/api/cases/${caseId}/evidence`);
        if (response.ok) {
          const data = await response.json();
          setEvidenceList(data);
        } else {
          console.error("Failed to fetch evidence");
        }
      } catch (error) {
        console.error("Error fetching evidence:", error);
      } finally {
        setIsLoading(false);
      }
    };
    
    if (caseId) {
      fetchEvidence();
    }
  }, [caseId]);

  // --- Save evidence to database ---
  const handleAddEvidence = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);

    const newEvidence = {
      category,
      collectedDate,
      collectedFrom,
      location,
      documentName: category === "document" ? documentName : undefined,
      deviceType: category === "electronic" ? deviceType : undefined,
      identifyingInfo: category === "electronic" ? identifyingInfo : undefined,
    };

    try {
      const response = await fetch(`http://localhost:8000/api/cases/${caseId}/evidence`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newEvidence),
      });

      if (response.ok) {
        // Refresh the evidence list from database
        const updatedResponse = await fetch(`http://localhost:8000/api/cases/${caseId}/evidence`);
        if (updatedResponse.ok) {
          const data = await updatedResponse.json();
          setEvidenceList(data);
        }
        
        // Reset form fields
        setDocumentName("");
        setIdentifyingInfo("");
        setCollectedDate("");
        setCollectedFrom("");
        setLocation("");
        
        alert("Evidence saved successfully to chain of custody!");
      } else {
        alert("Failed to save evidence. Please try again.");
      }
    } catch (error) {
      console.error("Error saving evidence:", error);
      alert("Network error. Please check your connection to the backend.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="p-8 space-y-6 w-full max-w-7xl mx-auto text-black h-full overflow-y-auto">
      {/* Header */}
      <div className="flex justify-between items-center bg-gray-100 border border-gray-300 p-6 rounded-xl shadow-sm">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-black">Case: {caseId}</h1>
          <p className="text-black mt-1">Status: Evidence Collection | Dynamic Logging Mode</p>
        </div>
      </div>

      {/* Main Grid Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* LEFT COLUMN: The Detailed Form */}
        <div className="lg:col-span-1 bg-white p-6 rounded-xl shadow-sm border border-gray-300 h-fit sticky top-6">
          <h2 className="text-xl font-semibold mb-6 flex items-center gap-2 text-black">
            <ShieldAlert className="w-5 h-5 text-black" />
            Log New Evidence
          </h2>

          <form onSubmit={handleAddEvidence} className="space-y-4">
            {/* 1. Evidence Category */}
            <div>
              <label className="block text-sm font-medium text-black mb-1">Evidence Category</label>
              <select 
                className="w-full p-2 border border-gray-400 rounded-lg focus:ring-2 focus:ring-black outline-none text-black bg-white"
                value={category}
                onChange={(e) => setCategory(e.target.value as EvidenceCategory)}
              >
                <option value="electronic">Electronic Device</option>
                <option value="document">Physical Document</option>
                <option value="other">Other / Miscellaneous</option>
              </select>
            </div>

            {/* --- CONDITIONAL FIELDS --- */}
            
            {/* IF DOCUMENT */}
            {category === "document" && (
              <div className="p-4 bg-gray-50 border border-gray-300 rounded-lg space-y-3">
                <div>
                  <label className="block text-sm font-medium text-black mb-1 flex items-center gap-1"><FileText className="w-4 h-4"/> Document Name</label>
                  <input type="text" required placeholder="e.g., Bank Statement, Signed Contract" className="w-full p-2 border border-gray-400 rounded-lg outline-none text-black placeholder:text-gray-500 bg-white" value={documentName} onChange={(e) => setDocumentName(e.target.value)} />
                </div>
              </div>
            )}

            {/* IF ELECTRONIC DEVICE */}
            {category === "electronic" && (
              <div className="p-4 bg-gray-50 border border-gray-300 rounded-lg space-y-4">
                <div>
                  <label className="block text-sm font-medium text-black mb-1 flex items-center gap-1"><Smartphone className="w-4 h-4"/> Device Type</label>
                  <select className="w-full p-2 border border-gray-400 rounded-lg outline-none text-black bg-white" value={deviceType} onChange={(e) => setDeviceType(e.target.value)}>
                    <option value="Smartphone">Smartphone</option>
                    <option value="Laptop/PC">Laptop / PC</option>
                    <option value="Storage">Storage (USB/HDD)</option>
                    <option value="Networking">Networking Equipment</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-black mb-1 flex items-center gap-1"><HardDrive className="w-4 h-4"/> Identifiers (IMEI/MAC/Serial)</label>
                  <input type="text" required placeholder="e.g., IMEI: 35891..., SN: C02..." className="w-full p-2 border border-gray-400 rounded-lg outline-none text-black placeholder:text-gray-500 bg-white" value={identifyingInfo} onChange={(e) => setIdentifyingInfo(e.target.value)} />
                </div>
              </div>
            )}

            {/* --- COMMON FIELDS --- */}
            <div>
              <label className="block text-sm font-medium text-black mb-1 flex items-center gap-1"><Calendar className="w-4 h-4"/> Date Collected</label>
              <input type="date" required className="w-full p-2 border border-gray-400 rounded-lg outline-none text-black bg-white" value={collectedDate} onChange={(e) => setCollectedDate(e.target.value)} />
            </div>

            <div>
              <label className="block text-sm font-medium text-black mb-1 flex items-center gap-1"><User className="w-4 h-4"/> Collected From (Person)</label>
              <input type="text" required placeholder="e.g., John Doe (Suspect)" className="w-full p-2 border border-gray-400 rounded-lg outline-none text-black placeholder:text-gray-500 bg-white" value={collectedFrom} onChange={(e) => setCollectedFrom(e.target.value)} />
            </div>

            <div>
              <label className="block text-sm font-medium text-black mb-1 flex items-center gap-1"><MapPin className="w-4 h-4"/> Location of Seizure</label>
              <input type="text" required placeholder="e.g., Suspect's Residence, Desk 4" className="w-full p-2 border border-gray-400 rounded-lg outline-none text-black placeholder:text-gray-500 bg-white" value={location} onChange={(e) => setLocation(e.target.value)} />
            </div>

            <button 
              type="submit" 
              disabled={isSaving}
              className="w-full bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white font-medium py-3 rounded-lg flex items-center justify-center gap-2 transition-colors mt-6"
            >
              {isSaving ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="w-5 h-5" />
                  Save to Chain of Custody
                </>
              )}
            </button>
          </form>
        </div>

        {/* RIGHT COLUMN: The Dynamic Timeline */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Timeline Panel */}
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-300 min-h-[400px] max-h-[600px] overflow-y-auto">
            <h2 className="text-xl font-semibold mb-6 text-black sticky top-0 bg-white z-10 py-2">Chain of Custody / Logged Items</h2>
            
            {isLoading ? (
              <div className="flex flex-col items-center justify-center h-64 text-black">
                <Loader2 className="w-12 h-12 mb-3 text-black animate-spin" />
                <p>Loading evidence from database...</p>
              </div>
            ) : evidenceList.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-64 text-black border-2 border-dashed border-gray-400 rounded-xl">
                <ShieldAlert className="w-12 h-12 mb-3 text-black" />
                <p>No evidence has been logged yet.</p>
                <p className="text-sm">Use the form to add items to the chain of custody.</p>
              </div>
            ) : (
              <div className="space-y-6 relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-gray-400 before:to-transparent">
                {evidenceList.map((item) => (
                  <div key={item.id} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                    {/* Timeline Dot */}
                    <div className="flex items-center justify-center w-10 h-10 rounded-full border border-gray-400 bg-gray-100 text-black shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 z-10 relative">
                      {item.category === 'electronic' ? <Smartphone className="w-5 h-5 text-black" /> : <FileText className="w-5 h-5 text-black" />}
                    </div>
                    
                    {/* Content Card */}
                    <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] bg-white p-4 rounded-xl border border-gray-400 shadow-sm text-black">
                      <div className="flex justify-between items-start mb-1">
                        <span className="text-xs font-bold text-black bg-gray-200 border border-gray-300 px-2 py-1 rounded">{item.id}</span>
                        <time className="text-xs text-black font-medium">{item.collectedDate}</time>
                      </div>
                      
                      <h3 className="font-bold text-black text-lg mt-2">
                        {item.category === 'electronic' ? `${item.deviceType}` : `${item.documentName}`}
                      </h3>
                      
                      <div className="mt-3 space-y-1 text-sm text-black">
                        {item.identifyingInfo && <p><span className="font-bold">Identifier:</span> {item.identifyingInfo}</p>}
                        <p><span className="font-bold">Seized from:</span> {item.collectedFrom}</p>
                        <p><span className="font-bold">Location:</span> {item.location}</p>
                        <p className="text-xs text-black mt-2 font-medium">Logged at: {item.timestamp}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Graph Placeholder */}
          <div className="bg-gray-100 p-6 rounded-xl border-2 border-dashed border-gray-400 h-64 flex flex-col items-center justify-center text-black">
             <p className="font-bold text-lg mb-2 text-black">Evidence Graph View</p>
             <p className="text-sm text-black">Add evidence items above to generate relational graph.</p>
          </div>

        </div>
      </div>
    </div>
  );
}