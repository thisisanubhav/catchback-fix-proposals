import { useId } from "react";
import { money, rateLabel, winDefinitionText, type PackState } from "./pack.ts";

function Availability({ state }: { state: PackState }) {
  return <p className="muted" role="status">
    {state.status === "loading" ? "Loading current odds…" : "Current odds unavailable. Please retry."}
  </p>;
}

export function PackPromotion({ state, surface }: { state: PackState; surface: "homepage" | "selector" }) {
  const definitionId = useId();
  return <section className={`panel promotion ${surface}`} aria-label={`${surface} promotion`}
    data-version={state.status === "ready" ? state.pack.version : undefined}>
    <span className="eyebrow">{surface === "homepage" ? "Homepage promotion" : "Pack selector"}</span>
    <div className="promotion-content">
      <div>
        <h3>Rags to Riches</h3>
        <p className="muted">A little mystery.<br />A clearly defined chance.</p>
        {state.status === "ready" ? <>
          <p className="rate" aria-describedby={definitionId} data-testid="win-rate">
            <strong>{rateLabel(state.pack)}</strong> win rate
          </p>
          <p className="price">{money(state.pack.priceCents)} per pack</p>
        </> : <Availability state={state} />}
        <a className="button secondary" href="#pack-odds">Explore Pack <span aria-hidden="true">↗</span></a>
      </div>
      {/* Decorative art contains no rate. Visible/accessible claims are live HTML. */}
      <div className="pack-art" aria-hidden="true"><span>RAGS<br /><i>to</i><br />RICHES</span></div>
    </div>
    {state.status === "ready" && <p className="definition" id={definitionId}>{winDefinitionText}</p>}
  </section>;
}

export function PackOdds({ state }: { state: PackState }) {
  return <section id="pack-odds" className="panel odds" aria-label="Pack odds"
    data-version={state.status === "ready" ? state.pack.version : undefined}>
    <div className="section-heading"><h3>Know the odds</h3>
      {state.status === "ready" && <span className="pill">{rateLabel(state.pack)} win rate</span>}
    </div>
    {state.status !== "ready" ? <Availability state={state} /> : <>
      <p className="muted">Illustrative outcomes · reference values shown</p>
      <ul className="odds-list">{state.pack.outcomes.map(outcome => <li key={outcome.id}>
        <div><span>{outcome.name} <small>{money(outcome.referenceValueCents)}</small></span>
          <strong>{(outcome.weightBps / 100).toFixed(2)}%</strong></div>
        <div className="track" aria-hidden="true"><div style={{ width: `${outcome.weightBps / 100}%` }} /></div>
      </li>)}</ul>
      <p className="definition">{winDefinitionText}</p>
      <p className="version">Configuration: {state.pack.version} · Values: {state.pack.valuationVersion}</p>
    </>}
  </section>;
}
