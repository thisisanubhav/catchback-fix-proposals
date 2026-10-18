import { useCallback, useEffect, useState } from "react";
import { loadSample, sampleGateway, type PackScenario } from "./fixtures.ts";
import { PackOdds, PackPromotion } from "./PackViews.tsx";
import { resolveOpening, type OpeningResult, type VerifiedOpening } from "./result.ts";
import { ResultView } from "./ResultView.tsx";
import { usePublishedPack } from "./usePublishedPack.ts";

export default function App() {
  const [scenario, setScenario] = useState<PackScenario>("current");
  const [revision, setRevision] = useState(0);
  const loader = useCallback((signal: AbortSignal) => loadSample(scenario, signal), [scenario]);
  const pack = usePublishedPack(`${scenario}:${revision}`, loader);
  const [result, setResult] = useState<OpeningResult | null>(null);
  const [revealing, setRevealing] = useState(false);
  const [request, setRequest] = useState<{ query: string; status: VerifiedOpening["status"] }>({
    query: window.location.search || "?demo=true", status: "unavailable",
  });

  useEffect(() => {
    let active = true;
    void resolveOpening(new URLSearchParams(request.query), sampleGateway(request.status))
      .then(next => { if (active) setResult(next); });
    return () => { active = false; };
  }, [request]);

  function preview(status: VerifiedOpening["status"] | "demo") {
    setResult(null);
    setRevealing(false);
    setRequest(status === "demo" ? { query: "?demo=true", status: "unavailable" }
      : { query: "?opening_id=illustrative-opening", status });
  }

  return <>
    <div className="notice">Independent engineering proposal · Synthetic data · No purchases or real awards</div>
    <header className="site-header"><a href="#" className="wordmark">CATCHBACK <span>/ proposals</span></a>
      <a href="#result-preview">Result preview <span aria-hidden="true">↗</span></a></header>
    <main className="layout">
      <section className="intro"><span className="eyebrow">Two details. A clearer experience.</span>
        <h1>Clear odds.<br /><span>Honest outcomes.</span></h1>
        <p>A working proposal for consistent pack promotions and an unmistakable demo experience.</p>
      </section>
      <aside className="review-controls" aria-label="Proposal controls">
        <div><strong>Review the proposal</strong><p>These controls simulate integration states using local fixtures.</p></div>
        <label>Pack configuration<select value={scenario} onChange={event => setScenario(event.target.value as PackScenario)}>
          <option value="current">Example v1 · 67%</option><option value="updated">Example v2 · 60%</option>
          <option value="loading">Loading</option><option value="error">Fetch failure</option>
          <option value="expired">Expired data</option><option value="mismatch">Version mismatch</option>
        </select></label>
        <button className="button secondary" onClick={() => setRevision(value => value + 1)}>Retry configuration</button>
      </aside>
      <section aria-labelledby="consistency-title">
        <div className="section-title"><span className="number">01</span><div><h2 id="consistency-title">One configuration, every surface</h2>
          <p>Promotional text, accessible descriptions, and odds share the same published version.</p></div></div>
        <div className="promotions"><PackPromotion state={pack} surface="homepage" /><PackPromotion state={pack} surface="selector" /></div>
        <PackOdds state={pack} />
      </section>
      <section id="result-preview" aria-labelledby="results-title">
        <div className="section-title"><span className="number">02</span><div><h2 id="results-title">A demo should feel like a demo</h2>
          <p>The result explains what happened before showing the card.</p></div></div>
        <aside className="review-controls result-controls" aria-label="Result preview controls">
          <div><strong>Result fixtures</strong><p>Paid preview simulates a verified response; it does not establish ownership.</p></div>
          <div className="buttons">
            <button className="button secondary" onClick={() => { preview("demo"); setRevealing(true); }}>Open Demo</button>
            <button className="button secondary" onClick={() => preview("awarded")}>Paid success fixture</button>
            <button className="button secondary" onClick={() => preview("pending")}>Pending fixture</button>
            <button className="button secondary" onClick={() => preview("unavailable")}>Unverified fixture</button>
          </div>
        </aside>
        {revealing ? <section className="panel reveal" aria-label="Demo reveal">
          <h3>Demo — no card awarded</h3><p>Previewing a simulated pack opening.</p>
          <div className="buttons"><button className="button" onClick={() => setRevealing(false)}>Reveal demo result</button>
            <button className="button secondary" onClick={() => setRevealing(false)}>Skip</button></div>
        </section> : <ResultView result={result} />}
      </section>
      <footer>Example implementation for outreach. Integration requires CatchBack’s real configuration, valuation, authentication, and award services.</footer>
    </main>
  </>;
}
