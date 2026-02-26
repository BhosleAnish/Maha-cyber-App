"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useParams } from "next/navigation";
import {
  Save, FileText, Smartphone, HardDrive, MapPin, User, Calendar,
  ShieldAlert, Loader2, Network, X, Plus, Upload, Image, File,
  ZoomIn, ZoomOut, RotateCcw, Maximize2, Tag, Hash, Clock,
  AlertTriangle, Link2, Trash2, Eye, ChevronDown, ChevronUp,
  Database, Fingerprint, Camera, Server, Wifi, Cpu
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────
type EvidenceCategory = "document" | "electronic" | "forensic_image" | "photo" | "other";

interface UploadedFile {
  name: string;
  size: number;
  type: string;
  url: string; // object URL for preview
}

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
  // Extended attributes
  chainOfCustodyNumber?: string;
  examiner?: string;
  caseReference?: string;
  hashMD5?: string;
  hashSHA256?: string;
  condition?: string;
  priority?: "low" | "medium" | "high" | "critical";
  tags?: string[];
  notes?: string;
  files?: UploadedFile[];
}

interface Correlation {
  id?: number;
  from: string;
  to: string;
  relationshipType: string;
  description: string;
}

interface GraphNode {
  id: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  item: EvidenceItem;
}

const CATEGORY_CONFIG: Record<EvidenceCategory, { color: string; accent: string; icon: string; label: string }> = {
  electronic:     { color: "#00d4ff", accent: "#0099bb", icon: "📱", label: "Electronic Device" },
  document:       { color: "#a78bfa", accent: "#7c3aed", icon: "📄", label: "Physical Document" },
  forensic_image: { color: "#f59e0b", accent: "#d97706", icon: "💾", label: "Forensic Image" },
  photo:          { color: "#10b981", accent: "#059669", icon: "📷", label: "Photograph" },
  other:          { color: "#6b7280", accent: "#4b5563", icon: "📦", label: "Other / Misc" },
};

const PRIORITY_CONFIG = {
  low:      { color: "#6b7280", bg: "#1f2937", label: "Low" },
  medium:   { color: "#f59e0b", bg: "#292514", label: "Medium" },
  high:     { color: "#ef4444", bg: "#2a1515", label: "High" },
  critical: { color: "#dc2626", bg: "#3b0a0a", label: "CRITICAL" },
};

