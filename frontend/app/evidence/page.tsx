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
  firNumber?: string;
  caseType?: string;
  priority?: string;
  officerName?: string;
  officerRank?: string;
  policeStation?: string;
  district?: string;
}

const EMPTY_CASE = {
  id: "", title: "", description: "", status: "Investigation Pending",
  firNumber: "", caseType: "", priority: "Medium",
  officerName: "", officerRank: "", officerBadgeId: "", officerContact: "", supervisingOfficer: "",
  policeStation: "", district: "", state: "Maharashtra", court: "",
  incidentDate: "", reportedDate: "", complainant: "", suspects: "", estimatedLoss: "", legalSections: "",
};

const CASE_TYPES = ["Ransomware / Malware", "Financial Fraud / UPI", "Identity Theft", "Data Breach", "Phishing", "Cyber Stalking / Harassment", "Sextortion", "Hacking / Unauthorized Access", "Online Child Safety", "Social Media Crime", "Other"];
const RANKS = ["Police Constable", "Head Constable", "Assistant Sub-Inspector (ASI)", "Sub-Inspector (SI)", "Police Inspector (PI)", "Assistant Commissioner (ACP)", "Deputy Commissioner (DCP)", "Additional Commissioner", "Commissioner of Police"];
const PRIORITIES = ["Low", "Medium", "High", "Critical"];

const inputCls = "w-full p-2.5 border border-gray-400 rounded-lg outline-none text-black bg-white focus:border-black text-sm";

function Field({ label, required, children, className = "" }: { label: string; required?: boolean; children: React.ReactNode; className?: string }) {
  return (
    <div className={className}>
      <label className="block text-sm font-bold text-black mb-1">
        {label}{required && <span className="text-red-600"> *</span>}
      </label>
      {children}
    </div>
  );
}

function FormSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <fieldset className="border border-gray-300 rounded-xl p-4 bg-white">
      <legend className="px-2 text-xs font-bold tracking-wider uppercase text-gray-600">{title}</legend>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">{children}</div>
    </fieldset>
  );
}

