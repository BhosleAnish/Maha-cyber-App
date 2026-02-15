"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { FolderOpen, Plus, FolderPlus, ArrowRight, Clock, FileText, Loader2 } from "lucide-react";

interface CaseItem {
  id: string;
  title: string;
  description: string;
  status: string;
  lastUpdated: string;
  itemsCount: number;
}

export default function EvidenceDashboardPage() {
  const router = useRouter();
  const [cases, setCases] = useState<CaseItem[]>([]);
  const [isCreatingNew, setIsCreatingNew] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // Detailed Form State
  const [newCase, setNewCase] = useState({
    id: "",
    title: "",
    description: "",
    status: "Investigation Pending"
  });

  // Fetch real cases from Database
  useEffect(() => {
    fetchCases();
  }, []);

  const fetchCases = async () => {
    try {
      const response = await fetch("http://localhost:8000/api/cases");
      if (response.ok) {
        const data = await response.json();
        setCases(data);
      } else {
        console.error("Failed to fetch cases");
      }
    } catch (error) {
      console.error("Error fetching cases:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // Save Detailed Case to Database
  const handleCreateNewCase = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCase.id.trim() || !newCase.title.trim()) {
      alert("Please fill in all required fields");
      return;
    }

    setIsSaving(true);

    try {
      const response = await fetch("http://localhost:8000/api/cases", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newCase),
      });

      if (response.ok) {
        // Route to the specific case evidence page
        router.push(`/evidence/${newCase.id.trim()}`);
      } else {
        const error = await response.json();
        alert(`Failed to create case: ${error.detail || "ID might already exist"}`);
      }
    } catch (error) {
      console.error("Error creating case:", error);
      alert("Network error. Please check your connection to the backend.");
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="p-8 text-black flex flex-col items-center justify-center h-full">
        <Loader2 className="w-12 h-12 animate-spin text-gray-600 mb-4" />
        <p className="text-lg font-medium">Loading cases from database...</p>
      </div>
    );
  }

  return (
    <div className="p-8 w-full max-w-7xl mx-auto text-black h-full overflow-y-auto">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-black">Evidence Dashboard</h1>
          <p className="text-gray-600 mt-1">Manage cases and their associated chains of custody.</p>
        </div>
        
        {cases.length > 0 && !isCreatingNew && (
          <button 
            onClick={() => setIsCreatingNew(true)} 
            className="bg-black hover:bg-gray-800 text-white font-bold py-2.5 px-5 rounded-lg flex items-center gap-2 transition-colors"
          >
            <Plus className="w-5 h-5" />
            Create New Case
          </button>
        )}
      </div>

      {/* DETAILED CASE CREATION FORM */}
      {isCreatingNew && (
        <div className="bg-gray-50 border border-gray-300 p-6 rounded-xl mb-8 shadow-sm">
          <h2 className="text-xl font-bold mb-4 flex items-center gap-2 text-black">
            <FolderPlus className="w-6 h-6" /> Define New Case Details
          </h2>
          
          <form onSubmit={handleCreateNewCase} className="space-y-4 max-w-3xl">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-bold text-black mb-1">Case Number / ID</label>
                <input 
                  type="text" 
                  required 
                  placeholder="e.g., CR-2026-101" 
                  className="w-full p-3 border border-gray-400 rounded-lg outline-none text-black bg-white" 
                  value={newCase.id} 
                  onChange={(e) => setNewCase({...newCase, id: e.target.value})} 
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-black mb-1">Case Title</label>
                <input 
                  type="text" 
                  required 
                  placeholder="e.g., Ransomware Attack on Hospital" 
                  className="w-full p-3 border border-gray-400 rounded-lg outline-none text-black bg-white" 
                  value={newCase.title} 
                  onChange={(e) => setNewCase({...newCase, title: e.target.value})} 
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-bold text-black mb-1">Crime Description</label>
              <textarea 
                required 
                rows={3} 
                placeholder="Provide a detailed description of the cyber crime..." 
                className="w-full p-3 border border-gray-400 rounded-lg outline-none text-black bg-white resize-none" 
                value={newCase.description} 
                onChange={(e) => setNewCase({...newCase, description: e.target.value})}
              ></textarea>
            </div>

            <div className="flex justify-end gap-2 mt-4">
              <button 
                type="button" 
                onClick={() => {
                  setIsCreatingNew(false);
                  setNewCase({ id: "", title: "", description: "", status: "Investigation Pending" });
                }} 
                className="px-6 py-3 border border-gray-400 text-black font-bold rounded-lg hover:bg-gray-200"
                disabled={isSaving}
              >
                Cancel
              </button>
              <button 
                type="submit" 
                disabled={isSaving}
                className="bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white font-bold px-6 py-3 rounded-lg flex items-center gap-2"
              >
                {isSaving ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Creating...
                  </>
                ) : (
                  <>
                    Save Case & Add Evidence
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* EMPTY STATE */}
      {cases.length === 0 && !isCreatingNew && (
        <div className="bg-white border-2 border-dashed border-gray-300 rounded-2xl p-12 flex flex-col items-center justify-center text-center">
          <div className="bg-gray-100 p-5 rounded-full mb-4">
            <FolderOpen className="w-12 h-12 text-black" />
          </div>
          <h2 className="text-2xl font-bold text-black mb-2">No active cases found</h2>
          <p className="text-gray-600 max-w-md mx-auto mb-6">
            Create your first case file to begin logging the chain of custody.
          </p>
          <button 
            onClick={() => setIsCreatingNew(true)} 
            className="bg-black hover:bg-gray-800 text-white font-bold py-3 px-6 rounded-lg flex items-center gap-2"
          >
            <Plus className="w-5 h-5" /> Create Your First Case
          </button>
        </div>
      )}

      {/* EXISTING CASES GRID (Real Database Data) */}
      {cases.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {cases.map((caseItem) => (
            <div 
              key={caseItem.id} 
              onClick={() => router.push(`/evidence/${caseItem.id}`)} 
              className="bg-white border border-gray-300 rounded-xl p-6 shadow-sm hover:shadow-md hover:border-black transition-all cursor-pointer group flex flex-col justify-between"
            >
              <div>
                <div className="flex justify-between items-start mb-4">
                  <div className="bg-gray-100 p-3 rounded-lg group-hover:bg-black group-hover:text-white">
                    <FolderOpen className="w-6 h-6" />
                  </div>
                  <span className="text-xs font-bold bg-gray-200 text-black px-2 py-1 rounded border border-gray-300">
                    {caseItem.id}
                  </span>
                </div>
                <h3 className="text-lg font-bold text-black mb-1 line-clamp-1">{caseItem.title}</h3>
                <p className="text-sm text-gray-600 line-clamp-2 mb-4">
                  {caseItem.description || "No description provided."}
                </p>
              </div>
              <div className="mt-auto pt-4 border-t border-gray-200 flex items-center justify-between text-sm text-gray-600">
                <div className="flex items-center gap-1">
                  <FileText className="w-4 h-4" />
                  <span className="font-bold text-black">{caseItem.itemsCount || 0} items</span>
                </div>
                <div className="flex items-center gap-1">
                  <Clock className="w-4 h-4" />
                  <span>{caseItem.lastUpdated}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}