// ─── Main Component ───────────────────────────────────────────────────────────
export default function EvidencePage() {
  const params = useParams();
  const caseId = params.caseId as string;

  const [evidenceList, setEvidenceList] = useState<EvidenceItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [correlations, setCorrelations] = useState<Correlation[]>([]);
  const [selectedEvidence, setSelectedEvidence] = useState<EvidenceItem | null>(null);
  const [showGraphView, setShowGraphView] = useState(false);
  const [showCorrelationModal, setShowCorrelationModal] = useState(false);
  const [activeTab, setActiveTab] = useState<"timeline" | "graph">("timeline");
  const [showFormSection, setShowFormSection] = useState<string[]>(["basic", "device", "forensic", "notes"]);

  // Form state
  const [category, setCategory] = useState<EvidenceCategory>("electronic");
  const [collectedDate, setCollectedDate] = useState("");
  const [collectedFrom, setCollectedFrom] = useState("");
  const [location, setLocation] = useState("");
  const [documentName, setDocumentName] = useState("");
  const [deviceType, setDeviceType] = useState("Smartphone");
  const [identifyingInfo, setIdentifyingInfo] = useState("");
  const [chainOfCustodyNumber, setChainOfCustodyNumber] = useState("");
  const [examiner, setExaminer] = useState("");
  const [hashMD5, setHashMD5] = useState("");
  const [hashSHA256, setHashSHA256] = useState("");
  const [condition, setCondition] = useState("Good");
  const [priority, setPriority] = useState<"low" | "medium" | "high" | "critical">("medium");
  const [tagInput, setTagInput] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [notes, setNotes] = useState("");
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);

  // Correlation state
  const [corrFrom, setCorrFrom] = useState("");
  const [corrTo, setCorrTo] = useState("");
  const [corrType, setCorrType] = useState("Related to");
  const [corrDesc, setCorrDesc] = useState("");

  // Graph state
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const graphNodesRef = useRef<GraphNode[]>([]);
  const animFrameRef = useRef<number>(0);
  const isDraggingRef = useRef<{ node: GraphNode | null; offsetX: number; offsetY: number }>({ node: null, offsetX: 0, offsetY: 0 });
  const transformRef = useRef({ scale: 1, panX: 0, panY: 0 });
  const isPanningRef = useRef(false);
  const lastPanPosRef = useRef({ x: 0, y: 0 });
  const hoveredNodeRef = useRef<GraphNode | null>(null);

  // ─── Data fetching ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (!caseId) return;
    Promise.all([
      fetch(`http://localhost:8000/api/cases/${caseId}/evidence`).then(r => r.ok ? r.json() : []),
      fetch(`http://localhost:8000/api/cases/${caseId}/correlations`).then(r => r.ok ? r.json() : []),
    ]).then(([evData, corrData]) => {
      setEvidenceList(evData);
      setCorrelations(corrData);
    }).finally(() => setIsLoading(false));
  }, [caseId]);

  // ─── Graph Engine ──────────────────────────────────────────────────────────
  const initGraphNodes = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const w = canvas.width;
    const h = canvas.height;
    graphNodesRef.current = evidenceList.map((item, i) => {
      const angle = (i / evidenceList.length) * Math.PI * 2 - Math.PI / 2;
      const radius = Math.min(w, h) * 0.3;
      return {
        id: item.id,
        x: w / 2 + radius * Math.cos(angle),
        y: h / 2 + radius * Math.sin(angle),
        vx: 0,
        vy: 0,
        item,
      };
    });
  }, [evidenceList]);

  const drawGraph = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const { scale, panX, panY } = transformRef.current;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Background grid
    ctx.save();
    ctx.strokeStyle = "rgba(255,255,255,0.04)";
    ctx.lineWidth = 1;
    const gridSize = 40 * scale;
    const offsetX = ((panX % gridSize) + gridSize) % gridSize;
    const offsetY = ((panY % gridSize) + gridSize) % gridSize;
    for (let x = offsetX; x < canvas.width; x += gridSize) {
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, canvas.height); ctx.stroke();
    }
    for (let y = offsetY; y < canvas.height; y += gridSize) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(canvas.width, y); ctx.stroke();
    }
    ctx.restore();

    ctx.save();
    ctx.translate(panX, panY);
    ctx.scale(scale, scale);

    const nodes = graphNodesRef.current;
    const nodeMap: Record<string, GraphNode> = {};
    nodes.forEach(n => { nodeMap[n.id] = n; });

    // Draw edges
    correlations.forEach(corr => {
      const from = nodeMap[corr.from];
      const to = nodeMap[corr.to];
      if (!from || !to) return;

      const dx = to.x - from.x;
      const dy = to.y - from.y;
      const dist = Math.hypot(dx, dy) || 1;
      const nx = dx / dist;
      const ny = dy / dist;
      const nodeR = 36;

      const sx = from.x + nx * nodeR;
      const sy = from.y + ny * nodeR;
      const ex = to.x - nx * nodeR;
      const ey = to.y - ny * nodeR;

      // Glowing edge
      const grad = ctx.createLinearGradient(sx, sy, ex, ey);
      grad.addColorStop(0, "rgba(99,179,237,0.8)");
      grad.addColorStop(1, "rgba(159,122,234,0.8)");

      ctx.beginPath();
      ctx.moveTo(sx, sy);
      ctx.lineTo(ex, ey);
      ctx.strokeStyle = grad;
      ctx.lineWidth = 2;
      ctx.shadowBlur = 8;
      ctx.shadowColor = "#63b3ed";
      ctx.stroke();
      ctx.shadowBlur = 0;

      // Arrowhead
      const angle = Math.atan2(dy, dx);
      ctx.beginPath();
      ctx.moveTo(ex, ey);
      ctx.lineTo(ex - 12 * Math.cos(angle - 0.4), ey - 12 * Math.sin(angle - 0.4));
      ctx.lineTo(ex - 12 * Math.cos(angle + 0.4), ey - 12 * Math.sin(angle + 0.4));
      ctx.closePath();
      ctx.fillStyle = "#63b3ed";
      ctx.fill();

      // Label pill
      const midX = (sx + ex) / 2;
      const midY = (sy + ey) / 2;
      const labelW = ctx.measureText(corr.relationshipType).width + 16;
      ctx.fillStyle = "rgba(15,23,42,0.9)";
      ctx.beginPath();
      ctx.roundRect(midX - labelW / 2, midY - 10, labelW, 20, 10);
      ctx.fill();
      ctx.strokeStyle = "rgba(99,179,237,0.4)";
      ctx.lineWidth = 1;
      ctx.stroke();
      ctx.fillStyle = "#93c5fd";
      ctx.font = "11px 'JetBrains Mono', monospace";
      ctx.textAlign = "center";
      ctx.fillText(corr.relationshipType, midX, midY + 4);
    });

    // Draw nodes
    nodes.forEach(node => {
      const cfg = CATEGORY_CONFIG[node.item.category];
      const isHovered = hoveredNodeRef.current?.id === node.id;
      const isSelected = selectedEvidence?.id === node.id;
      const r = isHovered || isSelected ? 42 : 36;

      // Outer glow
      const glow = ctx.createRadialGradient(node.x, node.y, r * 0.5, node.x, node.y, r * 2);
      glow.addColorStop(0, cfg.color + "33");
      glow.addColorStop(1, "transparent");
      ctx.beginPath();
      ctx.arc(node.x, node.y, r * 2, 0, Math.PI * 2);
      ctx.fillStyle = glow;
      ctx.fill();

      // Node body
      const bodyGrad = ctx.createRadialGradient(node.x - r * 0.3, node.y - r * 0.3, 0, node.x, node.y, r);
      bodyGrad.addColorStop(0, cfg.color + "ee");
      bodyGrad.addColorStop(1, cfg.accent + "cc");
      ctx.beginPath();
      ctx.arc(node.x, node.y, r, 0, Math.PI * 2);
      ctx.fillStyle = bodyGrad;
      ctx.shadowBlur = isSelected ? 20 : 10;
      ctx.shadowColor = cfg.color;
      ctx.fill();
      ctx.shadowBlur = 0;

      // Border
      ctx.strokeStyle = isSelected ? "#ffffff" : cfg.color;
      ctx.lineWidth = isSelected ? 3 : 2;
      ctx.stroke();

      // Priority ring
      if (node.item.priority && node.item.priority !== "low") {
        const pCfg = PRIORITY_CONFIG[node.item.priority];
        ctx.beginPath();
        ctx.arc(node.x, node.y, r + 6, -Math.PI / 2, Math.PI * 1.5);
        ctx.strokeStyle = pCfg.color;
        ctx.lineWidth = 3;
        ctx.setLineDash([6, 4]);
        ctx.stroke();
        ctx.setLineDash([]);
      }

      // Icon
      ctx.font = `${r * 0.55}px serif`;
      ctx.textAlign = "center";
      ctx.fillStyle = "#fff";
      ctx.fillText(cfg.icon, node.x, node.y - 4);

      // ID label
      ctx.font = "bold 10px 'JetBrains Mono', monospace";
      ctx.fillStyle = "#ffffff";
      ctx.fillText(node.id, node.x, node.y + r + 16);

      // Device type / name
      const label = node.item.deviceType || node.item.documentName || node.item.category;
      ctx.font = "10px sans-serif";
      ctx.fillStyle = cfg.color;
      ctx.fillText(label.length > 14 ? label.slice(0, 13) + "…" : label, node.x, node.y + r + 28);
    });

    ctx.restore();
  }, [correlations, selectedEvidence]);

  // Physics simulation
  const runSimulation = useCallback(() => {
    const nodes = graphNodesRef.current;
    const canvas = canvasRef.current;
    if (!canvas || nodes.length === 0) return;

    // Repulsion
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const dx = nodes[j].x - nodes[i].x;
        const dy = nodes[j].y - nodes[i].y;
        const dist = Math.hypot(dx, dy) || 1;
        const force = Math.min(8000 / (dist * dist), 5);
        nodes[i].vx -= (dx / dist) * force;
        nodes[i].vy -= (dy / dist) * force;
        nodes[j].vx += (dx / dist) * force;
        nodes[j].vy += (dy / dist) * force;
      }
    }

    // Attraction along edges
    correlations.forEach(corr => {
      const from = nodes.find(n => n.id === corr.from);
      const to = nodes.find(n => n.id === corr.to);
      if (!from || !to) return;
      const dx = to.x - from.x;
      const dy = to.y - from.y;
      const dist = Math.hypot(dx, dy) || 1;
      const targetDist = 180;
      const force = (dist - targetDist) * 0.003;
      from.vx += (dx / dist) * force;
      from.vy += (dy / dist) * force;
      to.vx -= (dx / dist) * force;
      to.vy -= (dy / dist) * force;
    });

    // Center gravity
    const cx = canvas.width / 2;
    const cy = canvas.height / 2;
    nodes.forEach(n => {
      n.vx += (cx - n.x) * 0.001;
      n.vy += (cy - n.y) * 0.001;
    });

    // Damping & integrate (skip dragged node)
    nodes.forEach(n => {
      if (isDraggingRef.current.node?.id === n.id) return;
      n.vx *= 0.85;
      n.vy *= 0.85;
      n.x += n.vx;
      n.y += n.vy;
    });

    drawGraph();
    animFrameRef.current = requestAnimationFrame(runSimulation);
  }, [correlations, drawGraph]);

  useEffect(() => {
    if (activeTab === "graph" && evidenceList.length > 0) {
      const canvas = canvasRef.current;
      if (!canvas) return;
      canvas.width = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
      initGraphNodes();
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = requestAnimationFrame(runSimulation);
    }
    return () => cancelAnimationFrame(animFrameRef.current);
  }, [activeTab, evidenceList, correlations, initGraphNodes, runSimulation]);

  // ─── Canvas mouse events ───────────────────────────────────────────────────
  const getCanvasPos = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    const { scale, panX, panY } = transformRef.current;
    return {
      x: (e.clientX - rect.left - panX) / scale,
      y: (e.clientY - rect.top - panY) / scale,
    };
  };

  const findNodeAt = (x: number, y: number) =>
    graphNodesRef.current.find(n => Math.hypot(n.x - x, n.y - y) < 42);

  const handleCanvasMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const pos = getCanvasPos(e);
    const node = findNodeAt(pos.x, pos.y);
    if (node) {
      isDraggingRef.current = { node, offsetX: pos.x - node.x, offsetY: pos.y - node.y };
    } else {
      isPanningRef.current = true;
      lastPanPosRef.current = { x: e.clientX, y: e.clientY };
    }
  };

  const handleCanvasMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const pos = getCanvasPos(e);
    const node = findNodeAt(pos.x, pos.y);
    hoveredNodeRef.current = node || null;

    if (isDraggingRef.current.node) {
      isDraggingRef.current.node.x = pos.x - isDraggingRef.current.offsetX;
      isDraggingRef.current.node.y = pos.y - isDraggingRef.current.offsetY;
      isDraggingRef.current.node.vx = 0;
      isDraggingRef.current.node.vy = 0;
    } else if (isPanningRef.current) {
      const dx = e.clientX - lastPanPosRef.current.x;
      const dy = e.clientY - lastPanPosRef.current.y;
      transformRef.current.panX += dx;
      transformRef.current.panY += dy;
      lastPanPosRef.current = { x: e.clientX, y: e.clientY };
    }

    if (canvasRef.current) {
      canvasRef.current.style.cursor = node ? "grab" : isPanningRef.current ? "grabbing" : "default";
    }
  };

  const handleCanvasMouseUp = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const wasClick = !isDraggingRef.current.node || (
      Math.abs(isDraggingRef.current.node.vx) < 1 && Math.abs(isDraggingRef.current.node.vy) < 1
    );
    if (wasClick && !isPanningRef.current) {
      const pos = getCanvasPos(e);
      const node = findNodeAt(pos.x, pos.y);
      if (node) setSelectedEvidence(node.item);
    }
    isDraggingRef.current = { node: null, offsetX: 0, offsetY: 0 };
    isPanningRef.current = false;
  };

  const handleCanvasWheel = (e: React.WheelEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const factor = e.deltaY < 0 ? 1.1 : 0.9;
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    const { scale, panX, panY } = transformRef.current;
    const newScale = Math.max(0.3, Math.min(3, scale * factor));
    transformRef.current = {
      scale: newScale,
      panX: mouseX - (mouseX - panX) * (newScale / scale),
      panY: mouseY - (mouseY - panY) * (newScale / scale),
    };
  };

  const resetGraphView = () => {
    transformRef.current = { scale: 1, panX: 0, panY: 0 };
    initGraphNodes();
  };

  // ─── File upload ───────────────────────────────────────────────────────────
  const ACCEPTED_TYPES: Record<EvidenceCategory, string> = {
    electronic: ".pdf,.docx,.txt,.csv,.xml,.json,.log",
    document: ".pdf,.docx,.doc,.txt,.jpg,.png,.tiff",
    forensic_image: ".e01,.dd,.img,.iso,.dmg,.raw,.aff,.ad1",
    photo: ".jpg,.jpeg,.png,.tiff,.bmp,.heic,.raw",
    other: "*",
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const newFiles: UploadedFile[] = files.map(f => ({
      name: f.name,
      size: f.size,
      type: f.type,
      url: URL.createObjectURL(f),
    }));
    setUploadedFiles(prev => [...prev, ...newFiles]);
  };

  const removeFile = (idx: number) => {
    setUploadedFiles(prev => {
      URL.revokeObjectURL(prev[idx].url);
      return prev.filter((_, i) => i !== idx);
    });
  };

  const formatBytes = (b: number) => {
    if (b < 1024) return `${b} B`;
    if (b < 1024 ** 2) return `${(b / 1024).toFixed(1)} KB`;
    return `${(b / 1024 ** 2).toFixed(1)} MB`;
  };

  // ─── Tags ──────────────────────────────────────────────────────────────────
  const addTag = () => {
    const t = tagInput.trim().toLowerCase().replace(/\s+/g, "-");
    if (t && !tags.includes(t)) setTags(prev => [...prev, t]);
    setTagInput("");
  };

  // ─── Submit ────────────────────────────────────────────────────────────────
  const handleAddEvidence = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);

    const payload = {
      category, collectedDate, collectedFrom, location,
      documentName: category === "document" ? documentName : undefined,
      deviceType: category === "electronic" ? deviceType : undefined,
      identifyingInfo: ["electronic", "forensic_image"].includes(category) ? identifyingInfo : undefined,
      chainOfCustodyNumber, examiner, hashMD5, hashSHA256,
      condition, priority, tags, notes,
      filesCount: uploadedFiles.length,
    };

    try {
      const res = await fetch(`http://localhost:8000/api/cases/${caseId}/evidence`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        const updated = await fetch(`http://localhost:8000/api/cases/${caseId}/evidence`);
        if (updated.ok) setEvidenceList(await updated.json());
        // Reset
        setCollectedDate(""); setCollectedFrom(""); setLocation("");
        setDocumentName(""); setIdentifyingInfo(""); setChainOfCustodyNumber("");
        setExaminer(""); setHashMD5(""); setHashSHA256("");
        setTags([]); setTagInput(""); setNotes(""); setUploadedFiles([]);
        setPriority("medium"); setCondition("Good");
      } else {
        alert("Failed to save evidence.");
      }
    } catch {
      alert("Network error. Please check backend connection.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddCorrelation = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch(`http://localhost:8000/api/cases/${caseId}/correlations`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ from_evidence: corrFrom, to_evidence: corrTo, relationshipType: corrType, description: corrDesc }),
      });
      if (res.ok) {
        const updated = await fetch(`http://localhost:8000/api/cases/${caseId}/correlations`);
        if (updated.ok) setCorrelations(await updated.json());
        setCorrFrom(""); setCorrTo(""); setCorrType("Related to"); setCorrDesc("");
        setShowCorrelationModal(false);
      }
    } catch {
      alert("Network error.");
    }
  };

  const toggleSection = (s: string) =>
    setShowFormSection(prev => prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s]);

  // ─── Render ────────────────────────────────────────────────────────────────
  return (
    <div
      className="min-h-screen text-white overflow-y-auto"
      style={{
        background: "linear-gradient(135deg, #0a0f1a 0%, #0d1b2e 40%, #091527 100%)",
        fontFamily: "'IBM Plex Mono', 'JetBrains Mono', monospace",
      }}
    >
      {/* ── Header ── */}
      <div
        className="sticky top-0 z-20 px-6 py-4 flex justify-between items-center"
        style={{
          background: "rgba(10,15,26,0.95)",
          borderBottom: "1px solid rgba(99,179,237,0.15)",
          backdropFilter: "blur(12px)",
        }}
      >
        <div className="flex items-center gap-4">
          <div className="p-2 rounded-lg" style={{ background: "rgba(99,179,237,0.1)", border: "1px solid rgba(99,179,237,0.3)" }}>
            <ShieldAlert className="w-6 h-6" style={{ color: "#63b3ed" }} />
          </div>
          <div>
            <div className="flex items-center gap-3">
              <span className="text-xs" style={{ color: "#4a9ebe" }}>CASE FILE</span>
              <span className="text-xs px-2 py-0.5 rounded" style={{ background: "rgba(99,179,237,0.1)", color: "#63b3ed", border: "1px solid rgba(99,179,237,0.2)" }}>
                {evidenceList.length} items
              </span>
            </div>
            <h1 className="text-xl font-bold tracking-tight" style={{ color: "#e2e8f0" }}>{caseId}</h1>
          </div>
        </div>

        <div className="flex gap-3">
          <button
            onClick={() => setShowCorrelationModal(true)}
            disabled={evidenceList.length < 2}
            className="px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-all"
            style={{
              background: evidenceList.length < 2 ? "rgba(30,41,59,0.5)" : "rgba(99,179,237,0.1)",
              border: `1px solid ${evidenceList.length < 2 ? "rgba(71,85,105,0.3)" : "rgba(99,179,237,0.3)"}`,
              color: evidenceList.length < 2 ? "#475569" : "#63b3ed",
            }}
          >
            <Link2 className="w-4 h-4" /> Link Evidence
          </button>
        </div>
      </div>

      <div className="flex gap-0" style={{ minHeight: "calc(100vh - 73px)" }}>
        {/* ── LEFT: FORM PANEL ── */}
        <div
          className="w-96 shrink-0 overflow-y-auto"
          style={{
            borderRight: "1px solid rgba(99,179,237,0.1)",
            background: "rgba(10,15,26,0.6)",
          }}
        >
          <div className="p-5">
            <h2 className="text-sm font-bold mb-4 flex items-center gap-2" style={{ color: "#94a3b8", letterSpacing: "0.1em" }}>
              <Plus className="w-4 h-4" style={{ color: "#63b3ed" }} />
              LOG NEW EVIDENCE
            </h2>

            <form onSubmit={handleAddEvidence} className="space-y-3">
              {/* Category + Priority row */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs mb-1" style={{ color: "#64748b" }}>CATEGORY</label>
                  <select
                    value={category}
                    onChange={e => setCategory(e.target.value as EvidenceCategory)}
                    className="w-full px-3 py-2 rounded-lg text-sm outline-none"
                    style={{ background: "rgba(30,41,59,0.8)", border: "1px solid rgba(99,179,237,0.2)", color: "#e2e8f0" }}
                  >
                    {Object.entries(CATEGORY_CONFIG).map(([k, v]) => (
                      <option key={k} value={k}>{v.icon} {v.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs mb-1" style={{ color: "#64748b" }}>PRIORITY</label>
                  <select
                    value={priority}
                    onChange={e => setPriority(e.target.value as typeof priority)}
                    className="w-full px-3 py-2 rounded-lg text-sm outline-none"
                    style={{
                      background: PRIORITY_CONFIG[priority].bg,
                      border: `1px solid ${PRIORITY_CONFIG[priority].color}66`,
                      color: PRIORITY_CONFIG[priority].color,
                    }}
                  >
                    {Object.entries(PRIORITY_CONFIG).map(([k, v]) => (
                      <option key={k} value={k}>{v.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* ─ Section: Basic ─ */}
              <SectionToggle label="BASIC DETAILS" id="basic" open={showFormSection.includes("basic")} toggle={toggleSection} />
              {showFormSection.includes("basic") && (
                <div className="space-y-2 pl-3" style={{ borderLeft: "2px solid rgba(99,179,237,0.15)" }}>
                  {category === "document" && (
                    <FormField label="Document Name" icon={<FileText className="w-3.5 h-3.5" />}>
                      <input required placeholder="Bank Statement, Contract…" value={documentName} onChange={e => setDocumentName(e.target.value)} className={inputClass} style={inputStyle} />
                    </FormField>
                  )}
                  {category === "electronic" && (
                    <FormField label="Device Type" icon={<Smartphone className="w-3.5 h-3.5" />}>
                      <select value={deviceType} onChange={e => setDeviceType(e.target.value)} className={inputClass} style={inputStyle}>
                        <option>Smartphone</option>
                        <option>Laptop / PC</option>
                        <option>Storage (USB/HDD)</option>
                        <option>Networking Equipment</option>
                        <option>IoT Device</option>
                        <option>Server</option>
                        <option>Tablet</option>
                        <option>CCTV / Camera</option>
                        <option>GPS Device</option>
                        <option>Smartwatch</option>
                      </select>
                    </FormField>
                  )}
                  {["electronic", "forensic_image"].includes(category) && (
                    <FormField label="Identifiers (IMEI/MAC/Serial/Hash)" icon={<Fingerprint className="w-3.5 h-3.5" />}>
                      <input placeholder="IMEI: 358919…" value={identifyingInfo} onChange={e => setIdentifyingInfo(e.target.value)} className={inputClass} style={inputStyle} />
                    </FormField>
                  )}
                  <FormField label="Date Collected" icon={<Calendar className="w-3.5 h-3.5" />}>
                    <input required type="date" value={collectedDate} onChange={e => setCollectedDate(e.target.value)} className={inputClass} style={inputStyle} />
                  </FormField>
                  <FormField label="Collected From" icon={<User className="w-3.5 h-3.5" />}>
                    <input required placeholder="John Doe (Suspect)" value={collectedFrom} onChange={e => setCollectedFrom(e.target.value)} className={inputClass} style={inputStyle} />
                  </FormField>
                  <FormField label="Seizure Location" icon={<MapPin className="w-3.5 h-3.5" />}>
                    <input required placeholder="Flat 4B, Building A…" value={location} onChange={e => setLocation(e.target.value)} className={inputClass} style={inputStyle} />
                  </FormField>
                  <FormField label="Physical Condition" icon={<AlertTriangle className="w-3.5 h-3.5" />}>
                    <select value={condition} onChange={e => setCondition(e.target.value)} className={inputClass} style={inputStyle}>
                      <option>Excellent</option>
                      <option>Good</option>
                      <option>Fair</option>
                      <option>Damaged</option>
                      <option>Destroyed</option>
                    </select>
                  </FormField>
                </div>
              )}

              {/* ─ Section: Chain of Custody ─ */}
              <SectionToggle label="CHAIN OF CUSTODY" id="custody" open={showFormSection.includes("custody")} toggle={toggleSection} />
              {showFormSection.includes("custody") && (
                <div className="space-y-2 pl-3" style={{ borderLeft: "2px solid rgba(168,85,247,0.2)" }}>
                  <FormField label="CoC Number" icon={<Hash className="w-3.5 h-3.5" />}>
                    <input placeholder="CoC-2026-001" value={chainOfCustodyNumber} onChange={e => setChainOfCustodyNumber(e.target.value)} className={inputClass} style={inputStyle} />
                  </FormField>
                  <FormField label="Examiner / Officer" icon={<User className="w-3.5 h-3.5" />}>
                    <input placeholder="Inspector Singh" value={examiner} onChange={e => setExaminer(e.target.value)} className={inputClass} style={inputStyle} />
                  </FormField>
                </div>
              )}

              {/* ─ Section: Forensic Hashes ─ */}
              <SectionToggle label="FORENSIC INTEGRITY" id="forensic" open={showFormSection.includes("forensic")} toggle={toggleSection} />
              {showFormSection.includes("forensic") && (
                <div className="space-y-2 pl-3" style={{ borderLeft: "2px solid rgba(245,158,11,0.2)" }}>
                  <FormField label="MD5 Hash" icon={<Database className="w-3.5 h-3.5" />}>
                    <input placeholder="d41d8cd98f00b204e9800998ecf8427e" value={hashMD5} onChange={e => setHashMD5(e.target.value)} className={inputClass} style={{ ...inputStyle, fontFamily: "monospace", fontSize: "11px" }} />
                  </FormField>
                  <FormField label="SHA-256 Hash" icon={<Database className="w-3.5 h-3.5" />}>
                    <input placeholder="e3b0c44298fc1c149afb…" value={hashSHA256} onChange={e => setHashSHA256(e.target.value)} className={inputClass} style={{ ...inputStyle, fontFamily: "monospace", fontSize: "11px" }} />
                  </FormField>
                </div>
              )}

              {/* ─ Section: Tags & Notes ─ */}
              <SectionToggle label="TAGS & NOTES" id="notes" open={showFormSection.includes("notes")} toggle={toggleSection} />
              {showFormSection.includes("notes") && (
                <div className="space-y-2 pl-3" style={{ borderLeft: "2px solid rgba(16,185,129,0.2)" }}>
                  <div>
                    <label className="block text-xs mb-1" style={{ color: "#64748b" }}>TAGS</label>
                    <div className="flex gap-2 mb-2">
                      <input
                        placeholder="ransomware, suspect-a…"
                        value={tagInput}
                        onChange={e => setTagInput(e.target.value)}
                        onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); addTag(); } }}
                        className={inputClass + " flex-1"}
                        style={inputStyle}
                      />
                      <button type="button" onClick={addTag} className="px-3 py-2 rounded-lg text-xs" style={{ background: "rgba(16,185,129,0.1)", border: "1px solid rgba(16,185,129,0.3)", color: "#10b981" }}>
                        Add
                      </button>
                    </div>
                    {tags.length > 0 && (
                      <div className="flex flex-wrap gap-1.5">
                        {tags.map(t => (
                          <span key={t} className="flex items-center gap-1 px-2 py-0.5 rounded-full text-xs" style={{ background: "rgba(16,185,129,0.1)", border: "1px solid rgba(16,185,129,0.25)", color: "#10b981" }}>
                            <Tag className="w-2.5 h-2.5" />{t}
                            <button type="button" onClick={() => setTags(p => p.filter(x => x !== t))}>
                              <X className="w-2.5 h-2.5" />
                            </button>
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  <div>
                    <label className="block text-xs mb-1" style={{ color: "#64748b" }}>INVESTIGATOR NOTES</label>
                    <textarea
                      rows={3}
                      placeholder="Additional observations, context…"
                      value={notes}
                      onChange={e => setNotes(e.target.value)}
                      className={inputClass}
                      style={{ ...inputStyle, resize: "vertical", fontFamily: "sans-serif" }}
                    />
                  </div>
                </div>
              )}

              {/* ─ File Upload ─ */}
              <SectionToggle label="FILE ATTACHMENTS" id="files" open={showFormSection.includes("files")} toggle={toggleSection} />
              {showFormSection.includes("files") && (
                <div className="space-y-2 pl-3" style={{ borderLeft: "2px solid rgba(139,92,246,0.2)" }}>
                  <label
                    className="flex flex-col items-center justify-center gap-2 py-5 rounded-lg cursor-pointer transition-all"
                    style={{ background: "rgba(139,92,246,0.05)", border: "2px dashed rgba(139,92,246,0.2)" }}
                  >
                    <Upload className="w-5 h-5" style={{ color: "#8b5cf6" }} />
                    <span className="text-xs" style={{ color: "#8b5cf6" }}>
                      {category === "photo" ? "Drop images here" : category === "forensic_image" ? "Drop forensic images (.E01, .dd, .img…)" : "Drop files here"}
                    </span>
                    <span className="text-xs" style={{ color: "#64748b" }}>Accepted: {ACCEPTED_TYPES[category]}</span>
                    <input type="file" multiple accept={ACCEPTED_TYPES[category]} onChange={handleFileUpload} className="hidden" />
                  </label>
                  {uploadedFiles.length > 0 && (
                    <div className="space-y-1.5">
                      {uploadedFiles.map((f, i) => (
                        <div key={i} className="flex items-center justify-between px-3 py-2 rounded-lg" style={{ background: "rgba(30,41,59,0.6)", border: "1px solid rgba(99,179,237,0.1)" }}>
                          <div className="flex items-center gap-2 min-w-0">
                            {f.type.startsWith("image/") ? <Image className="w-3.5 h-3.5 shrink-0" style={{ color: "#10b981" }} /> : <File className="w-3.5 h-3.5 shrink-0" style={{ color: "#63b3ed" }} />}
                            <span className="text-xs truncate" style={{ color: "#cbd5e1" }}>{f.name}</span>
                          </div>
                          <div className="flex items-center gap-2 shrink-0 ml-2">
                            <span className="text-xs" style={{ color: "#64748b" }}>{formatBytes(f.size)}</span>
                            {f.type.startsWith("image/") && (
                              <a href={f.url} target="_blank" rel="noreferrer">
                                <Eye className="w-3.5 h-3.5" style={{ color: "#63b3ed" }} />
                              </a>
                            )}
                            <button type="button" onClick={() => removeFile(i)}>
                              <Trash2 className="w-3.5 h-3.5" style={{ color: "#ef4444" }} />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Submit */}
              <button
                type="submit"
                disabled={isSaving}
                className="w-full py-3 rounded-lg font-bold text-sm flex items-center justify-center gap-2 transition-all mt-2"
                style={{
                  background: isSaving ? "rgba(30,41,59,0.5)" : "linear-gradient(135deg, rgba(99,179,237,0.15), rgba(168,85,247,0.15))",
                  border: `1px solid ${isSaving ? "rgba(71,85,105,0.3)" : "rgba(99,179,237,0.4)"}`,
                  color: isSaving ? "#64748b" : "#e2e8f0",
                }}
              >
                {isSaving ? <><Loader2 className="w-4 h-4 animate-spin" /> Logging…</> : <><Save className="w-4 h-4" style={{ color: "#63b3ed" }} /> Save to Chain of Custody</>}
              </button>
            </form>
          </div>
        </div>

        {/* ── RIGHT: TABS ── */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Tab bar */}
          <div className="flex items-center px-6 pt-5 pb-0 gap-1" style={{ borderBottom: "1px solid rgba(99,179,237,0.1)" }}>
            {(["timeline", "graph"] as const).map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className="px-5 py-2.5 text-xs font-bold tracking-widest rounded-t-lg transition-all"
                style={{
                  background: activeTab === tab ? "rgba(99,179,237,0.08)" : "transparent",
                  borderTop: activeTab === tab ? "2px solid #63b3ed" : "2px solid transparent",
                  borderLeft: activeTab === tab ? "1px solid rgba(99,179,237,0.2)" : "1px solid transparent",
                  borderRight: activeTab === tab ? "1px solid rgba(99,179,237,0.2)" : "1px solid transparent",
                  color: activeTab === tab ? "#63b3ed" : "#475569",
                }}
              >
                {tab === "timeline" ? "⬤ TIMELINE" : "⬡ GRAPH"}
              </button>
            ))}
          </div>

          {/* ── TIMELINE TAB ── */}
          {activeTab === "timeline" && (
            <div className="flex-1 overflow-y-auto p-6">
              {isLoading ? (
                <div className="flex flex-col items-center justify-center h-64">
                  <Loader2 className="w-10 h-10 animate-spin mb-3" style={{ color: "#63b3ed" }} />
                  <p className="text-sm" style={{ color: "#64748b" }}>Loading evidence from database…</p>
                </div>
              ) : evidenceList.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-64 gap-3" style={{ border: "2px dashed rgba(99,179,237,0.1)", borderRadius: "12px" }}>
                  <ShieldAlert className="w-10 h-10" style={{ color: "#334155" }} />
                  <p className="text-sm" style={{ color: "#475569" }}>No evidence logged yet.</p>
                </div>
              ) : (
                <div className="relative space-y-4 pl-10">
                  {/* Vertical line */}
                  <div className="absolute left-4 top-0 bottom-0 w-px" style={{ background: "linear-gradient(to bottom, rgba(99,179,237,0.6), rgba(168,85,247,0.4), transparent)" }} />

                  {evidenceList.map((item, idx) => {
                    const cfg = CATEGORY_CONFIG[item.category] || CATEGORY_CONFIG.other;
                    const pCfg = item.priority ? PRIORITY_CONFIG[item.priority] : null;
                    return (
                      <div
                        key={item.id}
                        onClick={() => setSelectedEvidence(selectedEvidence?.id === item.id ? null : item)}
                        className="relative group cursor-pointer"
                      >
                        {/* Dot */}
                        <div
                          className="absolute -left-7 top-5 w-5 h-5 rounded-full flex items-center justify-center text-xs transition-transform"
                          style={{ background: cfg.color, boxShadow: `0 0 8px ${cfg.color}88`, transform: "translateX(-50%)" }}
                        >
                          <span>{cfg.icon}</span>
                        </div>

                        <div
                          className="rounded-xl p-4 transition-all"
                          style={{
                            background: selectedEvidence?.id === item.id ? "rgba(99,179,237,0.08)" : "rgba(15,23,42,0.6)",
                            border: `1px solid ${selectedEvidence?.id === item.id ? "rgba(99,179,237,0.3)" : "rgba(99,179,237,0.1)"}`,
                          }}
                        >
                          {/* Card header */}
                          <div className="flex items-start justify-between gap-3 mb-3">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-xs px-2 py-0.5 rounded font-bold" style={{ background: "rgba(30,41,59,0.8)", border: `1px solid ${cfg.color}44`, color: cfg.color }}>
                                {item.id}
                              </span>
                              {pCfg && (
                                <span className="text-xs px-2 py-0.5 rounded font-bold" style={{ background: pCfg.bg, color: pCfg.color, border: `1px solid ${pCfg.color}44` }}>
                                  {pCfg.label}
                                </span>
                              )}
                              {item.tags?.map(t => (
                                <span key={t} className="text-xs px-1.5 py-0.5 rounded-full" style={{ background: "rgba(16,185,129,0.08)", color: "#10b981", border: "1px solid rgba(16,185,129,0.2)" }}>
                                  #{t}
                                </span>
                              ))}
                            </div>
                            <time className="text-xs shrink-0" style={{ color: "#475569" }}>{item.collectedDate}</time>
                          </div>

                          <h3 className="text-base font-bold mb-3" style={{ color: "#e2e8f0" }}>
                            {item.deviceType || item.documentName || cfg.label}
                          </h3>

                          <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
                            {item.identifyingInfo && <InfoRow label="Identifier" value={item.identifyingInfo} mono />}
                            <InfoRow label="Seized from" value={item.collectedFrom} />
                            <InfoRow label="Location" value={item.location} />
                            {item.examiner && <InfoRow label="Examiner" value={item.examiner} />}
                            {item.chainOfCustodyNumber && <InfoRow label="CoC #" value={item.chainOfCustodyNumber} mono />}
                            {item.condition && <InfoRow label="Condition" value={item.condition} />}
                          </div>

                          {selectedEvidence?.id === item.id && (
                            <div className="mt-3 pt-3 space-y-2" style={{ borderTop: "1px solid rgba(99,179,237,0.1)" }}>
                              {item.hashMD5 && <InfoRow label="MD5" value={item.hashMD5} mono />}
                              {item.hashSHA256 && <InfoRow label="SHA-256" value={item.hashSHA256} mono />}
                              {item.notes && (
                                <div className="p-3 rounded-lg text-xs" style={{ background: "rgba(99,179,237,0.05)", border: "1px solid rgba(99,179,237,0.1)", color: "#94a3b8", fontFamily: "sans-serif" }}>
                                  {item.notes}
                                </div>
                              )}
                              <p className="text-xs" style={{ color: "#334155" }}>Logged: {item.timestamp}</p>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* ── GRAPH TAB ── */}
          {activeTab === "graph" && (
            <div className="flex-1 relative">
              {evidenceList.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full gap-3">
                  <Network className="w-10 h-10" style={{ color: "#334155" }} />
                  <p className="text-sm" style={{ color: "#475569" }}>Log evidence to see the graph.</p>
                </div>
              ) : (
                <>
                  <canvas
                    ref={canvasRef}
                    className="w-full h-full"
                    onMouseDown={handleCanvasMouseDown}
                    onMouseMove={handleCanvasMouseMove}
                    onMouseUp={handleCanvasMouseUp}
                    onMouseLeave={handleCanvasMouseUp}
                    onWheel={handleCanvasWheel}
                    style={{ display: "block", minHeight: "500px" }}
                  />

                  {/* Graph controls */}
                  <div className="absolute top-4 right-4 flex flex-col gap-2">
                    {[
                      { icon: <ZoomIn className="w-4 h-4" />, action: () => { transformRef.current.scale = Math.min(3, transformRef.current.scale * 1.2); } },
                      { icon: <ZoomOut className="w-4 h-4" />, action: () => { transformRef.current.scale = Math.max(0.3, transformRef.current.scale / 1.2); } },
                      { icon: <RotateCcw className="w-4 h-4" />, action: resetGraphView },
                    ].map((btn, i) => (
                      <button
                        key={i}
                        onClick={btn.action}
                        className="p-2 rounded-lg transition-all"
                        style={{ background: "rgba(10,15,26,0.9)", border: "1px solid rgba(99,179,237,0.2)", color: "#63b3ed" }}
                      >
                        {btn.icon}
                      </button>
                    ))}
                  </div>

                  {/* Legend */}
                  <div className="absolute bottom-4 left-4 p-3 rounded-xl text-xs space-y-1.5" style={{ background: "rgba(10,15,26,0.9)", border: "1px solid rgba(99,179,237,0.15)" }}>
                    <p className="font-bold mb-2" style={{ color: "#475569", letterSpacing: "0.08em" }}>LEGEND</p>
                    {Object.entries(CATEGORY_CONFIG).map(([k, v]) => (
                      <div key={k} className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full" style={{ background: v.color }} />
                        <span style={{ color: "#64748b" }}>{v.label}</span>
                      </div>
                    ))}
                  </div>

                  {/* Selected node details */}
                  {selectedEvidence && (
                    <div
                      className="absolute top-4 left-4 w-64 p-4 rounded-xl space-y-2"
                      style={{ background: "rgba(10,15,26,0.95)", border: "1px solid rgba(99,179,237,0.25)", backdropFilter: "blur(10px)" }}
                    >
                      <div className="flex justify-between items-start">
                        <span className="text-xs font-bold" style={{ color: CATEGORY_CONFIG[selectedEvidence.category]?.color || "#63b3ed" }}>
                          {selectedEvidence.id}
                        </span>
                        <button onClick={() => setSelectedEvidence(null)}>
                          <X className="w-4 h-4" style={{ color: "#475569" }} />
                        </button>
                      </div>
                      <p className="font-bold text-sm" style={{ color: "#e2e8f0" }}>
                        {selectedEvidence.deviceType || selectedEvidence.documentName || selectedEvidence.category}
                      </p>
                      <div className="text-xs space-y-1" style={{ color: "#64748b" }}>
                        <p>From: <span style={{ color: "#94a3b8" }}>{selectedEvidence.collectedFrom}</span></p>
                        <p>Location: <span style={{ color: "#94a3b8" }}>{selectedEvidence.location}</span></p>
                        <p>Date: <span style={{ color: "#94a3b8" }}>{selectedEvidence.collectedDate}</span></p>
                        {selectedEvidence.priority && (
                          <p>Priority: <span style={{ color: PRIORITY_CONFIG[selectedEvidence.priority].color }}>{PRIORITY_CONFIG[selectedEvidence.priority].label}</span></p>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Help text */}
                  <div className="absolute bottom-4 right-4 text-xs" style={{ color: "#334155" }}>
                    Drag nodes • Scroll to zoom • Click to inspect
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ── Correlation Modal ── */}
      {showCorrelationModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.7)", backdropFilter: "blur(6px)" }}>
          <div className="w-full max-w-md rounded-xl p-6" style={{ background: "rgba(10,15,26,0.98)", border: "1px solid rgba(99,179,237,0.25)" }}>
            <div className="flex justify-between items-center mb-5">
              <h2 className="font-bold" style={{ color: "#e2e8f0" }}>Link Evidence Items</h2>
              <button onClick={() => setShowCorrelationModal(false)}><X className="w-5 h-5" style={{ color: "#475569" }} /></button>
            </div>
            <form onSubmit={handleAddCorrelation} className="space-y-3">
              {[
                { label: "FROM", val: corrFrom, set: setCorrFrom, exclude: corrTo },
                { label: "TO", val: corrTo, set: setCorrTo, exclude: corrFrom },
              ].map(({ label, val, set, exclude }) => (
                <div key={label}>
                  <label className="block text-xs mb-1" style={{ color: "#64748b" }}>{label} EVIDENCE</label>
                  <select required value={val} onChange={e => set(e.target.value)} className={inputClass} style={inputStyle}>
                    <option value="">Select…</option>
                    {evidenceList.filter(i => i.id !== exclude).map(i => (
                      <option key={i.id} value={i.id}>{i.id} — {i.deviceType || i.documentName || i.category}</option>
                    ))}
                  </select>
                </div>
              ))}
              <div>
                <label className="block text-xs mb-1" style={{ color: "#64748b" }}>RELATIONSHIP TYPE</label>
                <select value={corrType} onChange={e => setCorrType(e.target.value)} className={inputClass} style={inputStyle}>
                  {["Related to", "Found with", "Mentions", "Accessed by", "Contains", "References", "Connected to", "Transferred data to", "Shared location with"].map(t => (
                    <option key={t}>{t}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs mb-1" style={{ color: "#64748b" }}>DESCRIPTION (optional)</label>
                <textarea rows={2} value={corrDesc} onChange={e => setCorrDesc(e.target.value)} placeholder="Describe the connection…" className={inputClass} style={{ ...inputStyle, resize: "vertical", fontFamily: "sans-serif" }} />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowCorrelationModal(false)} className="flex-1 py-2.5 rounded-lg text-sm" style={{ background: "rgba(30,41,59,0.5)", border: "1px solid rgba(71,85,105,0.3)", color: "#64748b" }}>Cancel</button>
                <button type="submit" className="flex-1 py-2.5 rounded-lg text-sm font-bold" style={{ background: "rgba(99,179,237,0.1)", border: "1px solid rgba(99,179,237,0.3)", color: "#63b3ed" }}>Add Link</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Sub-components ────────────────────────────────────────────────────────────
const inputClass = "w-full px-3 py-2 rounded-lg text-sm outline-none transition-all";
const inputStyle: React.CSSProperties = {
  background: "rgba(15,23,42,0.8)",
  border: "1px solid rgba(99,179,237,0.15)",
  color: "#e2e8f0",
};

function FormField({ label, icon, children }: { label: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div>
      <label className="flex items-center gap-1 text-xs mb-1" style={{ color: "#64748b" }}>
        <span style={{ color: "#475569" }}>{icon}</span>
        {label.toUpperCase()}
      </label>
      {children}
    </div>
  );
}

function SectionToggle({ label, id, open, toggle }: { label: string; id: string; open: boolean; toggle: (s: string) => void }) {
  return (
    <button
      type="button"
      onClick={() => toggle(id)}
      className="w-full flex items-center justify-between text-xs py-2 px-0 transition-all"
      style={{ color: "#475569", letterSpacing: "0.08em" }}
    >
      <span>{label}</span>
      {open ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
    </button>
  );
}

function InfoRow({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex gap-1">
      <span style={{ color: "#475569", minWidth: "70px" }}>{label}:</span>
      <span className="truncate" style={{ color: "#94a3b8", fontFamily: mono ? "monospace" : "inherit", fontSize: mono ? "10px" : "inherit" }}>{value}</span>
    </div>
  );
}