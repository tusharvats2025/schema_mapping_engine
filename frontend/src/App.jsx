import { useState, useCallback } from "react";

const API = "http://localhost:5000";

const DOMAINS = [
  { id: "sales",     label: "Sales / CRM",          icon: "◈", color: "#4ade80" },
  { id: "ecommerce", label: "E-commerce / Orders",   icon: "◎", color: "#60a5fa" },
  { id: "finance",   label: "Finance / Invoicing",   icon: "◇", color: "#f59e0b" },
  { id: "logistics", label: "Delivery / Logistics",  icon: "◉", color: "#a78bfa" },
  { id: "hr",        label: "HR / Payroll",          icon: "◐", color: "#f87171" },
];

const CONFIDENCE_STYLES = {
  high:       { bg: "rgba(74,222,128,0.15)", border: "#4ade80", text: "#4ade80",  label: "HIGH" },
  medium:     { bg: "rgba(251,191,36,0.15)", border: "#fbbf24", text: "#fbbf24",  label: "MED"  },
  unresolved: { bg: "rgba(239,68,68,0.12)",  border: "#ef4444", text: "#ef4444",  label: "—"    },
};

const METHOD_COLORS = {
  exact_canonical: "#4ade80",
  exact_alias:     "#60a5fa",
  fuzzy:           "#f59e0b",
  unresolved:      "#ef4444",
};

