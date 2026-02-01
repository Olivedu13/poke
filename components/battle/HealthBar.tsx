import React from 'react';
import { motion } from 'framer-motion';

interface HealthBarProps {
  current: number;
  max: number;
  label: string;
  isEnemy?: boolean;
}

export const HealthBar: React.FC<HealthBarProps> = ({ current, max, label, isEnemy }) => {
  const percentage = Math.max(0, Math.min(100, (current / max) * 100));
  
  // Color logic
  let colorClass = 'bg-cyan-500';
  if (percentage < 50) colorClass = 'bg-yellow-500';
  if (percentage < 20) colorClass = 'bg-red-500';

  return (
    <div className={`relative w-64 bg-slate-900/80 border border-slate-700 p-2 rounded-lg backdrop-blur-sm shadow-lg ${isEnemy ? 'border-red-500/30' : 'border-cyan-500/30'}`}>
      <div className="flex justify-between items-end mb-1">
        <span className="font-display font-bold text-white tracking-wider text-sm">{label}</span>
        <span className="font-mono text-xs text-slate-400">{current}/{max} PV</span>
      </div>
      
      <div className="h-4 w-full bg-slate-800 rounded-full overflow-hidden relative">
        {/* Background Grid Pattern */}
        <div className="absolute inset-0 opacity-20 bg-[linear-gradient(90deg,#000_2px,transparent_2px)] bg-[size:10px_100%]"></div>
        
        {/* Fill Bar */}
        <motion.div 
          className={`h-full ${colorClass} shadow-[0_0_10px_rgba(255,255,255,0.3)]`}
          initial={{ width: '100%' }}
          animate={{ width: `${percentage}%` }}
          transition={{ type: "spring", stiffness: 50, damping: 15 }}
        />
      </div>
    </div>
  );
};