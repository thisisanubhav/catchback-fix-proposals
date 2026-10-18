import { useId, useMemo, useState } from "react";
import { money } from "./pack.ts";

const cards = Array.from({ length: 18 }, (_, index) => ({
  id: `sample-card-${index + 1}`,
  name: `Example card ${String(index + 1).padStart(2, "0")}`,
  category: ["Pokémon", "Sports", "One Piece"][index % 3],
  priceCents: 500 + index * 250,
}));
const pageSize = 6;

function Pagination({ position, page, pages, onPage }: {
  position: "Top" | "Bottom"; page: number; pages: number; onPage: (page: number) => void;
}) {
  return <nav className="catalog-pagination" aria-label={`${position} catalog pagination`}>
    <button type="button" className="button secondary" aria-label="Previous page"
      disabled={page <= 1 || pages === 0} onClick={() => onPage(page - 1)}>← Previous</button>
    <span className="catalog-page">Page {pages ? page : 0} of {pages}</span>
    <button type="button" className="button secondary" aria-label="Next page"
      disabled={page >= pages} onClick={() => onPage(page + 1)}>Next →</button>
  </nav>;
}

/** Independent fixture catalog: replace its data with the real selection model. */
export function CatalogBrowser() {
  const id = useId();
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("All categories");
  const [price, setPrice] = useState("all");
  const [sort, setSort] = useState("asc");
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<Set<string>>(() => new Set());
  const filtered = useMemo(() => cards.filter(card =>
    card.name.toLowerCase().includes(search.trim().toLowerCase()) &&
    (category === "All categories" || card.category === category) &&
    (price === "all" || card.priceCents < 2500)
  ).sort((a, b) => sort === "asc" ? a.priceCents - b.priceCents : b.priceCents - a.priceCents), [search, category, price, sort]);
  const pages = Math.ceil(filtered.length / pageSize);
  const currentPage = Math.min(page, Math.max(1, pages));
  const visible = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  function toggle(cardId: string) {
    setSelected(previous => {
      const next = new Set(previous);
      if (next.has(cardId)) next.delete(cardId); else next.add(cardId);
      return next;
    });
  }

  return <section className="catalog-layout" aria-label="Custom pack catalog">
    <aside className="panel catalog-selection" aria-label="Selected cards">
      <span className="eyebrow">Illustrative custom pack</span>
      <h3>Your selection</h3>
      <p className="pill" role="status" aria-live="polite">{selected.size} selected</p>
      <p className="muted">Choose sample cards and browse between pages. Your selections stay with you.</p>
      {selected.size ? <ul>{cards.filter(card => selected.has(card.id)).map(card => <li key={card.id}>
        <span>{card.name}<small>{money(card.priceCents)}</small></span>
        <button type="button" className="button secondary" aria-label={`Remove ${card.name}`} onClick={() => toggle(card.id)}>Remove</button>
      </li>)}</ul> : <p className="catalog-empty-selection">No cards selected yet.</p>}
    </aside>
    <section className="panel catalog-column" aria-label="Selectable cards">
      <h3>Browse sample cards</h3>
      {/* Controls wrap in their own row. Neither pager shares their space. */}
      <div className="catalog-filters" role="group" aria-label="Catalog filters">
        <label htmlFor={`${id}-search`}>Search cards<input id={`${id}-search`} type="search" value={search}
          placeholder="Search by name" onChange={event => { setSearch(event.target.value); setPage(1); }} /></label>
        <label htmlFor={`${id}-category`}>Category<select id={`${id}-category`} value={category}
          onChange={event => { setCategory(event.target.value); setPage(1); }}>
          {["All categories", "Pokémon", "Sports", "One Piece"].map(value => <option key={value}>{value}</option>)}
        </select></label>
        <label htmlFor={`${id}-price`}>Price<select id={`${id}-price`} value={price}
          onChange={event => { setPrice(event.target.value); setPage(1); }}>
          <option value="all">All prices</option><option value="under25">Under $25</option>
        </select></label>
        <label htmlFor={`${id}-sort`}>Sort<select id={`${id}-sort`} value={sort}
          onChange={event => { setSort(event.target.value); setPage(1); }}>
          <option value="asc">Low to High</option><option value="desc">High to Low</option>
        </select></label>
      </div>
      <p className="muted catalog-summary" role="status" aria-live="polite" aria-atomic="true">
        {filtered.length ? `Showing ${(currentPage - 1) * pageSize + 1}–${Math.min(currentPage * pageSize, filtered.length)} of ${filtered.length} cards. Page ${currentPage} of ${pages}.`
          : "No cards match your filters."}
      </p>
      <Pagination position="Top" page={currentPage} pages={pages} onPage={setPage} />
      {visible.length ? <ul className="catalog-grid" aria-label="Card results">{visible.map(card => <li key={card.id}>
        <button type="button" className="catalog-card" aria-label={`Select ${card.name}`}
          aria-pressed={selected.has(card.id)} onClick={() => toggle(card.id)}>
          <span className="catalog-card-art" aria-hidden="true">✦<small>SAMPLE {card.name.slice(-2)}</small></span>
          <span className="catalog-card-name">{card.name}</span>
          <span className="muted">{card.category}</span>
          <span className="catalog-card-price">{money(card.priceCents)} <span>{selected.has(card.id) ? "Selected ✓" : "Select +"}</span></span>
        </button>
      </li>)}</ul> : <div className="catalog-no-results"><p>Try another name or reset the filters.</p>
        <button type="button" className="button secondary" onClick={() => {
          setSearch(""); setCategory("All categories"); setPrice("all"); setPage(1);
        }}>Reset filters</button></div>}
      <Pagination position="Bottom" page={currentPage} pages={pages} onPage={setPage} />
    </section>
  </section>;
}
