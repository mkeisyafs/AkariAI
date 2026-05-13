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
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-white">Loading...</div>
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
              background: '#2C2F33',
              color: '#fff',
              border: '1px solid #4a4d52',
            },
            success: {
              iconTheme: {
                primary: '#5865F2',
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
