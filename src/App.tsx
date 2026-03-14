import { BrowserRouter, Routes, Route, Link, useLocation } from 'react-router-dom';
import { Dashboard } from './screens/Dashboard';
import { CheckpointReview } from './screens/CheckpointReview';
import { History } from './screens/History';
import { CycleLog } from './screens/CycleLog';
import { Settings } from './screens/Settings';

function Nav() {
  const location = useLocation();
  const isActive = (path: string) =>
    location.pathname === path ? 'nav-item nav-item--active' : 'nav-item';

  return (
    <nav className="bottom-nav">
      <Link to="/" className={isActive('/')}>
        <span className="nav-icon">⚖</span>
        <span className="nav-label">Home</span>
      </Link>
      <Link to="/history" className={isActive('/history')}>
        <span className="nav-icon">☰</span>
        <span className="nav-label">History</span>
      </Link>
      <Link to="/cycles" className={isActive('/cycles')}>
        <span className="nav-icon">◐</span>
        <span className="nav-label">Cycles</span>
      </Link>
      <Link to="/settings" className={isActive('/settings')}>
        <span className="nav-icon">⚙</span>
        <span className="nav-label">Settings</span>
      </Link>
    </nav>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <div className="app">
        <header className="app-header">
          <h1 className="app-title">Tare</h1>
          <span className="app-subtitle">Find the true weight</span>
        </header>
        <main className="app-main">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/checkpoint" element={<CheckpointReview />} />
            <Route path="/history" element={<History />} />
            <Route path="/cycles" element={<CycleLog />} />
            <Route path="/settings" element={<Settings />} />
          </Routes>
        </main>
        <Nav />
      </div>
    </BrowserRouter>
  );
}
