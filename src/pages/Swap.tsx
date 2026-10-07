import { useEffect } from 'react';
import ConnectCta from '../components/ConnectCta';
import { initSwapTicker } from '../landing/swapTicker';

export default function Swap() {
  useEffect(() => {
    // Populates #swapTickerTrack (CoinGecko top-40 + Hyperliquid live mids).
    initSwapTicker();
  }, []);

  return (
    <div className="swap-page">
      <div className="swap-ticker" aria-label="Top 40 cryptocurrency markets by market capitalization">
        <div className="swap-ticker__track" id="swapTickerTrack"></div>
      </div>

      <div className="swap-workspace">
        <section className="swap-card" aria-labelledby="swap-title">
          <div className="swap-card__top">
            <div className="swap-mode" role="tablist" aria-label="Swap mode">
              <button className="is-active" type="button" role="tab" aria-selected="true">Standard</button>
              <button type="button" role="tab" aria-selected="false">Advanced</button>
            </div>
            <h1 id="swap-title" className="visually-hidden">Swap tokens</h1>
            <button className="swap-settings" type="button" aria-label="Swap settings">⚙</button>
          </div>

          <div className="swap-side swap-side--pay">
            <div className="swap-label-row"><label htmlFor="swap-amount-in">You pay</label><span>Balance <b>—</b></span></div>
            <div className="swap-input-row">
              <input id="swap-amount-in" type="text" inputMode="decimal" placeholder="0" aria-label="Amount to pay" />
              <button className="swap-token" type="button"><img src="/assets/usdc-logo.png" alt="" /><b>USDC</b><span aria-hidden="true">⌄</span></button>
            </div>
            <div className="swap-route-row">
              <span className="swap-route-row__label">Route</span>
              <span className="swap-route-chip"><span className="swap-route-chip__orb">A</span> Arc Testnet <span className="swap-route-chip__dot"></span></span>
              <span className="swap-route-row__hint">Best route <b>—</b></span>
            </div>
          </div>

          <div className="swap-divider"><span></span><button type="button" aria-label="Switch tokens" className="swap-reverse">↓</button></div>

          <div className="swap-side swap-side--receive">
            <div className="swap-label-row"><label htmlFor="swap-amount-out">You receive</label><span>Balance <b>—</b></span></div>
            <div className="swap-input-row">
              <input id="swap-amount-out" type="text" inputMode="decimal" placeholder="0" aria-label="Estimated amount to receive" readOnly />
              <button className="swap-token" type="button"><img src="/assets/eurc-logo.png" alt="" /><b>EURC</b><span aria-hidden="true">⌄</span></button>
            </div>
            <div className="swap-estimate"><span>Rate</span><span>— USDC = — EURC</span></div>
          </div>

          <div className="swap-details"><span>Network fee <b>—</b></span><span>Slippage <b>0.50%</b></span></div>
          <ConnectCta className="swap-submit">Connect wallet</ConnectCta>
          <p className="swap-footnote">Rates and route details appear after connecting your wallet.</p>
        </section>
        <p className="swap-network-note"><span></span> Connected to Arc Testnet</p>
      </div>
    </div>
  );
}
