import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { authAPI } from '../services/api';
import { Bot, Shield, Users, Sparkles } from 'lucide-react';

export default function Home() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && user) {
      navigate('/dashboard');
    }
  }, [user, loading, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-discord-dark via-gray-900 to-discord-gray flex items-center justify-center">
        <div className="text-white text-xl">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-discord-dark via-gray-900 to-discord-gray flex items-center justify-center px-4 py-8">
      <div className="max-w-4xl w-full">
        <div className="text-center mb-8 md:mb-12">
          <Bot className="h-12 w-12 md:h-20 md:w-20 text-discord-blurple mx-auto mb-4 md:mb-6" />
          <h1 className="text-3xl md:text-5xl font-bold text-white mb-2 md:mb-4">
            Discord Bot Dashboard
          </h1>
          <p className="text-base md:text-xl text-gray-300 mb-6 md:mb-8 px-4">
            Manage your Discord bot settings with ease
          </p>
          <a
            href={authAPI.loginUrl}
            className="inline-flex items-center px-6 py-3 md:px-8 md:py-4 bg-discord-blurple hover:bg-blue-600 text-white font-semibold rounded-lg transition shadow-lg hover:shadow-xl text-sm md:text-base"
          >
            <svg className="w-5 h-5 md:w-6 md:h-6 mr-2" fill="currentColor" viewBox="0 0 24 24">
              <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515a.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0a12.64 12.64 0 0 0-.617-1.25a.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057a19.9 19.9 0 0 0 5.993 3.03a.078.078 0 0 0 .084-.028a14.09 14.09 0 0 0 1.226-1.994a.076.076 0 0 0-.041-.106a13.107 13.107 0 0 1-1.872-.892a.077.077 0 0 1-.008-.128a10.2 10.2 0 0 0 .372-.292a.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127a12.299 12.299 0 0 1-1.873.892a.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028a19.839 19.839 0 0 0 6.002-3.03a.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419c0-1.333.956-2.419 2.157-2.419c1.21 0 2.176 1.096 2.157 2.42c0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419c0-1.333.955-2.419 2.157-2.419c1.21 0 2.176 1.096 2.157 2.42c0 1.333-.946 2.418-2.157 2.418z"/>
            </svg>
            Login with Discord
          </a>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 mt-8 md:mt-16">
          <div className="bg-discord-gray p-4 md:p-6 rounded-lg border border-gray-700">
            <Sparkles className="h-8 w-8 md:h-10 md:w-10 text-discord-blurple mb-3 md:mb-4" />
            <h3 className="text-base md:text-lg font-semibold text-white mb-1 md:mb-2">AI Configuration</h3>
            <p className="text-gray-400 text-xs md:text-sm">
              Configure AI personality, response rates, and API settings
            </p>
          </div>

          <div className="bg-discord-gray p-4 md:p-6 rounded-lg border border-gray-700">
            <Shield className="h-8 w-8 md:h-10 md:w-10 text-green-500 mb-3 md:mb-4" />
            <h3 className="text-base md:text-lg font-semibold text-white mb-1 md:mb-2">Moderation</h3>
            <p className="text-gray-400 text-xs md:text-sm">
              Manage auto-moderation, toxicity detection, and action logs
            </p>
          </div>

          <div className="bg-discord-gray p-4 md:p-6 rounded-lg border border-gray-700">
            <Users className="h-8 w-8 md:h-10 md:w-10 text-blue-500 mb-3 md:mb-4" />
            <h3 className="text-base md:text-lg font-semibold text-white mb-1 md:mb-2">Welcome System</h3>
            <p className="text-gray-400 text-xs md:text-sm">
              Customize welcome messages and greet new members
            </p>
          </div>

          <div className="bg-discord-gray p-4 md:p-6 rounded-lg border border-gray-700">
            <Shield className="h-8 w-8 md:h-10 md:w-10 text-purple-500 mb-3 md:mb-4" />
            <h3 className="text-base md:text-lg font-semibold text-white mb-1 md:mb-2">Verification</h3>
            <p className="text-gray-400 text-xs md:text-sm">
              Set up member verification with buttons or commands
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
