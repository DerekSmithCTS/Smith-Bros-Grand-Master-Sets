import React, { useEffect, useMemo, useState } from "react";
import { createClient } from "@supabase/supabase-js";

// ===============================================
//  Mew & Rayquaza — Grand Master Set (Simple Build)
//  Zero UI libs. Just React + Supabase. Easy to deploy.
//  Features: shared collections, checklist, prices, search,
//  import/export, real-time sync.
// ===============================================

const SQL_SCHEMA_NOTE = `Open /supabase/schema.sql in this repo and run it in Supabase → SQL editor`;

const styles = {
  page: { fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, Arial", background: "#f6f8fb", minHeight: "100vh", color: "#0f172a" },
  container: { maxWidth: 1100, margin: "0 auto", padding: "24px" },
  h1: { fontSize: 24, fontWeight: 800, margin: "0 0 12px" },
  bar: { display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center", margin: "6px 0 16px" },
  card: { background: "white", padding: 16, borderRadius: 12, boxShadow: "0 1px 2px rgba(0,0,0,0.06)", border: "1px solid #e2e8f0" },
  label: { fontSize: 12, color: "#475569", display: "block", marginBottom: 6 },
  input: { border: "1px solid #cbd5e1", borderRadius: 8, padding: "8px 10px", minWidth: 220 },
  select: { border: "1px solid #cbd5e1", borderRadius: 8, padding: "8px 10px" },
  button: { background: "#111827", color: "white", border: 0, borderRadius: 8, padding: "9px 12px", cursor: "pointer" },
  secondary: { background: "#e2e8f0", color: "#111827" },
  tableWrap: { overflow: "auto", borderRadius: 12, border: "1px solid #e2e8f0", background: "white" },
  table: { width: "100%", borderCollapse: "collapse", minWidth: 900 },
  th: { textAlign: "left", fontSize: 12, color: "#475569", background: "#f8fafc", padding: 8, borderBottom: "1px solid #e2e8f0" },
  td: { padding: 8, borderBottom: "1px solid #f1f5f9" },
  small: { fontSize: 12, color: "#64748b" },
};

function Input(props) { return <input {...props} style={{ ...styles.input, ...(props.style||{}) }} /> }
function Select(props) { return <select {...props} style={{ ...styles.select, ...(props.style||{}) }} /> }
function Button({ variant = "primary", ...props }) {
  const base = { ...styles.button, ...(variant === "secondary" ? styles.secondary : {}) };
  return <button {...props} style={{ ...base, ...(props.style||{}) }} />;
}

function randomId(len = 8) { return Math.random().toString(36).slice(2, 2+len); }

export default function App() {
  // Supabase creds (prefer .env, fallback to localStorage)
  const envUrl = import.meta.env.VITE_SUPABASE_URL;
  const envAnon = import.meta.env.VITE_SUPABASE_ANON_KEY;

  const [url, setUrl] = useState(envUrl || localStorage.getItem("gms_url") || "");
  const [anon, setAnon] = useState(envAnon || localStorage.getItem("gms_anon") || "");
  const [client, setClient] = useState(null);
  const [showSettings, setShowSettings] = useState(!url || !anon);

  useEffect(() => { localStorage.setItem("gms_url", url); }, [url]);
  useEffect(() => { localStorage.setItem("gms_anon", anon); }, [anon]);
  useEffect(() => { 
    if (url && anon) setClient(createClient(url, anon));
    else setClient(null);
  }, [url, anon]);

  // Collection state
  const initialId = new URLSearchParams(location.search).get("c") || localStorage.getItem("gms_collection") || "";
  const [collectionId, setCollectionId] = useState(initialId);
  const [collectionName, setCollectionName] = useState("");
  useEffect(() => { if (collectionId) localStorage.setItem("gms_collection", collectionId); }, [collectionId]);

  // Items
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [q, setQ] = useState("");
  const [showOwned, setShowOwned] = useState("all");
  const [showMew, setShowMew] = useState(true);
  const [showRay, setShowRay] = useState(true);

  useEffect(() => {
    if (!client || !collectionId) return;
    let active = true;
    (async () => {
      setLoading(true);
      const { data: coll } = await client.from("collections").select("*").eq("id", collectionId).maybeSingle();
      if (coll && active) setCollectionName(coll.name || collectionId);
      const { data: it } = await client.from("items").select("*").eq("collection_id", collectionId).order("created_at", { ascending: true });
      if (active) setItems(it || []);
      setLoading(false);
    })();

    const sub = client.channel(`items_${collectionId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'items', filter: `collection_id=eq.${collectionId}` }, (payload) => {
        setItems((prev) => {
          if (payload.eventType === 'INSERT') return [...prev, payload.new];
          if (payload.eventType === 'UPDATE') return prev.map((x) => x.id === payload.new.id ? payload.new : x);
          if (payload.eventType === 'DELETE') return prev.filter((x) => x.id !== payload.old.id);
          return prev;
        });
      })
      .subscribe();

    return () => { client.removeChannel(sub); };
  }, [client, collectionId]);

  // Filtered + totals
  const filtered = useMemo(() => {
    return items.filter((it) => {
      const matchesQ = !q || [it.name, it.code, it.category].some(v => (v||"").toLowerCase().includes(q.toLowerCase()));
      const matchesPkm = (showMew && it.pokemon === 'Mew') || (showRay && it.pokemon === 'Rayquaza');
      const matchesOwned = showOwned === 'all' || (showOwned === 'yes' ? it.owned : !it.owned);
      return matchesQ && matchesPkm && matchesOwned;
    });
  }, [items, q, showMew, showRay, showOwned]);

  const totals = useMemo(() => {
    const sum = (arr, fn) => arr.reduce((a,b)=>a + (Number(fn(b))||0), 0);
    const invested = sum(filtered, (x)=> (x.purchase_price||0) * (x.qty||1));
    const market = sum(filtered, (x)=> (x.market_price||0) * (x.qty||1));
    const countOwned = sum(filtered, (x)=> x.owned ? (x.qty||1) : 0);
    const countAll = sum(filtered, (x)=> x.qty||1);
    return { invested, market, countOwned, countAll, pl: market - invested };
  }, [filtered]);

  // Mutations
  async function ensureCollection() {
    if (!client) return alert("Add your Supabase URL + anon key in Settings first.");
    const id = Math.random().toString(36).slice(2, 8);
    const name = prompt("Name this collection:", "Mew & Rayquaza — Grand Master Set") || "Mew & Rayquaza — Grand Master Set";
    const { error } = await client.from("collections").upsert({ id, name });
    if (error) return alert("Failed: " + error.message);
    setCollectionId(id);
    const u = new URL(location.href); u.searchParams.set("c", id); history.replaceState({}, "", u);
    setCollectionName(name);
    navigator.clipboard?.writeText(u.toString());
    alert("Collection link copied. Send it to Matt.");
  }

  async function addItem() {
    if (!client || !collectionId) return alert("Open a collection first.");
    const rec = {
      id: crypto.randomUUID(),
      collection_id: collectionId,
      pokemon: "Rayquaza",
      category: "Singles",
      name: "",
      code: "",
      owned: false,
      purchase_price: null,
      market_price: null,
      qty: 1,
      notes: "",
    };
    const { error } = await client.from("items").insert(rec);
    if (error) alert("Add failed: " + error.message);
  }

  async function updateItem(id, patch) {
    if (!client) return;
    const { error } = await client.from("items").update(patch).eq("id", id);
    if (error) alert("Save failed: " + error.message);
  }

  async function deleteItem(id) {
    if (!client) return;
    if (!confirm("Delete this item?")) return;
    const { error } = await client.from("items").delete().eq("id", id);
    if (error) alert("Delete failed: " + error.message);
  }

  // Import & Export
  const [importText, setImportText] = useState("");
  const [importPokemon, setImportPokemon] = useState("Rayquaza");
  const [importCategory, setImportCategory] = useState("Singles");

  async function runImport() {
    if (!client || !collectionId) return alert("Open a collection first.");
    const lines = importText.split(/\r?\n/).map(l=>l.trim()).filter(Boolean);
    if (!lines.length) return;
    const rows = lines.map((line) => {
      const parts = line.split("|").map(p=>p.trim());
      const [name, code, marketMaybe, catMaybe] = parts;
      const market = marketMaybe && !isNaN(Number(marketMaybe)) ? Number(marketMaybe) : null;
      const pokemon = /mew/i.test(line) ? "Mew" : /rayquaza|ray/i.test(line) ? "Rayquaza" : importPokemon;
      return {
        id: crypto.randomUUID(),
        collection_id: collectionId,
        pokemon,
        category: catMaybe || importCategory,
        name: name || "",
        code: code || "",
        owned: false,
        purchase_price: null,
        market_price: market,
        qty: 1,
        notes: "",
      };
    });
    const { error } = await client.from("items").insert(rows);
    if (error) alert("Import failed: " + error.message);
    else setImportText("");
  }

  function exportJSON() {
    const blob = new Blob([JSON.stringify({ collectionId, collectionName, items }, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob); const a = document.createElement("a");
    a.href = url; a.download = `grand-master-${collectionId||'local'}.json`; a.click(); URL.revokeObjectURL(url);
  }

  return (
    <div style={styles.page}>
      <div style={styles.container}>
        <h1 style={styles.h1}>Mew & Rayquaza — Grand Master Set</h1>

        {/* Top bar */}
        <div style={styles.bar}>
          <Button onClick={() => setShowSettings(s=>!s)} variant="secondary">Settings</Button>
          <Button onClick={ensureCollection}>New Collection</Button>
          <div>
            <span style={styles.small}>Or join by code:</span><br/>
            <Input value={collectionId} onChange={(e)=>setCollectionId(e.target.value)} placeholder="e.g. abc123" />
          </div>
          <div style={{flex:1}}/>
          <div>
            <span style={styles.small}>Search</span><br/>
            <Input value={q} onChange={(e)=>setQ(e.target.value)} placeholder="name, code, category" />
          </div>
          <div>
            <span style={styles.small}>Filters</span><br/>
            <Select value={showOwned} onChange={(e)=>setShowOwned(e.target.value)}>
              <option value="all">All</option>
              <option value="yes">Owned</option>
              <option value="no">Missing</option>
            </Select>
            {' '}<label><input type="checkbox" checked={showRay} onChange={(e)=>setShowRay(e.target.checked)} /> Rayquaza</label>
            {' '}<label><input type="checkbox" checked={showMew} onChange={(e)=>setShowMew(e.target.checked)} /> Mew</label>
          </div>
          <Button onClick={exportJSON} variant="secondary">Export JSON</Button>
        </div>

        {/* Settings card */}
        {showSettings && (
          <div style={styles.card}>
            <div style={{ display: "grid", gap: 12, gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))" }}>
              <div>
                <label style={styles.label}>Supabase URL</label>
                <Input placeholder="https://YOUR-PROJECT.supabase.co" value={url} onChange={(e)=>setUrl(e.target.value)} />
              </div>
              <div>
                <label style={styles.label}>Supabase anon key</label>
                <Input placeholder="eyJhbGci..." value={anon} onChange={(e)=>setAnon(e.target.value)} />
              </div>
              <div style={{ gridColumn: "1/-1" }}>
                <label style={styles.label}>Run this schema in Supabase → SQL (see supabase/schema.sql)</label>
                <textarea readOnly rows={6} value={SQL_SCHEMA_NOTE} style={{ width: "100%", fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace", fontSize: 12, border: "1px solid #cbd5e1", borderRadius: 8, padding: 10 }} />
              </div>
            </div>
          </div>
        )}

        {/* Summary */}
        <div style={{ ...styles.card, display: "flex", gap: 16, alignItems: "center", flexWrap: "wrap" }}>
          <strong>{collectionName || "No collection selected"}</strong>
          <div style={{flex:1}}/>
          <div style={styles.small}><b>{totals.countOwned}</b>/<b>{totals.countAll}</b> owned</div>
          <div style={styles.small}>Invested: <b>${totals.invested.toFixed(2)}</b></div>
          <div style={styles.small}>Market: <b>${totals.market.toFixed(2)}</b></div>
          <div style={styles.small}>P/L: <b style={{color: totals.pl>=0?"#16a34a":"#dc2626"}}>${totals.pl.toFixed(2)}</b></div>
        </div>

        {/* Toolbar */}
        <div style={styles.bar}>
          <Button onClick={addItem}>Add Item</Button>
          <div style={{ ...styles.card, flex: 1 }}>
            <div style={{ marginBottom: 6, ...styles.small }}>Import (one per line): Name | Code | Market(optional) | Category(optional)</div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 6 }}>
              <div>
                <span style={styles.small}>Default Pokémon</span><br/>
                <Select value={importPokemon} onChange={(e)=>setImportPokemon(e.target.value)}>
                  <option>Rayquaza</option>
                  <option>Mew</option>
                </Select>
              </div>
              <div>
                <span style={styles.small}>Default Category</span><br/>
                <Input value={importCategory} onChange={(e)=>setImportCategory(e.target.value)} placeholder="Singles / Sealed / Promo / Deck…" />
              </div>
              <div style={{ alignSelf: "end" }}>
                <Button onClick={runImport}>Import Now</Button>
              </div>
            </div>
            <textarea rows={6} placeholder={`Example:\nRayquaza VMAX (Alt Art) | SWSH07-218/203 | 666.20 | Singles\nMew ex (SAR) | SV2a-205/165 | 695.54 | Singles`} value={importText} onChange={(e)=>setImportText(e.target.value)} style={{ width: "100%", fontFamily: "ui-monospace, Menlo, monospace", border: "1px solid #cbd5e1", borderRadius: 8, padding: 10 }} />
          </div>
        </div>

        {/* Table */}
        <div style={styles.tableWrap}>
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>Owned</th>
                <th style={styles.th}>Pokémon</th>
                <th style={styles.th}>Category</th>
                <th style={styles.th}>Name</th>
                <th style={styles.th}>Code</th>
                <th style={{...styles.th, textAlign:'right'}}>Qty</th>
                <th style={{...styles.th, textAlign:'right'}}>Buy $</th>
                <th style={{...styles.th, textAlign:'right'}}>Market $</th>
                <th style={{...styles.th, textAlign:'right'}}>Value $</th>
                <th style={{...styles.th, textAlign:'right'}}>Δ $</th>
                <th style={styles.th}></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((it) => (
                <tr key={it.id}>
                  <td style={styles.td}><input type="checkbox" checked={it.owned||false} onChange={(e)=>updateItem(it.id,{owned:e.target.checked})} /></td>
                  <td style={styles.td}>
                    <Select value={it.pokemon} onChange={(e)=>updateItem(it.id,{pokemon:e.target.value})}>
                      <option>Rayquaza</option>
                      <option>Mew</option>
                    </Select>
                  </td>
                  <td style={styles.td}><Input value={it.category||""} onChange={(e)=>updateItem(it.id,{category:e.target.value})} /></td>
                  <td style={styles.td}><Input style={{minWidth: 280}} value={it.name||""} onChange={(e)=>updateItem(it.id,{name:e.target.value})} /></td>
                  <td style={styles.td}><Input style={{minWidth: 160}} value={it.code||""} onChange={(e)=>updateItem(it.id,{code:e.target.value})} /></td>
                  <td style={{...styles.td, textAlign:'right'}}><Input type="number" min={1} value={it.qty||1} onChange={(e)=>updateItem(it.id,{qty: Number(e.target.value)||1})} style={{textAlign:'right', width:80}} /></td>
                  <td style={{...styles.td, textAlign:'right'}}><Input type="number" step="0.01" value={it.purchase_price??""} onChange={(e)=>updateItem(it.id,{purchase_price: e.target.value===""?null:Number(e.target.value)})} style={{textAlign:'right', width:120}} /></td>
                  <td style={{...styles.td, textAlign:'right'}}><Input type="number" step="0.01" value={it.market_price??""} onChange={(e)=>updateItem(it.id,{market_price: e.target.value===""?null:Number(e.target.value)})} style={{textAlign:'right', width:120}} /></td>
                  <td style={{...styles.td, textAlign:'right'}}>{(((it.market_price||0)*(it.qty||1))||0).toFixed(2)}</td>
                  <td style={{...styles.td, textAlign:'right'}}>{((((it.market_price||0)-(it.purchase_price||0))*(it.qty||1))||0).toFixed(2)}</td>
                  <td style={{...styles.td, textAlign:'right'}}>
                    <Button variant="secondary" onClick={()=>deleteItem(it.id)}>Delete</Button>
                  </td>
                </tr>
              ))}
              {filtered.length===0 && (
                <tr><td colSpan={11} style={{...styles.td, textAlign:'center', color:'#64748b'}}>No items (yet). Use Add Item or Import above.</td></tr>
              )}
            </tbody>
          </table>
        </div>

        <div style={{ marginTop: 14, ...styles.small }}>
          Tip: Click <b>New Collection</b> to generate a shareable link. Send to Matt; you’ll both edit live (real‑time).
        </div>
      </div>
    </div>
  );
}

function Input(props){ return <input {...props} style={{ ...styles.input, ...(props.style||{}) }} /> }
function Select(props){ return <select {...props} style={{ ...styles.select, ...(props.style||{}) }} /> }
