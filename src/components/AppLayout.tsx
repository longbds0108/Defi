import { Link, NavLink, Outlet } from 'react-router-dom';
import { ConnectButton } from '@rainbow-me/rainbowkit';

const NAV = [
  { to: '/app/dashboard', label: 'Dashboard' },
  { to: '/app/swap', label: 'Swap' },
  { to: '/app/bridge', label: 'Bridge / Deposit / Withdraw' },
  { to: '/app/pools', label: 'Liquidity / Pools' },
  { to: '/app/supply', label: 'Lend / Supply' },
  { to: '/app/borrow', label: 'Borrow' },
  { to: '/app/vaults', label: 'Vaults / Strategies' },
  { to: '/app/portfolio', label: 'Portfolio / Positions' },
];

export default function AppLayout() {
  return (
    <div className="app-shell app-shell--pages">
      <header className="app-header pages-header">
        <Link className="app-header__left pages-brand" to="/" aria-label="Hedgora home">
          <img className="pages-brand__logo" src="/assets/hedgora-logo.png" alt="Hedgora" />
        </Link>
        <div className="app-header__right">
          <ConnectButton />
        </div>
      </header>
      <div className="pages-layout">
        <aside className="pages-sidebar" aria-label="Workspace">
          <nav className="app-nav" aria-label="App navigation">
            {NAV.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) => (isActive ? 'active' : undefined)}
              >
                {item.label}
              </NavLink>
            ))}
          </nav>
        </aside>
        <main className="app-main pages-main" aria-label="Workspace">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
