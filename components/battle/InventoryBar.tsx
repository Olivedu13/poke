import React from 'react';
import { motion } from 'framer-motion';
import { Item } from '../../types';
import { ASSETS_BASE_URL } from '../../config';

interface InventoryBarProps {
  items: Item[];
  onUse: (item: Item) => void;
  onClose: () => void;
}

export const InventoryBar: React.FC<InventoryBarProps> = ({ items, onUse, onClose }) => {
  return (
    <motion.div 
      initial={{ y: '100%' }}
      animate={{ y: 0 }}
      exit={{ y: '100%' }}
      className="absolute bottom-0 left-0 right-0 bg-slate-900/95 border-t-2 border-cyan-500 rounded-t-3xl p-6 z-40 shadow-[0_-10px_40px_rgba(0,0,0,0.8)]"
    >
      <div className="flex justify-between items-center mb-4">
        <h3 className="font-display text-cyan-400 text-lg flex items-center gap-2">
            <img src={`${ASSETS_BASE_URL}/pokeball.webp`} className="w-6 h-6" />
            INVENTAIRE TACTIQUE
        </h3>
        <button onClick={onClose} className="text-slate-500 hover:text-white font-bold">FERMER [X]</button>
      </div>

      {!items || items.length === 0 ? (
        <div className="text-center text-slate-600 py-8 font-mono">AUCUN OBJET EN STOCK</div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {items.map(item => (
            <button
              key={item.id}
              onClick={() => onUse(item)}
              className="bg-slate-950 border border-slate-700 hover:border-cyan-500 p-3 rounded-xl flex flex-col items-center gap-2 transition-all group hover:-translate-y-1 relative"
            >
               <div className="w-12 h-12 flex items-center justify-center transition-transform group-hover:scale-110">
                 {/* PRIORITÉ À L'IMAGE DB, SINON POKEBALL */}
                 <img 
                    src={item.image ? `${ASSETS_BASE_URL}/${item.image}` : `${ASSETS_BASE_URL}/pokeball.webp`} 
                    alt={item.name} 
                    className="w-full h-full object-contain" 
                 />
               </div>
               <div className="text-center w-full">
                 <div className="text-sm font-bold text-white truncate w-full">{item.name}</div>
                 <div className="text-xs text-slate-400">x{item.quantity}</div>
               </div>
               
               {/* Use indicator */}
               <div className="absolute top-2 right-2 w-2 h-2 bg-green-500 rounded-full opacity-0 group-hover:opacity-100 animate-pulse"></div>
            </button>
          ))}
        </div>
      )}
    </motion.div>
  );
};
