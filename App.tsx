import React, { useEffect, useState } from 'react';
import { useGameStore } from './store/gameStore';
import { AuthForm } from './components/auth/AuthForm';
import { ParentDashboard } from './components/dashboard/ParentDashboard';
import { BattleScene } from './components/battle/BattleScene';
import { Wheel } from './components/metagame/Wheel';
import { Collection } from './components/metagame/Collection';
import { Shop } from './components/metagame/Shop';
import { SettingsPanel } from './components/dashboard/SettingsPanel';
import { PinCodeModal } from './components/dashboard/PinCodeModal';
import { PvPNotification } from './components/battle/PvPNotification';
import { AdminPanel } from './components/dashboard/AdminPanel';
import { ASSETS_BASE_URL } from './config';
import { playSfx } from './utils/soundEngine';
import { socketService } from './services/socket';

// Navigation items with custom icons
const NAV_ITEMS = [
  { id: 'GAME', label: 'Combat', icon: 'fight_icon.webp' },
  { id: 'COLLECTION', label: 'Équipe', icon: 'team_icon.webp' },
  { id: 'SHOP', label: 'Boutique', icon: 'shop_icon.webp' },
  { id: 'WHEEL', label: 'Roue', icon: 'wheel_icon.webp' },
];

const App: React.FC = () => {
  const { currentView, user, logout, setView, setPvpNotification, pvpNotification, fetchUser, token } = useGameStore();
  const [showSettings, setShowSettings] = useState(false);
  const [showPinModal, setShowPinModal] = useState(false);
  const [showAdmin, setShowAdmin] = useState(false);
  const [logoClickCount, setLogoClickCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  // Try to restore session on app load
  useEffect(() => {
    const restoreSession = async () => {
      if (token && !user) {
        await fetchUser();
        // After fetching, if user is now set, switch to GAME view
        const currentUser = useGameStore.getState().user;
        if (currentUser) {
          useGameStore.setState({ currentView: 'GAME' });
        }
      }
      setIsLoading(false);
    };
    restoreSession();
  }, []);

  // Audio unlock on first interaction
  useEffect(() => {
    const unlockAudio = () => {
      playSfx('CLICK');
      window.removeEventListener('click', unlockAudio);
      window.removeEventListener('touchstart', unlockAudio);
    };
    window.addEventListener('click', unlockAudio);
    window.addEventListener('touchstart', unlockAudio);
    return () => {
      window.removeEventListener('click', unlockAudio);
      window.removeEventListener('touchstart', unlockAudio);
    };
  }, []);

  // Connect to socket when logged in
  useEffect(() => {
    if (user) {
      const token = localStorage.getItem('poke_edu_token');
      if (token) {
        socketService.connect(token);
        
        // Listen for PvP challenges
        socketService.on('pvp:challenge_received', (data: any) => {
          setPvpNotification({
            challengeId: data.challengeId,
            challengerName: data.challengerName
          });
          playSfx('WIN');
        });

        // Listen for match creation (when you're the challenger)
        socketService.on('pvp:match_created', (data: { matchId: number }) => {
          localStorage.setItem('pvp_match_id', String(data.matchId));
        });

        // Listen for user updates from admin (tokens, gold, etc.)
        socketService.on('user:updated', (data: any) => {
          // Directly update user state with new values
          useGameStore.setState((state) => ({
            user: state.user ? {
              ...state.user,
              gold: data.gold ?? state.user.gold,
              tokens: data.tokens ?? state.user.tokens,
              global_xp: data.global_xp ?? state.user.global_xp,
            } : null
          }));
        });
      }
    }
    
    return () => {
      socketService.off('pvp:challenge_received');
      socketService.off('pvp:match_created');
      socketService.off('user:updated');
      socketService.disconnect();
    };
  }, [user, setPvpNotification]);

  const handleSettingsClick = () => {
    playSfx('CLICK');
    setShowPinModal(true);
  };

  const handlePinSuccess = () => {
    setShowPinModal(false);
    setShowSettings(true);
  };

  const handleLogout = () => {
    playSfx('CLICK');
    socketService.disconnect();
    logout();
  };

  // Admin mode: tap logo 5 times or use ?admin=1 URL param
  const handleLogoClick = () => {
    const newCount = logoClickCount + 1;
    setLogoClickCount(newCount);
    if (newCount >= 5) {
      setShowAdmin(true);
      setLogoClickCount(0);
    }
    // Reset after 3 seconds
    setTimeout(() => setLogoClickCount(0), 3000);
  };

  // Check URL for admin param
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('admin') === '1') {
      setShowAdmin(true);
    }
  }, []);

  const handleNavClick = (view: string) => {
    playSfx('CLICK');
    setView(view as any);
  };

  // Loading screen
  if (isLoading) {
    return (
      <div className="h-screen h-[100dvh] bg-slate-950 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-cyan-400 font-display">CHARGEMENT...</p>
        </div>
      </div>
    );
  }

  // Auth screen - Mobile First
  if (!user || currentView === 'AUTH') {
    return (
      <div className="h-screen h-[100dvh] bg-slate-950 flex flex-col overflow-hidden">
        {/* Background */}
        <div className="fixed inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-slate-900 via-slate-950 to-slate-950 pointer-events-none" />
        <div className="fixed inset-0 bg-[linear-gradient(to_right,#1e293b_1px,transparent_1px),linear-gradient(to_bottom,#1e293b_1px,transparent_1px)] bg-[size:3rem_3rem] opacity-20 pointer-events-none" />
        
        <main className="relative z-10 flex-1 flex items-center justify-center p-4 overflow-hidden">
          <AuthForm />
        </main>
      </div>
    );
  }

  return (
    <div className="h-screen h-[100dvh] bg-slate-950 flex flex-col overflow-hidden">
      {/* Background */}
      <div className="fixed inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-cyan-950/20 via-slate-950 to-slate-950 pointer-events-none" />
      
      {/* === TOP HEADER WITH NAV === */}
      <header className="relative z-20 bg-slate-950/95 backdrop-blur-md border-b border-slate-800/50 shrink-0">
        {/* Row 1: Logo + Stats */}
        <div className="px-2 py-1 flex items-center justify-between gap-2">
          {/* Logo - tap 5 times for admin */}
          <button 
            onClick={handleLogoClick}
            className="flex items-center gap-2 active:scale-95 transition-transform"
          >
            <div className="w-8 h-8 bg-gradient-to-br from-cyan-400 to-blue-600 rounded-lg flex items-center justify-center shadow-lg overflow-hidden">
              <img src={`${ASSETS_BASE_URL}/pokeball.webp`} alt="Logo" className="w-6 h-6 object-contain" />
            </div>
            <span className="font-display font-bold text-sm text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-500 hidden sm:block">
              POKE-EDU
            </span>
          </button>

          {/* User Stats + Admin + XP + Logout */}
          <div className="flex items-center gap-2">
            {/* Player name */}
            <span className="text-xs text-white/80 font-bold truncate max-w-[60px] sm:max-w-[100px]">{user.username}</span>
            {/* Gold */}
            <div className="flex items-center gap-1 bg-slate-900/80 px-2 py-1 rounded-full border border-slate-700/50">
              <img src={`${ASSETS_BASE_URL}/credits.webp`} alt="Or" className="w-4 h-4" />
              <span className="text-xs text-yellow-400 font-mono font-bold">{user.gold}</span>
            </div>
            {/* Tokens */}
            <div className="flex items-center gap-1 bg-slate-900/80 px-2 py-1 rounded-full border border-slate-700/50">
              <img src={`${ASSETS_BASE_URL}/jetons.webp`} alt="Jetons" className="w-4 h-4" />
              <span className="text-xs text-cyan-400 font-mono font-bold">{user.tokens}</span>
            </div>
            {/* XP */}
            <div className="flex items-center gap-1 bg-slate-900/80 px-2 py-1 rounded-full border border-slate-700/50">
              <img src={`${ASSETS_BASE_URL}/xp.webp`} alt="EXP" className="w-4 h-4" />
              <span className="text-xs text-cyan-300 font-mono font-bold">{user.global_xp ?? 0} EXP</span>
            </div>
            {/* Admin button - long press */}
            <button
              onClick={() => setShowAdmin(true)}
              onContextMenu={(e) => { e.preventDefault(); setShowAdmin(true); }}
              className="w-6 h-6 flex items-center justify-center rounded-full bg-slate-800 border border-slate-700 text-slate-500 hover:text-red-400 hover:border-red-500/50 active:scale-90 transition-all"
              title="Administrateur"
            >
              <span className="text-[10px]">⚙</span>
            </button>
            {/* Logout button */}
            <button onClick={handleLogout} className="ml-1 px-3 py-1 rounded-full bg-red-700 hover:bg-red-800 text-white text-xs font-bold">Sortie</button>
          </div>
        </div>
        
        {/* Row 2: Navigation Icons */}
        <div className="flex items-center justify-around px-0">
          {NAV_ITEMS.map((item) => {
            const isActive = currentView === item.id;
            return (
              <button
                key={item.id}
                onClick={() => handleNavClick(item.id)}
                className={`relative flex flex-col items-center px-1 py-0.5 rounded transition-all active:scale-95 ${
                  isActive 
                    ? 'bg-cyan-600/20 text-cyan-400' 
                    : 'text-slate-500 hover:text-slate-300'
                }`}
              >
                <img 
                  src={`${ASSETS_BASE_URL}/${item.icon}?v=2`} 
                  alt={item.label} 
                  className={`w-10 h-10 sm:w-12 sm:h-12 lg:w-16 lg:h-16 object-contain transition-all ${isActive ? 'brightness-125' : 'brightness-75 opacity-70'}`}
                />
              </button>
            );
          })}
          {/* Params */}
          <button
            onClick={() => setShowPinModal(true)}
            className="flex flex-col items-center px-1 py-0.5 rounded text-slate-500 hover:text-slate-300 active:scale-95 transition-all"
          >
            <img 
              src={`${ASSETS_BASE_URL}/params_icon.webp?v=2`} 
              alt="Paramètres" 
              className="w-10 h-10 sm:w-12 sm:h-12 lg:w-16 lg:h-16 object-contain brightness-75 opacity-70"
            />
          </button>
        </div>
      </header>

      {/* === MAIN CONTENT === */}
      <main className="relative z-10 flex-1 overflow-x-hidden flex flex-col">
        {currentView === 'DASHBOARD' && (
          <div className="p-4 max-w-4xl mx-auto flex-1 overflow-y-auto">
            <ParentDashboard />
          </div>
        )}
        
        {currentView === 'GAME' && (
          <div className="flex-1 flex flex-col overflow-hidden lg:max-w-none lg:mx-0">
            <BattleScene />
          </div>
        )}
        
        {currentView === 'WHEEL' && (
          <div className="p-2 max-w-lg lg:max-w-2xl mx-auto flex-1 overflow-hidden">
            <Wheel />
          </div>
        )}
        
        {currentView === 'COLLECTION' && (
          <div className="px-0 sm:px-2 sm:max-w-4xl lg:max-w-6xl sm:mx-auto flex-1 overflow-y-auto">
            <Collection />
          </div>
        )}
        
        {currentView === 'SHOP' && (
          <div className="p-2 max-w-4xl lg:max-w-6xl mx-auto flex-1 overflow-y-auto">
            <Shop />
          </div>
        )}
      </main>

      {/* === MODALS & OVERLAYS === */}
      {user && <PvPNotification />}
      
      {showPinModal && (
        <PinCodeModal
          onSuccess={handlePinSuccess}
          onCancel={() => setShowPinModal(false)}
        />
      )}
      
      {showSettings && (
        <SettingsPanel onClose={() => setShowSettings(false)} />
      )}
      
      {showAdmin && (
        <AdminPanel onClose={() => setShowAdmin(false)} />
      )}
    </div>
  );
};

export default App;
