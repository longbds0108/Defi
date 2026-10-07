import ConnectCta from '../components/ConnectCta';

export default function Bridge() {
  return (
    <div className="pages-content">
      <div className="page-heading">
        <div>
          <p className="page-eyebrow">MOVE ASSETS · ARC TESTNET</p>
          <h1>Bridge / Deposit / Withdraw</h1>
          <p className="page-intro">Move assets between your wallet and supported networks.</p>
        </div>
      </div>
      <section className="ui-card section-card">
        <div className="segmented-control" role="tablist" aria-label="Asset movement">
          <button className="is-selected" type="button" role="tab" aria-selected="true">Bridge</button>
          <button type="button" role="tab" aria-selected="false">Deposit</button>
          <button type="button" role="tab" aria-selected="false">Withdraw</button>
        </div>
        <div className="movement-layout">
          <div className="form-stack">
            <div className="token-field">
              <div className="field-top"><label>From network</label><span>Wallet balance —</span></div>
              <button className="network-select" type="button">Select network <span>⌄</span></button>
            </div>
            <div className="token-field">
              <div className="field-top"><label>Asset and amount</label><span>Available —</span></div>
              <div className="token-input-row"><input inputMode="decimal" placeholder="0.00" aria-label="Asset amount" /><button className="token-select" type="button">Select token <span>⌄</span></button></div>
            </div>
            <div className="token-field">
              <div className="field-top"><label>To network</label></div>
              <button className="network-select" type="button">Arc Testnet <span>⌄</span></button>
            </div>
            <ConnectCta className="ui-button ui-button--primary ui-button--wide">Connect wallet</ConnectCta>
          </div>
          <aside className="info-panel">
            <span className="info-icon">↗</span>
            <h3>Transfer overview</h3>
            <p>Estimated time <b>—</b></p>
            <p>Network fee <b>—</b></p>
            <p>You receive <b>—</b></p>
          </aside>
        </div>
      </section>
    </div>
  );
}
