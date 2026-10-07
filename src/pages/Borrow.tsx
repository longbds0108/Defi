import ConnectCta from '../components/ConnectCta';

export default function Borrow() {
  return (
    <div className="pages-content">
      <div className="page-heading">
        <div>
          <p className="page-eyebrow">CREDIT · ARC TESTNET</p>
          <h1>Borrow</h1>
          <p className="page-intro">Borrow against your supplied collateral.</p>
        </div>
        <button className="ui-button ui-button--outline" type="button">Borrow history <span aria-hidden="true">→</span></button>
      </div>
      <section className="metric-grid metric-grid--three">
        <article className="ui-card metric-card"><span>Borrowed</span><strong>$—</strong><small>Current debt</small></article>
        <article className="ui-card metric-card"><span>Available to borrow</span><strong>$—</strong><small>Based on collateral</small></article>
        <article className="ui-card metric-card"><span>Health factor</span><strong>—</strong><small>Account safety</small></article>
      </section>
      <div className="workbench">
        <section className="ui-card form-card">
          <div className="section-heading">
            <div><p className="page-eyebrow">NEW BORROW</p><h2>Borrow assets</h2></div>
          </div>
          <div className="token-field">
            <div className="field-top"><label>Asset</label><span>Available —</span></div>
            <button className="network-select" type="button"><span className="asset-pair"><i className="token-dot token-dot--usdc">$</i> USDC</span><span>⌄</span></button>
          </div>
          <div className="token-field">
            <div className="field-top"><label>Amount</label><span>Borrow limit —</span></div>
            <div className="token-input-row"><input inputMode="decimal" placeholder="0.00" aria-label="Borrow amount" /></div>
          </div>
          <div className="form-detail"><span>Borrow APY</span><b>—</b></div>
          <ConnectCta className="ui-button ui-button--primary ui-button--wide">Connect wallet</ConnectCta>
        </section>
        <aside className="ui-card side-card">
          <p className="page-eyebrow">COLLATERAL</p>
          <h2>Your supplied assets</h2>
          <div className="empty-inline">Connect wallet to view collateral</div>
          <div className="health-meter"><div><span>Borrow limit used</span><b>—</b></div><i><span></span></i></div>
        </aside>
      </div>
    </div>
  );
}
