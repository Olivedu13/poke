import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ASSETS_BASE_URL } from '../../config';
import confetti from 'canvas-confetti';
import { playSfx } from '../../utils/soundEngine';

/*
 * Phases séquentielles de l'animation de capture Pokémon
 * ──────────────────────────────────────────────────────
 * idle      → Le Pokémon ennemi flotte, prêt pour la capture
 * throw     → La Pokéball est lancée en arc depuis le bas-droit
 * hit       → La Pokéball touche le Pokémon — flash blanc
 * absorb    → Le Pokémon rétrécit et disparaît dans la ball
 * fall      → La ball tombe au sol et rebondit
 * shake1‥3  → La ball oscille gauche/droite (1 à 3 fois)
 * click     → La ball se verrouille : "★ CLIC ! ★"
 * success   → Halo lumineux, étoiles, CAPTURÉ !
 * burst     → La ball éclate (échec)
 * escape    → Le Pokémon ressort, la ball disparaît
 */
type Phase =
  | 'idle' | 'throw' | 'hit' | 'absorb' | 'fall'
  | 'shake1' | 'shake2' | 'shake3'
  | 'click' | 'success'
  | 'burst' | 'escape';

interface Props {
  enemySprite: string;
  enemyName: string;
  success: boolean;
  onComplete: () => void;
}

/* ─── Layout constants (% of container) ─── */
const POKE_TOP = '18%';       // Enemy sprite vertical position
const BALL_GROUND_TOP = '62%'; // Where ball rests on ground
const BALL_START_TOP = '85%';  // Throw origin (bottom area)
const BALL_START_LEFT = '75%'; // Throw origin (right side)