export default function EvidenceDashboardPage() {
  const router = useRouter();
  const [cases, setCases] = useState<CaseItem[]>([]);
  const [isCreatingNew, setIsCreatingNew] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const [newCase, setNewCase] = useState({ ...EMPTY_CASE });
  const set = (k: keyof typeof EMPTY_CASE) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setNewCase({ ...newCase, [k]: e.target.value });

  useEffect(() => {
    fetchCases();
  }, []);

  const fetchCases = async () => {
    try {
      const response = await fetch("/backend/api/cases");
      if (response.ok) {
        setCases(await response.json());
      } else {
        console.error("Failed to fetch cases");
      }
    } catch (error) {
      console.error("Error fetching cases:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateNewCase = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCase.id.trim() || !newCase.title.trim() || !newCase.officerName.trim() || !newCase.officerRank || !newCase.policeStation.trim() || !newCase.district.trim()) {
      alert("Please fill in all required fields (case number, title, officer, rank, police station, district)");
      return;
    }

    setIsSaving(true);
    try {
      const response = await fetch("/backend/api/cases", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newCase),
      });

      if (response.ok) {
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

          <form onSubmit={handleCreateNewCase} className="space-y-5">
            <FormSection title="Case Identity">
              <Field label="Case Number / ID" required>
                <input type="text" required placeholder="e.g., CR-2026-101" className={inputCls} value={newCase.id} onChange={set("id")} />
              </Field>
              <Field label="FIR / Crime Number">
                <input type="text" placeholder="e.g., FIR 0142/2026" className={inputCls} value={newCase.firNumber} onChange={set("firNumber")} />
              </Field>
              <Field label="Case Title" required>
                <input type="text" required placeholder="e.g., Ransomware Attack on Hospital" className={inputCls} value={newCase.title} onChange={set("title")} />
              </Field>
              <Field label="Case Type">
                <select className={inputCls} value={newCase.caseType} onChange={set("caseType")}>
                  <option value="">Select type…</option>
                  {CASE_TYPES.map(t => <option key={t}>{t}</option>)}
                </select>
              </Field>
              <Field label="Priority">
                <select className={inputCls} value={newCase.priority} onChange={set("priority")}>
                  {PRIORITIES.map(t => <option key={t}>{t}</option>)}
                </select>
              </Field>
              <Field label="Applicable Sections (IT Act / BNS)">
                <input type="text" placeholder="e.g., IT Act 66C, 66D; BNS 318" className={inputCls} value={newCase.legalSections} onChange={set("legalSections")} />
              </Field>
            </FormSection>

            <FormSection title="Investigating Officer">
              <Field label="Officer Name" required>
                <input type="text" required placeholder="e.g., Rajesh Patil" className={inputCls} value={newCase.officerName} onChange={set("officerName")} />
              </Field>
              <Field label="Rank" required>
                <select required className={inputCls} value={newCase.officerRank} onChange={set("officerRank")}>
                  <option value="">Select rank…</option>
                  {RANKS.map(t => <option key={t}>{t}</option>)}
                </select>
              </Field>
              <Field label="Badge / Employee ID">
                <input type="text" placeholder="e.g., MH-CY-2041" className={inputCls} value={newCase.officerBadgeId} onChange={set("officerBadgeId")} />
              </Field>
              <Field label="Contact Number">
                <input type="tel" placeholder="e.g., +91 98XXXXXXXX" className={inputCls} value={newCase.officerContact} onChange={set("officerContact")} />
              </Field>
              <Field label="Supervising Officer">
                <input type="text" placeholder="e.g., ACP Sunita Deshmukh" className={inputCls} value={newCase.supervisingOfficer} onChange={set("supervisingOfficer")} />
              </Field>
            </FormSection>

            <FormSection title="Police Station & Jurisdiction">
              <Field label="Police Station" required>
                <input type="text" required placeholder="e.g., Cyber Police Station, BKC" className={inputCls} value={newCase.policeStation} onChange={set("policeStation")} />
              </Field>
              <Field label="District / Commissionerate" required>
                <input type="text" required placeholder="e.g., Mumbai City" className={inputCls} value={newCase.district} onChange={set("district")} />
              </Field>
              <Field label="State">
                <input type="text" className={inputCls} value={newCase.state} onChange={set("state")} />
              </Field>
              <Field label="Court of Jurisdiction" className="md:col-span-2 lg:col-span-3">
                <input type="text" placeholder="e.g., Metropolitan Magistrate Court, Esplanade" className={inputCls} value={newCase.court} onChange={set("court")} />
              </Field>
            </FormSection>

            <FormSection title="Incident Details">
              <Field label="Date & Time of Incident">
                <input type="datetime-local" className={inputCls} value={newCase.incidentDate} onChange={set("incidentDate")} />
              </Field>
              <Field label="Date Reported">
                <input type="date" className={inputCls} value={newCase.reportedDate} onChange={set("reportedDate")} />
              </Field>
              <Field label="Estimated Loss (₹)">
                <input type="text" placeholder="e.g., 4,50,000" className={inputCls} value={newCase.estimatedLoss} onChange={set("estimatedLoss")} />
              </Field>
              <Field label="Complainant / Victim">
                <input type="text" placeholder="Name of complainant" className={inputCls} value={newCase.complainant} onChange={set("complainant")} />
              </Field>
              <Field label="Suspect(s)" className="lg:col-span-2">
                <input type="text" placeholder="Known suspects or aliases, if any" className={inputCls} value={newCase.suspects} onChange={set("suspects")} />
              </Field>
              <Field label="Crime Description" required className="md:col-span-2 lg:col-span-3">
                <textarea required rows={3} placeholder="Provide a detailed description of the cyber crime..." className={inputCls + " resize-none"} value={newCase.description} onChange={set("description")}></textarea>
              </Field>
            </FormSection>

            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setIsCreatingNew(false);
                  setNewCase({ ...EMPTY_CASE });
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

      {/* EXISTING CASES GRID */}
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
                  <div className="flex flex-col items-end gap-1">
                    <span className="text-xs font-bold bg-gray-200 text-black px-2 py-1 rounded border border-gray-300">
                      {caseItem.id}
                    </span>
                    {caseItem.caseType && <span className="text-[11px] text-gray-600">{caseItem.caseType}</span>}
                  </div>
                </div>
                <h3 className="text-lg font-bold text-black mb-1 line-clamp-1">{caseItem.title}</h3>
                <p className="text-sm text-gray-600 line-clamp-2 mb-3">
                  {caseItem.description || "No description provided."}
                </p>
                {(caseItem.officerName || caseItem.policeStation) && (
                  <div className="text-xs text-gray-700 space-y-0.5 mb-4">
                    {caseItem.officerName && (
                      <div>
                        <span className="font-bold">IO:</span> {caseItem.officerRank ? `${caseItem.officerRank.replace(/ \(.*\)/, "")} ` : ""}{caseItem.officerName}
                      </div>
                    )}
                    {caseItem.policeStation && (
                      <div>
                        <span className="font-bold">PS:</span> {caseItem.policeStation}{caseItem.district ? `, ${caseItem.district}` : ""}
                      </div>
                    )}
                  </div>
                )}
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
