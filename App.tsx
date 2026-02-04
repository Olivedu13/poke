
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
import { ASSETS_BASE_URL } from './config';
import { playSfx } from './utils/soundEngine';
import { api } from './services/api';

const App: React.FC = () => {
  const { currentView, user, logout, setView, setPvpNotification, pvpNotification } = useGameStore();
  const [showSettings, setShowSettings] = useState(false);
  const [showPinModal, setShowPinModal] = useState(false);

  // Polling global pour les invitations PVP
  useEffect(() => {
    if (!user) return;

    const checkPvPInvitations = async () => {
      try {
        const res = await api.get('/pvp_lobby.php?action=get_challenges');
        if (res.data.success && res.data.challenges?.length > 0) {
          // S'il y a des invitations et qu'on n'affiche pas déjà une notification
          if (!pvpNotification) {
            const challenge = res.data.challenges[0];
            setPvpNotification({
              challengeId: challenge.id,
              challengerName: challenge.challenger_name
            });
            playSfx('victory'); // Son de notification
          }
        }
      } catch (e) {
        console.error('Erreur vérification invitations PVP:', e);
      }
    };

    // Vérifier immédiatement
    checkPvPInvitations();

    // Puis toutes les 5 secondes
    const interval = setInterval(checkPvPInvitations, 5000);
    return () => clearInterval(interval);
  }, [user, pvpNotification, setPvpNotification]);

  // "Réveil" du moteur audio au premier clic utilisateur
  useEffect(() => {
    const unlockAudio = () => {
        playSfx('CLICK'); // Joue un son silencieux ou très court pour débloquer le contexte
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

  const handleSettingsClick = () => {
    setShowPinModal(true);
  };

  const handlePinSuccess = () => {
    setShowPinModal(false);
    setShowSettings(true);
  };

  return (
    <div className="h-screen w-full bg-slate-950 text-white font-sans selection:bg-cyan-500 selection:text-black flex flex-col">
      {/* Background Ambience / Grid Effect */}
      <div className="fixed inset-0 z-0 pointer-events-none bg-[linear-gradient(to_right,#1e293b_1px,transparent_1px),linear-gradient(to_bottom,#1e293b_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] opacity-20"></div>

      {/* Top Navbar - Mobile First */}
      <header className="relative z-20 w-full border-b border-cyan-900/50 bg-slate-950/90 backdrop-blur-sm shrink-0">
        <div className="max-w-7xl mx-auto px-2 md:px-4 py-2 flex flex-col gap-2">
          
          {/* Ligne 1: Logo + Username + Stats */}
          <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 cursor-pointer group" onClick={() => setView('DASHBOARD')}>
                 <div className="w-8 h-8 md:w-10 md:h-10 bg-gradient-to-br from-cyan-400 to-blue-600 rounded-lg flex items-center justify-center shadow-lg shadow-cyan-500/20 overflow-hidden border border-cyan-300 group-hover:scale-105 transition-transform">
                    <img src={`${ASSETS_BASE_URL}/pokeball.webp`} alt="Logo" className="w-6 h-6 md:w-8 md:h-8 object-contain" />
                 </div>
                 <h1 className="text-sm md:text-xl font-display font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-500 tracking-wider">
                  POKE-EDU
                </h1>
              </div>
              
              {user && (
                  <div className="flex items-center gap-2">
                      <span className="text-xs font-display font-bold text-cyan-400 hidden sm:inline">{user.username}</span>
                      <div className="flex items-center gap-2 bg-slate-900/80 px-2 py-1 rounded-full border border-slate-700">
                          <div className="flex items-center gap-1" title="Crédits">
                              <img src={`${ASSETS_BASE_URL}/credits.webp`} alt="Or" className="w-4 h-4 object-contain" />
                              <span className="text-[10px] md:text-xs text-yellow-400 font-mono font-bold">{user.gold}</span>
                          </div>
                          <div className="flex items-center gap-1 border-l border-slate-700 pl-2" title="Jetons">
                              <img src={`${ASSETS_BASE_URL}/jetons.webp`} alt="Jetons" className="w-4 h-4 object-contain" />
                              <span className="text-[10px] md:text-xs text-cyan-400 font-mono font-bold">{user.tokens}</span>
                          </div>
                      </div>
                  </div>
              )}
          </div>
          
          {/* Ligne 2: Navigation */}
          {user && (
              <nav className="flex items-center justify-between gap-2 w-full">
                <div className="flex gap-1 md:gap-2 flex-1 justify-start">
                  {[
                      { id: 'GAME', label: 'COMBAT', icon: '⚔️' },
                      { id: 'COLLECTION', label: 'ÉQUIPE', icon: '👥' },
                      { id: 'SHOP', label: 'SHOP', icon: '🏪' },
                      { id: 'WHEEL', label: 'ROUE', icon: '🎯' },
                  ].map(nav => (
                      <button 
                        key={nav.id}
                        onClick={() => setView(nav.id as any)}
                        className={`flex items-center gap-1 text-[10px] md:text-sm font-display uppercase tracking-wider transition-colors px-2 md:px-3 py-1.5 rounded-lg ${currentView === nav.id ? 'bg-cyan-600 text-white' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'}`}
                      >
                        <span className="text-sm md:hidden">{nav.icon}</span>
                        <span className="hidden md:inline">{nav.label}</span>
                      </button>
                  ))}
                </div>
                <button 
                  onClick={handleSettingsClick} 
                  className="text-[10px] md:text-sm bg-purple-900/20 text-purple-400 hover:bg-purple-900/40 px-2 md:px-3 py-1.5 rounded-lg transition-colors uppercase font-bold shrink-0"
                  title="Paramètres (Code requis)"
                >
                  <span className="md:hidden">⚙️</span>
                  <span className="hidden md:inline">PARAM</span>
                </button>
                <button 
                  onClick={logout} 
                  className="text-[10px] md:text-xs text-red-400 hover:text-red-300 bg-red-900/20 px-2 md:px-3 py-1.5 rounded-lg hover:bg-red-900/40 transition-colors uppercase font-bold shrink-0"
                >
                  <span className="md:hidden">❌</span>
                  <span className="hidden md:inline">DÉCO</span>
                </button>
              </nav>
          )}
        </div>
      </header>

      {/* Main Content Area - Mobile First */}
      <main className="relative z-10 flex-1 w-full overflow-y-auto overflow-x-hidden flex flex-col">
        {currentView === 'AUTH' && (
          <div className="p-4 md:p-8 max-w-7xl mx-auto w-full">
            <AuthForm />
          </div>
        )}
        
        {currentView === 'DASHBOARD' && user && (
          <div className="p-4 md:p-8 max-w-7xl mx-auto w-full animate-in fade-in zoom-in-95 duration-300">
            <ParentDashboard />
          </div>
        )}
        
        {currentView === 'GAME' && user && (
          <div className="flex-1 flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-300">
            <BattleScene />
          </div>
        )}
        
        {currentView === 'WHEEL' && user && (
          <div className="p-4 md:p-8 max-w-7xl mx-auto w-full animate-in fade-in zoom-in-95 duration-300">
            <Wheel />
          </div>
        )}
        
        {currentView === 'COLLECTION' && user && (
          <div className="p-4 md:p-8 max-w-7xl mx-auto w-full animate-in fade-in zoom-in-95 duration-300">
            <Collection />
          </div>
        )}
        
        {currentView === 'SHOP' && user && (
          <div className="p-4 md:p-8 max-w-7xl mx-auto w-full animate-in fade-in zoom-in-95 duration-300">
            <Shop />
          </div>
        )}
      </main>

      {/* Notification PVP globale */}
      {user && <PvPNotification />}
      
      {/* Footer System Status */}
      <footer className="relative z-10 border-t border-slate-900 bg-slate-950 py-2">
         <div className="max-w-7xl mx-auto px-4 flex justify-between items-center text-[10px] text-slate-600 font-mono uppercase">
            <span>Système: v1.0.0-alpha</span>
            <span className="flex items-center gap-2">
              Serveur: <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span> IONOS-Hybrid
            </span>
         </div>
      </footer>

      {/* Modals */}
      {showPinModal && (
        <PinCodeModal
          onSuccess={handlePinSuccess}
          onCancel={() => setShowPinModal(false)}
        />
      )}
      {showSettings && (
        <SettingsPanel onClose={() => setShowSettings(false)} />
      )}
    </div>
  );
};

export default App;
