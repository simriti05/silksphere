import React from 'react'
import Dashboard from './Dashboard'
import LifeCycle from './LifeCycle'
import MyBatches from './MyBatches'
import AIDiagnostics from './AIDiagnostics'
import Analytics from './Analytics'
import EnvironmentHistory from './EnvironmentHistory'
import FarmerMarketplace from './FarmerMarketplace'
import Wallet from '../shared/Wallet'
import Settings from '../shared/Settings'

export default function FarmerRouter({ page, setPage }) {
  switch (page) {
    case 'dashboard': return <Dashboard setPage={setPage} />
    case 'lifecycle': return <LifeCycle />
    case 'batches': return <MyBatches setPage={setPage} />
    case 'diagnostics': return <AIDiagnostics />
    case 'analytics': return <Analytics />
    case 'env-history': return <EnvironmentHistory setPage={setPage} />
    case 'marketplace': return <FarmerMarketplace />
    case 'wallet': return <Wallet />
    case 'settings': return <Settings />
    default: return <Dashboard setPage={setPage} />
  }
}