export const CaptureAnimation: React.FC<Props> = ({
  enemySprite,
  enemyName,
  success,
  onComplete,
}) => {
  const [phase, setPhase] = useState<Phase>('idle');
  const dead = useRef(false);

  /* Utility: cancellable delay */
  const wait = (ms: number) =>
    new Promise<void>((resolve) => {
      const t = setTimeout(resolve, ms);
      // cleanup on unmount handled by dead ref check after await
      return t;
    });

  useEffect(() => {
    dead.current = false;

    (async () => {
      // Small initial pause to let the overlay fade in
      await wait(400);
      if (dead.current) return;

      // ── 1. THROW ──
      setPhase('throw');
      try { playSfx('SPIN'); } catch {}
      await wait(700);  // ball arc animation duration
      if (dead.current) return;

      // ── 2. HIT ──
      setPhase('hit');
      await wait(200);
      if (dead.current) return;

      // ── 3. ABSORB ──
      setPhase('absorb');
      await wait(600);
      if (dead.current) return;

      // ── 4. FALL ──
      setPhase('fall');
      await wait(800);
      if (dead.current) return;

      // ── 5. WOBBLES ──
      const wobbles = success ? 3 : Math.floor(Math.random() * 2) + 1; // 1-2 shakes if fail
      for (let i = 1; i <= wobbles; i++) {
        setPhase(`shake${i}` as Phase);
        await wait(900); // wobble + pause
        if (dead.current) return;
      }

      await wait(400);
      if (dead.current) return;

      if (success) {
        // ── 6a. CLICK ──
        setPhase('click');
        try { playSfx('REWARD'); } catch {}
        await wait(1000);
        if (dead.current) return;

        // ── 7a. SUCCESS ──
        setPhase('success');
        confetti({ particleCount: 200, spread: 140, origin: { y: 0.55 } });
        await wait(2800);
      } else {
        // ── 6b. BURST ──
        setPhase('burst');
        try { playSfx('DAMAGE'); } catch {}
        await wait(500);
        if (dead.current) return;

        // ── 7b. ESCAPE ──
        setPhase('escape');
        await wait(2400);
      }

      if (dead.current) return;
      onComplete();
    })();

    return () => { dead.current = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ── Derived state ── */
  const showPokemon = phase === 'idle' || phase === 'throw' || phase === 'hit';
  const ballVisible = !['idle', 'escape'].includes(phase);
  const ballOnGround = ['fall', 'shake1', 'shake2', 'shake3', 'click', 'success'].includes(phase);
  const shaking = phase.startsWith('shake');
  const shakeIdx = shaking ? Number(phase[5]) : 0;
  const dotsCount = shaking
    ? shakeIdx
    : phase === 'click' || phase === 'success'
      ? 3
      : 0;

  /* ── Ball position ── */
  const getBallStyle = (): React.CSSProperties => {
    if (phase === 'throw') {
      // Start position (will be animated via CSS to pokemon)
      return { top: BALL_START_TOP, left: BALL_START_LEFT };
    }
    if (phase === 'hit' || phase === 'absorb') {
      return { top: POKE_TOP, left: '50%', transform: 'translate(-50%, 0)' };
    }
    if (ballOnGround || phase === 'burst') {
      return { top: BALL_GROUND_TOP, left: '50%', transform: 'translate(-50%, 0)' };
    }
    return { top: BALL_START_TOP, left: BALL_START_LEFT };
  };

  /* ── Ball animation class based on phase ── */
  const getBallAnimClass = () => {
    if (phase === 'throw') return 'animate-pokeball-throw';
    if (phase === 'fall') return 'animate-pokeball-fall';
    if (shaking) return 'animate-pokeball-wobble';
    if (phase === 'click') return 'animate-pokeball-click';
    if (phase === 'success') return 'animate-pokeball-glow';
    if (phase === 'burst') return 'animate-pokeball-burst';
    return '';
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.2 }}
      className="absolute inset-0 z-50 bg-slate-950/95 overflow-hidden"
    >
      {/* ═══════ CSS Animations (scoped via style tag) ═══════ */}
      <style>{`
        @keyframes pokeball-throw {
          0%   { top: ${BALL_START_TOP}; left: ${BALL_START_LEFT}; opacity: 1; transform: rotate(0deg) scale(0.5); }
          40%  { top: 5%; left: 40%; transform: rotate(360deg) scale(0.9); }
          100% { top: ${POKE_TOP}; left: 50%; opacity: 1; transform: translate(-50%, 0) rotate(720deg) scale(1); }
        }
        .animate-pokeball-throw {
          animation: pokeball-throw 0.65s cubic-bezier(0.2, 0.8, 0.3, 1) forwards;
        }

        @keyframes pokeball-fall {
          0%   { top: ${POKE_TOP}; transform: translate(-50%, 0) scale(0.9); }
          50%  { top: ${BALL_GROUND_TOP}; transform: translate(-50%, 0) scale(1.1, 0.85); }
          65%  { top: calc(${BALL_GROUND_TOP} - 25px); transform: translate(-50%, 0) scale(0.95, 1.05); }
          80%  { top: ${BALL_GROUND_TOP}; transform: translate(-50%, 0) scale(1.05, 0.9); }
          90%  { top: calc(${BALL_GROUND_TOP} - 8px); transform: translate(-50%, 0) scale(1); }
          100% { top: ${BALL_GROUND_TOP}; transform: translate(-50%, 0) scale(1); }
        }
        .animate-pokeball-fall {
          animation: pokeball-fall 0.7s cubic-bezier(0.4, 0, 1, 1) forwards;
        }

        @keyframes pokeball-wobble {
          0%   { transform: translate(-50%, 0) rotate(0deg); }
          15%  { transform: translate(calc(-50% - 6px), 0) rotate(-25deg); }
          35%  { transform: translate(calc(-50% + 6px), 0) rotate(25deg); }
          50%  { transform: translate(calc(-50% - 4px), 0) rotate(-18deg); }
          70%  { transform: translate(calc(-50% + 4px), 0) rotate(18deg); }
          85%  { transform: translate(calc(-50% - 2px), 0) rotate(-8deg); }
          100% { transform: translate(-50%, 0) rotate(0deg); }
        }
        .animate-pokeball-wobble {
          animation: pokeball-wobble 0.7s ease-in-out;
        }

        @keyframes pokeball-click {
          0%   { transform: translate(-50%, 0) scale(1); }
          30%  { transform: translate(-50%, 0) scale(0.88); }
          60%  { transform: translate(-50%, 0) scale(1.06); }
          100% { transform: translate(-50%, 0) scale(1); }
        }
        .animate-pokeball-click {
          animation: pokeball-click 0.3s ease-out;
        }

        @keyframes pokeball-glow {
          0%, 100% { filter: drop-shadow(0 0 8px rgba(6, 182, 212, 0.6)); }
          50%      { filter: drop-shadow(0 0 25px rgba(6, 182, 212, 0.9)) drop-shadow(0 0 50px rgba(6, 182, 212, 0.4)); }
        }
        .animate-pokeball-glow {
          animation: pokeball-glow 1.2s ease-in-out infinite;
          transform: translate(-50%, 0);
        }

        @keyframes pokeball-burst {
          0%   { transform: translate(-50%, 0) scale(1); opacity: 1; }
          50%  { transform: translate(-50%, 0) scale(1.6); opacity: 0.5; }
          100% { transform: translate(-50%, 0) scale(2.2); opacity: 0; }
        }
        .animate-pokeball-burst {
          animation: pokeball-burst 0.4s ease-out forwards;
        }

        @keyframes float-idle {
          0%, 100% { transform: translate(-50%, 0px); }
          50%      { transform: translate(-50%, -8px); }
        }

        @keyframes pokemon-absorb {
          0%   { transform: translate(-50%, 0) scale(1); opacity: 1; filter: brightness(1); }
          30%  { transform: translate(-50%, 0) scale(1.1); opacity: 1; filter: brightness(3); }
          100% { transform: translate(-50%, 0) scale(0); opacity: 0; filter: brightness(5); }
        }

        @keyframes pokemon-escape {
          0%   { transform: translate(-50%, 0) scale(0); opacity: 0; }
          50%  { transform: translate(-50%, -10px) scale(1.15); opacity: 1; }
          100% { transform: translate(-50%, 0) scale(1); opacity: 1; }
        }

        @keyframes star-burst {
          0%   { transform: translate(-50%, -50%) scale(1); opacity: 1; }
          100% { opacity: 0; }
        }
      `}</style>

      {/* ═══════ GROUND ═══════ */}
      {ballOnGround && (
        <div
          className="absolute left-1/2 -translate-x-1/2 h-[2px] bg-slate-700/40 rounded-full transition-all duration-300"
          style={{ top: `calc(${BALL_GROUND_TOP} + 34px)`, width: '120px' }}
        />
      )}

      {/* ═══════ BALL SHADOW ═══════ */}
      {ballOnGround && (
        <div
          className="absolute left-1/2 -translate-x-1/2 rounded-full bg-black/20 blur-sm transition-all duration-200"
          style={{
            top: `calc(${BALL_GROUND_TOP} + 30px)`,
            width: shaking ? '50px' : '36px',
            height: '6px',
          }}
        />
      )}

      {/* ═══════ ENEMY POKÉMON ═══════ */}
      <AnimatePresence>
        {showPokemon && (
          <div
            key="pokemon-container"
            className="absolute left-1/2"
            style={{
              top: POKE_TOP,
              animation:
                phase === 'idle' || phase === 'throw'
                  ? 'float-idle 2s ease-in-out infinite'
                  : undefined,
            }}
          >
            <img
              src={enemySprite}
              alt={enemyName}
              className="w-28 h-28 sm:w-36 sm:h-36 object-contain"
              style={{
                filter: 'drop-shadow(0 0 15px rgba(100,100,255,0.3))',
                transform: 'translate(-50%, 0)',
              }}
            />
          </div>
        )}
      </AnimatePresence>

      {/* Pokémon absorb animation (overlays sprite location) */}
      {phase === 'absorb' && (
        <div
          className="absolute left-1/2"
          style={{ top: POKE_TOP }}
        >
          <img
            src={enemySprite}
            alt=""
            className="w-28 h-28 sm:w-36 sm:h-36 object-contain"
            style={{
              animation: 'pokemon-absorb 0.5s ease-in forwards',
              transform: 'translate(-50%, 0)',
            }}
          />
        </div>
      )}

      {/* ═══════ WHITE FLASH (on hit) ═══════ */}
      <AnimatePresence>
        {(phase === 'hit' || phase === 'absorb') && (
          <motion.div
            key="flash"
            className="absolute inset-0 bg-white pointer-events-none"
            initial={{ opacity: 0 }}
            animate={{ opacity: phase === 'hit' ? 0.8 : 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          />
        )}
      </AnimatePresence>

      {/* ═══════ POKÉBALL ═══════ */}
      {ballVisible && phase !== 'burst' && (
        <img
          key={`ball-${phase}`}
          src={`${ASSETS_BASE_URL}/pokeball.webp`}
          alt="Pokéball"
          className={`absolute w-12 h-12 sm:w-14 sm:h-14 ${getBallAnimClass()}`}
          style={{
            ...getBallStyle(),
            zIndex: 20,
          }}
        />
      )}

      {/* Burst ball (separate element that fades out) */}
      {phase === 'burst' && (
        <img
          src={`${ASSETS_BASE_URL}/pokeball.webp`}
          alt=""
          className="absolute w-12 h-12 sm:w-14 sm:h-14 animate-pokeball-burst"
          style={{
            top: BALL_GROUND_TOP,
            left: '50%',
            zIndex: 20,
          }}
        />
      )}

      {/* ═══════ WOBBLE PROGRESS DOTS ═══════ */}
      <AnimatePresence>
        {dotsCount > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, transition: { duration: 0.2 } }}
            className="absolute left-1/2 -translate-x-1/2 flex gap-3"
            style={{ top: `calc(${BALL_GROUND_TOP} + 50px)` }}
          >
            {[1, 2, 3].map(i => (
              <motion.div
                key={i}
                className={`w-2.5 h-2.5 rounded-full transition-all duration-300 ${
                  i <= dotsCount
                    ? (phase === 'click' || phase === 'success')
                      ? 'bg-cyan-400 shadow-[0_0_10px_rgba(6,182,212,0.8)]'
                      : 'bg-yellow-400 shadow-[0_0_6px_rgba(250,204,21,0.6)]'
                    : 'bg-slate-700'
                }`}
                initial={i === dotsCount ? { scale: 0 } : undefined}
                animate={i === dotsCount ? { scale: [0, 1.5, 1] } : undefined}
                transition={{ duration: 0.3 }}
              />
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ═══════ CLICK TEXT ═══════ */}
      <AnimatePresence>
        {phase === 'click' && (
          <motion.div
            initial={{ opacity: 0, scale: 0.3 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            transition={{ type: 'spring', stiffness: 400, damping: 15 }}
            className="absolute left-1/2 -translate-x-1/2 text-yellow-300 font-display font-black text-xl tracking-widest"
            style={{ top: `calc(${BALL_GROUND_TOP} + 80px)` }}
          >
            ★ CLIC ! ★
          </motion.div>
        )}
      </AnimatePresence>

      {/* ═══════ SUCCESS GLOW RING ═══════ */}
      {phase === 'success' && (
        <div
          className="absolute left-1/2 -translate-x-1/2 -translate-y-1/2 w-28 h-28 rounded-full pointer-events-none"
          style={{
            top: `calc(${BALL_GROUND_TOP} + 16px)`,
            background: 'radial-gradient(circle, rgba(6,182,212,0.5) 0%, transparent 70%)',
            animation: 'pokeball-glow 1.2s ease-in-out infinite',
          }}
        />
      )}

      {/* ═══════ SUCCESS — CAPTURED POKEMON (above ball) ═══════ */}
      <AnimatePresence>
        {phase === 'success' && (
          <motion.div
            key="captured-sprite"
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.4, type: 'spring', stiffness: 200 }}
            className="absolute left-1/2 -translate-x-1/2"
            style={{ top: POKE_TOP, zIndex: 30 }}
          >
            <img
              src={enemySprite}
              alt={enemyName}
              className="w-24 h-24 sm:w-32 sm:h-32 object-contain"
              style={{ filter: 'drop-shadow(0 0 25px rgba(6,182,212,0.7))', transform: 'translate(-50%, 0)' }}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* ═══════ SUCCESS — CAPTURED! TEXT ═══════ */}
      <AnimatePresence>
        {phase === 'success' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6, type: 'spring', stiffness: 120 }}
            className="absolute left-1/2 -translate-x-1/2 text-center"
            style={{ top: `calc(${BALL_GROUND_TOP} + 70px)` }}
          >
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.7 }}
              className="text-3xl font-display font-black text-cyan-400 drop-shadow-[0_0_30px_rgba(6,182,212,0.9)]"
            >
              CAPTURÉ !
            </motion.div>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1 }}
              className="text-slate-300 text-sm mt-1"
            >
              {enemyName} a rejoint ta collection !
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ═══════ SUCCESS STAR PARTICLES ═══════ */}
      {phase === 'success' && (
        <div className="absolute inset-0 pointer-events-none" style={{ zIndex: 25 }}>
          {Array.from({ length: 14 }).map((_, i) => {
            const angle = (i / 14) * Math.PI * 2;
            const dist = 55 + Math.random() * 50;
            const dx = Math.cos(angle) * dist;
            const dy = Math.sin(angle) * dist;
            return (
              <motion.div
                key={i}
                className="absolute text-yellow-300"
                style={{
                  left: '50%',
                  top: BALL_GROUND_TOP,
                  fontSize: 10 + Math.random() * 8,
                }}
                initial={{ x: 0, y: 0, opacity: 1, scale: 1 }}
                animate={{ x: dx, y: dy, opacity: 0, scale: 0, rotate: Math.random() * 360 }}
                transition={{ duration: 0.9, delay: 0.15 + i * 0.03, ease: 'easeOut' }}
              >
                ★
              </motion.div>
            );
          })}
        </div>
      )}

      {/* ═══════ RED FLASH ON BURST ═══════ */}
      <AnimatePresence>
        {(phase === 'burst' || phase === 'escape') && (
          <motion.div
            key="red-flash"
            className="absolute inset-0 bg-red-600 pointer-events-none"
            initial={{ opacity: 0.5 }}
            animate={{ opacity: 0 }}
            transition={{ duration: 0.4 }}
          />
        )}
      </AnimatePresence>

      {/* ═══════ ESCAPE — Pokémon ressort ═══════ */}
      <AnimatePresence>
        {phase === 'escape' && (
          <motion.div
            key="escape-container"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="absolute inset-0"
          >
            {/* Pokémon springs back */}
            <div
              className="absolute left-1/2"
              style={{ top: POKE_TOP }}
            >
              <img
                src={enemySprite}
                alt={enemyName}
                className="w-28 h-28 sm:w-36 sm:h-36 object-contain"
                style={{
                  animation: 'pokemon-escape 0.5s cubic-bezier(0.2, 0.8, 0.3, 1) forwards',
                  transform: 'translate(-50%, 0)',
                }}
              />
            </div>

            {/* Broken ball halves flying apart */}
            <motion.div
              className="absolute w-5 h-5 rounded-full bg-red-500/60"
              style={{ top: BALL_GROUND_TOP, left: '50%' }}
              initial={{ x: 0, y: 0, opacity: 0.8 }}
              animate={{ x: -40, y: 50, opacity: 0, rotate: -90 }}
              transition={{ duration: 0.7 }}
            />
            <motion.div
              className="absolute w-5 h-5 rounded-full bg-white/60"
              style={{ top: BALL_GROUND_TOP, left: '50%' }}
              initial={{ x: 0, y: 0, opacity: 0.8 }}
              animate={{ x: 30, y: 45, opacity: 0, rotate: 90 }}
              transition={{ duration: 0.7 }}
            />

            {/* Escape text */}
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 }}
              className="absolute left-1/2 -translate-x-1/2 text-center"
              style={{ top: `calc(${POKE_TOP} + 160px)` }}
            >
              <div className="text-2xl font-display font-bold text-red-400 drop-shadow-[0_0_10px_rgba(239,68,68,0.5)]">
                {enemyName} s'est échappé !
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};
