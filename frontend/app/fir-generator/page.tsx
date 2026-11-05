"use client";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2, Printer, CheckCircle2, ShieldCheck, Sparkles } from "lucide-react";

// ─── Static data ──────────────────────────────────────────────────────────────
const JURISDICTION_MAP: Record<string, { station: string; district: string }> = {
  mumbai: { station: "Cyber Police Station, BKC", district: "Mumbai City" },
  pune: { station: "Cyber Police Station, Shivajinagar", district: "Pune City" },
  nagpur: { station: "Cyber Police Station, Nagpur", district: "Nagpur City" },
  nashik: { station: "Cyber Police Station, Nashik", district: "Nashik City" },
  thane: { station: "Cyber Police Station, Thane", district: "Thane City" },
};

const ID_TYPES = ["Aadhaar", "Voter ID", "Driving Licence", "PAN", "Passport", "Ration Card", "Other"];
const INFO_TYPES = ["Written", "Oral", "Online (e-FIR / Cyber Portal)"];
const CRIME_CATEGORIES = [
  "Online Financial Fraud / UPI", "Digital Arrest / Impersonation", "Phishing / Vishing", "Investment / Trading Fraud",
  "Identity Theft", "Sextortion / Cyber Stalking", "Hacking / Unauthorized Access", "Ransomware / Malware",
  "Social Media Account Takeover", "Data Breach", "Other Cyber Offence",
];
const ACTS = ["BNS 2023", "IT Act 2000", "BNSS 2023", "Other"];

type Suggestion = { act: string; section: string; title: string };

const KEYWORD_RULES: { keys: string[]; items: Suggestion[] }[] = [
  { keys: ["digital arrest", "extort", "blackmail", "threat"], items: [{ act: "BNS 2023", section: "308", title: "Extortion" }] },
  { keys: ["fake app", "trading fraud", "investment", "upi", "otp", "cheat", "fraud", "scam"], items: [
    { act: "BNS 2023", section: "318(4)", title: "Cheating" },
    { act: "IT Act 2000", section: "66D", title: "Cheating by personation using computer resource" },
  ] },
  { keys: ["phishing", "fake link", "fake website", "vishing"], items: [{ act: "IT Act 2000", section: "66C", title: "Identity theft" }] },
  { keys: ["hack", "unauthorized access", "unauthorised access", "ransomware", "malware"], items: [
    { act: "IT Act 2000", section: "66", title: "Computer-related offences" },
    { act: "IT Act 2000", section: "43", title: "Damage to computer / unauthorised access" },
  ] },
  { keys: ["obscene", "morphed", "sextortion", "intimate"], items: [{ act: "IT Act 2000", section: "67", title: "Publishing obscene material electronically" }] },
  { keys: ["stalk", "harass"], items: [{ act: "BNS 2023", section: "78", title: "Stalking" }] },
];

const EMPTY = {
  // Section 1 – station (auto-filled from place of occurrence, editable)
  district: "", policeStation: "",
  // Section 3 – occurrence
  occurrenceDay: "", occurrenceDate: "", occurrenceTime: "",
  infoReceivedDate: "", infoReceivedTime: "", gdEntryNo: "", infoType: "Written",
  placeAddress: "", placeDirection: "", placeBeat: "", placeCity: "", outsideJurisdiction: "",
  // Section 4 – complainant
  complainantName: "", relativeName: "", dob: "", nationality: "India", occupation: "",
  contactNumber: "", email: "", idType: "Aadhaar", idNumber: "", address: "",
  // Section 7 – delay
  delayReason: "",
  // Section 8 – cyber particulars
  crimeCategory: "", platform: "", suspectContact: "", transactionId: "", amountLost: "", bankDetails: "", propertyDetails: "",
  // Section 9 – facts
  description: "",
  // Section 10 – action
  officerName: "", officerRank: "", officerNo: "",
  declaration: false,
};

type Accused = { name: string; alias: string; address: string; known: string };

// ─── Small UI helpers ─────────────────────────────────────────────────────────
const input =
  "w-full px-3 py-2 text-sm text-slate-900 bg-white border border-slate-300 rounded-md outline-none focus:border-slate-900 focus:ring-1 focus:ring-slate-900 placeholder:text-slate-400 read-only:bg-slate-50 read-only:text-slate-600";

function Field({ label, required, hint, className = "", children }: { label: string; required?: boolean; hint?: string; className?: string; children: React.ReactNode }) {
  return (
    <div className={className}>
      <label className="block text-xs font-semibold text-slate-700 mb-1">
        {label}{required && <span className="text-red-600"> *</span>}
      </label>
      {children}
      {hint && <p className="text-[11px] text-slate-500 mt-1">{hint}</p>}
    </div>
  );
}