export default function App() {
  const [domain,   setDomain]   = useState(null);
  const [file,     setFile]     = useState(null);
  const [dragging, setDragging] = useState(false);
  const [loading,  setLoading]  = useState(false);
  const [result,   setResult]   = useState(null);
  const [error,    setError]    = useState(null);
  const [tab,      setTab]      = useState("mapping");

  const onDrop = useCallback((e) => {
    e.preventDefault(); setDragging(false);
    const f = e.dataTransfer?.files[0] || e.target.files[0];
    if (f) { setFile(f); setResult(null); setError(null); }
  }, []);

  const submit = async () => {
    if (!domain || !file) return;
    setLoading(true); setError(null); setResult(null);
    const fd = new FormData();
    fd.append("file", file);
    try {
      const res = await fetch(`${API}/${domain}/map`, { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Request failed");
      setResult(data);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const downloadCSV = () => {
    if (!result?.download?.data) return;
    const blob = new Blob([result.download.data], { type: "text/csv" });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement("a");
    a.href = url; a.download = result.download.filename; a.click();
    URL.revokeObjectURL(url);
  };

  const activeDomain = DOMAINS.find(d => d.id === domain);
  const accentColor  = activeDomain?.color || "#4ade80";

  return (
    <div style={{
      minHeight: "100vh", background: "#080c10",
      fontFamily: "'IBM Plex Mono', 'Courier New', monospace",
      color: "#e2e8f0", padding: "0 0 80px 0"
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@300;400;500;600&family=Space+Grotesk:wght@400;500;600;700&display=swap');
        * { box-sizing: border-box; }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-track { background: #0f1419; }
        ::-webkit-scrollbar-thumb { background: #2d3748; border-radius: 2px; }
        .domain-card { cursor: pointer; transition: all 0.2s; border: 1px solid #1a2230; }
        .domain-card:hover { transform: translateY(-2px); }
        .domain-card.active { transform: translateY(-2px); }
        .upload-zone { transition: all 0.2s; }
        .upload-zone:hover { border-color: #4ade80 !important; }
        .tab-btn { cursor: pointer; transition: all 0.15s; }
        .tab-btn:hover { color: #e2e8f0 !important; }
        .mapping-row { transition: background 0.15s; }
        .mapping-row:hover { background: rgba(255,255,255,0.03) !important; }
        .submit-btn { cursor: pointer; transition: all 0.2s; }
        .submit-btn:hover { transform: translateY(-1px); filter: brightness(1.1); }
        .submit-btn:active { transform: translateY(0); }
        .download-btn { cursor: pointer; transition: all 0.15s; }
        .download-btn:hover { filter: brightness(1.15); }
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.4} }
        @keyframes slideIn { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:translateY(0)} }
        .slide-in { animation: slideIn 0.3s ease forwards; }
      `}</style>

      {/* Header */}
      <div style={{ padding: "40px 48px 32px", borderBottom: "1px solid #0f1e2e" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto" }}>
          <div style={{ display: "flex", alignItems: "baseline", gap: 16, marginBottom: 8 }}>
            <span style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 26, fontWeight: 700, letterSpacing: "-0.5px", color: "#f1f5f9" }}>
              Schema Mapping Engine
            </span>
            <span style={{ fontSize: 11, color: "#4ade80", border: "1px solid #4ade80", borderRadius: 3, padding: "2px 7px", letterSpacing: 1 }}>
              v1.0
            </span>
          </div>
          <p style={{ fontSize: 13, color: "#64748b", margin: 0, letterSpacing: 0.3 }}>
            Upload messy CSV / XLS / XLSX → select domain → get clean, agent-ready schema
          </p>
        </div>
      </div>

      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "32px 48px 0" }}>

        {/* Step 1: Domain Selection */}
        <div style={{ marginBottom: 36 }}>
          <div style={{ fontSize: 11, color: "#4ade80", letterSpacing: 2, marginBottom: 16, fontWeight: 600 }}>
            01 / SELECT DOMAIN
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 10 }}>
            {DOMAINS.map(d => (
              <div key={d.id} className={`domain-card${domain === d.id ? " active" : ""}`}
                onClick={() => { setDomain(d.id); setResult(null); setError(null); }}
                style={{
                  background: domain === d.id ? `rgba(${hexToRgb(d.color)}, 0.08)` : "#0c1117",
                  border: `1px solid ${domain === d.id ? d.color : "#1a2230"}`,
                  borderRadius: 8, padding: "16px 14px", textAlign: "center",
                  boxShadow: domain === d.id ? `0 0 20px rgba(${hexToRgb(d.color)},0.15)` : "none"
                }}>
                <div style={{ fontSize: 22, color: d.color, marginBottom: 8 }}>{d.icon}</div>
                <div style={{ fontSize: 11, fontWeight: 600, color: domain === d.id ? d.color : "#94a3b8", lineHeight: 1.4 }}>
                  {d.label}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Step 2: File Upload */}
        <div style={{ marginBottom: 36 }}>
          <div style={{ fontSize: 11, color: "#4ade80", letterSpacing: 2, marginBottom: 16, fontWeight: 600 }}>
            02 / UPLOAD FILE
          </div>
          <label
            className="upload-zone"
            onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onDrop={onDrop}
            style={{
              display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
              border: `1px dashed ${dragging ? accentColor : file ? "#2d3748" : "#1e2d3d"}`,
              borderRadius: 8, padding: "36px 24px", cursor: "pointer",
              background: dragging ? `rgba(${hexToRgb(accentColor)},0.04)` : "#0c1117",
              transition: "all 0.2s"
            }}>
            <input type="file" accept=".csv,.xls,.xlsx,.xlsm,.tsv" onChange={onDrop} style={{ display: "none" }} />
            <div style={{ fontSize: 28, marginBottom: 12, opacity: 0.6 }}>⊕</div>
            {file ? (
              <div>
                <div style={{ fontSize: 13, color: accentColor, fontWeight: 600 }}>{file.name}</div>
                <div style={{ fontSize: 11, color: "#4a5568", marginTop: 4 }}>
                  {(file.size / 1024).toFixed(1)} KB · click to change
                </div>
              </div>
            ) : (
              <div style={{ textAlign: "center" }}>
                <div style={{ fontSize: 13, color: "#64748b" }}>Drop file here or click to browse</div>
                <div style={{ fontSize: 11, color: "#2d3748", marginTop: 6 }}>CSV · XLS · XLSX · TSV</div>
              </div>
            )}
          </label>
        </div>

        {/* Submit */}
        <div style={{ marginBottom: 40 }}>
          <button
            className="submit-btn"
            onClick={submit}
            disabled={!domain || !file || loading}
            style={{
              background: domain && file && !loading ? accentColor : "#1a2230",
              color: domain && file && !loading ? "#080c10" : "#2d3748",
              border: "none", borderRadius: 6, padding: "13px 36px",
              fontSize: 13, fontWeight: 700, letterSpacing: 1,
              fontFamily: "'IBM Plex Mono', monospace",
              cursor: domain && file && !loading ? "pointer" : "not-allowed",
              transition: "all 0.2s"
            }}>
            {loading ? "MAPPING..." : "RUN MAPPING ENGINE"}
          </button>
          {loading && (
            <span style={{ marginLeft: 16, fontSize: 11, color: "#4ade80", animation: "pulse 1.2s infinite" }}>
              processing schema...
            </span>
          )}
        </div>

        {/* Error */}
        {error && (
          <div style={{ background: "rgba(239,68,68,0.08)", border: "1px solid #ef4444", borderRadius: 6, padding: "12px 16px", marginBottom: 24, fontSize: 13, color: "#ef4444" }}>
            ✕ {error}
          </div>
        )}

        {/* Results */}
        {result && (
          <div className="slide-in">

            {/* Stats Bar */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(6,1fr)", gap: 10, marginBottom: 28 }}>
              {[
                { label: "INPUT COLS",  value: result.stats.total_input },
                { label: "MAPPED",      value: result.stats.mapped,           color: "#4ade80" },
                { label: "FUZZY HIT",   value: result.stats.fuzzy_resolved,   color: "#f59e0b" },
                { label: "UNRESOLVED",  value: result.stats.unresolved,       color: "#ef4444" },
                { label: "COVERAGE",    value: `${result.stats.coverage_pct}%`, color: "#60a5fa" },
                { label: "MISSING REQ", value: result.stats.missing_required.length, color: result.stats.missing_required.length === 0 ? "#4ade80" : "#ef4444" },
              ].map(s => (
                <div key={s.label} style={{ background: "#0c1117", border: "1px solid #1a2230", borderRadius: 6, padding: "14px 12px", textAlign: "center" }}>
                  <div style={{ fontSize: 22, fontWeight: 700, color: s.color || "#e2e8f0", fontFamily: "'Space Grotesk', sans-serif" }}>{s.value}</div>
                  <div style={{ fontSize: 9, color: "#4a5568", letterSpacing: 1.5, marginTop: 4 }}>{s.label}</div>
                </div>
              ))}
            </div>

            {/* With vs Without */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 28 }}>
              <div style={{ background: "rgba(239,68,68,0.05)", border: "1px solid rgba(239,68,68,0.2)", borderRadius: 6, padding: "16px 20px" }}>
                <div style={{ fontSize: 10, color: "#ef4444", letterSpacing: 2, marginBottom: 10, fontWeight: 600 }}>WITHOUT LAYER</div>
                <div style={{ fontSize: 12, color: "#94a3b8" }}>
                  Agent fails for <span style={{ color: "#ef4444", fontWeight: 700 }}>{result.stats.without_layer_fail}</span> / {result.stats.total_input} required fields
                </div>
                <div style={{ fontSize: 11, color: "#4a5568", marginTop: 6 }}>KeyErrors, silent mismatches, wrong outputs</div>
              </div>
              <div style={{ background: "rgba(74,222,128,0.05)", border: "1px solid rgba(74,222,128,0.2)", borderRadius: 6, padding: "16px 20px" }}>
                <div style={{ fontSize: 10, color: "#4ade80", letterSpacing: 2, marginBottom: 10, fontWeight: 600 }}>WITH LAYER</div>
                <div style={{ fontSize: 12, color: "#94a3b8" }}>
                  Agent fails for <span style={{ color: result.stats.with_layer_fail === 0 ? "#4ade80" : "#ef4444", fontWeight: 700 }}>{result.stats.with_layer_fail}</span> / {result.stats.total_input} required fields
                </div>
                <div style={{ fontSize: 11, color: "#4a5568", marginTop: 6 }}>Clean schema, typed columns, zero silent failures</div>
              </div>
            </div>

            {/* Tabs */}
            <div style={{ display: "flex", gap: 0, marginBottom: 0, borderBottom: "1px solid #1a2230" }}>
              {[
                { id: "mapping", label: "COLUMN MAPPING" },
                { id: "preview", label: "DATA PREVIEW" },
              ].map(t => (
                <div key={t.id} className="tab-btn" onClick={() => setTab(t.id)}
                  style={{
                    padding: "10px 20px", fontSize: 11, letterSpacing: 1.5, fontWeight: 600,
                    color: tab === t.id ? accentColor : "#4a5568",
                    borderBottom: tab === t.id ? `2px solid ${accentColor}` : "2px solid transparent",
                    marginBottom: -1
                  }}>
                  {t.label}
                </div>
              ))}
            </div>

            {/* Mapping Table */}
            {tab === "mapping" && (
              <div style={{ background: "#0a0e14", border: "1px solid #1a2230", borderTop: "none", borderRadius: "0 0 8px 8px", overflow: "hidden" }}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 120px 100px", padding: "10px 20px", fontSize: 10, color: "#4a5568", letterSpacing: 1.5, borderBottom: "1px solid #1a2230", fontWeight: 600 }}>
                  <span>INPUT COLUMN</span><span>→ MAPPED TO</span><span>METHOD</span><span style={{ textAlign: "right" }}>CONFIDENCE</span>
                </div>
                {result.mapping.map((row, i) => {
                  const cs = CONFIDENCE_STYLES[row.confidence_label] || CONFIDENCE_STYLES.unresolved;
                  return (
                    <div key={i} className="mapping-row" style={{
                      display: "grid", gridTemplateColumns: "1fr 1fr 120px 100px",
                      padding: "11px 20px", fontSize: 12,
                      background: i % 2 === 0 ? "transparent" : "rgba(255,255,255,0.01)",
                      borderBottom: "1px solid #0f1419", alignItems: "center"
                    }}>
                      <span style={{ color: "#94a3b8", fontFamily: "'IBM Plex Mono', monospace" }}>{row.input}</span>
                      <span style={{ color: row.mapped ? accentColor : "#374151", fontFamily: "'IBM Plex Mono', monospace" }}>
                        {row.mapped || "— unresolved"}
                      </span>
                      <span style={{ fontSize: 10, color: METHOD_COLORS[row.method] || "#4a5568" }}>
                        {row.method.replace(/_/g, " ")}
                      </span>
                      <div style={{ textAlign: "right" }}>
                        <span style={{
                          fontSize: 10, fontWeight: 700, padding: "3px 8px", borderRadius: 3,
                          background: cs.bg, border: `1px solid ${cs.border}`, color: cs.text
                        }}>
                          {row.method !== "unresolved" ? `${row.confidence}` : "—"}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Preview Table */}
            {tab === "preview" && result.preview.length > 0 && (
              <div style={{ background: "#0a0e14", border: "1px solid #1a2230", borderTop: "none", borderRadius: "0 0 8px 8px", overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11 }}>
                  <thead>
                    <tr style={{ borderBottom: "1px solid #1a2230" }}>
                      {Object.keys(result.preview[0]).map(k => (
                        <th key={k} style={{ padding: "10px 16px", textAlign: "left", fontSize: 10, color: "#4a5568", letterSpacing: 1.5, fontWeight: 600, whiteSpace: "nowrap" }}>
                          {k.toUpperCase()}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {result.preview.map((row, i) => (
                      <tr key={i} style={{ borderBottom: "1px solid #0f1419" }}>
                        {Object.values(row).map((v, j) => (
                          <td key={j} style={{ padding: "9px 16px", color: "#94a3b8", fontFamily: "'IBM Plex Mono', monospace", whiteSpace: "nowrap" }}>
                            {String(v ?? "—")}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Download */}
            <div style={{ marginTop: 24, display: "flex", alignItems: "center", gap: 16 }}>
              <button className="download-btn" onClick={downloadCSV}
                style={{
                  background: "#0c1117", border: `1px solid ${accentColor}`,
                  color: accentColor, borderRadius: 6, padding: "10px 24px",
                  fontSize: 12, fontWeight: 600, letterSpacing: 1,
                  fontFamily: "'IBM Plex Mono', monospace", cursor: "pointer"
                }}>
                ↓ DOWNLOAD MAPPED FILE
              </button>
              <span style={{ fontSize: 11, color: "#4a5568" }}>
                {result.download.filename} · output matches input format
              </span>
            </div>

          </div>
        )}
      </div>
    </div>
  );
}

function hexToRgb(hex) {
  const r = parseInt(hex.slice(1,3),16);
  const g = parseInt(hex.slice(3,5),16);
  const b = parseInt(hex.slice(5,7),16);
  return `${r},${g},${b}`;
}