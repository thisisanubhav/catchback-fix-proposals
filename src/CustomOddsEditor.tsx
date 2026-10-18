import { useEffect, useId, useState } from "react";
import { maximumOdds, rebalanceOdds, sampleCustomOdds, type CustomOutcome } from "./customOdds.ts";

function OddsControl({ row, maximum, fixed, onChange, onLock }: {
  row: CustomOutcome; maximum: number; fixed: boolean;
  onChange: (bps: number) => void; onLock: () => void;
}) {
  const id = useId();
  const [draft, setDraft] = useState<string | null>(null);
  const [error, setError] = useState("");
  const disabled = row.locked || fixed;
  const hint = row.locked ? "Locked. Unlock this card to edit its odds."
    : fixed ? "Unlock another card to redistribute the odds."
      : `Enter 0 to ${(maximum / 100).toFixed(2)}%. Press Enter or leave the field to apply. Arrow keys adjust the slider.`;

  function commit() {
    if (draft === null) return;
    const value = Number(draft);
    if (!draft.trim() || !Number.isFinite(value) || value < 0 || value * 100 > maximum ||
        Math.abs(value * 100 - Math.round(value * 100)) > 0.000001) {
      setError(`Enter a number from 0 to ${(maximum / 100).toFixed(2)} with at most two decimal places. Odds have not changed.`);
      return;
    }
    onChange(Math.round(value * 100));
    setDraft(null);
    setError("");
  }

  return <fieldset className="custom-odds-row">
    <legend>{row.name}</legend>
    <div className="custom-odds-controls">
      <div className="custom-number">
        <label htmlFor={`${id}-number`}>Odds for {row.name} (%)</label>
        <input id={`${id}-number`} type="number" inputMode="decimal" min="0" max={maximum / 100} step="0.01"
          disabled={disabled} value={draft ?? (row.weightBps / 100).toFixed(2)}
          aria-describedby={`${id}-hint${error ? ` ${id}-error` : ""}`} aria-invalid={!!error}
          onChange={event => { setDraft(event.target.value); setError(""); }} onBlur={commit}
          onKeyDown={event => {
            if (event.key === "Enter") { event.preventDefault(); event.currentTarget.blur(); }
            if (event.key === "Escape") { setDraft(null); setError(""); }
          }} />
      </div>
      <div className="custom-slider">
        <label htmlFor={`${id}-range`}>Adjust odds for {row.name}</label>
        <input id={`${id}-range`} type="range" min={fixed ? row.weightBps / 100 : 0}
          max={maximum / 100} step="0.01" value={row.weightBps / 100} disabled={disabled}
          aria-valuetext={`${(row.weightBps / 100).toFixed(2)} percent`} aria-describedby={`${id}-hint`}
          onChange={event => { setDraft(null); setError(""); onChange(Math.round(Number(event.target.value) * 100)); }} />
      </div>
      <button className="button secondary" type="button" aria-label={`Lock odds for ${row.name}`}
        aria-pressed={row.locked} onClick={() => { setDraft(null); setError(""); onLock(); }}>
        {row.locked ? "Locked" : "Lock"}
      </button>
    </div>
    <p id={`${id}-hint`} className="muted custom-hint">{hint}</p>
    {error && <p className="field-error" id={`${id}-error`} role="alert">{error}</p>}
  </fieldset>;
}

export function CustomOddsEditor() {
  const [rows, setRows] = useState(sampleCustomOdds);
  const [reset, setReset] = useState(0);
  const [message, setMessage] = useState("Total probability: 100.00%.");
  const [announcement, setAnnouncement] = useState(message);
  useEffect(() => {
    const timer = setTimeout(() => setAnnouncement(message), 300);
    return () => clearTimeout(timer);
  }, [message]);

  function update(id: string, bps: number) {
    const next = rebalanceOdds(rows, id, bps);
    setRows(next);
    setMessage(`Odds updated. ${next.map(row => `${row.name}: ${(row.weightBps / 100).toFixed(2)}%`).join("; ")}. Total probability: 100.00%.`);
  }

  return <section className="panel custom-odds" aria-label="Custom odds editor">
    <div className="section-heading"><h3>Set your odds</h3><span className="pill">Total: 100.00%</span></div>
    <p className="muted">Illustrative cards. Edit a percentage or use its slider. Unlocked cards share the remainder in proportion to their current odds; locked cards stay fixed.</p>
    <button className="button secondary" onClick={() => {
      setRows(sampleCustomOdds()); setReset(value => value + 1);
      setMessage("Odds reset. Five cards at 20.00% each. All cards unlocked. Total probability: 100.00%.");
    }}>Reset odds</button>
    {rows.map(row => <OddsControl key={`${reset}-${row.id}`} row={row} maximum={maximumOdds(rows, row.id)}
      fixed={!rows.some(peer => peer.id !== row.id && !peer.locked)}
      onChange={bps => update(row.id, bps)} onLock={() => {
        setRows(rows.map(item => item.id === row.id ? { ...item, locked: !item.locked } : item));
        setMessage(`${row.name} ${row.locked ? "unlocked" : "locked"} at ${(row.weightBps / 100).toFixed(2)}%. Total probability: 100.00%.`);
      }} />)}
    <p className="custom-status muted" role="status" aria-live="polite" aria-atomic="true">{announcement}</p>
  </section>;
}
