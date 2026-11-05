"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { ArrowLeft, Printer, Loader2, AlertTriangle } from "lucide-react";

interface Transfer { fromPerson: string; toPerson: string; date: string; purpose: string }
interface Evidence {
  id: string; category: string; collectedDate?: string; collectedFrom?: string; location?: string;
  documentName?: string; deviceType?: string; identifyingInfo?: string; itemDescription?: string; exhibitNumber?: string;
  makeModel?: string; priority?: string; seizureMemoNumber?: string; witnesses?: string;
  collectedByName?: string; collectedByRank?: string; collectedByBadge?: string; collectedByUnit?: string;
  examiner?: string; examinerRank?: string; examinerLab?: string; examinationDate?: string; toolsUsed?: string; examinationMethod?: string; findings?: string;
  chainOfCustodyNumber?: string; currentCustodian?: string; storageLocation?: string; custodyTransfers?: Transfer[];
  hashMD5?: string; hashSHA256?: string; condition?: string; sealed?: boolean; sealNumber?: string; notes?: string; timestamp?: string;
}
interface Correlation { from: string; to: string; relationshipType: string; description?: string }
interface CaseInfo {
  id: string; title?: string; description?: string; status?: string; caseType?: string; firNumber?: string; priority?: string;
  officerName?: string; officerRank?: string; officerBadgeId?: string; officerContact?: string; supervisingOfficer?: string;
  policeStation?: string; district?: string; state?: string; court?: string; legalSections?: string;
  complainant?: string; incidentDate?: string; reportedDate?: string;
}

const CATEGORY_LABEL: Record<string, string> = {
  electronic: "Electronic Device", document: "Physical Document", forensic_image: "Forensic Image", photo: "Photograph", other: "Other / Misc",
};
const dt = (v?: string) => (v ? v.replace("T", " ") : "—");
const rank = (r?: string) => (r ? r.replace(/ \(.*\)/, "") : "");
const person = (name?: string, r?: string, badge?: string, unit?: string) =>
  [[rank(r), name].filter(Boolean).join(" "), badge ? `(${badge})` : "", unit].filter(Boolean).join(" ") || "—";
const title = (e: Evidence) => e.deviceType || e.documentName || CATEGORY_LABEL[e.category] || e.category;
const num = (id: string) => parseInt(id.replace(/\D/g, ""), 10) || 0;

interface LogEntry { date?: string; event: string; from: string; to: string; note: string }

function custodyLog(e: Evidence): LogEntry[] {
  const log: LogEntry[] = [{
    date: e.collectedDate, event: "Seized / collected",
    from: [e.collectedFrom, e.location].filter(Boolean).join(", ") || "—",
    to: person(e.collectedByName, e.collectedByRank, e.collectedByBadge, e.collectedByUnit),
    note: [e.seizureMemoNumber && `Memo ${e.seizureMemoNumber}`, e.witnesses && `Witnesses: ${e.witnesses}`, e.sealed && `Sealed${e.sealNumber ? ` (${e.sealNumber})` : ""}`].filter(Boolean).join("; "),
  }];
  const later: LogEntry[] = (e.custodyTransfers || []).map(t => ({
    date: t.date, event: "Custody transfer", from: t.fromPerson || "—", to: t.toPerson || "—", note: t.purpose || "",
  }));
  if (e.examiner) {
    later.push({
      date: e.examinationDate, event: "Forensic examination", from: "—",
      to: [e.examiner, rank(e.examinerRank), e.examinerLab].filter(Boolean).join(", "),
      note: [e.toolsUsed && `Tools: ${e.toolsUsed}`, e.examinationMethod && `Method: ${e.examinationMethod}`].filter(Boolean).join("; "),
    });
  }
  later.sort((a, b) => (a.date || "9999").localeCompare(b.date || "9999"));
  return [...log, ...later];
}

function issues(e: Evidence): string[] {
  const out: string[] = [];
  if (!e.collectedByName) out.push("collecting officer not recorded");
  if (!e.hashMD5 && !e.hashSHA256 && e.category !== "document") out.push("no integrity hash");
  if (!e.seizureMemoNumber) out.push("no seizure memo / panchnama no.");
  if (!e.currentCustodian && !e.storageLocation) out.push("current custody not recorded");
  return out;
}

