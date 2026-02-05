
import { useState, useEffect, useRef } from 'react';
import { useAnimation } from 'framer-motion';
import { useGameStore } from '../../store/gameStore';
import { api } from '../../services/api';
import axios from 'axios';
import confetti from 'canvas-confetti';
import { Pokemon, Item } from '../../types';
import { playSfx } from '../../utils/soundEngine';
import { getPokemonNameFr } from '../../utils/pokemonNames';

export const useBattleLogic = () => {
    const { 
        user, initBattle, playerPokemon, enemyPokemon, battleLogs, 
        addLog, isPlayerTurn, damageEntity, healEntity, endTurn, battleOver,
        collection, fetchCollection, inventory, fetchInventory, claimBattleRewards,
        gradeGauge, updateGradeProgress, combo, specialGauge, consumeSpecial,
        battlePhase, setBattlePhase, previewEnemy, selectedPlayer,
        setPreviewEnemy, setPreviewEnemyTeam, setSelectedPlayer, battleMode, trainerOpponent,
        setTrainerOpponent
    } = useGameStore();

    // --- LOCAL STATE ---
    const [showQuiz, setShowQuiz] = useState(false);
    const [showInventory, setShowInventory] = useState(false);
    const [showTeam, setShowTeam] = useState(false);
    const [lootRevealed, setLootRevealed] = useState(false);
    const [rewards, setRewards] = useState<{xp: number, gold: number, loot?: string} | null>(null);
    const [captureAttempted, setCaptureAttempted] = useState(false);
    const [captureSuccess, setCaptureSuccess] = useState(false);
    
    // Combat stats tracking (XP based on performance)
    const [questionsAnswered, setQuestionsAnswered] = useState(0);
    const [correctAnswers, setCorrectAnswers] = useState(0);
    const [maxCombo, setMaxCombo] = useState(0);
    const [difficultyPoints, setDifficultyPoints] = useState(0);

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
            const response = await axios.get(`https://tyradex.app/api/v1/pokemon/${id}`, { timeout: 5000 });
            const data = response.data;
            const scale = (base: number) => Math.floor(base * (1 + level / 50));
            const hpMult = isBoss ? 2.0 : 0.7;
            const hp = Math.floor(scale(data.stats.hp) * hpMult);
            
            return {
                id: `wild-${data.pokedex_id}`,
                name: data.name?.fr || getPokemonNameFr(id),
                sprite_url: spriteUrl,
                level: level,
                max_hp: hp, current_hp: hp,
                type: data.types && data.types[0] ? data.types[0].name : 'Normal',
                stats: { atk: scale(data.stats.atk), def: scale(data.stats.def), spe: scale(data.stats.vit || 50) },
                current_xp: 0, tyradex_id: data.pokedex_id, next_level_xp: 100, isBoss: isBoss
            };
        } catch (e) {
             const hpMult = isBoss ? 2.0 : 0.7;
             return { 
                id: `wild-fb-${id}`, name: getPokemonNameFr(id), sprite_url: spriteUrl, level: level, max_hp: Math.floor(70 * hpMult), current_hp: Math.floor(70 * hpMult), type: 'Normal',
                stats: { atk: 50, def: 50, spe: 50 }, current_xp: 0, tyradex_id: id, next_level_xp: 100, isBoss: isBoss
            };
        }
    };

    // --- GENERATE TRAINER OPPONENT ---
    const generateTrainerOpponent = async (playerLevel: number): Promise<any> => {
        const trainerNames = ['Sacha', 'Pierre', 'Ondine', 'Flora', 'Max', 'Aurore', 'Iris', 'Lem', 'Serena', 'Tili'];
        const name = trainerNames[Math.floor(Math.random() * trainerNames.length)];
        
        const team = [];
        for (let i = 0; i < 3; i++) {
            const level = Math.max(1, playerLevel + Math.floor(Math.random() * 3) - 1);
            const pokemonId = Math.floor(Math.random() * 150) + 1;
            const pokemon = await fetchTyradexData(pokemonId, level);
            team.push(pokemon);
        }

        return {
            name,
            avatar: '👤',
            team,
            currentPokemonIndex: 0
        };
    };

    // --- SETUP INITIAL ---
    useEffect(() => {
        // Désactiver complètement le flux PVP legacy (on utilise PvPBattleProc)
        if (battleMode === 'PVP') {
            return;
        }

        // Ne lancer le setup QUE si on est en phase LOADING (après un clic sur un mode de combat)
        if (battlePhase === 'NONE' || battlePhase === 'PVP_LOBBY') {
            return;
        }
        
        // Ne pas réinitialiser si un combat est déjà en cours
        if (battlePhase !== 'LOADING' && playerPokemon && enemyPokemon) {
            return;
        }
        
        if (battlePhase === 'LOADING') {
            const setup = async () => {
                await fetchCollection();
                await fetchInventory();
                const myTeam = useGameStore.getState().collection;
                const activeTeam = myTeam.filter(p => p.is_team && p.current_hp > 0);
                const starter = activeTeam[0] || myTeam[0]; 
                if (starter) setSelectedPlayer(starter);
                
                const baseLevel = (starter?.level || 1);
                
                if (battleMode === 'TRAINER') {
                    const trainer = await generateTrainerOpponent(baseLevel);
                    setTrainerOpponent(trainer);
                    setPreviewEnemy(trainer.team[0]);
                    setPreviewEnemyTeam(trainer.team);
                } else {
                    // --- GAME LOOP & IA ---
                    useEffect(() => {
                        if (battleMode === 'PVP') return;
                        // Vérifier victoire: ennemi KO
                        if (battleOver && enemyPokemon?.current_hp === 0 && battlePhase === 'FIGHTING') {
                            // Mode TRAINER : vérifier s'il reste des Pokemon
                            if (battleMode === 'TRAINER' && trainerOpponent) {
                                const nextIndex = trainerOpponent.currentPokemonIndex + 1;
                                if (nextIndex < trainerOpponent.team.length) {
                                    addLog({ message: `${trainerOpponent.name} envoie ${trainerOpponent.team[nextIndex].name} !`, type: 'INFO' });
                                    setTrainerOpponent({
                                        ...trainerOpponent,
                                        currentPokemonIndex: nextIndex
                                    });
                                    initBattle(playerPokemon!, trainerOpponent.team[nextIndex]);
                                    return;
                                }
                            }
                            // Mode WILD : proposer la capture si pokeball, sinon récompense
                            if (battleMode === 'WILD') {
                                const hasPokeball = inventory.some(i => i.effect_type === 'CAPTURE' && i.quantity > 0);
                                if (hasPokeball) {
                                    setBattlePhase('CAPTURE');
                                } else {
                                    setCaptureAttempted(true);
                                    setCaptureSuccess(false);
                                    setBattlePhase('CAPTURE');
                                }
                            } else {
                                // Mode TRAINER : pas de capture, victoire directe
                                setCaptureAttempted(true);
                                setCaptureSuccess(false);
                                setBattlePhase('CAPTURE');
                            }
                        } else if (battlePhase === 'CAPTURE' && captureAttempted) {
                            // Après tentative de capture, passer à la victoire
                            setBattlePhase('FINISHED');
                            confetti({ particleCount: 200, spread: 150, origin: { y: 0.6 } });
                            if (enemyPokemon) {
                                claimBattleRewards(enemyPokemon);
                            }
                        }
                    }, [battleOver, battlePhase, enemyPokemon, battleMode, trainerOpponent, inventory, playerPokemon, initBattle, setTrainerOpponent, setBattlePhase, setCaptureAttempted, setCaptureSuccess, claimBattleRewards, addLog]);
                    setBattlePhase('CAPTURE');
                } else {
                    setCaptureAttempted(true);
                    setCaptureSuccess(false);
                    setBattlePhase('CAPTURE');
                }
            } else {
                // Mode TRAINER : pas de capture, victoire directe
                setCaptureAttempted(true);
                setCaptureSuccess(false);
                setBattlePhase('CAPTURE');
            }
        } else if (battlePhase === 'CAPTURE' && captureAttempted) {
            // Après tentative de capture, passer à la victoire
            setBattlePhase('FINISHED');
            confetti({ particleCount: 200, spread: 150, origin: { y: 0.6 } });
            
            if (enemyPokemon) {
                const isBoss = enemyPokemon.isBoss || false;
                const isTrainerMode = battleMode === 'TRAINER';
                
                // Base XP/Gold calc
                const baseXp = (enemyPokemon.level * 20) + 10;
                const baseGold = (enemyPokemon.level * 10) + 5;
                
                // Bonus basé sur les bonnes réponses
                const correctBonus = 1 + (correctAnswers * 0.1); // +10% par bonne réponse
                
                // Bonus basé sur le combo max atteint
                const comboBonus = 1 + (maxCombo * 0.2); // +20% par niveau de combo max
                
                // Bonus basé sur la difficulté totale (points gagnés)
                const difficultyBonus = 1 + (difficultyPoints * 0.05); // +5% par point de difficulté
                
                let xpGain = Math.floor(baseXp * correctBonus * comboBonus * difficultyBonus);
                let goldGain = Math.floor(baseGold * correctBonus);
                
                // Multiplicateur pour boss et dresseur
                if (isBoss) { xpGain *= 3; goldGain *= 3; }
                if (isTrainerMode) { xpGain *= 2; goldGain *= 2; }
                
                let loot: string | undefined = undefined;
                // Loot chance augmente avec le combo
                const lootChance = Math.min(0.8, 0.20 + (maxCombo * 0.1));
                if (Math.random() < lootChance || isBoss || isTrainerMode) { 
                    const items = isTrainerMode 
                        ? ['heal_r2', 'traitor_r1', 'atk_r1', 'def_r1'] 
                        : ['heal_r1', 'pokeball'];
                    loot = items[Math.floor(Math.random() * items.length)];
                    if (isBoss) loot = 'heal_r2'; 
                }
                setRewards({ xp: xpGain, gold: goldGain, loot });
                claimBattleRewards(xpGain, goldGain, loot);
                
                const victoryMsg = isTrainerMode && trainerOpponent 
                    ? `Tu as battu le dresseur ${trainerOpponent.name} !` 
                    : 'VICTOIRE !';
                addLog({ message: victoryMsg, type: 'INFO' });
            }

        } else if (battleOver && playerPokemon?.current_hp === 0 && battlePhase === 'FIGHTING') {
             setBattlePhase('FINISHED');
             setRewards(null);
        }
    }, [battleOver, battlePhase, captureAttempted, questionsAnswered]);

    // IA Turn
    useEffect(() => {
        if (battleMode === 'PVP') return;
        if (battlePhase === 'FIGHTING' && !isPlayerTurn && !battleOver && enemyPokemon && playerPokemon) {
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
    }, [isPlayerTurn, battleOver, battlePhase]);

    // --- ACTIONS JOUEUR ---
    const startBattle = async () => {
        if (battleMode === 'PVP') {
            return; // PvP procédural géré par PvPBattleProc
        }
        
        if(selectedPlayer && previewEnemy) {
            initBattle(selectedPlayer, previewEnemy);
            setBattlePhase('FIGHTING');
        }
    };

    // Calcul dégâts local (remplace combat_engine.php)
    // La jauge (gradeGauge) impacte les dégâts: 0=x1, 1=x1.1, 2=x1.2, 3=x1.3, 4=x1.4, 5=x1.5
    const calculateDamage = (isCorrect: boolean, attackerLevel: number, comboCount: number, isUltimate: boolean, difficulty: string = 'MEDIUM'): number => {
        if (!isCorrect) return 0;
        
        const baseDamage = 10 + attackerLevel * 2;
        const comboBonus = 1 + (comboCount * 0.1);
        const gaugeBonus = 1 + (gradeGauge * 0.1); // Bonus basé sur la jauge de niveau
        const difficultyBonus = difficulty === 'HARD' ? 1.3 : difficulty === 'MEDIUM' ? 1.15 : 1.0;
        const ultimateMultiplier = isUltimate ? 3 : 1;
        const randomVariance = 0.9 + Math.random() * 0.2;
        
        return Math.floor(baseDamage * comboBonus * gaugeBonus * difficultyBonus * ultimateMultiplier * randomVariance);
    };

    const executeAttack = async (isUltimate = false, isCorrect = true, difficulty = 'HARD', forcedDamage?: number) => {
        let damage = 0;
        if (typeof forcedDamage === 'number') {
            damage = forcedDamage;
        } else {
            damage = calculateDamage(isCorrect, playerPokemon?.level || 1, combo, isUltimate);
        }

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

    const handleQuizComplete = async (isCorrect: boolean, dmgDealt: number, difficulty: string, questionId?: string | number, answerIndex?: number) => {
        setShowQuiz(false);
        const leveled = await updateGradeProgress(isCorrect, difficulty);
        if(!isCorrect) triggerFlash('red'); 
        
        // Track question stats for XP calculation
        setQuestionsAnswered(prev => prev + 1);
        if (isCorrect) {
            setCorrectAnswers(prev => prev + 1);
            setMaxCombo(prev => Math.max(prev, combo + 1));
        }
        // Bonus de difficulté: EASY=1, MEDIUM=2, HARD=3
        const diffPts = difficulty === 'HARD' ? 3 : difficulty === 'MEDIUM' ? 2 : 1;
        if (isCorrect) setDifficultyPoints(prev => prev + diffPts);
        
        executeAttack(false, isCorrect, difficulty, undefined);
    };

    const handleUltimate = () => {
        consumeSpecial();
        executeAttack(true, true, 'HARD');
    };

    const handleUseItem = async (item: Item) => {
        if (['HEAL', 'BUFF_ATK', 'BUFF_DEF', 'TRAITOR', 'DMG_FLAT'].includes(item.effect_type)) {
            if (item.effect_type === 'TRAITOR' || item.effect_type === 'DMG_FLAT') {
                // Potion traître ou dégâts directs
                playSfx('ATTACK');
                damageEntity('ENEMY', item.value);
                spawnFloatingText(`-${item.value}!`, 'text-purple-400', false);
                addLog({ message: `${item.name} ! ${item.value} dégâts infligés !`, type: 'PLAYER' });
            } else if (item.effect_type === 'HEAL') {
                playSfx('POTION'); 
                healEntity('PLAYER', item.value);
                spawnFloatingText(`+${item.value}`, 'text-green-400', true);
            } else {
                playSfx('POTION');
                addLog({ message: `${item.name} utilisé !`, type: 'PLAYER' });
            }
            
            // Utiliser l'item via API Node.js
            try {
                 await api.post(`/shop/use-item`, { itemId: item.id, pokemonId: playerPokemon?.id });
                 await fetchInventory();
            } catch(e) {
                console.error('Erreur utilisation item:', e);
            }
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

    // Fuir le combat - aucune récompense
    const handleFlee = () => {
        playSfx('DAMAGE');
        addLog({ message: 'Vous avez fui le combat !', type: 'INFO' });
        setRewards(null);
        setLootRevealed(false);
        setCaptureAttempted(false);
        setCaptureSuccess(false);
        setQuestionsAnswered(0);
        setCorrectAnswers(0);
        setMaxCombo(0);
        setDifficultyPoints(0);
        useGameStore.setState({ 
            playerPokemon: null, 
            enemyPokemon: null, 
            battleOver: false, 
            battleLogs: [], 
            isPlayerTurn: true, 
            gradeGauge: 0, 
            combo: 0, 
            specialGauge: 0, 
            battlePhase: 'NONE',
            battleMode: 'WILD',
            trainerOpponent: null,
            previewEnemy: null,
            previewEnemyTeam: [],
            selectedPlayer: null
        });
    };

    const handleExitBattle = async () => {
        setRewards(null);
        setLootRevealed(false);
        setCaptureAttempted(false);
        setCaptureSuccess(false);
        // Reset combat stats
        setQuestionsAnswered(0);
        setCorrectAnswers(0);
        setMaxCombo(0);
        setDifficultyPoints(0);
        useGameStore.setState({ 
            playerPokemon: null, 
            enemyPokemon: null, 
            battleOver: false, 
            battleLogs: [], 
            isPlayerTurn: true, 
            gradeGauge: 0, 
            combo: 0, 
            specialGauge: 0, 
            battlePhase: 'NONE',
            battleMode: 'WILD',
            trainerOpponent: null,
            previewEnemy: null,
            previewEnemyTeam: [],
            selectedPlayer: null,
            currentView: 'COLLECTION'
        });
    };

    const revealLoot = () => {
        setLootRevealed(true); 
        confetti({ particleCount: 150, spread: 100, origin: { y: 0.6 } });
    };

    const handleCapture = async (attempt: boolean) => {
        if (!attempt) {
            setCaptureAttempted(true);
            setCaptureSuccess(false);
            return;
        }
        
        // Vérifier qu'on a une pokeball
        const pokeball = inventory.find(i => i.effect_type === 'CAPTURE' && i.quantity > 0);
        if (!pokeball || !enemyPokemon) {
            setCaptureAttempted(true);
            setCaptureSuccess(false);
            addLog({ message: 'Pas de Pokéball !', type: 'INFO' });
            return;
        }
        
        // Calcul de la probabilité de capture (plus HP bas = plus facile)
        const hpPercent = (enemyPokemon?.current_hp || 0) / (enemyPokemon?.max_hp || 1);
        const captureChance = 0.6 + (1 - hpPercent) * 0.4;
        const success = Math.random() < captureChance;
        
        // Consommer la pokeball via API Node.js
        try {
            await api.post(`/shop/use-item`, {
                itemId: pokeball.id,
                pokemonId: playerPokemon?.id
            });
            await fetchInventory();
        } catch (e) {
            console.error('Erreur consommation pokeball:', e);
        }
        
        if (success && enemyPokemon) {
            try {
                await api.post(`/collection/capture`, {
                    tyradexId: enemyPokemon.tyradex_id,
                    level: enemyPokemon.level,
                    name: enemyPokemon.name
                });
                setCaptureSuccess(true);
                confetti({ particleCount: 300, spread: 180, origin: { y: 0.6 } });
                addLog({ message: `${enemyPokemon.name} capturé !`, type: 'PLAYER' });
            } catch (e) {
                console.error('Erreur capture:', e);
            }
        } else {
            addLog({ message: `${enemyPokemon?.name} s'est échappé !`, type: 'INFO' });
        }
        
        setCaptureAttempted(true);
        setCaptureSuccess(success);
    };

    return {
        // State
        phase: battlePhase, previewEnemy, selectedPlayer, rewards, lootRevealed,
        showQuiz, setShowQuiz,
        showInventory, setShowInventory,
        showTeam, setShowTeam,
        shake, flash, floatingTexts,
        controlsPlayer, controlsEnemy,
        captureSuccess,
        
        // PVP State (legacy, non utilisé)
        isPvpMyTurn: false,
        pvpOpponentAction: null,
        currentPvPQuestion: null,
        
        // Actions
        startBattle,
        handleQuizComplete,
        handleUltimate,
        handleFlee,
        handleUseItem,
        handleSwitchPokemon,
        handleExitBattle,
        revealLoot,
        handleCapture
    };
};
