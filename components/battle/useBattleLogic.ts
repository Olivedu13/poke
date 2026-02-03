
import { useState, useEffect, useRef } from 'react';
import { useAnimation } from 'framer-motion';
import { useGameStore } from '../../store/gameStore';
import { api } from '../../services/api';
import axios from 'axios';
import confetti from 'canvas-confetti';
import { Pokemon, Item } from '../../types';
import { playSfx } from '../../utils/soundEngine';

export const useBattleLogic = () => {
    const { 
        user, initBattle, playerPokemon, enemyPokemon, battleLogs, 
        addLog, isPlayerTurn, damageEntity, healEntity, endTurn, battleOver,
        collection, fetchCollection, inventory, fetchInventory, claimBattleRewards,
        gradeGauge, updateGradeProgress, combo, specialGauge, consumeSpecial 
    } = useGameStore();

    // --- LOCAL STATE ---
    const [phase, setPhase] = useState<'LOADING' | 'PREVIEW' | 'FIGHTING' | 'FINISHED'>('LOADING');
    const [previewEnemy, setPreviewEnemy] = useState<Pokemon|null>(null);
    const [selectedPlayer, setSelectedPlayer] = useState<Pokemon|null>(null);
    const [showQuiz, setShowQuiz] = useState(false);
    const [showInventory, setShowInventory] = useState(false);
    const [showTeam, setShowTeam] = useState(false);
    const [lootRevealed, setLootRevealed] = useState(false);
    const [rewards, setRewards] = useState<{xp: number, gold: number, loot?: string} | null>(null);

    // --- ANIMATION STATE ---
    const controlsPlayer = useAnimation();
    const controlsEnemy = useAnimation();
    const [shake, setShake] = useState(false);
    const [flash, setFlash] = useState(false);
    const [floatingTexts, setFloatingTexts] = useState<{id: number, text: string, color: string, x: number, y: number}[]>([]);

    // --- HELPERS VISUELS ---
    const spawnFloatingText = (text: string, color: string, isPlayerTarget: boolean) => {
        const id = Date.now();
        const x = isPlayerTarget ? Math.random() * 40 - 20 : Math.random() * 40 - 20;
        const y = isPlayerTarget ? 50 : -50;
        setFloatingTexts(prev => [...prev, { id, text, color, x, y }]);
        setTimeout(() => setFloatingTexts(prev => prev.filter(t => t.id !== id)), 1000);
    };

    const triggerShake = (intensity = 1) => {
        setShake(true); setTimeout(() => setShake(false), 500 * intensity);
    };

    const triggerFlash = (color = 'red') => {
        setFlash(true); setTimeout(() => setFlash(false), 200);
    };

    // --- DATA FETCHING (TYRADEX) ---
    const fetchTyradexData = async (id: number, level: number = 5): Promise<Pokemon> => {
        const spriteUrl = `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${id}.png`;
        const streak = user?.streak || 0;
        const isBoss = (streak + 1) % 3 === 0;

        try {
            const response = await axios.get(`https://tyradex.vercel.app/api/v1/pokemon/${id}`, { timeout: 3000 });
            const data = response.data;
            const scale = (base: number) => Math.floor(base * (1 + level / 50));
            const hpMult = isBoss ? 10.0 : 4.0;
            const hp = Math.floor(scale(data.stats.hp) * hpMult);
            
            return {
                id: `wild-${data.pokedexId}`,
                name: data.name.fr,
                sprite_url: spriteUrl,
                level: level,
                max_hp: hp, current_hp: hp,
                type: data.types && data.types[0] ? data.types[0].name : 'Normal',
                stats: { atk: scale(data.stats.atk), def: scale(data.stats.def), spe: scale(data.stats.spe) },
                current_xp: 0, tyradex_id: data.pokedexId, next_level_xp: 100, isBoss: isBoss
            };
        } catch (e) {
             const hpMult = isBoss ? 10.0 : 4.0;
             return { 
                id: `wild-fb-${id}`, name: `Pokemon #${id}`, sprite_url: spriteUrl, level: level, max_hp: 70 * hpMult, current_hp: 70 * hpMult, type: 'Normal',
                stats: { atk: 50, def: 50, spe: 50 }, current_xp: 0, tyradex_id: id, next_level_xp: 100, isBoss: isBoss
            };
        }
    };

    // --- SETUP INITIAL ---
    useEffect(() => {
        if (phase === 'LOADING') {
            const setup = async () => {
                await fetchCollection();
                await fetchInventory();
                const myTeam = useGameStore.getState().collection;
                const activeTeam = myTeam.filter(p => p.is_team && p.current_hp > 0);
                const starter = activeTeam[0] || myTeam[0]; 
                if (starter) setSelectedPlayer(starter);
                
                const baseLevel = (starter?.level || 1);
                const enemyLevel = Math.max(1, baseLevel + Math.floor(Math.random() * 3) - 1);
                const enemyId = Math.floor(Math.random() * 150) + 1;
                const enemy = await fetchTyradexData(enemyId, enemyLevel);
                setPreviewEnemy(enemy);
                setPhase('PREVIEW');
            };
            setup();
        }
    }, [phase]);

    // --- GAME LOOP & IA ---
    useEffect(() => {
        if (battleOver && enemyPokemon?.current_hp === 0 && phase === 'FIGHTING') {
            setPhase('FINISHED');
            confetti({ particleCount: 200, spread: 150, origin: { y: 0.6 } });
            
            const isBoss = enemyPokemon.isBoss || false;
            let xpGain = (enemyPokemon.level * 20) + 10;
            let goldGain = (enemyPokemon.level * 10) + 5;
            if (isBoss) { xpGain *= 3; goldGain *= 3; }
            
            let loot: string | undefined = undefined;
            if (Math.random() < 0.30 || isBoss) { 
                const items = ['heal_r1', 'pokeball'];
                loot = items[Math.floor(Math.random() * items.length)];
                if (isBoss) loot = 'heal_r2'; 
            }
            setRewards({ xp: xpGain, gold: goldGain, loot });
            claimBattleRewards(xpGain, goldGain, loot);
            addLog({ message: 'VICTOIRE !', type: 'INFO' });

        } else if (battleOver && playerPokemon?.current_hp === 0 && phase === 'FIGHTING') {
             setPhase('FINISHED');
             setRewards(null);
        }
    }, [battleOver, phase]);

    useEffect(() => {
        if (phase === 'FIGHTING' && !isPlayerTurn && !battleOver && enemyPokemon && playerPokemon) {
            const aiTurn = async () => {
                await new Promise(r => setTimeout(r, 1000));
                await controlsEnemy.start({ x: -100, y: 100, scale: 1.2, transition: { duration: 0.2 } });
                await controlsEnemy.start({ x: 0, y: 0, scale: 1, transition: { type: "spring", stiffness: 300 } });
                triggerShake(); triggerFlash('red');
                const dmg = Math.max(1, Math.floor((enemyPokemon.stats?.atk || 10) / 6) + Math.floor(Math.random() * 3));
                damageEntity('PLAYER', dmg);
                spawnFloatingText(`-${dmg}`, 'text-red-500', true);
                addLog({ message: `${enemyPokemon.name} attaque !`, type: 'ENEMY' });
                endTurn();
            };
            aiTurn();
        }
    }, [isPlayerTurn, battleOver, phase]);

    // --- ACTIONS JOUEUR ---
    const startBattle = () => {
        if(selectedPlayer && previewEnemy) {
            initBattle(selectedPlayer, previewEnemy);
            setPhase('FIGHTING');
        }
    };

    const executeAttack = async (isUltimate = false, isCorrect = true, difficulty = 'HARD') => {
        let damage = 0;
        try {
             const combatRes = await api.post(`/combat_engine.php`, {
                is_correct: isCorrect,
                attacker_level: playerPokemon?.level || 1, 
                attacker_type: 'FIRE', 
                enemy_type: 'PLANTE',
                combo: combo,
                is_ultimate: isUltimate
            });
            if(combatRes.data && combatRes.data.damage) damage = combatRes.data.damage;
        } catch(e) { damage = isUltimate ? 50 : 12; }

        if (isCorrect) {
            await controlsPlayer.start({ x: 100, y: -100, scale: isUltimate ? 1.5 : 1.2, transition: { duration: 0.2 } });
            controlsPlayer.start({ x: 0, y: 0, scale: 1, transition: { type: "spring", stiffness: 300 } });
            controlsEnemy.start({ x: [0, 20, -20, 0], filter: ["brightness(1)", "brightness(3)", "brightness(1)"], transition: { duration: 0.3 } });

            damageEntity('ENEMY', damage);
            spawnFloatingText(`-${damage}`, isUltimate ? 'text-purple-400 text-6xl' : 'text-yellow-400', false);
            
            if (isUltimate) {
                spawnFloatingText("ULTIMATE!", "text-cyan-300", false);
                triggerShake(2);
            } else if (damage > 20) {
                spawnFloatingText("CRITIQUE!", "text-yellow-300", false);
            }
            addLog({ message: isUltimate ? `FRAPPE ULTIME -${damage}!` : `Coup réussi ! -${damage}`, type: 'PLAYER' });
            endTurn();
        } else {
            addLog({ message: `Raté...`, type: 'INFO' });
            triggerShake(0.5); 
            endTurn();
        }
    };

    const handleQuizComplete = async (isCorrect: boolean, dmgDealt: number, difficulty: string) => {
        setShowQuiz(false);
        const leveled = await updateGradeProgress(isCorrect, difficulty);
        if(!isCorrect) triggerFlash('red'); 
        executeAttack(false, isCorrect, difficulty);
    };

    const handleUltimate = () => {
        consumeSpecial();
        executeAttack(true, true, 'HARD');
    };

    const handleUseItem = async (item: Item) => {
        if (['HEAL', 'BUFF_ATK', 'BUFF_DEF'].includes(item.effect_type)) {
            playSfx('POTION'); 
            if (item.effect_type === 'HEAL') {
                 healEntity('PLAYER', item.value);
                 spawnFloatingText(`+${item.value}`, 'text-green-400', true);
            }
            try {
                 await api.post(`/collection.php`, { action: 'use_item', item_id: item.id, pokemon_id: playerPokemon?.id });
                 await fetchInventory();
            } catch(e) {}
            setShowInventory(false);
            endTurn();
        }
    };

    const handleSwitchPokemon = (newPoke: Pokemon, isFromTeam: boolean) => {
        if (isFromTeam) {
            useGameStore.setState({ playerPokemon: newPoke, isPlayerTurn: false });
            setShowTeam(false);
            addLog({ message: `Go ${newPoke.name} !`, type: 'PLAYER' });
        }
    };

    const handleExitBattle = () => {
        setRewards(null);
        setLootRevealed(false);
        useGameStore.setState({ playerPokemon: null, enemyPokemon: null, battleOver: false, battleLogs: [], isPlayerTurn: true, gradeGauge: 0, combo: 0, specialGauge: 0 });
        setPhase('LOADING');
    };

    const revealLoot = () => {
        setLootRevealed(true); 
        confetti({ particleCount: 150, spread: 100, origin: { y: 0.6 } });
    };

    return {
        // State
        phase, previewEnemy, selectedPlayer, rewards, lootRevealed,
        showQuiz, setShowQuiz,
        showInventory, setShowInventory,
        showTeam, setShowTeam,
        shake, flash, floatingTexts,
        controlsPlayer, controlsEnemy,
        
        // Actions
        startBattle,
        handleQuizComplete,
        handleUltimate,
        handleUseItem,
        handleSwitchPokemon,
        handleExitBattle,
        revealLoot
    };
};