export default function CustodyReportPage() {
  const { caseId } = useParams() as { caseId: string };
  const router = useRouter();
  const { data: session } = useSession();
  const [c, setC] = useState<CaseInfo | null>(null);
  const [ev, setEv] = useState<Evidence[]>([]);
  const [corr, setCorr] = useState<Correlation[]>([]);
  const [loading, setLoading] = useState(true);
  const [generated] = useState(() => new Date().toLocaleString("en-IN", { dateStyle: "long", timeStyle: "short" }));

  const [loadError, setLoadError] = useState("");

  useEffect(() => {
    const get = async (url: string) => {
      const r = await fetch(url);
      if (!r.ok) throw new Error(`${url} returned ${r.status}`);
      return r.json();
    };
    Promise.all([
      get(`/backend/api/cases/${caseId}`),
      get(`/backend/api/cases/${caseId}/evidence`),
      get(`/backend/api/cases/${caseId}/correlations`),
    ]).then(([ci, e, co]) => {
      setC(ci);
      setEv([...e].sort((a: Evidence, b: Evidence) => num(a.id) - num(b.id)));
      setCorr(co);
    }).catch(err => setLoadError(err instanceof Error ? err.message : "Network error"))
      .finally(() => setLoading(false));
  }, [caseId]);

  if (loading) {
    return <div className="flex-1 flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-slate-500" /></div>;
  }

  if (loadError) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-3 p-8 text-center text-slate-800">
        <AlertTriangle className="w-8 h-8 text-amber-600" />
        <p className="font-bold">The report could not be generated because case data failed to load.</p>
        <p className="text-sm text-slate-600">{loadError}</p>
        <button onClick={() => window.location.reload()} className="px-4 py-2 rounded-lg bg-slate-900 text-white text-sm font-semibold">Retry</button>
      </div>
    );
  }

  const byId = Object.fromEntries(ev.map(e => [e.id, e]));
  const flagged = ev.filter(e => issues(e).length > 0);
  const th = "text-left text-[11px] font-bold uppercase tracking-wide bg-slate-100 border border-slate-300 px-2 py-1.5";
  const td = "align-top border border-slate-300 px-2 py-1.5 text-xs";

  return (
    <div className="flex-1 overflow-y-auto bg-slate-200 print:bg-white print:overflow-visible print:h-auto">
      {/* Toolbar (hidden when printing) */}
      <div className="print:hidden sticky top-0 z-10 flex items-center justify-between px-6 py-3 bg-slate-900 text-white">
        <button onClick={() => router.push(`/evidence/${caseId}`)} className="flex items-center gap-2 text-sm text-slate-300 hover:text-white">
          <ArrowLeft className="w-4 h-4" /> Back to case
        </button>
        <button onClick={() => window.print()} className="flex items-center gap-2 text-sm font-bold bg-blue-600 hover:bg-blue-500 px-4 py-2 rounded-lg">
          <Printer className="w-4 h-4" /> Print / Save as PDF
        </button>
      </div>

      <article className="max-w-[210mm] mx-auto my-6 print:my-0 bg-white text-slate-900 shadow-lg print:shadow-none p-[14mm] text-sm leading-snug">
        {/* Letterhead */}
        <header className="text-center border-b-2 border-slate-900 pb-3 mb-5">
          <p className="text-[11px] font-semibold tracking-[0.25em] uppercase text-slate-600">Government of Maharashtra · Maharashtra Police</p>
          <h1 className="font-serif text-2xl font-bold tracking-wide mt-1">CHAIN OF CUSTODY REPORT</h1>
          <p className="text-xs text-slate-600 mt-1">Case {caseId}{c?.firNumber ? ` · ${c.firNumber}` : ""} · Generated {generated}{session?.user?.name ? ` by ${session.user.name}` : ""}</p>
        </header>

        {/* 1. Case particulars */}
        <h2 className="text-sm font-bold uppercase tracking-wide mb-2">1. Case Particulars</h2>
        <table className="w-full border-collapse mb-6">
          <tbody>
            {([
              ["Case No.", c?.id], ["FIR No.", c?.firNumber],
              ["Title", c?.title], ["Case Type", c?.caseType],
              ["Investigating Officer", person(c?.officerName, c?.officerRank, c?.officerBadgeId)], ["Supervising Officer", c?.supervisingOfficer],
              ["Police Station", c?.policeStation], ["District / State", [c?.district, c?.state].filter(Boolean).join(", ")],
              ["Court of Jurisdiction", c?.court], ["Applicable Sections", c?.legalSections],
              ["Complainant", c?.complainant], ["Status", c?.status],
            ] as [string, string | undefined][]).reduce<[string, string | undefined][][]>((rows, cell, i) => {
              if (i % 2 === 0) rows.push([cell]); else rows[rows.length - 1].push(cell);
              return rows;
            }, []).map((row, i) => (
              <tr key={i}>
                {row.map(([k, v]) => (
                  <FragmentCells key={k} label={k} value={v || "—"} td={td} />
                ))}
              </tr>
            ))}
          </tbody>
        </table>

        {/* 2. Evidence register */}
        <h2 className="text-sm font-bold uppercase tracking-wide mb-2">2. Evidence Register ({ev.length} item{ev.length === 1 ? "" : "s"})</h2>
        <table className="w-full border-collapse mb-6">
          <thead>
            <tr><th className={th}>ID</th><th className={th}>Item</th><th className={th}>Seized</th><th className={th}>Collected by</th><th className={th}>Current custody</th><th className={th}>Integrity</th></tr>
          </thead>
          <tbody>
            {ev.map(e => (
              <tr key={e.id} className="break-inside-avoid">
                <td className={td + " font-mono font-bold whitespace-nowrap"}>{e.id}{e.exhibitNumber ? <><br />{e.exhibitNumber}</> : null}</td>
                <td className={td}><b>{title(e)}</b>{e.makeModel ? <><br />{e.makeModel}</> : null}{e.identifyingInfo ? <><br /><span className="font-mono">{e.identifyingInfo}</span></> : null}</td>
                <td className={td}>{dt(e.collectedDate)}<br />{e.collectedFrom}</td>
                <td className={td}>{person(e.collectedByName, e.collectedByRank, e.collectedByBadge)}</td>
                <td className={td}>{[e.currentCustodian, e.storageLocation].filter(Boolean).join(" — ") || "—"}</td>
                <td className={td + " font-mono text-[10px] break-all"}>{e.hashMD5 ? `MD5 ${e.hashMD5}` : ""}{e.hashMD5 && e.hashSHA256 ? <br /> : null}{e.hashSHA256 ? `SHA256 ${e.hashSHA256}` : ""}{!e.hashMD5 && !e.hashSHA256 ? "—" : ""}</td>
              </tr>
            ))}
            {ev.length === 0 && <tr><td className={td} colSpan={6}>No evidence has been logged for this case.</td></tr>}
          </tbody>
        </table>

        {/* 3. Custody log per item */}
        <h2 className="text-sm font-bold uppercase tracking-wide mb-2">3. Custody Log by Item</h2>
        {ev.map(e => (
          <section key={e.id} className="mb-5 break-inside-avoid">
            <p className="text-xs font-bold bg-slate-800 text-white px-2 py-1">
              {e.id} — {title(e)}{e.chainOfCustodyNumber ? ` · CoC ${e.chainOfCustodyNumber}` : ""}{e.condition ? ` · Condition: ${e.condition}` : ""}
            </p>
            <table className="w-full border-collapse">
              <thead><tr><th className={th}>#</th><th className={th}>Date &amp; time</th><th className={th}>Event</th><th className={th}>Released by / from</th><th className={th}>Received by</th><th className={th}>Remarks</th></tr></thead>
              <tbody>
                {custodyLog(e).map((l, i) => (
                  <tr key={i}>
                    <td className={td}>{i + 1}</td><td className={td + " whitespace-nowrap"}>{dt(l.date)}</td><td className={td}>{l.event}</td>
                    <td className={td}>{l.from}</td><td className={td}>{l.to}</td><td className={td}>{l.note || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {e.findings && <p className="text-xs border border-t-0 border-slate-300 px-2 py-1.5"><b>Examination findings:</b> {e.findings}</p>}
          </section>
        ))}

        {/* 4. Relationships */}
        <h2 className="text-sm font-bold uppercase tracking-wide mb-2">4. Evidence Relationships</h2>
        {corr.length === 0 ? (
          <p className="text-xs mb-6">No relationships between evidence items have been recorded.</p>
        ) : (
          <table className="w-full border-collapse mb-6">
            <thead><tr><th className={th}>From</th><th className={th}>Relationship</th><th className={th}>To</th><th className={th}>Basis</th></tr></thead>
            <tbody>
              {corr.map((r, i) => (
                <tr key={i} className="break-inside-avoid">
                  <td className={td}><b className="font-mono">{r.from}</b> {byId[r.from] ? title(byId[r.from]) : ""}</td>
                  <td className={td}>{r.relationshipType}</td>
                  <td className={td}><b className="font-mono">{r.to}</b> {byId[r.to] ? title(byId[r.to]) : ""}</td>
                  <td className={td}>{r.description || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {/* 5. Integrity review */}
        <h2 className="text-sm font-bold uppercase tracking-wide mb-2">5. Record Completeness Review</h2>
        {flagged.length === 0 ? (
          <p className="text-xs mb-6">All logged items have a collecting officer, seizure memo, integrity hash (where applicable) and recorded custody.</p>
        ) : (
          <ul className="mb-6 space-y-1">
            {flagged.map(e => (
              <li key={e.id} className="flex items-start gap-2 text-xs">
                <AlertTriangle className="w-3.5 h-3.5 mt-0.5 text-amber-600 shrink-0" />
                <span><b className="font-mono">{e.id}</b> — {issues(e).join("; ")}</span>
              </li>
            ))}
          </ul>
        )}

        {/* Certification */}
        <div className="break-inside-avoid border-t border-slate-400 pt-3 mt-6">
          <p className="text-xs mb-8">I certify that the above is a true record of the custody of the listed exhibits from the time of seizure to the date of this report, prepared from the case file maintained on the Maharashtra Cyber Portal.</p>
          <div className="grid grid-cols-2 gap-16 text-xs text-slate-600">
            <div className="border-t border-slate-500 pt-1 text-center">Investigating Officer<br /><span className="text-slate-900 font-semibold">{person(c?.officerName, c?.officerRank, c?.officerBadgeId)}</span></div>
            <div className="border-t border-slate-500 pt-1 text-center">Officer-in-charge / Supervising Officer<br /><span className="text-slate-900 font-semibold">{c?.supervisingOfficer || " "}</span></div>
          </div>
        </div>
      </article>
    </div>
  );
}

function FragmentCells({ label, value, td }: { label: string; value: string; td: string }) {
  return (
    <>
      <td className={td + " bg-slate-50 font-semibold w-[18%]"}>{label}</td>
      <td className={td + " w-[32%]"}>{value}</td>
    </>
  );
}