function Section({ num, title, subtitle, children }: { num: number; title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <section className="border border-slate-300 rounded-lg overflow-hidden bg-white">
      <header className="flex items-baseline gap-3 px-5 py-2.5 bg-slate-800 text-white">
        <span className="text-xs font-bold bg-white/15 rounded px-2 py-0.5">{num}</span>
        <h2 className="text-sm font-bold tracking-wide uppercase">{title}</h2>
        {subtitle && <span className="text-xs text-slate-300 hidden md:inline">{subtitle}</span>}
      </header>
      <div className="p-5">{children}</div>
    </section>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function FIRGenerator() {
  const router = useRouter();
  const [f, setF] = useState({ ...EMPTY });
  const [sections, setSections] = useState<Suggestion[]>([]);
  const [accused, setAccused] = useState<Accused[]>([{ name: "", alias: "", address: "", known: "Unknown" }]);
  const [registered, setRegistered] = useState<{ no: string; station: string } | null>(null);

  const set = (k: keyof typeof EMPTY) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setF(p => ({ ...p, [k]: e.target.value }));

  const year = new Date().getFullYear().toString();

  // Jurisdiction auto-detect from place of occurrence
  const detected = useMemo(() => {
    const loc = `${f.placeCity} ${f.placeAddress}`.toLowerCase();
    const key = Object.keys(JURISDICTION_MAP).find(k => loc.includes(k));
    return key ? JURISDICTION_MAP[key] : null;
  }, [f.placeCity, f.placeAddress]);
  const station = f.policeStation || detected?.station || "";
  const district = f.district || detected?.district || "";

  // Suggested legal sections from the narrative
  const suggestions = useMemo(() => {
    const t = f.description.toLowerCase();
    const out: Suggestion[] = [];
    KEYWORD_RULES.forEach(r => {
      if (r.keys.some(k => t.includes(k))) r.items.forEach(i => { if (!out.some(o => o.act === i.act && o.section === i.section)) out.push(i); });
    });
    return out.filter(s => !sections.some(x => x.act === s.act && x.section === s.section));
  }, [f.description, sections]);

  const addSection = (s: Suggestion) => setSections(p => [...p, s]);
  const updateAccused = (i: number, k: keyof Accused, v: string) => setAccused(p => p.map((a, idx) => (idx === i ? { ...a, [k]: v } : a)));

  const handleRegister = (e: React.FormEvent) => {
    e.preventDefault();
    if (sections.length === 0) {
      alert("Add at least one Act & Section before registering the FIR.");
      return;
    }
    if (!f.declaration) {
      alert("Please confirm the declaration.");
      return;
    }
    const finalStation = station || "Jurisdiction Not Found - Manual Review Required";
    const no = `${String(Date.now()).slice(-4)}/${year}`;
    setRegistered({ no, station: finalStation });
    window.scrollTo({ top: 0, behavior: "smooth" });
    setTimeout(() => router.push(`/jurisdiction?station=${encodeURIComponent(finalStation)}`), 4000);
  };

  return (
    <div className="min-h-screen overflow-y-auto bg-slate-100 py-8 px-4 text-slate-900">
      <div className="max-w-5xl mx-auto">
        {/* Letterhead */}
        <div className="bg-white border border-slate-300 rounded-t-lg px-8 py-6 text-center">
          <p className="text-xs font-semibold tracking-[0.25em] text-slate-500 uppercase">Government of Maharashtra · Maharashtra Police</p>
          <h1 className="mt-2 text-2xl font-bold tracking-wide font-serif">FIRST INFORMATION REPORT</h1>
          <p className="text-xs text-slate-600 mt-1">(Under Section 173 of the Bharatiya Nagarik Suraksha Sanhita, 2023)</p>
          <div className="mt-4 flex flex-wrap items-center justify-center gap-x-8 gap-y-1 text-xs text-slate-600">
            <span>FIR No.: <b className="text-slate-900">{registered ? registered.no : "To be assigned on registration"}</b></span>
            <span>Year: <b className="text-slate-900">{year}</b></span>
            <span>Form: <b className="text-slate-900">IF-1 (Cyber)</b></span>
          </div>
        </div>

        {registered && (
          <div className="bg-green-50 border-x border-b border-green-300 px-6 py-4 flex items-start gap-3">
            <CheckCircle2 className="w-6 h-6 text-green-600 shrink-0" />
            <div className="text-sm">
              <p className="font-bold text-green-900">FIR registered — No. {registered.no}</p>
              <p className="text-green-800">Case assigned to: {registered.station}. Redirecting to jurisdiction details…</p>
            </div>
            <button type="button" onClick={() => window.print()} className="ml-auto flex items-center gap-1.5 text-xs font-semibold border border-green-700 text-green-900 rounded px-3 py-1.5 hover:bg-green-100">
              <Printer className="w-3.5 h-3.5" /> Print
            </button>
          </div>
        )}

        <form onSubmit={handleRegister} className="space-y-5 bg-slate-50 border-x border-b border-slate-300 rounded-b-lg p-5 md:p-6">
          {/* 1 */}
          <Section num={1} title="Police Station & District" subtitle="Auto-detected from place of occurrence">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Field label="District / Commissionerate" required>
                <input required className={input} value={district} onChange={set("district")} placeholder="e.g., Mumbai City" />
              </Field>
              <Field label="Police Station" required className="md:col-span-2">
                <input required className={input} value={station} onChange={set("policeStation")} placeholder="e.g., Cyber Police Station, BKC" />
              </Field>
            </div>
          </Section>

          {/* 2 */}
          <Section num={2} title="Acts & Sections" subtitle="Provisions of law applied">
            <div className="space-y-2">
              {sections.length > 0 && (
                <div className="hidden md:grid grid-cols-[1.2fr_0.7fr_2fr_auto] gap-2 text-[11px] font-semibold text-slate-500 uppercase tracking-wide">
                  <span>Act</span><span>Section</span><span>Offence</span><span className="w-8" />
                </div>
              )}
              {sections.map((s, i) => (
                <div key={i} className="grid grid-cols-1 md:grid-cols-[1.2fr_0.7fr_2fr_auto] gap-2">
                  <select className={input} value={s.act} onChange={e => setSections(p => p.map((x, idx) => idx === i ? { ...x, act: e.target.value } : x))}>
                    {ACTS.map(a => <option key={a}>{a}</option>)}
                  </select>
                  <input className={input} placeholder="Section" value={s.section} onChange={e => setSections(p => p.map((x, idx) => idx === i ? { ...x, section: e.target.value } : x))} />
                  <input className={input} placeholder="Offence / description" value={s.title} onChange={e => setSections(p => p.map((x, idx) => idx === i ? { ...x, title: e.target.value } : x))} />
                  <button type="button" aria-label="Remove section" onClick={() => setSections(p => p.filter((_, idx) => idx !== i))} className="w-8 h-9 flex items-center justify-center text-red-600 hover:bg-red-50 rounded"><Trash2 className="w-4 h-4" /></button>
                </div>
              ))}
              <button type="button" onClick={() => addSection({ act: "BNS 2023", section: "", title: "" })} className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 border border-dashed border-slate-400 rounded-md px-3 py-1.5 hover:bg-slate-100">
                <Plus className="w-3.5 h-3.5" /> Add section
              </button>
              {suggestions.length > 0 && (
                <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-md">
                  <p className="flex items-center gap-1.5 text-xs font-bold text-blue-900 mb-2"><Sparkles className="w-3.5 h-3.5" /> Suggested from the brief facts — review before adding</p>
                  <div className="flex flex-wrap gap-2">
                    {suggestions.map(s => (
                      <button type="button" key={s.act + s.section} onClick={() => addSection(s)} className="text-xs bg-white border border-blue-300 text-blue-900 rounded-full px-3 py-1 hover:bg-blue-100">
                        + {s.act} §{s.section} — {s.title}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </Section>

          {/* 3 */}
          <Section num={3} title="Occurrence of Offence">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Field label="Date of Occurrence" required>
                <input required type="date" className={input} value={f.occurrenceDate} onChange={e => { const v = e.target.value; setF(p => ({ ...p, occurrenceDate: v, occurrenceDay: v ? new Date(v).toLocaleDateString("en-IN", { weekday: "long" }) : "" })); }} />
              </Field>
              <Field label="Day">
                <input readOnly className={input} value={f.occurrenceDay} placeholder="Auto" />
              </Field>
              <Field label="Time of Occurrence">
                <input type="time" className={input} value={f.occurrenceTime} onChange={set("occurrenceTime")} />
              </Field>
              <Field label="Type of Information" required>
                <select className={input} value={f.infoType} onChange={set("infoType")}>{INFO_TYPES.map(t => <option key={t}>{t}</option>)}</select>
              </Field>

              <Field label="Information Received — Date" required>
                <input required type="date" className={input} value={f.infoReceivedDate} onChange={set("infoReceivedDate")} />
              </Field>
              <Field label="Information Received — Time" required>
                <input required type="time" className={input} value={f.infoReceivedTime} onChange={set("infoReceivedTime")} />
              </Field>
              <Field label="General Diary Entry No." className="md:col-span-2">
                <input className={input} value={f.gdEntryNo} onChange={set("gdEntryNo")} placeholder="GD / Station Diary reference" />
              </Field>

              <Field label="Place of Occurrence (address / URL / platform)" required className="md:col-span-4">
                <input required className={input} value={f.placeAddress} onChange={set("placeAddress")} placeholder="Address where the offence was felt, or website / app / platform used" />
              </Field>
              <Field label="City / District" required className="md:col-span-2">
                <input required className={input} value={f.placeCity} onChange={set("placeCity")} placeholder="e.g., Mumbai" />
              </Field>
              <Field label="Direction & distance from PS">
                <input className={input} value={f.placeDirection} onChange={set("placeDirection")} placeholder="e.g., 3 km North" />
              </Field>
              <Field label="Beat No.">
                <input className={input} value={f.placeBeat} onChange={set("placeBeat")} />
              </Field>
              <Field label="If outside this PS limits — name of PS & district" className="md:col-span-4">
                <input className={input} value={f.outsideJurisdiction} onChange={set("outsideJurisdiction")} placeholder="Leave blank if within jurisdiction (Zero FIR will be transferred otherwise)" />
              </Field>
            </div>
          </Section>

          {/* 4 */}
          <Section num={4} title="Complainant / Informant">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Field label="Full Name" required>
                <input required className={input} value={f.complainantName} onChange={set("complainantName")} />
              </Field>
              <Field label="Father's / Husband's Name" required>
                <input required className={input} value={f.relativeName} onChange={set("relativeName")} />
              </Field>
              <Field label="Date of Birth">
                <input type="date" className={input} value={f.dob} onChange={set("dob")} />
              </Field>
              <Field label="Nationality">
                <input className={input} value={f.nationality} onChange={set("nationality")} />
              </Field>
              <Field label="Occupation">
                <input className={input} value={f.occupation} onChange={set("occupation")} />
              </Field>
              <Field label="Mobile Number" required>
                <input required type="tel" pattern="[0-9+ \-]{10,15}" className={input} value={f.contactNumber} onChange={set("contactNumber")} placeholder="10-digit mobile" />
              </Field>
              <Field label="Email">
                <input type="email" className={input} value={f.email} onChange={set("email")} />
              </Field>
              <Field label="ID Proof Type">
                <select className={input} value={f.idType} onChange={set("idType")}>{ID_TYPES.map(t => <option key={t}>{t}</option>)}</select>
              </Field>
              <Field label="ID Proof Number">
                <input className={input} value={f.idNumber} onChange={set("idNumber")} />
              </Field>
              <Field label="Residential Address" required className="md:col-span-3">
                <textarea required rows={2} className={input + " resize-none"} value={f.address} onChange={set("address")} />
              </Field>
            </div>
          </Section>

          {/* 5 */}
          <Section num={5} title="Details of Known / Suspected / Unknown Accused">
            <div className="space-y-3">
              {accused.map((a, i) => (
                <div key={i} className="grid grid-cols-1 md:grid-cols-[1.2fr_1fr_2fr_1fr_auto] gap-2 items-end">
                  <Field label={i === 0 ? "Name" : ""}><input className={input} placeholder="Name (if known)" value={a.name} onChange={e => updateAccused(i, "name", e.target.value)} /></Field>
                  <Field label={i === 0 ? "Alias / Handle" : ""}><input className={input} placeholder="Alias, username" value={a.alias} onChange={e => updateAccused(i, "alias", e.target.value)} /></Field>
                  <Field label={i === 0 ? "Address / Whereabouts" : ""}><input className={input} placeholder="Address, if known" value={a.address} onChange={e => updateAccused(i, "address", e.target.value)} /></Field>
                  <Field label={i === 0 ? "Status" : ""}>
                    <select className={input} value={a.known} onChange={e => updateAccused(i, "known", e.target.value)}><option>Unknown</option><option>Suspected</option><option>Known</option></select>
                  </Field>
                  <button type="button" aria-label="Remove accused" disabled={accused.length === 1} onClick={() => setAccused(p => p.filter((_, idx) => idx !== i))} className="w-8 h-9 flex items-center justify-center text-red-600 hover:bg-red-50 rounded disabled:opacity-30"><Trash2 className="w-4 h-4" /></button>
                </div>
              ))}
              <button type="button" onClick={() => setAccused(p => [...p, { name: "", alias: "", address: "", known: "Unknown" }])} className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 border border-dashed border-slate-400 rounded-md px-3 py-1.5 hover:bg-slate-100">
                <Plus className="w-3.5 h-3.5" /> Add accused
              </button>
            </div>
          </Section>

          {/* 6 */}
          <Section num={6} title="Cyber Crime Particulars" subtitle="Digital trail & financial loss">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Field label="Nature of Cyber Crime" required>
                <select required className={input} value={f.crimeCategory} onChange={set("crimeCategory")}>
                  <option value="">Select…</option>{CRIME_CATEGORIES.map(c => <option key={c}>{c}</option>)}
                </select>
              </Field>
              <Field label="Platform / Website / App Used">
                <input className={input} value={f.platform} onChange={set("platform")} placeholder="e.g., WhatsApp, Telegram, fake trading app" />
              </Field>
              <Field label="Suspect Phone / UPI / URL / Email">
                <input className={input} value={f.suspectContact} onChange={set("suspectContact")} />
              </Field>
              <Field label="Transaction ID / UTR">
                <input className={input} value={f.transactionId} onChange={set("transactionId")} />
              </Field>
              <Field label="Total Amount Lost (₹)">
                <input inputMode="decimal" className={input} value={f.amountLost} onChange={set("amountLost")} placeholder="e.g., 4,50,000" />
              </Field>
              <Field label="Bank / Wallet Account Details">
                <input className={input} value={f.bankDetails} onChange={set("bankDetails")} placeholder="Bank, A/c no. (last 4), IFSC" />
              </Field>
              <Field label="Properties / Devices Involved" className="md:col-span-3">
                <textarea rows={2} className={input + " resize-none"} value={f.propertyDetails} onChange={set("propertyDetails")} placeholder="Describe stolen / affected property, devices or accounts and their approximate value" />
              </Field>
            </div>
          </Section>

          {/* 7 */}
          <Section num={7} title="Reasons for Delay in Reporting" subtitle="If any">
            <Field label="Reason for delay">
              <textarea rows={2} className={input + " resize-none"} value={f.delayReason} onChange={set("delayReason")} placeholder="Leave blank if reported without delay" />
            </Field>
          </Section>

          {/* 8 */}
          <Section num={8} title="Brief Facts of the Case" subtitle="First information contents">
            <Field label="Narrative of the incident" required hint="State what happened in chronological order: who contacted you, how, what you were asked to do, what was lost, and when you realised.">
              <textarea required rows={9} className={input} value={f.description} onChange={set("description")} placeholder="I, the complainant, state that on…" />
            </Field>
          </Section>

          {/* 9 */}
          <Section num={9} title="Action Taken" subtitle="Registering officer">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Field label="Name of Officer" required>
                <input required className={input} value={f.officerName} onChange={set("officerName")} />
              </Field>
              <Field label="Rank">
                <input className={input} value={f.officerRank} onChange={set("officerRank")} placeholder="e.g., Police Inspector" />
              </Field>
              <Field label="Badge / Number">
                <input className={input} value={f.officerNo} onChange={set("officerNo")} />
              </Field>
            </div>
            <p className="text-xs text-slate-600 mt-3">The case will be registered, taken up for investigation, and a copy of the FIR given free of cost to the complainant.</p>
          </Section>

          {/* Declaration */}
          <section className="border border-slate-300 rounded-lg bg-white p-5">
            <label className="flex items-start gap-3 text-sm text-slate-800">
              <input type="checkbox" className="mt-1 w-4 h-4" checked={f.declaration} onChange={e => setF(p => ({ ...p, declaration: e.target.checked }))} />
              <span>FIR read over to the complainant, admitted to be correctly recorded, and a copy given to the complainant free of cost. I declare that the information given is true to the best of my knowledge.</span>
            </label>
            <div className="grid grid-cols-2 gap-10 mt-8 text-xs text-slate-600">
              <div className="border-t border-slate-400 pt-1 text-center">Signature / Thumb impression of Complainant</div>
              <div className="border-t border-slate-400 pt-1 text-center">Signature of Officer-in-charge, Police Station</div>
            </div>
          </section>

          <button type="submit" disabled={!!registered} className="w-full flex items-center justify-center gap-2 bg-slate-900 hover:bg-slate-700 disabled:bg-slate-400 text-white py-3 rounded-lg font-bold tracking-wide transition">
            <ShieldCheck className="w-5 h-5" /> Register FIR
          </button>
        </form>
      </div>
    </div>
  );
}
