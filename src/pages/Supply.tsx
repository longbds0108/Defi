import ConnectCta from '../components/ConnectCta';

export default function Supply() {
  return (
    <div className="pages-content">
      <div className="page-heading">
        <div>
          <p className="page-eyebrow">LEND · ARC TESTNET</p>
          <h1>Lend / Supply</h1>
          <p className="page-intro">Supply assets to earn variable yield.</p>
        </div>
        <button className="ui-button ui-button--outline" type="button">My supplies <span aria-hidden="true">→</span></button>
      </div>
      <section className="metric-grid metric-grid--three">
        <article className="ui-card metric-card"><span>Total supplied</span><strong>$—</strong><small>Your active supply</small></article>
        <article className="ui-card metric-card"><span>Available to supply</span><strong>$—</strong><small>Across supported assets</small></article>
        <article className="ui-card metric-card"><span>Average supply APY</span><strong>—</strong><small>Variable rate</small></article>
      </section>
      <div className="workbench">
        <section className="ui-card form-card">
          <div className="section-heading">
            <div><p className="page-eyebrow">SUPPLY ASSETS</p><h2>Choose an asset</h2></div>
          </div>
          <div className="token-field">
            <div className="field-top"><label>Asset</label><span>Wallet balance —</span></div>
            <button className="network-select" type="button"><span className="asset-pair"><i className="token-dot token-dot--usdc">$</i> USDC</span><span>⌄</span></button>
          </div>
          <div className="token-field">
            <div className="field-top"><label>Amount</label><span>Available —</span></div>
            <div className="token-input-row"><input inputMode="decimal" placeholder="0.00" aria-label="Supply amount" /><button className="max-button" type="button">MAX</button></div>
          </div>
          <div className="form-detail"><span>Supply APY</span><b>—</b></div>
          <ConnectCta className="ui-button ui-button--primary ui-button--wide">Connect wallet</ConnectCta>
        </section>
        <aside className="ui-card side-card">
          <p className="page-eyebrow">SUPPLY MARKETS</p>
          <h2>Supported assets</h2>
          <div className="mini-asset-row"><span className="asset-pair"><i className="token-dot token-dot--usdc">$</i><b>USDC</b></span><span>APY <b>—</b></span></div>
          <div className="mini-asset-row"><span className="asset-pair"><i className="token-dot token-dot--eurc">€</i><b>EURC</b></span><span>APY <b>—</b></span></div>
        </aside>
      </div>
    </div>
  );
}
