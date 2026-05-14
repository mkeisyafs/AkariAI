import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './hooks/useAuth';
import Layout from './components/layout/Layout';
import RequireGlobalAdmin from './components/layout/RequireGlobalAdmin';
import Home from './pages/Home';
import Dashboard from './pages/Dashboard';
import GuildConfig from './pages/GuildConfig';
import AdminBots from './pages/AdminBots';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex items-center gap-3 text-ink-secondary">
          <span className="h-2 w-2 rounded-full bg-brand-400 animate-pulse" />
          Loading…
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Toaster
          position="top-right"
          toastOptions={{
            style: {
              background: '#15151F',
              color: '#F5F5F7',
              border: '1px solid #2A2A40',
              borderRadius: '10px',
              fontSize: '13px',
              padding: '10px 14px',
              boxShadow: '0 8px 32px -8px rgba(0,0,0,0.6)',
            },
            success: {
              iconTheme: {
                primary: '#7A5AF8',
                secondary: '#fff',
              },
            },
            error: {
              iconTheme: {
                primary: '#EF4444',
                secondary: '#fff',
              },
            },
          }}
        />
        <Routes>
          <Route path="/" element={<Home />} />
          <Route
            element={
              <ProtectedRoute>
                <Layout />
              </ProtectedRoute>
            }
          >
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/guild/:guildId" element={<GuildConfig />} />
            <Route path="/admin/bots" element={<RequireGlobalAdmin><AdminBots /></RequireGlobalAdmin>} />
          </Route>
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
