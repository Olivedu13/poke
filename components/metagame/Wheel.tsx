import React, { useState, useRef } from 'react';
import { motion, useAnimation, AnimatePresence } from 'framer-motion';
import { api } from '../../services/api';
import { useGameStore } from '../../store/gameStore';
import confetti from 'canvas-confetti';
import { ASSETS_BASE_URL } from '../../config';
import { playSfx } from '../../utils/soundEngine';

interface WheelSegment {
  type: 'GOLD' | 'XP' | 'ITEM' | 'POKEMON';
  value?: number;
  id?: string | number;
  label: string;
  img?: string;
  color: string;
  isMystery?: boolean;
}

const getItemIcon = (id: string | number | undefined) => {
  if (!id) return `${ASSETS_BASE_URL}/pokeball.webp`;
  const strId = String(id);
  if (strId.includes('heal')) return `${ASSETS_BASE_URL}/soin.webp`;
  if (strId.includes('atk')) return `${ASSETS_BASE_URL}/attaque.webp`;
  if (strId.includes('def')) return `${ASSETS_BASE_URL}/defense.webp`;
  if (strId.includes('ball') || strId.includes('capture')) return `${ASSETS_BASE_URL}/pokeball.webp`;
  if (strId.includes('joker')) return `${ASSETS_BASE_URL}/joker.webp`;
  if (strId.includes('xp')) return `${ASSETS_BASE_URL}/xp.webp`;
  if (strId.includes('mirror') || strId.includes('traitor')) return `${ASSETS_BASE_URL}/miroir.webp`;
  return `${ASSETS_BASE_URL}/jetons.webp`;
};

const generatePreviewSegments = (bet: number): WheelSegment[] => {
  const genericPoke = `${ASSETS_BASE_URL}/pokeball.webp`;
  const genericItem = `${ASSETS_BASE_URL}/jetons.webp`;
  const mult = bet === 10 ? 15 : bet === 5 ? 5 : 1;

  // Ordre identique au serveur, sans doublons adjacents
  return [
    { type: 'GOLD', value: 50 * mult, label: `${50 * mult} OR`, color: '#fbbf24' },
    { type: 'XP', value: 100 * mult, label: `${100 * mult} XP`, color: '#3b82f6' },
    { type: 'ITEM', label: 'POTION', img: genericItem, color: '#a855f7', isMystery: true },
    { type: 'GOLD', value: 200 * mult, label: `${200 * mult} OR`, color: '#fbbf24' },
    { type: 'POKEMON', label: 'POKEMON', img: genericPoke, color: '#ef4444', isMystery: true },
    { type: 'XP', value: 250 * mult, label: `${250 * mult} XP`, color: '#3b82f6' },
    { type: 'ITEM', label: bet >= 5 ? 'SUPER POTION' : 'POKEBALL', img: genericItem, color: '#a855f7', isMystery: true },
    { type: 'GOLD', value: 10000 * (bet === 10 ? 3 : bet === 5 ? 1.5 : 1), label: 'JACKPOT 💰', color: '#10b981' },
  ];
};

