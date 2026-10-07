import { Link } from 'react-router-dom';
import { useAccount, useBalance } from 'wagmi';
import { formatUnits } from 'viem';
import ConnectCta from '../components/ConnectCta';

function formatAmount(value: bigint, decimals: number) {
  const n = Number(formatUnits(value, decimals));
  return n.toLocaleString('en-US', { maximumFractionDigits: 4 });
}

export default function Dashboard() {
  const { address, isConnected, chain } = useAccount();
  const { data: balance, isLoading, isError } = useBalance({
    address,
    query: { enabled: Boolean(address), refetchInterval: 15_000 },
  });

  const connected = isConnected && Boolean(address);
  const loadingBal = connected && (isLoading || !balance);

  const totalBalance = !connected
    ? '$0.00'
    : loadingBal
      ? '…'
      : balance
        ? `${formatAmount(balance.value, balance.decimals)} ${balance.symbol}`
        : '—';

  const balanceSub = !connected
    ? 'Across all markets'
    : isError
      ? 'Balance unavailable'
      : `Wallet balance${chain ? ` · ${chain.name}` : ''}`;

  return (
    <div className="pages-content">
      <div className="page-heading">
        <div>
          <p className="page-eyebrow">HEDGORA · ARC TESTNET</p>
          <h1>Dashboard</h1>
          <p className="page-intro">Your stablecoin activity, in one place.</p>
        </div>
        <ConnectCta className="ui-button ui-button--outline">
          Connect wallet <span aria-hidden="true">↗</span>
        </ConnectCta>
      </div>
      <section className="metric-grid" aria-label="Account overview">
        <article className="ui-card metric-card"><span>Total balance</span><strong>{totalBalance}</strong><small>{balanceSub}</small></article>
        <article className="ui-card metric-card"><span>Supplied</span><strong>$0.00</strong><small>0 active positions</small></article>
        <article className="ui-card metric-card"><span>Borrowed</span><strong>$0.00</strong><small>Available credit —</small></article>
        <article className="ui-card metric-card"><span>Net APY</span><strong>—</strong><small>Estimated return</small></article>
      </section>
      <section className="ui-card section-card">
        <div className="section-heading">
          <div><p className="page-eyebrow">OVERVIEW</p><h2>Your positions</h2></div>
          <Link className="text-link" to="/app/portfolio">View portfolio <span aria-hidden="true">→</span></Link>
        </div>
        {connected ? (
          <div className="data-table">
            <div className="table-row table-head"><span>Asset</span><span>Type</span><span>Balance</span><span>Network</span></div>
            <div className="table-row">
              <span className="asset-pair"><i className="token-dot token-dot--usdc">$</i><b>{balance?.symbol ?? '—'}</b></span>
              <span>Wallet</span>
              <span>{loadingBal ? '…' : balance ? formatAmount(balance.value, balance.decimals) : '—'}</span>
              <span>{chain?.name ?? '—'}</span>
            </div>
          </div>
        ) : (
          <div className="empty-state">
            <span className="empty-orb" aria-hidden="true">✳</span>
            <strong>Your dashboard is ready</strong>
            <p>Connect your wallet to see your balances and activity.</p>
            <ConnectCta className="ui-button ui-button--primary">Connect wallet</ConnectCta>
          </div>
        )}
      </section>
    </div>
  );
}
