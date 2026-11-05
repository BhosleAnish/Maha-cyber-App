"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useParams } from "next/navigation";
import {
  Save, FileText, Smartphone, HardDrive, MapPin, User, Calendar,
  ShieldAlert, Loader2, Network, X, Plus, Upload, Image, File,
  ZoomIn, ZoomOut, RotateCcw, Maximize2, Tag, Hash, Clock,
  AlertTriangle, Link2, Trash2, Eye, ChevronDown, ChevronUp,
  Database, Fingerprint, Camera, Server, Wifi, Cpu, Sparkles
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
  itemDescription?: string;
  exhibitNumber?: string;
  makeModel?: string;
  seizureMemoNumber?: string;
  witnesses?: string;
  collectedByName?: string;
  collectedByRank?: string;
  collectedByBadge?: string;
  collectedByUnit?: string;
  examinerRank?: string;
  examinerLab?: string;
  examinationDate?: string;
  toolsUsed?: string;
  examinationMethod?: string;
  findings?: string;
  currentCustodian?: string;
  storageLocation?: string;
  custodyTransfers?: CustodyTransfer[];
  sealed?: boolean;
  sealNumber?: string;
  filesCount?: number;
}

interface CustodyTransfer {
  fromPerson: string;
  toPerson: string;
  date: string;
  purpose: string;
}

interface CaseInfo {
  id: string;
  title?: string;
  status?: string;
  caseType?: string;
  firNumber?: string;
  priority?: string;
  officerName?: string;
  officerRank?: string;
  officerBadgeId?: string;
  officerContact?: string;
  supervisingOfficer?: string;
  policeStation?: string;
  district?: string;
  state?: string;
  court?: string;
  legalSections?: string;
}

interface Correlation {
  id?: number;
  from: string;
  to: string;
  relationshipType: string;
  description: string;
}

interface AiSuggestion {
  from: string;
  to: string;
  relationshipType: string;
  description: string;
  confidence: number;
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
  electronic:     { color: "#3b82f6", accent: "#2563eb", icon: "📱", label: "Electronic Device" },
  document:       { color: "#8b5cf6", accent: "#7c3aed", icon: "📄", label: "Physical Document" },
  forensic_image: { color: "#f59e0b", accent: "#d97706", icon: "💾", label: "Forensic Image" },
  photo:          { color: "#10b981", accent: "#059669", icon: "📷", label: "Photograph" },
  other:          { color: "#64748b", accent: "#475569", icon: "📦", label: "Other / Misc" },
};

const PRIORITY_CONFIG = {
  low:      { color: "#6b7280", bg: "#1f2937", label: "Low" },
  medium:   { color: "#f59e0b", bg: "#292514", label: "Medium" },
  high:     { color: "#ef4444", bg: "#2a1515", label: "High" },
  critical: { color: "#dc2626", bg: "#3b0a0a", label: "CRITICAL" },
};

const RANKS = ["Police Constable", "Head Constable", "Assistant Sub-Inspector (ASI)", "Sub-Inspector (SI)", "Police Inspector (PI)", "Assistant Commissioner (ACP)", "Deputy Commissioner (DCP)", "Forensic Analyst", "Senior Forensic Expert", "Other"];
const DEVICE_TYPES = ["Smartphone", "Laptop / PC", "Storage (USB/HDD)", "Networking Equipment", "IoT Device", "Server", "Tablet", "CCTV / Camera", "GPS Device", "Smartwatch"];
const CONDITIONS = ["Excellent", "Good", "Fair", "Damaged", "Destroyed"];

const EMPTY_EVIDENCE = {
  category: "electronic" as EvidenceCategory,
  priority: "medium" as "low" | "medium" | "high" | "critical",
  itemDescription: "", exhibitNumber: "", deviceType: "Smartphone", makeModel: "", identifyingInfo: "", documentName: "",
  collectedDate: "", collectedFrom: "", location: "", seizureMemoNumber: "", witnesses: "",
  collectedByName: "", collectedByRank: "", collectedByBadge: "", collectedByUnit: "",
  examiner: "", examinerRank: "", examinerLab: "", examinationDate: "", toolsUsed: "", examinationMethod: "", findings: "",
  chainOfCustodyNumber: "", currentCustodian: "", storageLocation: "",
  hashMD5: "", hashSHA256: "", condition: "Good", sealed: false, sealNumber: "",
  notes: "",
};

const NODE_W = 172;
const NODE_H = 62;

// Point where the line from a node centre toward (tx,ty) leaves the node's rectangle.
function clipToRect(cx: number, cy: number, tx: number, ty: number) {
  const dx = tx - cx;
  const dy = ty - cy;
  if (!dx && !dy) return { x: cx, y: cy };
  const s = Math.min((NODE_W / 2 + 2) / (Math.abs(dx) || 1e-9), (NODE_H / 2 + 2) / (Math.abs(dy) || 1e-9));
  return { x: cx + dx * s, y: cy + dy * s };
}

