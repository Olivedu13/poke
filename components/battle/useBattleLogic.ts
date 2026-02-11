
import { useState, useEffect, useRef } from 'react';
import { useAnimation } from 'framer-motion';
import { useGameStore } from '../../store/gameStore';
import { api } from '../../services/api';
import axios from 'axios';
import confetti from 'canvas-confetti';
import { Pokemon, Item } from '../../types';
import { playSfx } from '../../utils/soundEngine';
import { getPokemonNameFr } from '../../utils/pokemonNames';
import { ASSETS_BASE_URL } from '../../config';
import { getTypeEffectiveness, getMatchupHint } from '../../utils/typeEffectiveness';

export const useBattleLogic = () => {
    const { 
        user, initBattle, playerPokemon, enemyPokemon, battleLogs, 
        addLog, isPlayerTurn, damageEntity, healEntity, endTurn, battleOver,
        collection, fetchCollection, inventory, fetchInventory, claimBattleRewards,
        gradeGauge, updateGradeProgress, combo, specialGauge, consumeSpecial,
        battlePhase, setBattlePhase, previewEnemy, selectedPlayer,
        setPreviewEnemy, setPreviewEnemyTeam, setSelectedPlayer, battleMode, trainerOpponent,
        setTrainerOpponent, setPreparedQuestionIds
    } = useGameStore();

    // --- LOCAL STATE ---
    const [showQuiz, setShowQuiz] = useState(false);
    const [showInventory, setShowInventory] = useState(false);
    const [showTeam, setShowTeam] = useState(false);
    const [lootRevealed, setLootRevealed] = useState(false);
    const [rewards, setRewards] = useState<{xp: number, gold: number, tokens?: number, loot?: string} | null>(null);
    const [captureAttempted, setCaptureAttempted] = useState(false);
    const [captureSuccess, setCaptureSuccess] = useState(false);
    const [captureAnimating, setCaptureAnimating] = useState(false);
    
    // Type matchup hint (shown in battle UI)
    const [typeMatchup, setTypeMatchup] = useState<{text: string, color: string, icon: string} | null>(null);

    // Combat stats tracking (minimum 5 questions, XP based on performance)
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
        const spriteUrl = `${ASSETS_BASE_URL}/tyradex/images/${id}/regular.png`;
        const streak = user?.streak || 0;
        const isBoss = (streak + 1) % 3 === 0;

        try {
            // Try to read local cached Tyradex JSON
            const response = await axios.get(`${ASSETS_BASE_URL}/tyradex/pokemon.json`, { timeout: 5000 });
            const list = response.data;
            const data = Array.isArray(list) ? list.find((p: any) => Number(p.pokedex_id) === Number(id) || Number(p.id) === Number(id)) : null;
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

        // Empêcher toute réinitialisation de l'ennemi tant que le combat n'est pas terminé
        if ((battlePhase !== 'LOADING' && playerPokemon && enemyPokemon && !battleOver)) {
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
                    // Mode WILD classique
                    const enemyLevel = Math.max(1, baseLevel + Math.floor(Math.random() * 3) - 1);
                    const enemyId = Math.floor(Math.random() * 150) + 1;
                    const enemy = await fetchTyradexData(enemyId, enemyLevel);
                    setPreviewEnemy(enemy);
                    setPreviewEnemyTeam([enemy]);
                }

                setBattlePhase('PREVIEW');
            };
            setup();
        }
    }, [battlePhase, battleOver]);

    // Auto-démarrage : seulement pour modes non-PVP
    useEffect(() => {
        if (battleMode !== 'PVP' && battlePhase === 'PREVIEW') {
            startBattle();
        }
    }, [battleMode, battlePhase]);

    // --- GAME LOOP & IA ---
    // MIN_QUESTIONS désactivé - victoire dès que l'ennemi est KO
    
    useEffect(() => {
        if (battleMode === 'PVP') return;
        // Vérifier victoire: ennemi KO
        if (battleOver && enemyPokemon?.current_hp === 0 && battlePhase === 'FIGHTING') {
            // Mode TRAINER : vérifier s'il reste des Pokemon
            if (battleMode === 'TRAINER' && trainerOpponent) {
                const nextIndex = trainerOpponent.currentPokemonIndex + 1;
                if (nextIndex < trainerOpponent.team.length) {
                    // Clone la team et met à jour le Pokémon KO
                    const updatedTeam = trainerOpponent.team.map((poke, idx) =>
                        idx === trainerOpponent.currentPokemonIndex ? { ...poke, current_hp: 0 } : poke
                    );
                    setTrainerOpponent({
                        ...trainerOpponent,
                        team: updatedTeam,
                        currentPokemonIndex: nextIndex
                    });
                    // Switch direct sans passer par PREVIEW (sinon startBattle() réutilise previewEnemy)
                    addLog({ message: `${trainerOpponent.name} envoie ${updatedTeam[nextIndex].name} !`, type: 'INFO' });
                    useGameStore.setState({
                        enemyPokemon: updatedTeam[nextIndex],
                        battleOver: false,
                        isPlayerTurn: true,
                    });
                    return;
                }
            }
            // Vérifier si on a une pokeball pour proposer la capture (uniquement en mode WILD)
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
                const isBoss = enemyPokemon.isBoss || false;
                const isTrainerMode = battleMode === 'TRAINER';
                // XP basé sur la difficulté des questions
                // EASY=1, MEDIUM=2, HARD=3 (déjà stocké dans difficultyPoints)
                // On donne 10xp par point de difficulté, bonus combo, bonus bonnes réponses
                const baseXp = difficultyPoints * 10;
                const baseGold = (enemyPokemon.level * 10) + 5;
                const correctBonus = 1 + (correctAnswers * 0.1);
                const comboBonus = 1 + (maxCombo * 0.2);
                let xpGain = Math.floor(baseXp * correctBonus * comboBonus);
                let goldGain = Math.floor(baseGold * correctBonus);
                if (isBoss) { xpGain *= 3; goldGain *= 3; }
                if (isTrainerMode) { xpGain *= 2; goldGain *= 2; }
                // Gain de tokens : 1 par combat sauvage, 2 par dresseur, 3 si boss
                let tokenGain = 1;
                if (isTrainerMode) tokenGain = 2;
                if (isBoss) tokenGain = 3;
                // Bonus token si bon combo
                if (maxCombo >= 3) tokenGain += 1;
                let loot: string | undefined = undefined;
                const lootChance = Math.min(0.8, 0.20 + (maxCombo * 0.1));
                if (Math.random() < lootChance || isBoss || isTrainerMode) { 
                    const items = isTrainerMode 
                        ? ['heal_r2', 'traitor_r1', 'atk_r1', 'def_r1'] 
                        : ['heal_r1', 'pokeball'];
                    loot = items[Math.floor(Math.random() * items.length)];
                    if (isBoss) loot = 'heal_r2'; 
                }
                setRewards({ xp: xpGain, gold: goldGain, tokens: tokenGain, loot });
                claimBattleRewards(xpGain, goldGain, tokenGain, loot);
                const victoryMsg = isTrainerMode && trainerOpponent 
                    ? `Tu as battu le dresseur ${trainerOpponent.name} !` 
                    : 'VICTOIRE !';
                addLog({ message: victoryMsg, type: 'INFO' });
            }
        } else if (battleOver && playerPokemon?.current_hp === 0 && battlePhase === 'FIGHTING') {
            // Mode TRAINER : vérifier s'il reste des Pokémon dans l'équipe du joueur
            if (battleMode === 'TRAINER' && enemyPokemon) {
                const myTeam = useGameStore.getState().collection.filter(p => p.is_team && p.current_hp > 0 && p.id !== playerPokemon.id);
                if (myTeam.length > 0) {
                    const nextPokemon = myTeam[0];
                    addLog({ message: `${playerPokemon.name} est K.O. ! Tu envoies ${nextPokemon.name} !`, type: 'INFO' });
                    // Switch direct sans passer par PREVIEW pour ne pas réinitialiser le combat
                    useGameStore.setState({
                        playerPokemon: nextPokemon,
                        battleOver: false,
                        isPlayerTurn: true,
                    });
                    return;
                }
            }
            setBattlePhase('FINISHED');
            setRewards(null);
        }
    }, [battleOver, battlePhase, captureAttempted, questionsAnswered]);

    // IA Turn (with status effects)
    useEffect(() => {
        if (battleMode === 'PVP') return;
        if (battlePhase === 'FIGHTING' && !isPlayerTurn && !battleOver && enemyPokemon && playerPokemon) {
            const aiTurn = async () => {
                await new Promise(r => setTimeout(r, 800));

                // Apply poison damage at start of enemy turn
                if (enemyStatus === 'poison' && enemyPoisonDmg > 0) {
                    damageEntity('ENEMY', enemyPoisonDmg);
                    spawnFloatingText(`-${enemyPoisonDmg} ☠️`, 'text-green-500', false);
                    addLog({ message: `${enemyPokemon.name} subit ${enemyPoisonDmg} dégâts de poison !`, type: 'INFO' });
                    await new Promise(r => setTimeout(r, 500));
                }

                // Check if enemy is sleeping
                if (enemyStatus === 'sleep' && enemySleepTurns > 0) {
                    setEnemySleepTurns(prev => prev - 1);
                    spawnFloatingText('💤 Zzz...', 'text-indigo-400', false);
                    addLog({ message: `${enemyPokemon.name} dort profondément... (${enemySleepTurns - 1} tour${enemySleepTurns - 1 > 1 ? 's' : ''} restant${enemySleepTurns - 1 > 1 ? 's' : ''})`, type: 'INFO' });
                    if (enemySleepTurns <= 1) {
                        setEnemyStatus(null);
                        addLog({ message: `${enemyPokemon.name} se réveille !`, type: 'INFO' });
                    }
                    endTurn();
                    return;
                }

                // Normal enemy attack with type effectiveness
                await controlsEnemy.start({ x: -100, y: 100, scale: 1.2, transition: { duration: 0.2 } });
                await controlsEnemy.start({ x: 0, y: 0, scale: 1, transition: { type: "spring", stiffness: 300 } });
                triggerShake(); triggerFlash('red');
                const baseDmg = Math.max(1, Math.floor((enemyPokemon.stats?.atk || 10) / 6) + Math.floor(Math.random() * 3));
                // Appliquer l'efficacité de type ennemi → joueur
                const enemyTypeResult = getTypeEffectiveness(
                    enemyPokemon.type || 'Normal',
                    playerPokemon.type || 'Normal'
                );
                const dmg = Math.max(1, Math.floor(baseDmg * enemyTypeResult.multiplier));
                damageEntity('PLAYER', dmg);
                spawnFloatingText(`-${dmg}`, 'text-red-500', true);
                if (enemyTypeResult.label) {
                    spawnFloatingText(`${enemyTypeResult.emoji}`, enemyTypeResult.color, true);
                }
                const enemyTypeInfo = enemyTypeResult.label ? ` ${enemyTypeResult.emoji} ${enemyTypeResult.label}` : '';
                addLog({ message: `${enemyPokemon.name} attaque ! -${dmg}${enemyTypeInfo}`, type: 'ENEMY' });
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
            // Reset status effects
            setEnemyStatus(null);
            setEnemySleepTurns(0);
            setEnemyPoisonDmg(0);

            // Adapter le message de début de combat selon le mode
            const startMsg = battleMode === 'TRAINER' && trainerOpponent
                ? `${trainerOpponent.name} envoie ${previewEnemy.name} !`
                : `Un ${previewEnemy.name} sauvage apparaît !`;

            // Pre-generate AI questions (bloquant pour garantir les IDs dès la 1ère question)
            try {
                const res = await api.post('/ai/prepare-battle', {
                    userId: user?.id,
                    gradeLevel: user?.grade_level || 'CE1',
                    difficulty: gradeGauge || 0
                });
                if (res.data?.question_ids?.length > 0) {
                    setPreparedQuestionIds(res.data.question_ids);
                } else {
                    setPreparedQuestionIds([]);
                }
            } catch (e) {
                console.warn('AI prepare-battle failed, will use question bank fallback:', e);
                setPreparedQuestionIds([]);
            }

            initBattle(selectedPlayer, previewEnemy, startMsg);
            setBattlePhase('FIGHTING');

            // Calculer le matchup de type et afficher un hint
            const hint = getMatchupHint(selectedPlayer.type || 'Normal', previewEnemy.type || 'Normal');
            setTypeMatchup(hint);
            if (hint) {
                setTimeout(() => {
                    addLog({ message: `${hint.icon} ${hint.text}`, type: hint.color.includes('red') || hint.color.includes('orange') ? 'ENEMY' : 'CRITICAL' });
                }, 600);
            }
        }
    };

    // Calcul dégâts local (remplace combat_engine.php)
    // La jauge (gradeGauge) impacte les dégâts: 0=x1, 1=x1.1, 2=x1.2, 3=x1.3, 4=x1.4, 5=x1.5
    const calculateDamage = (isCorrect: boolean, attackerLevel: number, comboCount: number, isUltimate: boolean, difficulty: string = 'MEDIUM'): number => {
        if (!isCorrect) return 0;
        
        const baseDamage = 15 + attackerLevel * 3;
        const comboBonus = 1 + (comboCount * 0.1);
        // En PvP, pas de bonus de jauge (équité entre joueurs)
        const gaugeBonus = battleMode === 'PVP' ? 1 : 1 + (gradeGauge * 0.1);
        const difficultyBonus = difficulty === 'HARD' ? 1.3 : difficulty === 'MEDIUM' ? 1.15 : 1.0;
        const ultimateMultiplier = isUltimate ? 3 : 1;
        const randomVariance = 0.9 + Math.random() * 0.2;
        
        // Efficacité de type : attaquant (joueur) → défenseur (ennemi)
        const typeResult = getTypeEffectiveness(
            playerPokemon?.type || 'Normal',
            enemyPokemon?.type || 'Normal'
        );
        const typeMultiplier = typeResult.multiplier;
        
        return Math.floor(baseDamage * comboBonus * gaugeBonus * difficultyBonus * ultimateMultiplier * typeMultiplier * randomVariance);
    };

    const executeAttack = async (isUltimate = false, isCorrect = true, difficulty = 'HARD', forcedDamage?: number) => {
        let damage = 0;
        if (typeof forcedDamage === 'number') {
            damage = forcedDamage;
        } else {
            damage = calculateDamage(isCorrect, playerPokemon?.level || 1, combo, isUltimate);
        }

        // Afficher le message d'efficacité de type
        const typeResult = getTypeEffectiveness(
            playerPokemon?.type || 'Normal',
            enemyPokemon?.type || 'Normal'
        );

        if (isCorrect) {
            await controlsPlayer.start({ x: 100, y: -100, scale: isUltimate ? 1.5 : 1.2, transition: { duration: 0.2 } });
            controlsPlayer.start({ x: 0, y: 0, scale: 1, transition: { type: "spring", stiffness: 300 } });
            controlsEnemy.start({ x: [0, 20, -20, 0], filter: ["brightness(1)", "brightness(3)", "brightness(1)"], transition: { duration: 0.3 } });

            damageEntity('ENEMY', damage);
            spawnFloatingText(`-${damage}`, isUltimate ? 'text-purple-400 text-6xl' : 'text-yellow-400', false);
            
            // Afficher le feedback d'efficacité de type
            if (typeResult.label) {
                spawnFloatingText(`${typeResult.emoji} ${typeResult.label}`, typeResult.color, false);
            }
            
            if (isUltimate) {
                spawnFloatingText("ULTIME !", "text-cyan-300", false);
                triggerShake(2);
            } else if (damage > 20) {
                spawnFloatingText("CRITIQUE!", "text-yellow-300", false);
            }
            
            // Message de log avec info type
            const typeInfo = typeResult.label ? ` ${typeResult.emoji} ${typeResult.label}` : '';
            addLog({ message: isUltimate ? `FRAPPE ULTIME -${damage}!${typeInfo}` : `Coup réussi ! -${damage}${typeInfo}`, type: 'PLAYER' });
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

    // Status effects on enemy
    const [enemyStatus, setEnemyStatus] = useState<'sleep' | 'poison' | null>(null);
    const [enemySleepTurns, setEnemySleepTurns] = useState(0);
    const [enemyPoisonDmg, setEnemyPoisonDmg] = useState(0);

    const handleUseItem = async (item: Item) => {
        // Battle-usable items
        if (['HEAL', 'HEAL_TEAM', 'BUFF_ATK', 'BUFF_DEF', 'TRAITOR', 'DMG_FLAT', 'SLEEP', 'POISON', 'QUESTION_SUCCESS'].includes(item.effect_type)) {
            // Apply local effect immediately for instant visual feedback
            if (item.effect_type === 'TRAITOR' || item.effect_type === 'DMG_FLAT') {
                playSfx('ATTACK');
                damageEntity('ENEMY', item.value);
                spawnFloatingText(`-${item.value}!`, 'text-purple-400', false);
                addLog({ message: `${item.name} ! ${item.value} dégâts infligés !`, type: 'PLAYER' });
            } else if (item.effect_type === 'SLEEP') {
                playSfx('POTION');
                setEnemyStatus('sleep');
                setEnemySleepTurns(2);
                spawnFloatingText('💤 DODO !', 'text-indigo-400', false);
                addLog({ message: `${item.name} ! ${enemyPokemon?.name} s'endort pendant 2 tours !`, type: 'PLAYER' });
            } else if (item.effect_type === 'POISON') {
                playSfx('POTION');
                setEnemyStatus('poison');
                setEnemyPoisonDmg(item.value || 10);
                spawnFloatingText('☠️ POISON !', 'text-green-500', false);
                addLog({ message: `${item.name} ! ${enemyPokemon?.name} est empoisonné (-${item.value} PV/tour) !`, type: 'PLAYER' });
            } else if (item.effect_type === 'HEAL') {
                playSfx('POTION');
                healEntity('PLAYER', item.value);
                spawnFloatingText(`+${item.value} PV`, 'text-green-400', true);
                addLog({ message: `${item.name} restaure ${item.value} PV !`, type: 'PLAYER' });
            } else if (item.effect_type === 'HEAL_TEAM') {
                playSfx('POTION');
                healEntity('PLAYER', item.value);
                spawnFloatingText(`+${item.value} PV (équipe)`, 'text-green-400', true);
                addLog({ message: `${item.name} soigne toute l'équipe !`, type: 'PLAYER' });
            } else if (item.effect_type === 'BUFF_ATK') {
                playSfx('POTION');
                spawnFloatingText('ATQ ↑', 'text-orange-400', true);
                addLog({ message: `${item.name} : Attaque augmentée !`, type: 'PLAYER' });
            } else if (item.effect_type === 'BUFF_DEF') {
                playSfx('POTION');
                spawnFloatingText('DÉF ↑', 'text-blue-400', true);
                addLog({ message: `${item.name} : Défense augmentée !`, type: 'PLAYER' });
            }

            // Consume item via backend API
            try {
                await api.post('/shop/use-item', { itemId: item.id, pokemonId: playerPokemon?.id });
                await fetchInventory();
            } catch (e) {
                console.error('Erreur utilisation item:', e);
            }

            setShowInventory(false);
            // Potions (HEAL / HEAL_TEAM) ne consomment pas le tour du joueur
            if (!['HEAL', 'HEAL_TEAM', 'TEAM_HEAL'].includes(item.effect_type)) {
                endTurn();
            }
        }
    };

    const handleSwitchPokemon = (newPoke: Pokemon, isFromTeam: boolean) => {
        // Allow switching whether from team or box - the Pokemon just needs to be valid
        if (newPoke && newPoke.current_hp > 0) {
            useGameStore.setState({ playerPokemon: newPoke, isPlayerTurn: false });
            setShowTeam(false);
            addLog({ message: `En avant ${newPoke.name} !`, type: 'PLAYER' });
        }
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
            // gradeGauge: 0, // Do NOT reset gradeGauge to persist between battles
            combo: 0, 
            specialGauge: 0, 
            battlePhase: 'NONE',
            battleMode: 'WILD',
            trainerOpponent: null,
            previewEnemy: null,
            previewEnemyTeam: [],
            selectedPlayer: null,
            currentView: 'COLLECTION',
            preparedQuestionIds: [],
        });
    };

    // Alias for fleeing battle
    const handleFlee = handleExitBattle;

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
        // Calcul de la probabilité de capture (plus difficile pour hauts niveaux)
        const hpPercent = (enemyPokemon?.current_hp || 0) / (enemyPokemon?.max_hp || 1);
        let rarityBonus = 1;
        if (enemyPokemon.isBoss) rarityBonus = 0.35;
        const baseRate = 0.25;
        // Pénalité de niveau : un pokémon nv100 est ~2x plus dur qu'un nv1
        const levelPenalty = Math.max(0.3, 1 - (enemyPokemon.level / 100) * 0.7);
        const captureChance = Math.max(0.05, Math.min(0.75,
            baseRate * rarityBonus * levelPenalty + (1 - hpPercent) * 0.35));
        const success = Math.random() < captureChance;

        // Set result immediately then start animation
        setCaptureSuccess(success);
        setCaptureAnimating(true);
        addLog({ message: 'Tu lances une Pokéball...', type: 'INFO' });

        // Consume pokeball via API (runs in background while animation plays)
        try {
            await api.post(`/shop/use-item`, {
                itemId: pokeball.id,
                pokemonId: playerPokemon?.id
            });
            await fetchInventory();
        } catch (e) {
            console.error('Erreur consommation pokeball:', e);
        }
        // If success, register capture via API
        if (success && enemyPokemon) {
            try {
                await api.post(`/collection/capture`, {
                    tyradexId: enemyPokemon.tyradex_id,
                    level: enemyPokemon.level,
                    name: enemyPokemon.name
                });
                addLog({ message: `${enemyPokemon.name} capturé !`, type: 'PLAYER' });
            } catch (e) {
                console.error('Erreur capture:', e);
            }
        } else {
            addLog({ message: `${enemyPokemon?.name} s'est échappé !`, type: 'INFO' });
        }
        // NOTE: captureAttempted is set by onCaptureAnimEnd when animation finishes
    };

    /** Called by CaptureAnimation when the sequence finishes */
    const onCaptureAnimEnd = () => {
        setCaptureAnimating(false);
        setCaptureAttempted(true);
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
        captureAnimating,
        enemyStatus, enemySleepTurns, enemyPoisonDmg,
        typeMatchup,
        
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
        handleCapture,
        onCaptureAnimEnd,
    };
};
