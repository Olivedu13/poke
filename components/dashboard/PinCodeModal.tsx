import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { api } from '../../services/api';

interface PinCodeModalProps {
  onSuccess: () => void;
  onCancel: () => void;
}

export const PinCodeModal: React.FC<PinCodeModalProps> = ({ onSuccess, onCancel }) => {
  const [pin, setPin] = useState('');
  const [error, setError] = useState(false);
  const [checking, setChecking] = useState(false);

  const verifyPin = async (code: string) => {
    setChecking(true);
    try {
      const res = await api.post('/admin/verify-parental', { code });
      if (res.data.success) {
        setTimeout(() => onSuccess(), 200);
      } else {
        setError(true);
        setTimeout(() => setPin(''), 500);
      }
    } catch {
      // Fallback: if server unreachable, try legacy code
      if (code === '1234') {
        setTimeout(() => onSuccess(), 200);
      } else {
        setError(true);
        setTimeout(() => setPin(''), 500);
      }
    } finally {
      setChecking(false);
    }
  };

  const handleDigit = (digit: string) => {
    if (pin.length < 4 && !checking) {
      const newPin = pin + digit;
      setPin(newPin);
      setError(false);

      if (newPin.length === 4) {
        verifyPin(newPin);
      }
    }
  };

  const handleDelete = () => {
    setPin(pin.slice(0, -1));
    setError(false);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-xl flex items-center justify-center p-4 animate-in fade-in">
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="bg-slate-900 border-2 border-cyan-500/50 rounded-2xl p-6 max-w-sm w-full shadow-2xl"
      >
        <h2 className="text-2xl font-display font-bold text-center text-cyan-400 mb-2">
          🔒 CODE PARENTAL
        </h2>
        <p className="text-slate-400 text-center text-sm mb-6">
          Entrez le code PIN pour accéder aux paramètres
        </p>

        {/* PIN Display */}
        <div className="flex justify-center gap-3 mb-8">
          {[0, 1, 2, 3].map((index) => (
            <div
              key={index}
              className={`w-14 h-14 rounded-lg flex items-center justify-center text-2xl font-bold transition ${
                error
                  ? 'bg-red-900/50 border-2 border-red-500 animate-shake'
                  : pin.length > index
                  ? 'bg-cyan-600 border-2 border-cyan-400'
                  : 'bg-slate-800 border-2 border-slate-700'
              }`}
            >
              {pin.length > index ? '●' : ''}
            </div>
          ))}
        </div>

        {error && (
          <p className="text-red-400 text-center text-sm mb-4 animate-pulse">
            ❌ Code incorrect
          </p>
        )}

        {/* Numpad */}
        <div className="grid grid-cols-3 gap-3 mb-4">
          {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((digit) => (
            <button
              key={digit}
              onClick={() => handleDigit(digit)}
              className="bg-slate-800 hover:bg-slate-700 active:bg-cyan-600 text-white font-bold text-xl h-14 rounded-lg transition"
            >
              {digit}
            </button>
          ))}
          <button
            onClick={onCancel}
            className="bg-red-900/50 hover:bg-red-900/70 text-red-400 font-bold text-sm rounded-lg transition"
          >
            ANNULER
          </button>
          <button
            onClick={() => handleDigit('0')}
            className="bg-slate-800 hover:bg-slate-700 active:bg-cyan-600 text-white font-bold text-xl h-14 rounded-lg transition"
          >
            0
          </button>
          <button
            onClick={handleDelete}
            className="bg-slate-800 hover:bg-slate-700 text-slate-400 font-bold text-lg rounded-lg transition"
          >
            ⌫
          </button>
        </div>

      </motion.div>
    </div>
  );
};