function fitText(ctx: CanvasRenderingContext2D, text: string, maxW: number) {
  if (ctx.measureText(text).width <= maxW) return text;
  let t = text;
  while (t.length > 1 && ctx.measureText(t + "…").width > maxW) t = t.slice(0, -1);
  return t + "…";
}

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
  const [showEvidenceForm, setShowEvidenceForm] = useState(false);
  const [caseInfo, setCaseInfo] = useState<CaseInfo | null>(null);

  // Evidence form state
  const [form, setForm] = useState({ ...EMPTY_EVIDENCE });
  const setField = (k: keyof typeof EMPTY_EVIDENCE) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
      setForm(p => ({ ...p, [k]: e.target.value }));
  const [custodyTransfers, setCustodyTransfers] = useState<CustodyTransfer[]>([]);
  const [tagInput, setTagInput] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const category = form.category;

  // AI correlation state
  const [showAiModal, setShowAiModal] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState("");
  const [aiSuggestions, setAiSuggestions] = useState<AiSuggestion[]>([]);

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
  const alphaRef = useRef(1);
  const selectedRef = useRef<EvidenceItem | null>(null);
  const downPosRef = useRef({ x: 0, y: 0 });

  // ─── Data fetching ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (!caseId) return;
    Promise.all([
      fetch(`/backend/api/cases/${caseId}/evidence`).then(r => r.ok ? r.json() : []),
      fetch(`/backend/api/cases/${caseId}/correlations`).then(r => r.ok ? r.json() : []),
      fetch(`/backend/api/cases/${caseId}`).then(r => r.ok ? r.json() : null),
    ]).then(([evData, corrData, caseData]) => {
      setCaseInfo(caseData);
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
    const n = evidenceList.length;
    const radius = Math.max(Math.min(w, h) * 0.32, n > 1 ? 150 + n * 14 : 0);
    graphNodesRef.current = evidenceList.map((item, i) => {
      const angle = (i / n) * Math.PI * 2 - Math.PI / 2;
      return {
        id: item.id,
        x: w / 2 + radius * Math.cos(angle),
        y: h / 2 + radius * Math.sin(angle),
        vx: 0,
        vy: 0,
        item,
      };
    });
    alphaRef.current = 1;
  }, [evidenceList]);

  const drawGraph = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const { scale, panX, panY } = transformRef.current;
    const selectedId = selectedRef.current?.id;

    // Background + dot grid
    ctx.fillStyle = "#0b1220";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    const gridSize = 24 * scale;
    const offsetX = ((panX % gridSize) + gridSize) % gridSize;
    const offsetY = ((panY % gridSize) + gridSize) % gridSize;
    ctx.fillStyle = "rgba(148,163,184,0.14)";
    for (let x = offsetX; x < canvas.width; x += gridSize) {
      for (let y = offsetY; y < canvas.height; y += gridSize) ctx.fillRect(x, y, 1.5, 1.5);
    }

    ctx.save();
    ctx.translate(panX, panY);
    ctx.scale(scale, scale);

    const nodes = graphNodesRef.current;
    const nodeMap: Record<string, GraphNode> = {};
    nodes.forEach(n => { nodeMap[n.id] = n; });

    // ── Edges ──
    correlations.forEach(corr => {
      const from = nodeMap[corr.from];
      const to = nodeMap[corr.to];
      if (!from || !to) return;
      const active = selectedId === from.id || selectedId === to.id;
      const color = active ? "#cbd5e1" : "#475569";

      const a = clipToRect(from.x, from.y, to.x, to.y);
      const b = clipToRect(to.x, to.y, from.x, from.y);

      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      ctx.lineTo(b.x, b.y);
      ctx.strokeStyle = color;
      ctx.lineWidth = active ? 1.75 : 1.25;
      ctx.stroke();

      // Arrowhead
      const angle = Math.atan2(b.y - a.y, b.x - a.x);
      ctx.beginPath();
      ctx.moveTo(b.x, b.y);
      ctx.lineTo(b.x - 9 * Math.cos(angle - 0.4), b.y - 9 * Math.sin(angle - 0.4));
      ctx.lineTo(b.x - 9 * Math.cos(angle + 0.4), b.y - 9 * Math.sin(angle + 0.4));
      ctx.closePath();
      ctx.fillStyle = color;
      ctx.fill();

      // Label
      ctx.font = "500 10px Inter, system-ui, sans-serif";
      const text = corr.relationshipType;
      const labelW = ctx.measureText(text).width + 14;
      const midX = (a.x + b.x) / 2;
      const midY = (a.y + b.y) / 2;
      ctx.beginPath();
      ctx.roundRect(midX - labelW / 2, midY - 9, labelW, 18, 4);
      ctx.fillStyle = "#0b1220";
      ctx.fill();
      ctx.strokeStyle = active ? "#64748b" : "#334155";
      ctx.lineWidth = 1;
      ctx.stroke();
      ctx.fillStyle = active ? "#e2e8f0" : "#94a3b8";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(text, midX, midY + 0.5);
    });

    // ── Nodes (flat cards) ──
    nodes.forEach(node => {
      const cfg = CATEGORY_CONFIG[node.item.category] || CATEGORY_CONFIG.other;
      const isHovered = hoveredNodeRef.current?.id === node.id;
      const isSelected = selectedId === node.id;
      const x = node.x - NODE_W / 2;
      const y = node.y - NODE_H / 2;

      // Card
      ctx.beginPath();
      ctx.roundRect(x, y, NODE_W, NODE_H, 6);
      ctx.fillStyle = isSelected ? "#1a2942" : isHovered ? "#16223a" : "#111b2e";
      ctx.fill();
      ctx.strokeStyle = isSelected ? cfg.color : isHovered ? "#475569" : "#243247";
      ctx.lineWidth = isSelected ? 1.5 : 1;
      ctx.stroke();

      // Category colour bar
      ctx.save();
      ctx.beginPath();
      ctx.roundRect(x, y, NODE_W, NODE_H, 6);
      ctx.clip();
      ctx.fillStyle = cfg.color;
      ctx.fillRect(x, y, 4, NODE_H);
      ctx.restore();

      const tx = x + 14;
      ctx.textBaseline = "alphabetic";
      ctx.textAlign = "left";

      // Category label
      ctx.font = "600 9px Inter, system-ui, sans-serif";
      ctx.fillStyle = "#64748b";
      ctx.fillText(cfg.label.toUpperCase(), tx, y + 19);

      // ID (right)
      ctx.font = "600 10px 'JetBrains Mono', monospace";
      ctx.fillStyle = "#94a3b8";
      ctx.textAlign = "right";
      ctx.fillText(node.id, x + NODE_W - 10, y + 19);

      // Title
      ctx.textAlign = "left";
      ctx.font = "600 12px Inter, system-ui, sans-serif";
      ctx.fillStyle = "#e2e8f0";
      const label = node.item.deviceType || node.item.documentName || cfg.label;
      ctx.fillText(fitText(ctx, label, NODE_W - 28), tx, y + 38);

      // Priority badge
      const pr = node.item.priority;
      if (pr && pr !== "low") {
        const pCfg = PRIORITY_CONFIG[pr];
        ctx.beginPath();
        ctx.arc(tx + 3, y + 51, 3, 0, Math.PI * 2);
        ctx.fillStyle = pCfg.color;
        ctx.fill();
        ctx.font = "600 9px Inter, system-ui, sans-serif";
        ctx.fillStyle = pCfg.color;
        ctx.fillText(pCfg.label.toUpperCase(), tx + 11, y + 54);
      }
    });

    ctx.restore();
  }, [correlations]);

  // Force layout: runs only until the nodes settle, then the graph stays still.
  const runSimulation = useCallback(() => {
    const nodes = graphNodesRef.current;
    const canvas = canvasRef.current;
    if (!canvas || nodes.length === 0) return;

    const alpha = alphaRef.current;
    if (alpha > 0.03) {
      // Repulsion + overlap avoidance
      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const dx = nodes[j].x - nodes[i].x;
          const dy = nodes[j].y - nodes[i].y;
          const dist = Math.hypot(dx, dy) || 1;
          let force = Math.min(60000 / (dist * dist), 3) * alpha;
          if (Math.abs(dx) < NODE_W + 30 && Math.abs(dy) < NODE_H + 30) force += 2;
          nodes[i].vx -= (dx / dist) * force;
          nodes[i].vy -= (dy / dist) * force;
          nodes[j].vx += (dx / dist) * force;
          nodes[j].vy += (dy / dist) * force;
        }
      }

      // Spring along edges
      correlations.forEach(corr => {
        const from = nodes.find(n => n.id === corr.from);
        const to = nodes.find(n => n.id === corr.to);
        if (!from || !to) return;
        const dx = to.x - from.x;
        const dy = to.y - from.y;
        const dist = Math.hypot(dx, dy) || 1;
        const force = (dist - 280) * 0.01 * alpha;
        from.vx += (dx / dist) * force;
        from.vy += (dy / dist) * force;
        to.vx -= (dx / dist) * force;
        to.vy -= (dy / dist) * force;
      });

      // Gentle pull to centre
      const cx = canvas.width / 2;
      const cy = canvas.height / 2;
      nodes.forEach(n => {
        n.vx += (cx - n.x) * 0.0015 * alpha;
        n.vy += (cy - n.y) * 0.0015 * alpha;
      });

      // Heavy damping, capped speed, integrate (dragged node stays put)
      nodes.forEach(n => {
        if (isDraggingRef.current.node?.id === n.id) return;
        n.vx *= 0.55;
        n.vy *= 0.55;
        const sp = Math.hypot(n.vx, n.vy);
        if (sp > 10) { n.vx = (n.vx / sp) * 10; n.vy = (n.vy / sp) * 10; }
        n.x += n.vx;
        n.y += n.vy;
      });
      alphaRef.current = alpha * 0.97;
    }

    drawGraph();
    animFrameRef.current = requestAnimationFrame(runSimulation);
  }, [correlations, drawGraph]);

  useEffect(() => {
    selectedRef.current = selectedEvidence;
  }, [selectedEvidence]);

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

  // Non-passive wheel listener so zooming doesn't scroll the page
  useEffect(() => {
    const canvas = canvasRef.current;
    if (activeTab !== "graph" || !canvas) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const factor = e.deltaY < 0 ? 1.1 : 0.9;
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
    canvas.addEventListener("wheel", onWheel, { passive: false });
    return () => canvas.removeEventListener("wheel", onWheel);
  }, [activeTab, evidenceList.length]);

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
    [...graphNodesRef.current].reverse().find(n => Math.abs(n.x - x) <= NODE_W / 2 && Math.abs(n.y - y) <= NODE_H / 2);

  const handleCanvasMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const pos = getCanvasPos(e);
    const node = findNodeAt(pos.x, pos.y);
    downPosRef.current = { x: e.clientX, y: e.clientY };
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
      alphaRef.current = Math.max(alphaRef.current, 0.25); // let neighbours ease aside
    } else if (isPanningRef.current) {
      transformRef.current.panX += e.clientX - lastPanPosRef.current.x;
      transformRef.current.panY += e.clientY - lastPanPosRef.current.y;
      lastPanPosRef.current = { x: e.clientX, y: e.clientY };
    }

    if (canvasRef.current) {
      canvasRef.current.style.cursor = isDraggingRef.current.node || isPanningRef.current ? "grabbing" : node ? "pointer" : "default";
    }
  };

  const handleCanvasMouseUp = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const moved = Math.hypot(e.clientX - downPosRef.current.x, e.clientY - downPosRef.current.y);
    if (moved < 4 && e.type === "mouseup") {
      const pos = getCanvasPos(e);
      const node = findNodeAt(pos.x, pos.y);
      if (node) setSelectedEvidence(node.item);
    }
    isDraggingRef.current = { node: null, offsetX: 0, offsetY: 0 };
    isPanningRef.current = false;
  };

  const zoomBy = (f: number) => {
    transformRef.current.scale = Math.max(0.3, Math.min(3, transformRef.current.scale * f));
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

  // ─── Custody transfers ─────────────────────────────────────────────────────
  const addTransfer = () =>
    setCustodyTransfers(prev => [...prev, { fromPerson: "", toPerson: "", date: "", purpose: "" }]);
  const updateTransfer = (i: number, k: keyof CustodyTransfer, v: string) =>
    setCustodyTransfers(prev => prev.map((t, idx) => (idx === i ? { ...t, [k]: v } : t)));
  const removeTransfer = (i: number) =>
    setCustodyTransfers(prev => prev.filter((_, idx) => idx !== i));

  const resetEvidenceForm = () => {
    setForm({ ...EMPTY_EVIDENCE });
    setCustodyTransfers([]);
    setTags([]); setTagInput("");
    uploadedFiles.forEach(f => URL.revokeObjectURL(f.url));
    setUploadedFiles([]);
  };

  // ─── Submit ────────────────────────────────────────────────────────────────
  const handleAddEvidence = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);

    const payload = {
      ...form,
      documentName: category === "document" ? form.documentName : undefined,
      deviceType: category === "electronic" ? form.deviceType : undefined,
      makeModel: category === "electronic" ? form.makeModel : undefined,
      identifyingInfo: ["electronic", "forensic_image"].includes(category) ? form.identifyingInfo : undefined,
      custodyTransfers: custodyTransfers.filter(t => t.fromPerson || t.toPerson),
      tags,
      filesCount: uploadedFiles.length,
    };

    try {
      const res = await fetch(`/backend/api/cases/${caseId}/evidence`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        const updated = await fetch(`/backend/api/cases/${caseId}/evidence`);
        if (updated.ok) setEvidenceList(await updated.json());
        resetEvidenceForm();
        setShowEvidenceForm(false);
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
      const res = await fetch(`/backend/api/cases/${caseId}/correlations`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ from_evidence: corrFrom, to_evidence: corrTo, relationshipType: corrType, description: corrDesc }),
      });
      if (res.ok) {
        const updated = await fetch(`/backend/api/cases/${caseId}/correlations`);
        if (updated.ok) setCorrelations(await updated.json());
        setCorrFrom(""); setCorrTo(""); setCorrType("Related to"); setCorrDesc("");
        setShowCorrelationModal(false);
      }
    } catch {
      alert("Network error.");
    }
  };

  const runAiCorrelation = async () => {
    setShowAiModal(true);
    setAiLoading(true);
    setAiError("");
    setAiSuggestions([]);
    try {
      const res = await fetch(`/backend/api/cases/${caseId}/ai-correlate`, { method: "POST" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.detail || "AI correlation failed");
      setAiSuggestions(data.suggestions || []);
    } catch (err) {
      setAiError(err instanceof Error ? err.message : "Network error.");
    } finally {
      setAiLoading(false);
    }
  };

  const acceptAiSuggestion = async (s: AiSuggestion) => {
    try {
      const res = await fetch(`/backend/api/cases/${caseId}/correlations`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          from_evidence: s.from, to_evidence: s.to, relationshipType: s.relationshipType,
          description: `[AI] ${s.description}`,
        }),
      });
      if (res.ok) {
        const updated = await fetch(`/backend/api/cases/${caseId}/correlations`);
        if (updated.ok) setCorrelations(await updated.json());
        setAiSuggestions(prev => prev.filter(x => x !== s));
      }
    } catch {
      alert("Network error.");
    }
  };

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
            <h1 className="text-xl font-bold tracking-tight" style={{ color: "#e2e8f0" }}>
              {caseId}{caseInfo?.title ? <span className="font-normal" style={{ color: "#94a3b8" }}> — {caseInfo.title}</span> : null}
            </h1>
            {caseInfo && (caseInfo.officerName || caseInfo.policeStation) && (
              <p className="text-xs mt-1" style={{ color: "#64748b" }}>
                {caseInfo.officerName && <>IO: <span style={{ color: "#94a3b8" }}>{[caseInfo.officerRank?.replace(/ \(.*\)/, ""), caseInfo.officerName].filter(Boolean).join(" ")}{caseInfo.officerBadgeId ? ` (${caseInfo.officerBadgeId})` : ""}</span></>}
                {caseInfo.policeStation && <> &nbsp;•&nbsp; PS: <span style={{ color: "#94a3b8" }}>{caseInfo.policeStation}</span></>}
                {caseInfo.district && <> &nbsp;•&nbsp; <span style={{ color: "#94a3b8" }}>{caseInfo.district}{caseInfo.state ? `, ${caseInfo.state}` : ""}</span></>}
                {caseInfo.firNumber && <> &nbsp;•&nbsp; FIR: <span style={{ color: "#94a3b8" }}>{caseInfo.firNumber}</span></>}
              </p>
            )}
          </div>
        </div>

        <div className="flex gap-3">
          <button
            onClick={() => setShowEvidenceForm(true)}
            className="px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 transition-all"
            style={{ background: "#2563eb", border: "1px solid #3b82f6", color: "#fff" }}
          >
            <Plus className="w-4 h-4" /> Add Evidence
          </button>
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
          <button
            onClick={runAiCorrelation}
            disabled={evidenceList.length < 2 || aiLoading}
            className="px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-all"
            style={{
              background: evidenceList.length < 2 ? "rgba(30,41,59,0.5)" : "rgba(167,139,250,0.12)",
              border: `1px solid ${evidenceList.length < 2 ? "rgba(71,85,105,0.3)" : "rgba(167,139,250,0.4)"}`,
              color: evidenceList.length < 2 ? "#475569" : "#a78bfa",
            }}
          >
            {aiLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />} AI Correlate
          </button>
        </div>
      </div>

      <div className="flex gap-0" style={{ minHeight: "calc(100vh - 73px)" }}>
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
                  <div className="absolute left-4 top-0 bottom-0 w-px" style={{ background: "#243247" }} />

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
                          style={{ background: cfg.color, border: "2px solid #0b1220", transform: "translateX(-50%)" }}
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
                            <time className="text-xs shrink-0" style={{ color: "#475569" }}>{item.collectedDate?.replace("T", " ")}</time>
                          </div>

                          <h3 className="text-base font-bold mb-3" style={{ color: "#e2e8f0" }}>
                            {item.deviceType || item.documentName || cfg.label}
                          </h3>

                          <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
                            {item.identifyingInfo && <InfoRow label="Identifier" value={item.identifyingInfo} mono />}
                            <InfoRow label="Seized from" value={item.collectedFrom} />
                            {item.collectedByName && <InfoRow label="Collected by" value={[item.collectedByRank?.replace(/ \(.*\)/, ""), item.collectedByName].filter(Boolean).join(" ")} />}
                            <InfoRow label="Location" value={item.location} />
                            {item.examiner && <InfoRow label="Examiner" value={item.examiner} />}
                            {item.chainOfCustodyNumber && <InfoRow label="CoC #" value={item.chainOfCustodyNumber} mono />}
                            {item.condition && <InfoRow label="Condition" value={item.condition} />}
                          </div>

                          {selectedEvidence?.id === item.id && (
                            <div className="mt-3 pt-3 space-y-2" style={{ borderTop: "1px solid rgba(99,179,237,0.1)" }}>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-1">
                                {item.itemDescription && <InfoRow wrap label="Description" value={item.itemDescription} />}
                                {item.exhibitNumber && <InfoRow wrap label="Exhibit #" value={item.exhibitNumber} mono />}
                                {item.makeModel && <InfoRow wrap label="Make / model" value={item.makeModel} />}
                                {item.seizureMemoNumber && <InfoRow wrap label="Seizure memo" value={item.seizureMemoNumber} mono />}
                                {item.witnesses && <InfoRow wrap label="Witnesses" value={item.witnesses} />}
                                {item.collectedByName && <InfoRow wrap label="Collector" value={[item.collectedByRank, item.collectedByName, item.collectedByBadge && `(${item.collectedByBadge})`, item.collectedByUnit].filter(Boolean).join(" ")} />}
                                {item.examiner && <InfoRow wrap label="Examined by" value={[item.examiner, item.examinerRank, item.examinerLab].filter(Boolean).join(", ")} />}
                                {item.examinationDate && <InfoRow wrap label="Examined on" value={item.examinationDate.replace("T", " ")} />}
                                {item.toolsUsed && <InfoRow wrap label="Tools" value={item.toolsUsed} />}
                                {item.examinationMethod && <InfoRow wrap label="Method" value={item.examinationMethod} />}
                                {item.currentCustodian && <InfoRow wrap label="Custodian" value={item.currentCustodian} />}
                                {item.storageLocation && <InfoRow wrap label="Storage" value={item.storageLocation} />}
                                {item.sealed && <InfoRow wrap label="Sealed" value={item.sealNumber ? `Yes — seal ${item.sealNumber}` : "Yes"} />}
                              </div>
                              {item.findings && (
                                <div className="p-3 rounded-lg text-xs" style={{ background: "rgba(148,163,184,0.06)", border: "1px solid #243247", color: "#94a3b8", fontFamily: "sans-serif" }}>
                                  <span className="font-bold" style={{ color: "#64748b" }}>Findings: </span>{item.findings}
                                </div>
                              )}
                              {item.custodyTransfers && item.custodyTransfers.length > 0 && (
                                <div className="text-xs">
                                  <p className="font-bold mb-1" style={{ color: "#64748b" }}>Custody transfers</p>
                                  <div className="space-y-1">
                                    {item.custodyTransfers.map((t, i) => (
                                      <div key={i} className="flex flex-wrap gap-x-3 px-2 py-1 rounded" style={{ background: "rgba(148,163,184,0.06)", color: "#94a3b8" }}>
                                        <span>{t.date?.replace("T", " ")}</span><span>{t.fromPerson} → {t.toPerson}</span>{t.purpose && <span style={{ color: "#64748b" }}>({t.purpose})</span>}
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}
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
                    style={{ display: "block", minHeight: "max(500px, calc(100vh - 150px))" }}
                  />

                  {/* Graph controls */}
                  <div className="absolute top-4 right-4 flex flex-col rounded-lg overflow-hidden" style={{ background: "#111b2e", border: "1px solid #243247" }}>
                    {[
                      { icon: <ZoomIn className="w-4 h-4" />, title: "Zoom in", action: () => zoomBy(1.2) },
                      { icon: <ZoomOut className="w-4 h-4" />, title: "Zoom out", action: () => zoomBy(1 / 1.2) },
                      { icon: <Maximize2 className="w-4 h-4" />, title: "Reset view", action: resetGraphView },
                    ].map((btn, i) => (
                      <button
                        key={i}
                        onClick={btn.action}
                        title={btn.title}
                        className="p-2.5 transition-colors hover:bg-white/5"
                        style={{ color: "#94a3b8", borderTop: i ? "1px solid #243247" : "none" }}
                      >
                        {btn.icon}
                      </button>
                    ))}
                  </div>

                  {/* Legend */}
                  <div className="absolute bottom-4 left-4 px-3 py-2.5 rounded-lg text-xs space-y-1.5" style={{ background: "#111b2e", border: "1px solid #243247" }}>
                    <p className="font-semibold" style={{ color: "#64748b", letterSpacing: "0.08em", fontSize: "10px" }}>EVIDENCE TYPE</p>
                    {Object.entries(CATEGORY_CONFIG).map(([k, v]) => (
                      <div key={k} className="flex items-center gap-2">
                        <div className="w-2.5 h-2.5 rounded-sm" style={{ background: v.color }} />
                        <span style={{ color: "#94a3b8" }}>{v.label}</span>
                      </div>
                    ))}
                  </div>

                  {/* Selected node details */}
                  {selectedEvidence && (
                    <div
                      className="absolute top-4 left-4 w-72 p-4 rounded-lg space-y-2"
                      style={{ background: "#111b2e", border: "1px solid #243247" }}
                    >
                      <div className="flex justify-between items-start">
                        <span className="text-xs font-bold" style={{ color: CATEGORY_CONFIG[selectedEvidence.category]?.color || "#94a3b8" }}>
                          {selectedEvidence.id}
                        </span>
                        <button onClick={() => setSelectedEvidence(null)}>
                          <X className="w-4 h-4" style={{ color: "#64748b" }} />
                        </button>
                      </div>
                      <p className="font-semibold text-sm" style={{ color: "#e2e8f0" }}>
                        {selectedEvidence.deviceType || selectedEvidence.documentName || selectedEvidence.category}
                      </p>
                      <div className="text-xs space-y-1" style={{ color: "#64748b" }}>
                        <p>Seized from: <span style={{ color: "#94a3b8" }}>{selectedEvidence.collectedFrom}</span></p>
                        <p>Location: <span style={{ color: "#94a3b8" }}>{selectedEvidence.location}</span></p>
                        <p>Date: <span style={{ color: "#94a3b8" }}>{selectedEvidence.collectedDate?.replace("T", " ")}</span></p>
                        {selectedEvidence.collectedByName && <p>Collected by: <span style={{ color: "#94a3b8" }}>{[selectedEvidence.collectedByRank?.replace(/ \(.*\)/, ""), selectedEvidence.collectedByName].filter(Boolean).join(" ")}</span></p>}
                        {selectedEvidence.examiner && <p>Examiner: <span style={{ color: "#94a3b8" }}>{selectedEvidence.examiner}</span></p>}
                        {selectedEvidence.priority && (
                          <p>Priority: <span style={{ color: PRIORITY_CONFIG[selectedEvidence.priority].color }}>{PRIORITY_CONFIG[selectedEvidence.priority].label}</span></p>
                        )}
                      </div>
                    </div>
                  )}

                  <div className="absolute bottom-4 right-4 text-xs" style={{ color: "#475569" }}>
                    Drag to move • Scroll to zoom • Click a node to inspect
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ── Evidence Form Modal ── */}
      {showEvidenceForm && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto p-4 md:p-8" style={{ background: "rgba(2,6,15,0.8)", backdropFilter: "blur(4px)" }}>
          <form
            onSubmit={handleAddEvidence}
            className="w-full max-w-5xl rounded-xl"
            style={{ background: "#0d1626", border: "1px solid #243247", fontFamily: "Inter, system-ui, sans-serif" }}
          >
            <div className="flex items-center justify-between px-6 py-4 sticky top-0 z-10 rounded-t-xl" style={{ background: "#0d1626", borderBottom: "1px solid #243247" }}>
              <div>
                <h2 className="text-lg font-bold" style={{ color: "#e2e8f0" }}>Log New Evidence</h2>
                <p className="text-xs" style={{ color: "#64748b" }}>Case {caseId} · fields marked <span style={{ color: "#f87171" }}>*</span> are required for a valid chain of custody</p>
              </div>
              <button type="button" onClick={() => setShowEvidenceForm(false)} aria-label="Close"><X className="w-5 h-5" style={{ color: "#64748b" }} /></button>
            </div>

            <div className="p-6 space-y-5">
              <FormSection num={1} title="Evidence Identification">
                <FormField required label="Category">
                  <select value={form.category} onChange={setField("category")} className={inputClass} style={inputStyle}>
                    {Object.entries(CATEGORY_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                  </select>
                </FormField>
                <FormField label="Exhibit / Tag Number">
                  <input placeholder="e.g., EX-07" value={form.exhibitNumber} onChange={setField("exhibitNumber")} className={inputClass} style={inputStyle} />
                </FormField>
                <FormField label="Priority">
                  <select value={form.priority} onChange={setField("priority")} className={inputClass} style={{ ...inputStyle, color: PRIORITY_CONFIG[form.priority].color }}>
                    {Object.entries(PRIORITY_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                  </select>
                </FormField>
                {category === "document" && (
                  <FormField required label="Document Name">
                    <input required placeholder="Bank statement, contract…" value={form.documentName} onChange={setField("documentName")} className={inputClass} style={inputStyle} />
                  </FormField>
                )}
                {category === "electronic" && (
                  <>
                    <FormField label="Device Type">
                      <select value={form.deviceType} onChange={setField("deviceType")} className={inputClass} style={inputStyle}>
                        {DEVICE_TYPES.map(d => <option key={d}>{d}</option>)}
                      </select>
                    </FormField>
                    <FormField label="Make / Model">
                      <input placeholder="e.g., Samsung Galaxy S23" value={form.makeModel} onChange={setField("makeModel")} className={inputClass} style={inputStyle} />
                    </FormField>
                  </>
                )}
                {["electronic", "forensic_image"].includes(category) && (
                  <FormField label="Identifiers (IMEI / MAC / Serial)">
                    <input placeholder="IMEI: 358919…" value={form.identifyingInfo} onChange={setField("identifyingInfo")} className={inputClass} style={inputStyle} />
                  </FormField>
                )}
                <FormField label="Item Description" span={3}>
                  <textarea rows={2} placeholder="Describe the item: appearance, markings, state when found…" value={form.itemDescription} onChange={setField("itemDescription")} className={inputClass} style={{ ...inputStyle, resize: "vertical" }} />
                </FormField>
              </FormSection>

              <FormSection num={2} title="Seizure Details">
                <FormField required label="Date & Time Seized">
                  <input required type="datetime-local" value={form.collectedDate} onChange={setField("collectedDate")} className={inputClass} style={inputStyle} />
                </FormField>
                <FormField required label="Seized From">
                  <input required placeholder="John Doe (Suspect)" value={form.collectedFrom} onChange={setField("collectedFrom")} className={inputClass} style={inputStyle} />
                </FormField>
                <FormField required label="Seizure Location">
                  <input required placeholder="Flat 4B, Building A…" value={form.location} onChange={setField("location")} className={inputClass} style={inputStyle} />
                </FormField>
                <FormField label="Seizure Memo / Panchnama No.">
                  <input placeholder="e.g., PN-2026-0142" value={form.seizureMemoNumber} onChange={setField("seizureMemoNumber")} className={inputClass} style={inputStyle} />
                </FormField>
                <FormField label="Independent Witnesses (Panch)" span={2}>
                  <input placeholder="Names of witnesses present at seizure" value={form.witnesses} onChange={setField("witnesses")} className={inputClass} style={inputStyle} />
                </FormField>
              </FormSection>

              <FormSection num={3} title="Collected By (Seizing Officer)">
                <FormField required label="Officer Name">
                  <input required placeholder="e.g., Rajesh Patil" value={form.collectedByName} onChange={setField("collectedByName")} className={inputClass} style={inputStyle} />
                </FormField>
                <FormField required label="Rank">
                  <select required value={form.collectedByRank} onChange={setField("collectedByRank")} className={inputClass} style={inputStyle}>
                    <option value="">Select rank…</option>
                    {RANKS.map(r => <option key={r}>{r}</option>)}
                  </select>
                </FormField>
                <FormField label="Badge / Employee ID">
                  <input placeholder="e.g., MH-CY-2041" value={form.collectedByBadge} onChange={setField("collectedByBadge")} className={inputClass} style={inputStyle} />
                </FormField>
                <FormField label="Unit / Police Station" span={3}>
                  <input placeholder={caseInfo?.policeStation || "e.g., Cyber Police Station, BKC"} value={form.collectedByUnit} onChange={setField("collectedByUnit")} className={inputClass} style={inputStyle} />
                </FormField>
              </FormSection>

              <FormSection num={4} title="Forensic Examination">
                <FormField label="Examined / Operated By">
                  <input placeholder="Analyst name" value={form.examiner} onChange={setField("examiner")} className={inputClass} style={inputStyle} />
                </FormField>
                <FormField label="Rank / Designation">
                  <select value={form.examinerRank} onChange={setField("examinerRank")} className={inputClass} style={inputStyle}>
                    <option value="">Select…</option>
                    {RANKS.map(r => <option key={r}>{r}</option>)}
                  </select>
                </FormField>
                <FormField label="Laboratory / Unit">
                  <input placeholder="e.g., State Cyber Forensic Lab" value={form.examinerLab} onChange={setField("examinerLab")} className={inputClass} style={inputStyle} />
                </FormField>
                <FormField label="Examination Date & Time">
                  <input type="datetime-local" value={form.examinationDate} onChange={setField("examinationDate")} className={inputClass} style={inputStyle} />
                </FormField>
                <FormField label="Tools Used">
                  <input placeholder="e.g., Cellebrite UFED, FTK Imager" value={form.toolsUsed} onChange={setField("toolsUsed")} className={inputClass} style={inputStyle} />
                </FormField>
                <FormField label="Method / Write-blocker">
                  <input placeholder="e.g., Physical extraction via write-blocker" value={form.examinationMethod} onChange={setField("examinationMethod")} className={inputClass} style={inputStyle} />
                </FormField>
                <FormField label="Findings Summary" span={3}>
                  <textarea rows={2} placeholder="Key findings from the examination…" value={form.findings} onChange={setField("findings")} className={inputClass} style={{ ...inputStyle, resize: "vertical" }} />
                </FormField>
              </FormSection>

              <FormSection num={5} title="Chain of Custody">
                <FormField label="CoC Reference No.">
                  <input placeholder="CoC-2026-001" value={form.chainOfCustodyNumber} onChange={setField("chainOfCustodyNumber")} className={inputClass} style={inputStyle} />
                </FormField>
                <FormField label="Current Custodian">
                  <input placeholder="Person currently holding the item" value={form.currentCustodian} onChange={setField("currentCustodian")} className={inputClass} style={inputStyle} />
                </FormField>
                <FormField label="Storage Location">
                  <input placeholder="e.g., Malkhana Locker 12" value={form.storageLocation} onChange={setField("storageLocation")} className={inputClass} style={inputStyle} />
                </FormField>
                <div className="md:col-span-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold" style={{ color: "#94a3b8" }}>CUSTODY TRANSFERS</label>
                    <button type="button" onClick={addTransfer} className="text-xs px-3 py-1 rounded-md font-semibold" style={{ border: "1px solid #334155", color: "#93c5fd" }}>+ Add transfer</button>
                  </div>
                  {custodyTransfers.length === 0 && <p className="text-xs" style={{ color: "#475569" }}>No transfers recorded. Add one each time the item changes hands.</p>}
                  {custodyTransfers.map((t, i) => (
                    <div key={i} className="grid grid-cols-1 md:grid-cols-[1fr_1fr_1fr_1.2fr_auto] gap-2 items-center">
                      <input placeholder="Released by" value={t.fromPerson} onChange={e => updateTransfer(i, "fromPerson", e.target.value)} className={inputClass} style={inputStyle} />
                      <input placeholder="Received by" value={t.toPerson} onChange={e => updateTransfer(i, "toPerson", e.target.value)} className={inputClass} style={inputStyle} />
                      <input type="datetime-local" value={t.date} onChange={e => updateTransfer(i, "date", e.target.value)} className={inputClass} style={inputStyle} />
                      <input placeholder="Purpose (e.g., lab analysis)" value={t.purpose} onChange={e => updateTransfer(i, "purpose", e.target.value)} className={inputClass} style={inputStyle} />
                      <button type="button" onClick={() => removeTransfer(i)} aria-label="Remove transfer"><Trash2 className="w-4 h-4" style={{ color: "#ef4444" }} /></button>
                    </div>
                  ))}
                </div>
              </FormSection>

              <FormSection num={6} title="Integrity & Condition">
                <FormField label="MD5 Hash">
                  <input placeholder="d41d8cd98f00b204e9800998ecf8427e" value={form.hashMD5} onChange={setField("hashMD5")} className={inputClass} style={{ ...inputStyle, fontFamily: "monospace", fontSize: "12px" }} />
                </FormField>
                <FormField label="SHA-256 Hash" span={2}>
                  <input placeholder="e3b0c44298fc1c149afb…" value={form.hashSHA256} onChange={setField("hashSHA256")} className={inputClass} style={{ ...inputStyle, fontFamily: "monospace", fontSize: "12px" }} />
                </FormField>
                <FormField label="Physical Condition">
                  <select value={form.condition} onChange={setField("condition")} className={inputClass} style={inputStyle}>
                    {CONDITIONS.map(c => <option key={c}>{c}</option>)}
                  </select>
                </FormField>
                <FormField label="Evidence Sealed?">
                  <label className="flex items-center gap-2 h-[38px] text-sm" style={{ color: "#cbd5e1" }}>
                    <input type="checkbox" checked={form.sealed} onChange={e => setForm(p => ({ ...p, sealed: e.target.checked }))} className="w-4 h-4" />
                    Sealed in evidence bag
                  </label>
                </FormField>
                <FormField label="Seal Number">
                  <input disabled={!form.sealed} placeholder="e.g., SL-889120" value={form.sealNumber} onChange={setField("sealNumber")} className={inputClass + " disabled:opacity-40"} style={inputStyle} />
                </FormField>
              </FormSection>

              <FormSection num={7} title="Tags, Notes & Attachments">
                <div className="md:col-span-3">
                  <label className="block text-xs font-semibold mb-1" style={{ color: "#94a3b8" }}>TAGS</label>
                  <div className="flex gap-2 mb-2">
                    <input
                      placeholder="ransomware, suspect-a…"
                      value={tagInput}
                      onChange={e => setTagInput(e.target.value)}
                      onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); addTag(); } }}
                      className={inputClass + " flex-1"}
                      style={inputStyle}
                    />
                    <button type="button" onClick={addTag} className="px-4 py-2 rounded-lg text-xs font-semibold" style={{ border: "1px solid #334155", color: "#93c5fd" }}>Add</button>
                  </div>
                  {tags.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {tags.map(t => (
                        <span key={t} className="flex items-center gap-1 px-2 py-0.5 rounded-full text-xs" style={{ background: "rgba(148,163,184,0.1)", border: "1px solid #334155", color: "#cbd5e1" }}>
                          <Tag className="w-2.5 h-2.5" />{t}
                          <button type="button" onClick={() => setTags(p => p.filter(x => x !== t))}><X className="w-2.5 h-2.5" /></button>
                        </span>
                      ))}
                    </div>
                  )}
                </div>
                <FormField label="Investigator Notes" span={3}>
                  <textarea rows={3} placeholder="Additional observations, context…" value={form.notes} onChange={setField("notes")} className={inputClass} style={{ ...inputStyle, resize: "vertical" }} />
                </FormField>
                <div className="md:col-span-3">
                  <label className="flex items-center justify-center gap-3 py-4 rounded-lg cursor-pointer" style={{ border: "1px dashed #334155", color: "#94a3b8" }}>
                    <Upload className="w-4 h-4" />
                    <span className="text-xs">Attach files ({ACCEPTED_TYPES[category]})</span>
                    <input type="file" multiple accept={ACCEPTED_TYPES[category]} onChange={handleFileUpload} className="hidden" />
                  </label>
                  {uploadedFiles.length > 0 && (
                    <div className="space-y-1.5 mt-2">
                      {uploadedFiles.map((f, i) => (
                        <div key={i} className="flex items-center justify-between px-3 py-2 rounded-lg" style={{ background: "#111b2e", border: "1px solid #243247" }}>
                          <div className="flex items-center gap-2 min-w-0">
                            {f.type.startsWith("image/") ? <Image className="w-3.5 h-3.5 shrink-0" style={{ color: "#10b981" }} /> : <File className="w-3.5 h-3.5 shrink-0" style={{ color: "#93c5fd" }} />}
                            <span className="text-xs truncate" style={{ color: "#cbd5e1" }}>{f.name}</span>
                          </div>
                          <div className="flex items-center gap-2 shrink-0 ml-2">
                            <span className="text-xs" style={{ color: "#64748b" }}>{formatBytes(f.size)}</span>
                            <button type="button" onClick={() => removeFile(i)}><Trash2 className="w-3.5 h-3.5" style={{ color: "#ef4444" }} /></button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </FormSection>
            </div>

            <div className="flex justify-end gap-3 px-6 py-4 sticky bottom-0 rounded-b-xl" style={{ background: "#0d1626", borderTop: "1px solid #243247" }}>
              <button type="button" onClick={() => { resetEvidenceForm(); setShowEvidenceForm(false); }} disabled={isSaving} className="px-5 py-2.5 rounded-lg text-sm font-semibold" style={{ border: "1px solid #334155", color: "#94a3b8" }}>Cancel</button>
              <button type="submit" disabled={isSaving} className="px-5 py-2.5 rounded-lg text-sm font-bold flex items-center gap-2" style={{ background: isSaving ? "#1e293b" : "#2563eb", color: "#fff" }}>
                {isSaving ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving…</> : <><Save className="w-4 h-4" /> Save to Chain of Custody</>}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ── AI Correlation Modal ── */}
      {showAiModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.7)", backdropFilter: "blur(6px)" }}>
          <div className="w-full max-w-2xl max-h-[85vh] overflow-y-auto rounded-xl p-6" style={{ background: "rgba(10,15,26,0.98)", border: "1px solid rgba(167,139,250,0.3)" }}>
            <div className="flex justify-between items-center mb-2">
              <h2 className="font-bold flex items-center gap-2" style={{ color: "#e2e8f0" }}><Sparkles className="w-4 h-4" style={{ color: "#a78bfa" }} /> AI-Suggested Correlations</h2>
              <button onClick={() => setShowAiModal(false)}><X className="w-5 h-5" style={{ color: "#475569" }} /></button>
            </div>
            <p className="text-xs mb-4" style={{ color: "#64748b" }}>AI suggestions are leads only. Review each against the source evidence before accepting.</p>
            {aiLoading && <div className="flex items-center gap-2 py-8 justify-center text-sm" style={{ color: "#a78bfa" }}><Loader2 className="w-4 h-4 animate-spin" /> Analysing evidence…</div>}
            {aiError && <div className="text-sm p-3 rounded-lg" style={{ background: "rgba(239,68,68,0.1)", color: "#fca5a5" }}>{aiError}</div>}
            {!aiLoading && !aiError && aiSuggestions.length === 0 && <div className="text-sm py-6 text-center" style={{ color: "#64748b" }}>No new correlations found.</div>}
            <div className="space-y-3">
              {aiSuggestions.map((s, i) => (
                <div key={`${s.from}-${s.to}-${i}`} className="p-3 rounded-lg" style={{ background: "rgba(30,41,59,0.5)", border: "1px solid rgba(167,139,250,0.2)" }}>
                  <div className="flex justify-between items-center gap-2 mb-1">
                    <div className="text-sm font-bold" style={{ color: "#e2e8f0" }}>{s.from} <span style={{ color: "#a78bfa" }}>— {s.relationshipType} →</span> {s.to}</div>
                    <span className="text-xs px-2 py-0.5 rounded shrink-0" style={{ background: "rgba(167,139,250,0.12)", color: "#a78bfa" }}>{Math.round(s.confidence * 100)}%</span>
                  </div>
                  <p className="text-xs mb-2" style={{ color: "#94a3b8", fontFamily: "sans-serif" }}>{s.description}</p>
                  <div className="flex gap-2">
                    <button onClick={() => acceptAiSuggestion(s)} className="px-3 py-1 rounded text-xs font-bold" style={{ background: "rgba(16,185,129,0.12)", border: "1px solid rgba(16,185,129,0.4)", color: "#10b981" }}>Accept</button>
                    <button onClick={() => setAiSuggestions(prev => prev.filter(x => x !== s))} className="px-3 py-1 rounded text-xs" style={{ background: "rgba(30,41,59,0.5)", border: "1px solid rgba(71,85,105,0.3)", color: "#64748b" }}>Dismiss</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

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
  background: "#111b2e",
  border: "1px solid #243247",
  color: "#e2e8f0",
};

function FormField({ label, required, span, children }: { label: string; required?: boolean; span?: 2 | 3; children: React.ReactNode }) {
  const spanCls = span === 3 ? "md:col-span-3" : span === 2 ? "md:col-span-2" : "";
  return (
    <div className={spanCls}>
      <label className="block text-xs font-semibold mb-1" style={{ color: "#94a3b8" }}>
        {label.toUpperCase()}{required && <span style={{ color: "#f87171" }}> *</span>}
      </label>
      {children}
    </div>
  );
}

function FormSection({ num, title, children }: { num: number; title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-lg p-5" style={{ background: "#0b1220", border: "1px solid #1e293b" }}>
      <h3 className="flex items-center gap-2.5 text-sm font-bold mb-4" style={{ color: "#e2e8f0" }}>
        <span className="w-6 h-6 rounded-md flex items-center justify-center text-xs" style={{ background: "#1e293b", color: "#93c5fd" }}>{num}</span>
        {title}
      </h3>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">{children}</div>
    </section>
  );
}

function InfoRow({ label, value, mono, wrap }: { label: string; value: string; mono?: boolean; wrap?: boolean }) {
  return (
    <div className="flex gap-1 text-xs">
      <span className="shrink-0" style={{ color: "#475569", minWidth: "78px" }}>{label}:</span>
      <span className={wrap ? "break-words" : "truncate"} title={value} style={{ color: "#94a3b8", fontFamily: mono ? "monospace" : "inherit", fontSize: mono ? "10px" : "inherit" }}>{value}</span>
    </div>
  );
}