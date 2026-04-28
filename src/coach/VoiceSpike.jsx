// ═══ VOICE-MODE PROTOTYPE — SPIKE PAGE ═══
// Admin-only test surface for the voice-driven assessment flow.
// Goal: verify (1) Web Speech accuracy on Mac/Chrome, (2) Claude parsing accuracy,
// (3) latency + cost per utterance. No real saves.
import React, { useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { B, F, sCard } from "../data/theme";
import { BAT_ITEMS, IQ_ITEMS, MN_ITEMS, BAT_ARCH, BWL_ARCH } from "../data/skillItems";
import { supabase } from "../supabaseClient";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;

// Sample field schema for the spike — covers all 4 input types we'd voice-control.
// Production version (phase 2) will derive this dynamically from the player's role.
const SPIKE_FIELDS = [
  // Ratings — primary technical (batter items)
  ...BAT_ITEMS.map((label, i) => ({ key: `t1_${i}`, label: `Tech primary ${i + 1}: ${label}`, type: "rating" })),
  // Ratings — Game IQ
  ...IQ_ITEMS.map((label, i) => ({ key: `iq_${i}`, label: `Game IQ ${i + 1}: ${label}`, type: "rating" })),
  // Ratings — Mental
  ...MN_ITEMS.map((label, i) => ({ key: `mn_${i}`, label: `Mental ${i + 1}: ${label}`, type: "rating" })),
  // Ratings — Phase
  { key: "pb_pp", label: "Power-play batting effectiveness", type: "rating" },
  { key: "pb_mid", label: "Middle-overs batting effectiveness", type: "rating" },
  { key: "pb_death", label: "Death-overs batting effectiveness", type: "rating" },
  // Text fields
  { key: "narrative", label: "Narrative", type: "text" },
  { key: "str1", label: "Strength 1", type: "text" },
  { key: "str2", label: "Strength 2", type: "text" },
  { key: "str3", label: "Strength 3", type: "text" },
  { key: "pri1", label: "Priority 1", type: "text" },
  { key: "pri2", label: "Priority 2", type: "text" },
  { key: "pri3", label: "Priority 3", type: "text" },
  { key: "pl_explore", label: "12-week plan: Explore (weeks 1-4)", type: "text" },
  { key: "pl_challenge", label: "12-week plan: Challenge (weeks 5-8)", type: "text" },
  { key: "pl_execute", label: "12-week plan: Execute (weeks 9-12)", type: "text" },
  { key: "sqRec", label: "Squad recommendation", type: "text" },
  // Choice fields
  { key: "batA", label: "Batting archetype", type: "choice", choices: BAT_ARCH.map(a => a.nm) },
  { key: "bwlA", label: "Bowling archetype", type: "choice", choices: BWL_ARCH.map(a => a.nm) },
];

// Rough cost estimate using Sonnet 4.5 published pricing (2025-09):
//   $3 / M input, $15 / M output, $0.30 / M cached input.
function estimateCostUsd(d) {
  if (!d) return 0;
  const inToks = (d.input_tokens || 0) - (d.cache_read_input_tokens || 0);
  const cachedToks = d.cache_read_input_tokens || 0;
  const cacheCreateToks = d.cache_creation_input_tokens || 0;
  const outToks = d.output_tokens || 0;
  return (inToks * 3 + cachedToks * 0.3 + cacheCreateToks * 3.75 + outToks * 15) / 1_000_000;
}

function getSpeechRecognition() {
  if (typeof window === "undefined") return null;
  return window.SpeechRecognition || window.webkitSpeechRecognition || null;
}

export default function VoiceSpike({ onClose }) {
  const { isAdmin, session } = useAuth();
  const [supported, setSupported] = useState(true);
  const [listening, setListening] = useState(false);
  const [interim, setInterim] = useState("");
  const [finalTranscript, setFinalTranscript] = useState("");
  const [parsing, setParsing] = useState(false);
  const [draft, setDraft] = useState({});
  const [history, setHistory] = useState([]); // [{ transcript, parsed, diagnostics, ts, error }]
  const [error, setError] = useState("");
  const recognitionRef = useRef(null);

  const SR = useMemo(() => getSpeechRecognition(), []);

  useEffect(() => {
    if (!SR) {
      setSupported(false);
      return;
    }
    const r = new SR();
    r.continuous = true;
    r.interimResults = true;
    r.lang = "en-AU";
    r.onresult = (event) => {
      let interimText = "";
      let finalText = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const t = event.results[i][0].transcript;
        if (event.results[i].isFinal) finalText += t;
        else interimText += t;
      }
      setInterim(interimText);
      if (finalText) setFinalTranscript(prev => (prev ? prev + " " : "") + finalText.trim());
    };
    r.onerror = (e) => {
      setError(`Mic error: ${e.error}`);
      setListening(false);
    };
    r.onend = () => {
      setListening(false);
    };
    recognitionRef.current = r;
    return () => {
      try { r.stop(); } catch { /* ignore */ }
    };
  }, [SR]);

  if (!isAdmin) {
    return (
      <div style={{ padding: 24, fontFamily: F, color: B.g600 }}>
        Admin access required.
        <div style={{ marginTop: 12 }}>
          <button onClick={onClose} style={{ padding: "8px 14px", borderRadius: 8, border: `1px solid ${B.g200}`, background: B.w, fontFamily: F, cursor: "pointer" }}>← Back</button>
        </div>
      </div>
    );
  }

  const startListening = () => {
    setError("");
    setInterim("");
    if (!recognitionRef.current) return;
    try {
      recognitionRef.current.start();
      setListening(true);
    } catch (e) {
      setError(e.message);
    }
  };

  const stopListening = () => {
    try { recognitionRef.current?.stop(); } catch { /* ignore */ }
    setListening(false);
  };

  const clearTranscript = () => {
    setFinalTranscript("");
    setInterim("");
    setError("");
  };

  const sendToParser = async () => {
    const text = (finalTranscript + " " + interim).trim();
    if (!text) return;
    setParsing(true);
    setError("");
    try {
      const { data: sess } = await supabase.auth.getSession();
      const token = sess?.session?.access_token;
      const res = await fetch(`${SUPABASE_URL}/functions/v1/voice-parse-spike`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          apikey: import.meta.env.VITE_SUPABASE_ANON_KEY,
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          transcript: text,
          fields: SPIKE_FIELDS,
          current_draft: draft,
        }),
      });
      const data = await res.json();
      const entry = { transcript: text, parsed: data.parsed, diagnostics: data.diagnostics, error: data.error, ts: new Date().toISOString() };
      setHistory(h => [entry, ...h].slice(0, 20));
      if (data.parsed) {
        const updates = {};
        (data.parsed.ratings || []).forEach(r => { updates[r.field_key] = r.value; });
        (data.parsed.text_updates || []).forEach(t => { updates[t.field_key] = t.value; });
        if (Object.keys(updates).length) setDraft(d => ({ ...d, ...updates }));
        if (data.parsed.intent === "undo_last" && history.length) {
          // Crude undo: drop the latest staged keys from draft
          const last = history[0]?.parsed;
          if (last) {
            setDraft(d => {
              const next = { ...d };
              (last.ratings || []).forEach(r => delete next[r.field_key]);
              (last.text_updates || []).forEach(t => delete next[t.field_key]);
              return next;
            });
          }
        }
      } else if (data.error) {
        setError(data.error);
      }
      clearTranscript();
    } catch (e) {
      setError(e.message);
    } finally {
      setParsing(false);
    }
  };

  const totalCost = history.reduce((s, h) => s + estimateCostUsd(h.diagnostics), 0);
  const lastDiag = history[0]?.diagnostics;

  return (
    <div style={{ minHeight: "100vh", background: B.g50, fontFamily: F, padding: 16 }}>
      <div style={{ maxWidth: 720, margin: "0 auto" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
          <h1 style={{ fontSize: 18, fontWeight: 800, color: B.nvD, margin: 0 }}>
            Voice spike <span style={{ fontSize: 10, fontWeight: 700, color: B.amb, textTransform: "uppercase", letterSpacing: 1 }}>Admin · Prototype</span>
          </h1>
          <button onClick={onClose} style={{ padding: "8px 14px", borderRadius: 8, border: `1px solid ${B.g200}`, background: B.w, fontFamily: F, cursor: "pointer", fontSize: 12 }}>← Exit</button>
        </div>

        {!supported && (
          <div style={{ ...sCard, background: "#fee2e2", borderColor: "#fca5a5", color: "#991b1b", fontSize: 13 }}>
            ⚠ Web Speech API not available in this browser. Use Chrome on Mac for the spike.
          </div>
        )}

        {/* Mic + transcript */}
        <div style={{ ...sCard }}>
          <div style={{ display: "flex", gap: 12, alignItems: "center", marginBottom: 12 }}>
            <button
              onClick={listening ? stopListening : startListening}
              disabled={!supported || parsing}
              style={{
                width: 64, height: 64, borderRadius: "50%", border: "none",
                background: listening ? `linear-gradient(135deg,${B.red},#b91c1c)` : `linear-gradient(135deg,${B.bl},${B.pk})`,
                color: B.w, cursor: supported && !parsing ? "pointer" : "not-allowed",
                display: "flex", alignItems: "center", justifyContent: "center",
                boxShadow: listening ? "0 0 0 6px rgba(239,68,68,0.2)" : "0 4px 12px rgba(0,0,0,0.15)",
                transition: "all 0.2s",
                fontSize: 28,
              }}
              aria-label={listening ? "Stop listening" : "Start listening"}
            >
              {listening ? "■" : "🎙"}
            </button>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: B.nvD }}>
                {listening ? "Listening..." : "Tap to talk"}
              </div>
              <div style={{ fontSize: 11, color: B.g600, marginTop: 4, lineHeight: 1.5 }}>
                Try: <em>"Tech primary one, four. Tech primary two, five. Game IQ three, four. Power-play batting, five."</em>
              </div>
            </div>
          </div>

          <div style={{ background: B.g100, borderRadius: 8, padding: "10px 14px", minHeight: 60, fontSize: 13, color: B.nvD, lineHeight: 1.5 }}>
            {finalTranscript && <span>{finalTranscript} </span>}
            {interim && <span style={{ color: B.g400, fontStyle: "italic" }}>{interim}</span>}
            {!finalTranscript && !interim && <span style={{ color: B.g400 }}>Transcript will appear here…</span>}
          </div>

          <div style={{ display: "flex", gap: 8, marginTop: 10, justifyContent: "flex-end" }}>
            <button onClick={clearTranscript} disabled={parsing || (!finalTranscript && !interim)}
              style={{ padding: "8px 14px", borderRadius: 8, border: `1px solid ${B.g200}`, background: B.w, fontFamily: F, fontSize: 12, cursor: parsing ? "not-allowed" : "pointer" }}>
              Clear
            </button>
            <button onClick={sendToParser} disabled={parsing || (!finalTranscript && !interim)}
              style={{ padding: "8px 18px", borderRadius: 8, border: "none", background: `linear-gradient(135deg,${B.bl},${B.pk})`, color: B.w, fontFamily: F, fontSize: 12, fontWeight: 700, cursor: parsing ? "wait" : "pointer", opacity: parsing ? 0.7 : 1 }}>
              {parsing ? "Parsing..." : "Send to Claude →"}
            </button>
          </div>
        </div>

        {error && (
          <div style={{ ...sCard, background: "#fee2e2", borderColor: "#fca5a5", color: "#991b1b", fontSize: 12 }}>
            ⚠ {error}
          </div>
        )}

        {/* Telemetry */}
        <div style={{ ...sCard }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: B.g600, textTransform: "uppercase", letterSpacing: 1, marginBottom: 8 }}>
            Telemetry
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 10, fontSize: 12 }}>
            <Stat label="Calls this session" value={history.length} />
            <Stat label="Estimated cost" value={`$${totalCost.toFixed(4)}`} />
            <Stat label="Last latency" value={lastDiag ? `${lastDiag.latency_ms} ms` : "—"} />
            <Stat label="Last tokens (in/out)" value={lastDiag ? `${lastDiag.input_tokens || 0} / ${lastDiag.output_tokens || 0}` : "—"} />
            <Stat label="Last cache read" value={lastDiag?.cache_read_input_tokens ? `${lastDiag.cache_read_input_tokens} tokens` : "—"} />
            <Stat label="Model" value={lastDiag?.model || "—"} />
          </div>
        </div>

        {/* Draft buffer */}
        <div style={{ ...sCard }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: B.g600, textTransform: "uppercase", letterSpacing: 1, marginBottom: 8, display: "flex", justifyContent: "space-between" }}>
            <span>Draft buffer ({Object.keys(draft).length} fields staged)</span>
            <button onClick={() => setDraft({})} style={{ background: "none", border: "none", color: B.bl, fontFamily: F, fontSize: 10, cursor: "pointer", textDecoration: "underline" }}>Clear all</button>
          </div>
          {Object.keys(draft).length === 0 ? (
            <div style={{ fontSize: 12, color: B.g400, fontStyle: "italic" }}>Nothing staged yet.</div>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 80px", gap: 6, fontSize: 12 }}>
              {Object.entries(draft).map(([k, v]) => {
                const f = SPIKE_FIELDS.find(x => x.key === k);
                return (
                  <React.Fragment key={k}>
                    <div style={{ color: B.nvD, fontWeight: 600 }}>{f?.label || k}</div>
                    <div style={{ color: B.bl, fontWeight: 700, textAlign: "right", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                      {typeof v === "string" && v.length > 30 ? `"${v.slice(0, 30)}…"` : (typeof v === "string" ? `"${v}"` : v)}
                    </div>
                  </React.Fragment>
                );
              })}
            </div>
          )}
        </div>

        {/* History */}
        <div style={{ ...sCard, marginBottom: 24 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: B.g600, textTransform: "uppercase", letterSpacing: 1, marginBottom: 8 }}>
            Utterance history (last 20)
          </div>
          {history.length === 0 ? (
            <div style={{ fontSize: 12, color: B.g400, fontStyle: "italic" }}>None yet.</div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {history.map((h, i) => (
                <div key={i} style={{ background: B.g100, borderRadius: 6, padding: "8px 12px", fontSize: 11, fontFamily: "monospace", color: B.nvD }}>
                  <div style={{ color: B.g600, marginBottom: 4 }}>"{h.transcript}"</div>
                  {h.error ? (
                    <div style={{ color: B.red }}>error: {h.error}</div>
                  ) : (
                    <pre style={{ margin: 0, whiteSpace: "pre-wrap", wordBreak: "break-word" }}>{JSON.stringify(h.parsed, null, 2)}</pre>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value }) {
  return (
    <div>
      <div style={{ fontSize: 9, color: B.g400, textTransform: "uppercase", letterSpacing: 0.5 }}>{label}</div>
      <div style={{ fontSize: 14, fontWeight: 700, color: B.nvD, fontFamily: F, marginTop: 2 }}>{value}</div>
    </div>
  );
}
