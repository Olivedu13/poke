import React from 'react';
import { motion } from 'framer-motion';
import { Item } from '../../types';
import { ASSETS_BASE_URL } from '../../config';

interface InventoryBarProps {
  items: Item[];
  onUse: (item: Item) => void;
  onClose: () => void;
}

/**
 * Battle inventory overlay.
 * Items are pre-filtered by the parent (BattleScene) to only include
 * battle-usable items with quantity > 0. Pokéball items are excluded
 * when not in WILD mode by the parent component.
 */
export const InventoryBar: React.FC<InventoryBarProps> = ({ items, onUse, onClose }) => {
  return (
    <motion.div
      initial={{ y: '100%' }}
      animate={{ y: 0 }}
      exit={{ y: '100%' }}
      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
      className="absolute bottom-0 left-0 right-0 z-40 bg-slate-900/95 backdrop-blur-md border-t-2 border-cyan-500/50 rounded-t-2xl p-3 sm:p-4 max-h-[60vh] overflow-y-auto"
    >
      {/* Header */}
      <div className="flex justify-between items-center mb-3 sm:mb-4">
        <h3 className="font-display text-cyan-400 text-sm sm:text-base md:text-lg flex items-center gap-1.5 sm:gap-2">
          <img
            src={`${ASSETS_BASE_URL}/pokeball.webp`}
            alt=""
            className="w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6"
          />
          <span className="hidden sm:inline">INVENTAIRE TACTIQUE</span>
          <span className="sm:hidden">INVENTAIRE</span>
        </h3>
        <button
          onClick={onClose}
          className="text-slate-500 hover:text-white font-bold text-xs sm:text-sm transition-colors"
        >
          <span className="sm:hidden">✕</span>
          <span className="hidden sm:inline">FERMER [X]</span>
        </button>
      </div>

      {/* Empty state */}
      {!items || items.length === 0 ? (
        <div className="text-center text-slate-600 py-6 sm:py-8 font-mono text-xs sm:text-sm">
          AUCUN OBJET EN STOCK
        </div>
      ) : (
        /* Items grid */
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 sm:gap-3 md:gap-4">
          {items.map((item) => (
            <button
              key={item.id}
              onClick={() => onUse(item)}
              disabled={item.quantity <= 0}
              className="bg-slate-950 border border-slate-700 hover:border-cyan-500 p-2 sm:p-3 rounded-lg sm:rounded-xl flex flex-col items-center gap-1.5 sm:gap-2 transition-all group hover:-translate-y-1 active:scale-95 relative min-h-[80px] sm:min-h-[100px] disabled:opacity-40 disabled:pointer-events-none"
            >
              <div className="w-10 h-10 sm:w-12 sm:h-12 flex items-center justify-center transition-transform group-hover:scale-110">
                <img
                  src={
                    item.image
                      ? `${ASSETS_BASE_URL}/${item.image}`
                      : `${ASSETS_BASE_URL}/pokeball.webp`
                  }
                  alt={item.name}
                  className="w-full h-full object-contain"
                />
              </div>
              <div className="text-center w-full">
                <div className="text-[10px] sm:text-xs md:text-sm font-bold text-white truncate w-full">
                  {item.name}
                </div>
                <div className="text-[9px] sm:text-xs text-slate-400">x{item.quantity}</div>
              </div>

              {/* Hover indicator */}
              <div className="absolute top-1 sm:top-2 right-1 sm:right-2 w-1.5 h-1.5 sm:w-2 sm:h-2 bg-green-500 rounded-full opacity-0 group-hover:opacity-100 animate-pulse" />
            </button>
          ))}
        </div>
      )}
    </motion.div>
  );
};
