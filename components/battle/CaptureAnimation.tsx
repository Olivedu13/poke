import React, { useState, useEffect, useRef } from 'react';
import { motion, useAnimation, AnimatePresence } from 'framer-motion';
import { ASSETS_BASE_URL } from '../../config';
import confetti from 'canvas-confetti';

/* ─── Animation phases ─── */
type Phase =
  | 'idle'
  | 'throw'
  | 'hit'
  | 'absorb'
  | 'fall'
  | 'shake1'
  | 'shake2'
  | 'shake3'
  | 'click'
  | 'success'
  | 'burst'
  | 'escape';

interface CaptureAnimationProps {
  enemySprite: string;
  enemyName: string;
  success: boolean;
  onComplete: () => void;
}

/**
 * Pokéball capture animation matching the real Pokémon games:
 *
 * 1. Ball is thrown (arcs from bottom right toward the pokemon)
 * 2. Ball hits – bright flash, pokemon gets absorbed (shrinks into ball)
 * 3. Ball falls to the ground and bounces
 * 4. Ball wobbles left / right 1-3 times (real Pokémon tilt animation)
 * 5a. SUCCESS: Ball stops, "click!" sparkle, stars, CAPTURÉ!
 * 5b. FAILURE: Ball bursts open, pokemon jumps out, ball fades
 */
