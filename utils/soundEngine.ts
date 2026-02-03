
// utils/soundEngine.ts
import { ASSETS_BASE_URL } from '../config';

// Singleton AudioContext
let audioCtx: AudioContext | null = null;
let masterGain: GainNode | null = null;

// Cache pour les fichiers audio (évite de retélécharger à chaque clic)
const bufferCache: Record<string, AudioBuffer> = {};

const getCtx = () => {
    if (!audioCtx) {
        const CtxClass = window.AudioContext || (window as any).webkitAudioContext;
        audioCtx = new CtxClass();
        masterGain = audioCtx.createGain();
        masterGain.gain.value = 0.5; // Volume global
        masterGain.connect(audioCtx.destination);
    }
    return { ctx: audioCtx, master: masterGain! };
};

// --- GÉNÉRATEURS DE BRUIT (SYNTHÈSE) ---

const createNoiseBuffer = (ctx: AudioContext) => {
    const bufferSize = ctx.sampleRate * 2; // 2 secondes
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1;
    }
    return buffer;
};

// Fallback: Petit bip si MP3 manquant
const playFallbackBeep = (ctx: AudioContext, dest: AudioNode) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(440, ctx.currentTime);
    gain.gain.setValueAtTime(0.1, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
    osc.connect(gain);
    gain.connect(dest);
    osc.start();
    osc.stop(ctx.currentTime + 0.3);
};


// --- LECTEUR DE FICHIERS MP3 ---

const playAudioFile = async (ctx: AudioContext, dest: AudioNode, filename: string) => {
    try {
        // Politique navigateur : reprendre le contexte s'il est en pause (nécessaire pour Chrome/Safari)
        if (ctx.state === 'suspended') {
            await ctx.resume();
        }

        let buffer = bufferCache[filename];
        
        if (!buffer) {
            // Construction de l'URL
            const url = `${ASSETS_BASE_URL}/${filename}`;
            console.log(`[Audio] 🎵 Chargement : ${url}`);

            const response = await fetch(url);
            if (!response.ok) {
                console.error(`[Audio] ❌ ÉCHEC HTTP ${response.status} - ${response.statusText}`);
                console.error(`[Audio] URL testée : ${response.url}`);
                console.error(`[Audio] Content-Type reçu : ${response.headers.get('content-type')}`);
                console.error(`[Audio] Vérifiez que '${filename}' existe dans le dossier assets/`);
                // Fallback son synthétique si fichier absent
                playFallbackBeep(ctx, dest);
                return;
            }
            
            console.log(`[Audio] ✅ Téléchargement OK (${response.headers.get('content-type')})`);
            const arrayBuffer = await response.arrayBuffer();
            console.log(`[Audio] 📦 Buffer size: ${arrayBuffer.byteLength} bytes`);
            
            // Décodage
            try {
                buffer = await ctx.decodeAudioData(arrayBuffer);
                bufferCache[filename] = buffer;
                console.log(`[Audio] ✅ Décodage réussi : ${filename} (durée: ${buffer.duration.toFixed(2)}s)`);
            } catch (decodeError) {
                console.error(`[Audio] ❌ Erreur de décodage audio pour ${filename}:`, decodeError);
                playFallbackBeep(ctx, dest);
                return;
            }
        }

        const source = ctx.createBufferSource();
        source.buffer = buffer;
        source.connect(dest);
        source.start(0);
    } catch (e) {
        console.warn(`[Audio] Erreur lecture ${filename}`, e);
        // Fallback en cas d'erreur de décodage
        playFallbackBeep(ctx, dest);
    }
};

// --- EFFETS SYNTHÉTIQUES RESTANTS (DBZ Style) ---

// 1. FRACAS DE ROCHERS (Pour DÉGÂTS) - "KRRRR-SHHH"
const playRockCrash = (ctx: AudioContext, dest: AudioNode) => {
    const t = ctx.currentTime;
    
    // Grondement
    const osc = ctx.createOscillator();
    osc.type = 'sawtooth'; 
    osc.frequency.setValueAtTime(80, t);
    osc.frequency.linearRampToValueAtTime(20, t + 0.6);
    
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.8, t);
    gain.gain.exponentialRampToValueAtTime(0.01, t + 0.6);
    
    osc.connect(gain);
    gain.connect(dest);
    osc.start(t);
    osc.stop(t + 0.6);
    
    // Éboulis
    const noise = ctx.createBufferSource();
    noise.buffer = createNoiseBuffer(ctx);
    
    const nFilter = ctx.createBiquadFilter();
    nFilter.type = 'lowpass';
    nFilter.frequency.setValueAtTime(1200, t);
    nFilter.frequency.linearRampToValueAtTime(100, t + 0.8); 
    
    const nGain = ctx.createGain();
    nGain.gain.setValueAtTime(1.0, t);
    nGain.gain.exponentialRampToValueAtTime(0.01, t + 0.8);
    
    noise.connect(nFilter);
    nFilter.connect(nGain);
    nGain.connect(dest);
    noise.start(t);
    noise.stop(t + 0.8);
};

