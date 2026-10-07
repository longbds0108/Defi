import ConnectCta from '../components/ConnectCta';

export default function Portfolio() {
  return (
    <div className="pages-content">
      <div className="page-heading">
        <div>
          <p className="page-eyebrow">ACCOUNT · ARC TESTNET</p>
          <h1>Portfolio / Positions</h1>
          <p className="page-intro">Track your supplied assets, debt and activity.</p>
        </div>
        <ConnectCta className="ui-button ui-button--outline">
          Connect wallet <span aria-hidden="true">↗</span>
        </ConnectCta>
      </div>
      <section className="metric-grid">
        <article className="ui-card metric-card"><span>Net worth</span><strong>$0.00</strong><small>Across Hedgora</small></article>
        <article className="ui-card metric-card"><span>Supplied</span><strong>$0.00</strong><small>0 positions</small></article>
        <article className="ui-card metric-card"><span>Borrowed</span><strong>$0.00</strong><small>Current debt</small></article>
        <article className="ui-card metric-card"><span>Earned</span><strong>$0.00</strong><small>Estimated rewards</small></article>
      </section>
      <section className="ui-card section-card">
        <div className="section-heading">
          <div><p className="page-eyebrow">ACCOUNT ACTIVITY</p><h2>Your positions</h2></div>
          <div className="segmented-control segmented-control--small">
            <button className="is-selected" type="button">All</button>
            <button type="button">Supply</button>
            <button type="button">Borrow</button>
          </div>
        </div>
        <div className="data-table">
          <div className="table-row table-head"><span>Asset</span><span>Position</span><span>Balance</span><span>APY</span></div>
          <div className="empty-table">
            <span className="empty-orb" aria-hidden="true">✳</span>
            <b>No positions yet</b>
            <p>Connect your wallet to see your portfolio.</p>
          </div>
        </div>
      </section>
    </div>
  );
}
