import { useState, useEffect } from 'react';
import { Layout } from '@/components/layout/Layout';
import { Dashboard } from '@/pages/Dashboard';
import { IdeasPage } from '@/pages/Ideas';
import { ClientsPage } from '@/pages/Clients';
import { SchedulePage } from '@/pages/Schedule';
import { ApprovalsPage } from '@/pages/Approvals';
import { CalendarPage } from '@/pages/Calendar';
import { TasksPage } from '@/pages/Tasks';
import { EmployeesPage } from '@/pages/Employees';
import { MissionsPage } from '@/pages/Missions';
import { SuggestionsPage } from '@/pages/Suggestions';
import { AgentsPage } from '@/pages/Agents';
import { initializeMockData } from '@/lib/storage';

const Index = () => {
  const [currentPage, setCurrentPage] = useState('dashboard');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    initializeMockData();
  }, []);

  const renderPage = () => {
    switch (currentPage) {
      case 'dashboard':
        return <Dashboard onNavigate={setCurrentPage} />;
      case 'ideas':
        return <IdeasPage searchQuery={searchQuery} />;
      case 'clients':
        return <ClientsPage searchQuery={searchQuery} />;
      case 'schedule':
        return <SchedulePage searchQuery={searchQuery} />;
      case 'approvals':
        return <ApprovalsPage searchQuery={searchQuery} />;
      case 'calendar':
        return <CalendarPage searchQuery={searchQuery} />;
      case 'tasks':
        return <TasksPage searchQuery={searchQuery} />;
      case 'employees':
        return <EmployeesPage searchQuery={searchQuery} />;
      case 'missions':
        return <MissionsPage searchQuery={searchQuery} />;
      case 'suggestions':
        return <SuggestionsPage searchQuery={searchQuery} />;
      case 'agents':
        return <AgentsPage searchQuery={searchQuery} />;
      default:
        return <Dashboard onNavigate={setCurrentPage} />;
    }
  };

  return (
    <Layout
      currentPage={currentPage}
      onPageChange={setCurrentPage}
      searchQuery={searchQuery}
      onSearchChange={setSearchQuery}
    >
      {renderPage()}
    </Layout>
  );
};

export default Index;
