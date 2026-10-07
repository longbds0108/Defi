import { Routes, Route } from 'react-router-dom';

import Landing from './pages/Landing';
import AppLayout from './components/AppLayout';
import Dashboard from './pages/Dashboard';
import Swap from './pages/Swap';
import Bridge from './pages/Bridge';
import Pools from './pages/Pools';
import Supply from './pages/Supply';
import Borrow from './pages/Borrow';
import Vaults from './pages/Vaults';
import Portfolio from './pages/Portfolio';

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/app" element={<AppLayout />}>
        <Route index element={<Dashboard />} />
        <Route path="dashboard" element={<Dashboard />} />
        <Route path="swap" element={<Swap />} />
        <Route path="bridge" element={<Bridge />} />
        <Route path="pools" element={<Pools />} />
        <Route path="supply" element={<Supply />} />
        <Route path="borrow" element={<Borrow />} />
        <Route path="vaults" element={<Vaults />} />
        <Route path="portfolio" element={<Portfolio />} />
      </Route>
    </Routes>
  );
}
