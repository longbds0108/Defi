export default function Pools() {
  return (
    <div className="pages-content">
      <div className="page-heading">
        <div>
          <p className="page-eyebrow">LIQUIDITY · ARC TESTNET</p>
          <h1>Liquidity / Pools</h1>
          <p className="page-intro">Explore liquidity markets and pool opportunities.</p>
        </div>
        <button className="ui-button ui-button--outline" type="button">My positions <span aria-hidden="true">→</span></button>
      </div>
      <section className="metric-grid metric-grid--three">
        <article className="ui-card metric-card"><span>Total liquidity</span><strong>$—</strong><small>Across all pools</small></article>
        <article className="ui-card metric-card"><span>Active pools</span><strong>—</strong><small>Available markets</small></article>
        <article className="ui-card metric-card"><span>Your liquidity</span><strong>$—</strong><small>Connect wallet to view</small></article>
      </section>
      <section className="ui-card section-card">
        <div className="section-heading">
          <div><p className="page-eyebrow">AVAILABLE MARKETS</p><h2>Liquidity pools</h2></div>
          <div className="search-field"><span aria-hidden="true">⌕</span><input type="search" placeholder="Search pools" aria-label="Search pools" /></div>
        </div>
        <div className="data-table">
          <div className="table-row table-head"><span>Pool</span><span>TVL</span><span>APY</span><span></span></div>
          <div className="table-row"><span className="asset-pair"><i className="token-dot token-dot--usdc">$</i><i className="token-dot token-dot--eurc">€</i><b>USDC / EURC</b></span><span>—</span><span className="accent-value">—</span><button className="ui-button ui-button--small" type="button">View pool</button></div>
          <div className="table-row"><span className="asset-pair"><i className="token-dot token-dot--usdc">$</i><i className="token-dot token-dot--eth">◆</i><b>USDC / ETH</b></span><span>—</span><span className="accent-value">—</span><button className="ui-button ui-button--small" type="button">View pool</button></div>
        </div>
      </section>
    </div>
  );
}