export const CaptureAnimation: React.FC<CaptureAnimationProps> = ({
  enemySprite,
  enemyName,
  success,
  onComplete,
}) => {
  const [phase, setPhase] = useState<Phase>('idle');
  const ballControls = useAnimation();
  const cancelled = useRef(false);

  useEffect(() => {
    cancelled.current = false;
    const wait = (ms: number) => new Promise<void>(r => setTimeout(r, ms));

    const run = async () => {
      await wait(300);
      if (cancelled.current) return;

      /* ── THROW: arc from bottom-right toward center ── */
      setPhase('throw');
      await ballControls.start({
        x: 0,
        y: 0,
        opacity: 1,
        rotate: 360,
        scale: 1,
        transition: { duration: 0.6, ease: [0.2, 0.8, 0.3, 1] },
      });
      if (cancelled.current) return;

      /* ── HIT: ball reaches the pokemon ── */
      setPhase('hit');
      await wait(150);
      if (cancelled.current) return;

      /* ── ABSORB: flash + pokemon disappears into ball ── */
      setPhase('absorb');
      await ballControls.start({
        scale: [1.3, 0.75, 1.1, 0.95, 1],
        transition: { duration: 0.5, ease: 'easeOut' },
      });
      if (cancelled.current) return;

      /* ── FALL: ball drops to ground and bounces ── */
      setPhase('fall');
      await ballControls.start({
        y: 60,
        rotate: 360,
        transition: { duration: 0.35, ease: [0.55, 0, 1, 0.45] },
      });
      // Bounce
      await ballControls.start({
        y: [60, 35, 60, 48, 60],
        transition: { duration: 0.5, ease: 'easeOut' },
      });
      if (cancelled.current) return;

      /* ── WOBBLE SHAKES: tilt left/right like the real games ── */
      const wobbleCount = success ? 3 : Math.floor(Math.random() * 2) + 1;

      for (let i = 1; i <= wobbleCount; i++) {
        await wait(500);
        if (cancelled.current) return;
        setPhase(`shake${Math.min(i, 3)}` as Phase);

        // Real Pokémon wobble: tilt left, tilt right, center
        await ballControls.start({
          rotate: [360, 335, 385, 340, 380, 360],
          x: [0, -8, 8, -6, 6, 0],
          transition: { duration: 0.6, ease: 'easeInOut' },
        });
        if (cancelled.current) return;
      }

      await wait(600);
      if (cancelled.current) return;

      /* ── RESULT ── */
      if (success) {
        /* ── CLICK: ball locks shut ── */
        setPhase('click');
        await ballControls.start({
          scale: [1, 0.9, 1.05, 1],
          transition: { duration: 0.25 },
        });
        await wait(400);
        if (cancelled.current) return;

        /* ── SUCCESS: glow + sparkles + confetti ── */
        setPhase('success');
        confetti({ particleCount: 250, spread: 160, origin: { y: 0.55 } });
        await wait(2200);
      } else {
        /* ── BURST: ball pops open ── */
        setPhase('burst');
        await ballControls.start({
          scale: [1, 1.5, 1.8],
          opacity: [1, 0.5, 0],
          rotate: [360, 380, 400],
          transition: { duration: 0.4, ease: 'easeOut' },
        });
        await wait(300);
        if (cancelled.current) return;

        /* ── ESCAPE: pokemon jumps out ── */
        setPhase('escape');
        await wait(2200);
      }

      if (cancelled.current) return;
      onComplete();
    };

    run();
    return () => { cancelled.current = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ── Derived flags ── */
  const showEnemy = phase === 'idle' || phase === 'throw' || phase === 'hit';
  const showBall = !['idle', 'escape'].includes(phase) && phase !== 'burst';
  const showBurstBall = phase === 'burst';
  const shaking = phase.startsWith('shake');
  const shakeNum = shaking
    ? Number(phase[5])
    : phase === 'click' || phase === 'success'
      ? 3
      : 0;
  const ballOnGround = ['fall', 'shake1', 'shake2', 'shake3', 'click', 'success'].includes(phase);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.25 }}
      className="absolute inset-0 z-50 bg-slate-950/95 flex flex-col items-center justify-center overflow-hidden"
    >
      {/* ── "Ground" line ── */}
      {ballOnGround && (
        <div className="absolute left-1/2 -translate-x-1/2 top-[62%] w-32 h-[2px] bg-slate-700/50 rounded-full" />
      )}

      {/* ── Enemy sprite (visible until absorbed) ── */}
      <AnimatePresence>
        {showEnemy && (
          <motion.img
            key="enemy-sprite"
            src={enemySprite}
            alt={enemyName}
            className="w-32 h-32 object-contain drop-shadow-[0_0_12px_rgba(100,100,255,0.3)]"
            animate={{ y: [0, -6, 0] }}
            exit={{
              scale: 0,
              opacity: 0,
              filter: 'brightness(4)',
              transition: { duration: 0.35, ease: 'easeIn' },
            }}
            transition={{ repeat: Infinity, duration: 2, ease: 'easeInOut' }}
          />
        )}
      </AnimatePresence>

      {/* ── Spacer to keep ball centered vertically when enemy gone ── */}
      {!showEnemy && phase !== 'escape' && <div className="h-20" />}

      {/* ── Pokéball ── */}
      <AnimatePresence>
        {(showBall || showBurstBall) && (
          <motion.img
            key="pokeball"
            src={`${ASSETS_BASE_URL}/pokeball.webp`}
            alt="Pokéball"
            className="w-14 h-14 sm:w-16 sm:h-16 drop-shadow-[0_4px_12px_rgba(0,0,0,0.5)]"
            initial={{ x: 80, y: 200, opacity: 0, rotate: 0, scale: 0.6 }}
            animate={ballControls}
            exit={{ opacity: 0, scale: 0, transition: { duration: 0.2 } }}
          />
        )}
      </AnimatePresence>

      {/* ── White flash on absorb ── */}
      <AnimatePresence>
        {phase === 'absorb' && (
          <motion.div
            className="absolute inset-0 bg-white pointer-events-none"
            initial={{ opacity: 0 }}
            animate={{ opacity: [0, 0.7, 0] }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4 }}
          />
        )}
      </AnimatePresence>

      {/* ── Ball shadow on ground ── */}
      {ballOnGround && (
        <motion.div
          className="absolute left-1/2 -translate-x-1/2 top-[63%] w-10 h-2 bg-black/30 rounded-full blur-sm"
          animate={{ scaleX: shaking ? [1, 0.7, 1.3, 0.7, 1.3, 1] : 1 }}
          transition={{ duration: 0.6 }}
        />
      )}

      {/* ── Wobble progress dots ── */}
      <AnimatePresence>
        {(shaking || phase === 'click' || phase === 'success') && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="flex gap-3 mt-10"
          >
            {[1, 2, 3].map(i => (
              <motion.div
                key={i}
                className={`w-2.5 h-2.5 rounded-full transition-colors duration-300 ${
                  i <= shakeNum
                    ? phase === 'success' || phase === 'click'
                      ? 'bg-cyan-400 shadow-[0_0_10px_rgba(6,182,212,0.8)]'
                      : 'bg-yellow-400 shadow-[0_0_6px_rgba(250,204,21,0.5)]'
                    : 'bg-slate-700'
                }`}
                animate={
                  i === shakeNum && shakeNum > 0
                    ? { scale: [0.3, 1.6, 1] }
                    : { scale: 1 }
                }
                transition={{ duration: 0.35 }}
              />
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── "Click!" text on capture lock ── */}
      <AnimatePresence>
        {phase === 'click' && (
          <motion.div
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            transition={{ type: 'spring', stiffness: 300 }}
            className="mt-4 text-yellow-300 font-display font-black text-lg tracking-widest"
          >
            ★ CLIC ! ★
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Success glow ring around ball ── */}
      <AnimatePresence>
        {phase === 'success' && (
          <motion.div
            className="absolute left-1/2 top-[48%] -translate-x-1/2 -translate-y-1/2 w-24 h-24 rounded-full pointer-events-none"
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{
              opacity: [0, 0.8, 0.4, 0.8, 0.4],
              scale: [0.5, 1.5, 1.2, 1.5, 1.2],
            }}
            transition={{ duration: 2, repeat: Infinity }}
            style={{
              background: 'radial-gradient(circle, rgba(6,182,212,0.4) 0%, transparent 70%)',
              boxShadow: '0 0 40px rgba(6,182,212,0.3)',
            }}
          />
        )}
      </AnimatePresence>

      {/* ── Success result text + captured sprite ── */}
      <AnimatePresence>
        {phase === 'success' && (
          <motion.div
            initial={{ opacity: 0, y: 30, scale: 0.7 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ delay: 0.3, type: 'spring', stiffness: 130, damping: 12 }}
            className="mt-6 text-center"
          >
            <motion.img
              src={enemySprite}
              alt={enemyName}
              className="w-20 h-20 mx-auto mb-2 drop-shadow-[0_0_25px_rgba(6,182,212,0.6)]"
              initial={{ scale: 0, rotate: -15 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ delay: 0.6, type: 'spring', stiffness: 200 }}
            />
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.8 }}
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

      {/* ── Star sparkle particles on success ── */}
      {phase === 'success' && (
        <div className="absolute inset-0 pointer-events-none">
          {Array.from({ length: 16 }).map((_, i) => {
            const angle = (i * 2 * Math.PI) / 16;
            const dist = 60 + Math.random() * 60;
            return (
              <motion.div
                key={i}
                className="absolute left-1/2 top-[48%] text-yellow-300"
                style={{ fontSize: 10 + Math.random() * 8 }}
                initial={{ x: 0, y: 0, opacity: 1, scale: 1 }}
                animate={{
                  x: Math.cos(angle) * dist,
                  y: Math.sin(angle) * dist,
                  opacity: 0,
                  scale: 0,
                  rotate: Math.random() * 360,
                }}
                transition={{ duration: 1, delay: 0.2 + i * 0.03, ease: 'easeOut' }}
              >
                ★
              </motion.div>
            );
          })}
        </div>
      )}

      {/* ── Escape: pokemon jumps back out ── */}
      <AnimatePresence>
        {phase === 'escape' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.1 }}
            className="text-center"
          >
            {/* Red flash when ball bursts */}
            <motion.div
              className="absolute inset-0 bg-red-500 pointer-events-none"
              initial={{ opacity: 0.4 }}
              animate={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
            />

            {/* Pokemon springs out */}
            <motion.img
              src={enemySprite}
              alt={enemyName}
              className="w-28 h-28 mx-auto mb-3"
              initial={{ scale: 0, opacity: 0, y: 40 }}
              animate={{ scale: [0, 1.2, 1], opacity: 1, y: 0 }}
              transition={{
                type: 'spring',
                stiffness: 200,
                damping: 12,
                delay: 0.15,
              }}
            />

            {/* Escape text */}
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 }}
              className="text-2xl font-display font-bold text-red-400 drop-shadow-[0_0_10px_rgba(239,68,68,0.5)]"
            >
              {enemyName} s'est échappé !
            </motion.div>

            {/* Broken ball halves fading away */}
            <motion.div className="absolute left-[45%] top-[48%] pointer-events-none">
              <motion.div
                className="w-4 h-4 bg-red-500 rounded-full opacity-50"
                initial={{ x: 0, y: 0 }}
                animate={{ x: -30, y: 40, opacity: 0 }}
                transition={{ duration: 0.8, delay: 0.1 }}
              />
              <motion.div
                className="w-4 h-4 bg-white rounded-full opacity-50"
                initial={{ x: 0, y: 0 }}
                animate={{ x: 20, y: 35, opacity: 0 }}
                transition={{ duration: 0.8, delay: 0.1 }}
              />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};