export const Wheel: React.FC = () => {
  const { user, spendCurrency, fetchCollection, fetchInventory, fetchUser } = useGameStore();
  const controls = useAnimation();
  const rotationRef = useRef(0);
  const [spinning, setSpinning] = useState(false);
  const [bet, setBet] = useState(1);
  const [segments, setSegments] = useState<WheelSegment[]>(generatePreviewSegments(1));
  const [wonSegment, setWonSegment] = useState<WheelSegment | null>(null);

  const handleBetChange = (newBet: number) => {
    if (spinning) return;
    playSfx('CLICK');
    setBet(newBet);
    setSegments(generatePreviewSegments(newBet));
  };

  const spin = async () => {
    if (!user || user.tokens < bet || spinning) return;

    setSpinning(true);
    setWonSegment(null);
    spendCurrency('TOKEN', bet);
    playSfx('SPIN');

    const startRotation = rotationRef.current + 360 * 5;
    controls.start({
      rotate: startRotation,
      transition: { duration: 2, ease: 'linear', repeat: Infinity },
    });

    try {
      let targetIndex = 0;
      let newSegments = segments;
      let apiResponse: any = null;

      try {
        apiResponse = await api.post('/wheel/spin', { bet });

        if (apiResponse.data.success) {
          targetIndex = apiResponse.data.result_index;
          if (apiResponse.data.segments && Array.isArray(apiResponse.data.segments) && apiResponse.data.segments.length > 0) {
            newSegments = apiResponse.data.segments.map((s: any) => ({
              ...s,
              img: s.type === 'POKEMON'
                ? `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${s.id}.png`
                : s.img,
            }));
          }
        } else {
          controls.stop();
          setSpinning(false);
          return;
        }
      } catch (e) {
        targetIndex = Math.floor(Math.random() * 8);
      }

      controls.stop();
      setSegments(newSegments);
      const segmentBaseAngle = targetIndex * 45 + 22.5;
      const targetRotation = rotationRef.current + 1440 + (360 - segmentBaseAngle - (rotationRef.current % 360));
      rotationRef.current = targetRotation;

      await controls.start({
        rotate: targetRotation,
        transition: { duration: 4, type: 'spring', stiffness: 20, damping: 15, mass: 1.5 },
      });

      const winner = newSegments[targetIndex];
      setWonSegment(winner);
      playSfx('REWARD');

      if (apiResponse?.data && (apiResponse.data.new_gold !== undefined || apiResponse.data.new_xp !== undefined)) {
        useGameStore.setState((state) => ({
          user: state.user
            ? {
                ...state.user,
                gold: apiResponse.data.new_gold ?? state.user.gold,
                global_xp: apiResponse.data.new_xp ?? state.user.global_xp,
                tokens: apiResponse.data.new_tokens ?? state.user.tokens,
              }
            : null,
        }));
      }

      if (winner.type === 'POKEMON') {
        await fetchCollection();
      } else if (winner.type === 'ITEM') {
        await fetchInventory();
      }

      if (winner.type === 'POKEMON' || winner.type === 'ITEM' || (winner.value && winner.value > 100)) {
        confetti({ particleCount: 150, spread: 100, origin: { y: 0.6 }, zIndex: 100 });
      }
    } catch (e) {
      console.error('[Wheel] Spin error:', e);
    } finally {
      setSpinning(false);
    }
  };

  const getSegmentImage = (seg: WheelSegment) => {
    if (seg.isMystery) return seg.img;
    if (seg.type === 'POKEMON')
      return seg.img || `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${seg.id}.png`;
    if (seg.type === 'ITEM') return getItemIcon(seg.id);
    if (seg.type === 'GOLD') return `${ASSETS_BASE_URL}/credits.webp`;
    return `${ASSETS_BASE_URL}/xp.webp`;
  };

  const buildGradient = () => {
    let grad = 'conic-gradient(';
    segments.forEach((seg, i) => {
      const start = i * 45;
      const end = (i + 1) * 45;
      const color = i % 2 === 0 ? '#1e293b' : '#0f172a';
      grad += `${color} ${start}deg ${end}deg, `;
    });
    grad = grad.slice(0, -2) + ')';
    return grad;
  };

  return (
    <div className="flex flex-col items-center justify-start min-h-screen px-4 py-6 pb-28 relative overflow-hidden">
      {/* Background glow */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-cyan-900/20 via-slate-950 to-slate-950 pointer-events-none" />

      {/* Title */}
      <div className="text-center z-10 mb-4">
        <h2 className="text-2xl sm:text-4xl font-display font-black text-transparent bg-clip-text bg-gradient-to-b from-yellow-300 to-yellow-600 mb-1">
          ROUE MYSTÈRE
        </h2>
        <p className="text-slate-400 font-mono text-sm flex items-center justify-center gap-2">
          JETONS :{' '}
          <span className="text-cyan-400 font-bold flex items-center gap-1">
            {user?.tokens}
            <img src={`${ASSETS_BASE_URL}/jetons.webp`} className="w-4 h-4" alt="jetons" />
          </span>
        </p>
      </div>

      {/* Wheel */}
      <div className="relative w-[75vw] h-[75vw] max-w-[320px] max-h-[320px] sm:max-w-[400px] sm:max-h-[400px] z-10 mb-6">
        {/* Arrow */}
        <div className="absolute -top-3 sm:-top-4 left-1/2 -translate-x-1/2 z-30 w-0 h-0 border-l-[12px] sm:border-l-[16px] border-l-transparent border-r-[12px] sm:border-r-[16px] border-r-transparent border-t-[24px] sm:border-t-[32px] border-t-white drop-shadow-xl" />

        {/* Wheel */}
        <motion.div
          className="w-full h-full rounded-full border-4 sm:border-8 border-slate-800 bg-slate-900 relative overflow-hidden shadow-[0_0_60px_rgba(6,182,212,0.2)]"
          animate={controls}
          style={{ background: buildGradient() }}
        >
          {/* Dividers */}
          {[0, 45, 90, 135, 180, 225, 270, 315].map((deg) => (
            <div
              key={deg}
              className="absolute top-0 left-1/2 w-[1px] h-[50%] bg-white/10 origin-bottom -translate-x-1/2"
              style={{ transform: `rotate(${deg}deg)` }}
            />
          ))}

          {/* Segment Images */}
          {Array.isArray(segments) &&
            segments.map((seg, i) => (
              <div key={i} className="absolute top-0 left-0 w-full h-full" style={{ transform: `rotate(${i * 45}deg)` }}>
                <div
                  className="absolute left-1/2 top-[8%] -translate-x-1/2 flex flex-col items-center justify-center w-[16vw] max-w-[70px]"
                  style={{ transform: 'rotate(22.5deg)' }}
                >
                  <img src={getSegmentImage(seg)} className="w-full h-auto object-contain" alt="Reward" />
                </div>
              </div>
            ))}
        </motion.div>

        {/* Center */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[18%] h-[18%] bg-gradient-to-br from-slate-800 to-slate-950 rounded-full border-2 sm:border-4 border-cyan-500 z-20 flex items-center justify-center shadow-[0_0_30px_rgba(6,182,212,0.4)]">
          <img
            src={`${ASSETS_BASE_URL}/pokeball.webp`}
            className={`w-[55%] h-[55%] opacity-80 ${spinning ? 'animate-spin' : ''}`}
            alt="Pokeball"
          />
        </div>
      </div>

      {/* Bet Selection */}
      <div className="flex flex-col items-center gap-3 z-10 w-full max-w-sm px-4">
        <div className="flex gap-2 w-full justify-center bg-slate-900/80 p-2 rounded-xl border border-slate-800">
          {[1, 5, 10].map((amt) => (
            <button
              key={amt}
              onClick={() => handleBetChange(amt)}
              disabled={spinning}
              className={`flex-1 py-3 rounded-lg font-display font-bold text-base transition-all flex flex-col items-center gap-0.5 ${
                bet === amt
                  ? 'bg-cyan-600 text-white shadow-[0_0_15px_rgba(6,182,212,0.5)] scale-105'
                  : 'bg-slate-950 text-slate-500 border border-slate-800'
              }`}
            >
              <span>x{amt}</span>
              <span className="text-[8px] font-mono opacity-70 uppercase">
                {amt === 1 ? 'Commun' : amt === 5 ? 'Rare' : 'Légend.'}
              </span>
            </button>
          ))}
        </div>

        <button
          onClick={spin}
          disabled={spinning || (user?.tokens || 0) < bet}
          className={`w-full py-4 rounded-xl font-display font-black text-lg tracking-widest text-black shadow-2xl transition-all active:scale-[0.98] ${
            spinning || (user?.tokens || 0) < bet
              ? 'bg-slate-700 cursor-not-allowed opacity-50'
              : 'bg-gradient-to-r from-yellow-400 to-yellow-600 shadow-[0_0_30px_rgba(234,179,8,0.4)]'
          }`}
        >
          {spinning ? 'LA ROUE TOURNE...' : 'LANCER !'}
        </button>
      </div>

      {/* Win Modal */}
      <AnimatePresence>
        {wonSegment && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-xl p-4"
            onClick={() => setWonSegment(null)}
          >
            <motion.div
              initial={{ scale: 0.5, y: 100 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.5, y: 100 }}
              className="relative flex flex-col items-center justify-center w-full max-w-sm"
            >
              {/* Spinning Background */}
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[150vw] h-[150vw] bg-[conic-gradient(from_0deg,transparent_0deg,rgba(255,255,255,0.1)_20deg,transparent_40deg)] animate-spin-slow pointer-events-none rounded-full" />
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[250px] h-[250px] bg-yellow-500/20 blur-[100px] rounded-full" />

              <h2 className="text-3xl sm:text-5xl font-display font-black text-transparent bg-clip-text bg-gradient-to-b from-yellow-300 to-yellow-600 drop-shadow-lg mb-4 text-center animate-bounce">
                {wonSegment.type === 'POKEMON' ? 'CAPTURÉ !' : 'GAGNÉ !'}
              </h2>

              <div className="relative w-48 h-48 sm:w-64 sm:h-64 mb-6">
                <motion.img
                  src={getSegmentImage(wonSegment)}
                  className="w-full h-full object-contain drop-shadow-[0_0_50px_rgba(255,255,255,0.5)]"
                  animate={{ scale: [1, 1.1, 1], rotate: [0, 5, -5, 0] }}
                  transition={{ duration: 2, repeat: Infinity }}
                  alt="Prize"
                />
              </div>

              <div className="bg-slate-900/80 border border-yellow-500/50 rounded-2xl p-6 text-center shadow-2xl backdrop-blur-md w-full">
                <p className="text-slate-400 font-mono uppercase text-xs mb-2">Récompense obtenue</p>
                <h3 className="text-2xl font-display font-bold text-white mb-4" style={{ color: wonSegment.color }}>
                  {wonSegment.label}
                </h3>
                <button className="w-full bg-yellow-500 active:bg-yellow-400 text-black font-bold font-display px-6 py-3 rounded-full text-lg shadow-lg active:scale-95 transition-transform">
                  RÉCUPÉRER
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
