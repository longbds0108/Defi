export default function Vaults() {
  return (
    <div className="pages-content">
      <div className="page-heading">
        <div>
          <p className="page-eyebrow">AUTOMATED YIELD · ARC TESTNET</p>
          <h1>Vaults / Strategies</h1>
          <p className="page-intro">Explore strategies built for stablecoin capital.</p>
        </div>
        <button className="ui-button ui-button--outline" type="button">My vaults <span aria-hidden="true">→</span></button>
      </div>
      <section className="metric-grid metric-grid--three">
        <article className="ui-card metric-card"><span>Total value locked</span><strong>$—</strong><small>Across strategies</small></article>
        <article className="ui-card metric-card"><span>Strategies</span><strong>—</strong><small>Available vaults</small></article>
        <article className="ui-card metric-card"><span>Your deposits</span><strong>$—</strong><small>Connect wallet to view</small></article>
      </section>
      <div className="section-heading standalone-heading">
        <div><p className="page-eyebrow">STRATEGY DIRECTORY</p><h2>Explore vaults</h2></div>
        <div className="filter-chip-row">
          <button className="filter-chip is-selected" type="button">All assets</button>
          <button className="filter-chip" type="button">Stablecoins</button>
        </div>
      </div>
      <section className="vault-grid">
        <article className="ui-card vault-card">
          <div className="vault-card__top"><span className="token-dot token-dot--usdc">$</span><span className="status-pill"><i></i> Open</span></div>
          <p className="page-eyebrow">STABLECOIN STRATEGY</p>
          <h3>USDC yield vault</h3>
          <p className="vault-card__copy">A strategy for USDC deposits.</p>
          <div className="vault-card__stats"><span>Est. APY <b>—</b></span><span>TVL <b>$—</b></span></div>
          <button className="ui-button ui-button--outline ui-button--wide" type="button">View strategy <span>→</span></button>
        </article>
        <article className="ui-card vault-card">
          <div className="vault-card__top"><span className="token-dot token-dot--eurc">€</span><span className="status-pill"><i></i> Open</span></div>
          <p className="page-eyebrow">STABLECOIN STRATEGY</p>
          <h3>EURC yield vault</h3>
          <p className="vault-card__copy">A strategy for EURC deposits.</p>
          <div className="vault-card__stats"><span>Est. APY <b>—</b></span><span>TVL <b>$—</b></span></div>
          <button className="ui-button ui-button--outline ui-button--wide" type="button">View strategy <span>→</span></button>
        </article>
      </section>
    </div>
  );
}