// 2. AURA (Level Up / Evolve)
const playSuperSaiyanAura = (ctx: AudioContext, dest: AudioNode) => {
    const t = ctx.currentTime;
    const noise = ctx.createBufferSource();
    noise.buffer = createNoiseBuffer(ctx);
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(200, t);
    filter.frequency.linearRampToValueAtTime(3000, t + 2.0);
    filter.Q.value = 5;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0, t);
    gain.gain.linearRampToValueAtTime(0.5, t + 1.0);
    gain.gain.linearRampToValueAtTime(0, t + 3.0);
    const lfo = ctx.createOscillator();
    lfo.frequency.value = 15;
    const lfoGain = ctx.createGain();
    lfoGain.gain.value = 500; 
    lfo.connect(lfoGain);
    lfoGain.connect(filter.frequency);
    noise.connect(filter);
    filter.connect(gain);
    gain.connect(dest);
    noise.start(t); lfo.start(t);
    noise.stop(t + 3.0); lfo.stop(t + 3.0);
};

// 3. SCOUTER (UI Click)
const playScouterBlip = (ctx: AudioContext, dest: AudioNode) => {
    const t = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'square';
    osc.frequency.setValueAtTime(1500, t);
    gain.gain.setValueAtTime(0.1, t);
    gain.gain.exponentialRampToValueAtTime(0.01, t + 0.05);
    osc.connect(gain); gain.connect(dest);
    osc.start(t); osc.stop(t + 0.05);
};

// 4. TELEPORTATION SYNTH (Pour le SPIN de la roue uniquement)
const playInstantTransmissionSynth = (ctx: AudioContext, dest: AudioNode) => {
    const t = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(3500, t);
    osc.frequency.exponentialRampToValueAtTime(100, t + 0.15);
    gain.gain.setValueAtTime(0, t);
    gain.gain.linearRampToValueAtTime(0.5, t + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.01, t + 0.15);
    osc.connect(gain);
    gain.connect(dest);
    osc.start(t);
    osc.stop(t + 0.2);
};


// --- ROUTEUR PRINCIPAL ---

export const playSfx = (type: 'CLICK' | 'CORRECT' | 'WRONG' | 'ATTACK' | 'DAMAGE' | 'WIN' | 'LEVEL_UP' | 'POTION' | 'SPIN' | 'REWARD' | 'EVOLVE') => {
    try {
        const { ctx, master } = getCtx();
        if (ctx.state === 'suspended') ctx.resume();

        switch (type) {
            case 'CLICK':
                playScouterBlip(ctx, master);
                break;
            
            case 'ATTACK': 
                // FILE: teleportation.mp3
                playAudioFile(ctx, master, 'teleportation.mp3');
                break;

            case 'CORRECT':
                // FILE: evolution.mp3 (Bonne réponse)
                playAudioFile(ctx, master, 'evolution.mp3');
                break;
            
            case 'POTION':
                // FILE: potion.mp3
                playAudioFile(ctx, master, 'potion.mp3');
                break;

            case 'SPIN':
                playInstantTransmissionSynth(ctx, master);
                break;

            case 'DAMAGE':
                // SYNTH: Rochers/Impact
                playRockCrash(ctx, master);
                break;

            case 'LEVEL_UP':
            case 'EVOLVE':
                // SYNTH: Aura Super Saiyan
                playSuperSaiyanAura(ctx, master);
                break;

            case 'WRONG':
                // SYNTH: Erreur grave
                {
                    const t = ctx.currentTime;
                    const o = ctx.createOscillator();
                    const g = ctx.createGain();
                    o.type = 'sawtooth';
                    o.frequency.setValueAtTime(100, t);
                    o.frequency.linearRampToValueAtTime(50, t + 0.3);
                    g.gain.setValueAtTime(0.3, t);
                    g.gain.exponentialRampToValueAtTime(0.01, t + 0.3);
                    o.connect(g); g.connect(master);
                    o.start(t); o.stop(t + 0.3);
                }
                break;

            case 'REWARD':
                // SYNTH: Petit chime
                {
                    const t = ctx.currentTime;
                    const o = ctx.createOscillator();
                    const g = ctx.createGain();
                    o.type = 'sine';
                    o.frequency.setValueAtTime(800, t);
                    o.frequency.linearRampToValueAtTime(1200, t + 0.2);
                    g.gain.setValueAtTime(0.2, t);
                    g.gain.linearRampToValueAtTime(0, t + 0.2);
                    o.connect(g); g.connect(master);
                    o.start(t); o.stop(t + 0.2);
                }
                break;

            case 'WIN':
                // SYNTH: Jingle victoire
                {
                    const t = ctx.currentTime;
                    const notes = [523.25, 659.25, 783.99, 1046.50]; 
                    notes.forEach((freq, i) => {
                        const o = ctx.createOscillator();
                        const g = ctx.createGain();
                        o.type = 'square'; 
                        o.frequency.value = freq;
                        g.gain.setValueAtTime(0.1, t + i * 0.1);
                        g.gain.exponentialRampToValueAtTime(0.01, t + i * 0.1 + 0.3);
                        o.connect(g); g.connect(master);
                        o.start(t + i * 0.1);
                        o.stop(t + i * 0.1 + 0.3);
                    });
                }
                break;
        }

    } catch (e) {
        console.warn("Audio Error:", e);
    }
};
