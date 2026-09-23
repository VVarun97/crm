import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Sidebar } from './components/Layout/Sidebar';
import { Header } from './components/Layout/Header';
import { DashboardPage } from './pages/DashboardPage';
import { CustomersPage } from './pages/CustomersPage';
import { LeadsPage } from './pages/LeadsPage';
import { OrdersPage } from './pages/OrdersPage';
import { PaymentsPage } from './pages/PaymentsPage';
import { TasksPage } from './pages/TasksPage';
import { AuditLogPage } from './pages/AuditLogPage';
import { LoginPage } from './pages/LoginPage';
import { ConcurrencySimulatorModal } from './components/Modals/ConcurrencySimulatorModal';
import { ScaleSpecsModal } from './components/Modals/ScaleSpecsModal';

const MainLayout: React.FC = () => {
  const { user, isLoading } = useAuth();
  const [currentTab, setCurrentTab] = useState('dashboard');
  const [isSimulatorOpen, setIsSimulatorOpen] = useState(false);
  const [isScaleModalOpen, setIsScaleModalOpen] = useState(false);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center text-slate-400 text-sm">
        Initializing NexCRM session...
      </div>
    );
  }

  if (!user) {
    return <LoginPage />;
  }

  const renderContent = () => {
    switch (currentTab) {
      case 'dashboard':
        return <DashboardPage />;
      case 'customers':
        return <CustomersPage />;
      case 'leads':
        return <LeadsPage />;
      case 'orders':
        return <OrdersPage onOpenSimulator={() => setIsSimulatorOpen(true)} />;
      case 'payments':
        return <PaymentsPage />;
      case 'tasks':
        return <TasksPage />;
      case 'audit':
        return <AuditLogPage />;
      default:
        return <DashboardPage />;
    }
  };

  return (
    <div className="flex h-screen overflow-hidden bg-slate-950">
      {/* Sidebar */}
      <Sidebar
        currentTab={currentTab}
        setCurrentTab={setCurrentTab}
        onOpenScaleModal={() => setIsScaleModalOpen(true)}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Header
          currentTab={currentTab}
          onOpenSimulator={() => setIsSimulatorOpen(true)}
        />

        <main className="flex-1 overflow-y-auto p-8">
          <div className="max-w-7xl mx-auto">
            {renderContent()}
          </div>
        </main>
      </div>

      {/* Modals */}
      <ConcurrencySimulatorModal
        isOpen={isSimulatorOpen}
        onClose={() => setIsSimulatorOpen(false)}
      />

      <ScaleSpecsModal
        isOpen={isScaleModalOpen}
        onClose={() => setIsScaleModalOpen(false)}
      />
    </div>
  );
};

export const App: React.FC = () => {
  return (
    <AuthProvider>
      <MainLayout />
    </AuthProvider>
  );
};

export default App;
