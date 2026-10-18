import { money } from "./pack.ts";
import type { OpeningResult } from "./result.ts";

export function ResultView({ result }: { result: OpeningResult | null }) {
  if (!result) return <section className="panel result" aria-label="Opening result"><p role="status">Checking opening…</p></section>;
  if (result.kind === "pending" || result.kind === "unavailable") {
    return <section className="panel result" aria-label="Opening result">
      <h3>{result.kind === "pending" ? "Your opening is still processing" : "We couldn’t verify this opening"}</h3>
      <p className="muted">{result.kind === "pending"
        ? "We’ll confirm your card once the award is complete."
        : "No award can be confirmed here. Return to your account to check your opening."}</p>
      <a className="button secondary" href="#pack-odds">Explore Packs</a>
    </section>;
  }
  const demo = result.kind === "demo";
  return <section className={`panel result ${demo ? "demo" : "paid"}`} aria-label="Opening result">
    <div className="result-heading">
      <span className="eyebrow">{demo ? "Practice opening" : "Opening complete"}</span>
      <h3>{demo ? "Demo — no card awarded" : "Your pull has been added to your vault"}</h3>
      <p className="muted">{demo ? "This is a preview. No purchase was made and no card was added to your vault." : "Your card is ready to view in your vault."}</p>
    </div>
    <div className="result-body">
      <div className="sample-card" aria-hidden="true"><span>ILLUSTRATIVE<br />CARD</span><b>✦</b><small>COLLECTOR SERIES</small></div>
      <div className="result-description">
        <span className="pill">{demo ? "Simulated pull" : "Award confirmed"}</span>
        <h4>{result.card.name}</h4>
        <p>{demo ? `In a paid opening, a pull like this would have an estimated reference value of ${money(result.card.referenceValueCents)}.`
          : `Reference value: ${money(result.card.referenceValueCents)}`}</p>
        <p className="muted">Reference value does not guarantee a resale price or cash profit.</p>
        {demo ? <a className="button" href="#pack-odds">Explore Packs <span aria-hidden="true">↗</span></a>
          : <a className="button" href="/vault">View My Vault <span aria-hidden="true">↗</span></a>}
      </div>
    </div>
  </section>;
}
