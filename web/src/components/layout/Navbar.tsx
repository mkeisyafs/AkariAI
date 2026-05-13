import { Link } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { useSession } from '../../hooks/useSession';
import { LogOut, Bot, Shield } from 'lucide-react';

export default function Navbar() {
  const { user, logout } = useAuth();
  const { isGlobalAdmin } = useSession();

  const handleLogout = async () => {
    await logout();
    window.location.href = '/';
  };

  return (
    <nav className="bg-discord-dark border-b border-gray-700">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center">
            <Link to="/" className="flex items-center space-x-2">
              <Bot className="h-8 w-8 text-discord-blurple" />
              <span className="text-xl font-bold text-white">Discord Bot Dashboard</span>
            </Link>
          </div>

          {user && (
            <div className="flex items-center space-x-4">
              {isGlobalAdmin && (
                <Link
                  to="/admin/bots"
                  data-testid="nav-admin-bots"
                  className="flex items-center space-x-1 px-3 py-2 rounded-md text-sm font-medium text-gray-300 hover:text-white hover:bg-discord-gray transition"
                >
                  <Shield className="h-4 w-4" />
                  <span>Admin · Bots</span>
                </Link>
              )}
              <div className="flex items-center space-x-2">
                {user.avatar ? (
                  <img
                    src={`https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.png`}
                    alt={user.username}
                    className="h-8 w-8 rounded-full"
                  />
                ) : (
                  <div className="h-8 w-8 rounded-full bg-discord-blurple flex items-center justify-center text-white font-bold">
                    {user.username[0].toUpperCase()}
                  </div>
                )}
                <span className="text-white">{user.username}</span>
              </div>
              <button
                onClick={handleLogout}
                className="flex items-center space-x-1 px-3 py-2 rounded-md text-sm font-medium text-gray-300 hover:text-white hover:bg-discord-gray transition"
              >
                <LogOut className="h-4 w-4" />
                <span>Logout</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}
