
import React, { useEffect } from 'react';
import { useGameStore } from './store/gameStore';
import { AuthForm } from './components/auth/AuthForm';
import { ParentDashboard } from './components/dashboard/ParentDashboard';
import { BattleScene } from './components/battle/BattleScene';
import { Wheel } from './components/metagame/Wheel';
import { Collection } from './components/metagame/Collection';
import { Shop } from './components/metagame/Shop';
import { ASSETS_BASE_URL } from './config';
import { playSfx } from './utils/soundEngine';

const App: React.FC = () => {
  const { currentView, user, logout, setView } = useGameStore();

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

  return (
    <div className="min-h-screen w-full bg-slate-950 text-white font-sans selection:bg-cyan-500 selection:text-black flex flex-col">
      {/* Background Ambience / Grid Effect */}
      <div className="fixed inset-0 z-0 pointer-events-none bg-[linear-gradient(to_right,#1e293b_1px,transparent_1px),linear-gradient(to_bottom,#1e293b_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] opacity-20"></div>

      {/* Top Navbar */}
      <header className="relative z-20 w-full border-b border-cyan-900/50 bg-slate-950/50 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 py-3 flex flex-col md:flex-row justify-between items-center gap-4">
          
          <div className="flex items-center gap-4 md:gap-6">
              {/* NOM DU JOUEUR (Placé à gauche) */}
              {user && (
                  <div className="flex flex-col items-end border-r border-slate-800 pr-4 md:pr-6">
                      <span className="text-[10px] text-slate-500 font-mono uppercase tracking-widest">AGENT</span>
                      <span className="text-sm font-display font-bold text-cyan-400">{user.username}</span>
                  </div>
              )}

              <div className="flex items-center gap-3 cursor-pointer group" onClick={() => setView('DASHBOARD')}>
                 <div className="w-10 h-10 bg-gradient-to-br from-cyan-400 to-blue-600 rounded-lg flex items-center justify-center shadow-lg shadow-cyan-500/20 overflow-hidden border border-cyan-300 group-hover:scale-105 transition-transform">
                    <img src={`${ASSETS_BASE_URL}/pokeball.webp`} alt="Logo" className="w-8 h-8 object-contain" />
                 </div>
                 <h1 className="text-xl font-display font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-500 tracking-wider group-hover:text-cyan-300 transition-colors">
                  POKE-EDU
                </h1>
              </div>
          </div>
          
          {user && (
            <div className="flex flex-col md:flex-row items-center gap-6 w-full md:w-auto">
              <nav className="flex gap-4 overflow-x-auto w-full md:w-auto pb-2 md:pb-0 justify-center">
                {[
                    { id: 'GAME', label: 'COMBAT', icon: `${ASSETS_BASE_URL}/attaque.webp` },
                    { id: 'COLLECTION', label: 'ÉQUIPE', icon: `${ASSETS_BASE_URL}/pokeball.webp` },
                    { id: 'SHOP', label: 'BOUTIQUE', icon: `${ASSETS_BASE_URL}/credits.webp` },
                    { id: 'WHEEL', label: 'ROUE', icon: `${ASSETS_BASE_URL}/jetons.webp` },
                ].map(nav => (
                    <button 
                      key={nav.id}
                      onClick={() => setView(nav.id as any)}
                      className={`flex items-center gap-2 text-xs md:text-sm font-display uppercase tracking-wider hover:text-cyan-400 transition-colors whitespace-nowrap px-3 py-1 rounded-full border border-transparent ${currentView === nav.id ? 'bg-cyan-900/20 border-cyan-500/50 text-cyan-400' : 'text-slate-400'}`}
                    >
                      {/* Petit icône optionnel dans le menu */}
                      {nav.id === 'SHOP' || nav.id === 'WHEEL' ? (
                          <img src={nav.icon} alt={nav.label} className="w-4 h-4 object-contain" />
                      ) : null}
                      {nav.label}
                    </button>
                ))}
              </nav>

              <div className="flex items-center gap-4 pl-0 md:pl-6 border-l-0 md:border-l border-slate-800">
                <div className="flex flex-col items-end">
                   {/* NOM SUPPRIMÉ ICI */}
                   <div className="flex items-center gap-3 bg-slate-900/80 px-3 py-1 rounded-full border border-slate-700">
                       
                       {/* GOLD / CREDITS */}
                       <div className="flex items-center gap-1.5" title="Crédits">
                           <img src={`${ASSETS_BASE_URL}/credits.webp`} alt="Or" className="w-5 h-5 object-contain drop-shadow" />
                           <span className="text-[10px] md:text-xs text-yellow-400 font-mono font-bold">{user.gold}</span>
                       </div>

                       {/* TOKENS / JETONS */}
                       <div className="flex items-center gap-1.5 border-l border-slate-700 pl-3" title="Jetons">
                           <img src={`${ASSETS_BASE_URL}/jetons.webp`} alt="Jetons" className="w-5 h-5 object-contain drop-shadow" />
                           <span className="text-[10px] md:text-xs text-cyan-400 font-mono font-bold">{user.tokens}</span>
                       </div>

                       {/* XP */}
                       <div className="flex items-center gap-1.5 border-l border-slate-700 pl-3" title="Niveau Global">
                           <img src={`${ASSETS_BASE_URL}/xp.webp`} alt="XP" className="w-5 h-5 object-contain drop-shadow" />
                           <span className="text-[10px] md:text-xs text-purple-400 font-mono font-bold">{Math.floor(user.global_xp / 100) + 1}</span>
                       </div>

                   </div>
                </div>
                <button 
                  onClick={logout} 
                  className="text-xs text-red-400 hover:text-red-300 border border-red-900/50 bg-red-900/20 px-3 py-1 rounded hover:bg-red-900/40 transition-colors uppercase font-bold tracking-wider"
                >
                  DÉCONNEXION
                </button>
              </div>
            </div>
          )}
        </div>
      </header>

      {/* Main Content Area */}
      <main className="relative z-10 flex-grow p-4 md:p-8 max-w-7xl mx-auto w-full">
        {currentView === 'AUTH' && <AuthForm />}
        
        <div className="animate-in fade-in zoom-in-95 duration-300">
            {currentView === 'DASHBOARD' && user && <ParentDashboard />}
            {currentView === 'GAME' && user && <BattleScene />}
            {currentView === 'WHEEL' && user && <Wheel />}
            {currentView === 'COLLECTION' && user && <Collection />}
            {currentView === 'SHOP' && user && <Shop />}
        </div>
      </main>
      
      {/* Footer System Status */}
      <footer className="relative z-10 border-t border-slate-900 bg-slate-950 py-2">
         <div className="max-w-7xl mx-auto px-4 flex justify-between items-center text-[10px] text-slate-600 font-mono uppercase">
            <span>Système: v1.0.0-alpha</span>
            <span className="flex items-center gap-2">
              Serveur: <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span> IONOS-Hybrid
            </span>
         </div>
      </footer>
    </div>
  );
};

export default App;
