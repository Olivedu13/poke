
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

    // --- PVP STATE ---
    const [pvpMatchId, setPvpMatchId] = useState<number | null>(null);
    const [isPvpMyTurn, setIsPvpMyTurn] = useState(false);
    const [pvpOpponentAction, setPvpOpponentAction] = useState<any>(null);
    const [currentPvPQuestion, setCurrentPvPQuestion] = useState<any>(null); // Nouvelle question du serveur
    const [lastPvpTurnNumber, setLastPvpTurnNumber] = useState<number>(0);
    const lastPvpTurnRef = useRef<number>(0); // Ref pour éviter les problèmes de closure/state async

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
            const hpMult = isBoss ? 2.0 : 0.7;
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
             const hpMult = isBoss ? 2.0 : 0.7;
             return { 
                id: `wild-fb-${id}`, name: `Pokemon #${id}`, sprite_url: spriteUrl, level: level, max_hp: 70 * hpMult, current_hp: 70 * hpMult, type: 'Normal',
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
        // Ne lancer le setup QUE si on est en phase LOADING (après un clic sur un mode de combat)
        // Ne PAS lancer automatiquement si on est en NONE (sélection du mode)
        if (battlePhase === 'NONE' || battlePhase === 'PVP_LOBBY') {
            return; // Ne rien faire, on attend la sélection du mode
        }
        
        // Ne pas réinitialiser si un combat est déjà en cours
        if (battlePhase !== 'LOADING' && playerPokemon && enemyPokemon) {
            return;
        }
        
        if (battlePhase === 'LOADING') {
            const setup = async () => {
                // Note: Pour le mode PVP, pas besoin de vérifier can_start car le match est déjà validé
                
                await fetchCollection();
                await fetchInventory();
                const myTeam = useGameStore.getState().collection;
                const activeTeam = myTeam.filter(p => p.is_team && p.current_hp > 0);
                const starter = activeTeam[0] || myTeam[0]; 
                if (starter) setSelectedPlayer(starter);
                
                // Génération des questions IA si activé
                if (user?.custom_prompt_active && user.custom_prompt_text) {
                    try {
                        addLog({ message: 'Génération des questions...', type: 'INFO' });
                        await api.post(`/generate_ai_questions.php`, {
                            topic: user.custom_prompt_text,
                            count: 10
                        });
                    } catch (e) {
                        console.warn('Erreur génération questions IA:', e);
                    }
                }
                
                const baseLevel = (starter?.level || 1);
                
                // Mode PVP
                if (battleMode === 'PVP') {
                    console.log('🎮 [PVP] Initialisation du combat PVP...');
                    try {
                        // Récupérer les infos du match
                        const pvpMatchStr = localStorage.getItem('pvp_match');
                        console.log('🎮 [PVP] pvp_match depuis localStorage:', pvpMatchStr);
                        
                        if (!pvpMatchStr) {
                            console.error('🎮 [PVP] ERREUR: Match PVP non trouvé dans localStorage');
                            addLog({ message: 'Erreur: Match PVP non trouvé', type: 'INFO' });
                            setBattlePhase('NONE');
                            return;
                        }
                        const pvpMatch = JSON.parse(pvpMatchStr);
                        console.log('🎮 [PVP] Match parsé:', pvpMatch);
                        
                        // Déterminer l'ID de l'adversaire
                        const opponentId = pvpMatch.player1_id === user?.id ? pvpMatch.player2_id : pvpMatch.player1_id;
                        console.log('🎮 [PVP] User ID:', user?.id, 'Opponent ID:', opponentId);
                        
                        // Récupérer l'équipe de l'adversaire via le nouvel endpoint
                        console.log('🎮 [PVP] Récupération de l\'équipe adverse...');
                        const opponentRes = await api.get(`/pvp_lobby.php?action=get_opponent_team&opponent_id=${opponentId}`);
                        console.log('🎮 [PVP] Réponse API équipe adverse:', opponentRes.data);
                        
                        if (!opponentRes.data.success) {
                            console.error('🎮 [PVP] ERREUR: Équipe adversaire introuvable');
                            addLog({ message: 'Erreur: Équipe adversaire introuvable', type: 'INFO' });
                            setBattlePhase('NONE');
                            return;
                        }
                        
                        const opponentTeam = opponentRes.data.collection.filter((p: any) => p.is_team && p.current_hp > 0);
                        console.log('🎮 [PVP] Équipe adverse filtrée:', opponentTeam.length, 'Pokémon');
                        console.log('🎮 [PVP] Premier Pokémon adverse:', opponentTeam[0]);
                        
                        if (opponentTeam.length === 0) {
                            console.error('🎮 [PVP] ERREUR: L\'adversaire n\'a pas de Pokémon disponible');
                            addLog({ message: 'L\'adversaire n\'a pas de Pokémon disponible', type: 'INFO' });
                            setBattlePhase('NONE');
                            return;
                        }
                        
                        const opponentName = opponentRes.data.opponent_name || 'Adversaire';
                        console.log('🎮 [PVP] Nom de l\'adversaire:', opponentName);
                        
                        // Formater les Pokémon adverses au bon format
                        const formattedOpponentTeam = opponentTeam.map((p: any) => ({
                            id: p.id,
                            name: p.nickname || `Pokémon #${p.tyradex_id}`,
                            sprite_url: `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${p.tyradex_id}.png`,
                            level: p.level,
                            max_hp: p.max_hp || 100,
                            current_hp: p.current_hp,
                            type: 'Normal',
                            stats: { atk: 50, def: 50, spe: 50 },
                            current_xp: p.current_xp || 0,
                            tyradex_id: p.tyradex_id,
                            next_level_xp: 100
                        }));
                        
                        console.log('🎮 [PVP] Équipe formatée:', formattedOpponentTeam);
                        
                        const pvpOpponent = {
                            name: opponentName,
                            avatar: '🎮',
                            team: formattedOpponentTeam,
                            currentPokemonIndex: 0
                        };
                        
                        setTrainerOpponent(pvpOpponent);
                        setPreviewEnemy(formattedOpponentTeam[0]);
                        setPreviewEnemyTeam(formattedOpponentTeam);
                        
                        console.log('🎮 [PVP] Combat PVP initialisé avec succès !');
                        addLog({ message: `Combat PVP contre ${opponentName} !`, type: 'INFO' });
                    } catch (e) {
                        console.error('🎮 [PVP] EXCEPTION lors de l\'initialisation:', e);
                        addLog({ message: 'Erreur lors du chargement du combat PVP', type: 'INFO' });
                        setBattlePhase('NONE');
                        return;
                    }
                } else if (battleMode === 'TRAINER') {
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
    }, [battlePhase]);

    // Auto-démarrage PVP dès l'écran PREVIEW
    useEffect(() => {
        if (battleMode === 'PVP' && battlePhase === 'PREVIEW') {
            startBattle();
        }
    }, [battleMode, battlePhase]);

    // --- GAME LOOP & IA ---
    useEffect(() => {
        if (battleOver && enemyPokemon?.current_hp === 0 && battlePhase === 'FIGHTING') {
            // Mode TRAINER ou PVP : vérifier s'il reste des Pokemon
            if ((battleMode === 'TRAINER' || battleMode === 'PVP') && trainerOpponent) {
                const nextIndex = trainerOpponent.currentPokemonIndex + 1;
                if (nextIndex < trainerOpponent.team.length) {
                    // Passer au prochain Pokemon du dresseur/adversaire
                    addLog({ message: `${trainerOpponent.name} envoie ${trainerOpponent.team[nextIndex].name} !`, type: 'INFO' });
                    setTrainerOpponent({
                        ...trainerOpponent,
                        currentPokemonIndex: nextIndex
                    });
                    initBattle(playerPokemon!, trainerOpponent.team[nextIndex]);
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
                // Mode TRAINER ou PVP : pas de capture, victoire directe
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
                const isPvPMode = battleMode === 'PVP';
                
                let xpGain = (enemyPokemon.level * 20) + 10;
                let goldGain = (enemyPokemon.level * 10) + 5;
                
                // Multiplicateur pour boss, dresseur et PVP
                if (isBoss) { xpGain *= 3; goldGain *= 3; }
                if (isTrainerMode) { xpGain *= 2; goldGain *= 2; }
                if (isPvPMode) { xpGain *= 3; goldGain *= 3; } // Bonus PVP
                
                let loot: string | undefined = undefined;
                if (Math.random() < 0.30 || isBoss || isTrainerMode) { 
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
    }, [battleOver, battlePhase, captureAttempted]);

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

    // --- PVP POLLING ---
    useEffect(() => {
        if (battleMode !== 'PVP' || !pvpMatchId || battlePhase !== 'FIGHTING') return;

        console.log('🎮 [PVP] Démarrage du polling pour match:', pvpMatchId);
        
        const checkPvPState = async () => {
            try {
                const res = await api.get(`/pvp_battle.php?action=get_match_state&match_id=${pvpMatchId}`);
                if (res.data.success) {
                    const wasMyTurn = isPvpMyTurn;
                    const isNowMyTurn = res.data.is_my_turn;
                    
                    // MàJ Question Courante
                    if (res.data.current_question) {
                        setCurrentPvPQuestion(res.data.current_question);
                    }

                    setIsPvpMyTurn(isNowMyTurn);
                    
                    // Si c'est maintenant mon tour et que ce n'était pas le cas avant
                    if (isNowMyTurn && !wasMyTurn) {
                        console.log('🎮 [PVP] C\'est maintenant mon tour !');
                        addLog({ message: 'À votre tour !', type: 'INFO' });
                        playSfx('victory');
                    }

                    // Récupérer la dernière action de l'adversaire (une seule fois)
                    if (res.data.turns && res.data.turns.length > 0) {
                        const lastTurn = res.data.turns[res.data.turns.length - 1];
                        const turnNumber = lastTurn.turn_number || 0;
                        const lastProcessed = lastPvpTurnRef.current;

                        if (turnNumber > lastProcessed && lastTurn.player_id !== user?.id) {
                            console.log('🎮 [PVP] Nouvelle action adverse:', lastTurn);
                            
                            // Mettre à jour la ref et le state pour ne pas rejouer ce tour
                            lastPvpTurnRef.current = turnNumber;
                            setLastPvpTurnNumber(turnNumber);
                            setPvpOpponentAction(lastTurn);

                            // Log de l'action adverse
                            const isCorrect = lastTurn.is_correct ? 'Correct' : 'Faux';
                            let answerText = 'Réponse secrète';
                            try {
                                const opts = JSON.parse(lastTurn.options_json || '[]');
                                if (opts[lastTurn.answer_index]) answerText = opts[lastTurn.answer_index];
                            } catch (e) {}
                            
                            addLog({ message: `Adv: ${answerText} (${isCorrect})`, type: 'ENEMY' });

                            // Appliquer les dégâts si l'adversaire a réussi
                            if (lastTurn.is_correct && lastTurn.damage_dealt > 0) {
                                damageEntity('PLAYER', lastTurn.damage_dealt);
                                spawnFloatingText(`-${lastTurn.damage_dealt}`, 'text-red-500', true);
                                triggerShake();
                                triggerFlash('red');
                            }
                        }
                    }
                }
            } catch (e) {
                console.error('🎮 [PVP] Erreur polling état match:', e);
            }
        };

        // Vérifier immédiatement
        checkPvPState();
        
        // Puis toutes les 2 secondes
        const interval = setInterval(checkPvPState, 2000);
        
        return () => clearInterval(interval);
    }, [battleMode, pvpMatchId, battlePhase, isPvpMyTurn, user]); // Removed lastPvpTurnNumber dependency to use Ref logic

    // Ouvrir automatiquement la question quand c'est mon tour en PVP
    useEffect(() => {
        if (battleMode === 'PVP' && pvpMatchId && battlePhase === 'FIGHTING' && isPvpMyTurn && !showQuiz) {
            if (currentPvPQuestion && currentPvPQuestion.id) {
                setShowQuiz(true);
            }
        }
    }, [battleMode, pvpMatchId, battlePhase, isPvpMyTurn, showQuiz, currentPvPQuestion]);

    // --- ACTIONS JOUEUR ---
    const startBattle = async () => {
        console.log('🎮 [BATTLE] Démarrage du combat, mode:', battleMode);
        
        // Mode PVP : Initialiser le système de tours
        if (battleMode === 'PVP') {
            try {
                const pvpMatchStr = localStorage.getItem('pvp_match');
                if (pvpMatchStr) {
                    const pvpMatch = JSON.parse(pvpMatchStr);
                    console.log('🎮 [PVP] Initialisation du système de tours pour match:', pvpMatch.match_id);
                    
                    // Appeler l'API pour tirer au sort le premier joueur
                    const initRes = await api.get(`/pvp_battle.php?action=init_battle&match_id=${pvpMatch.match_id}`);
                    console.log('🎮 [PVP] Résultat init_battle:', initRes.data);
                    
                    if (initRes.data.success) {
                        // SÉCURITÉ : Récupérer d'abord l'état actuel pour éviter les "dégâts fantômes" du passé
                        // Si on rejoint un match en cours (ou terminé malproprement), on ne veut pas rejouer tous les tours comme des nouvelles attaques
                        try {
                            const stateRes = await api.get(`/pvp_battle.php?action=get_match_state&match_id=${pvpMatch.match_id}`);
                            if (stateRes.data.success) {
                                if (stateRes.data.current_question) {
                                    setCurrentPvPQuestion(stateRes.data.current_question);
                                }
                            }

                            if (stateRes.data.success && stateRes.data.turns && stateRes.data.turns.length > 0) {
                                const maxTurn = stateRes.data.turns.reduce((acc: number, t: any) => Math.max(acc, t.turn_number || 0), 0);
                                console.log(`🎮 [PVP] Synchro historique : On reprend au tour ${maxTurn}`);
                                setLastPvpTurnNumber(maxTurn);
                                lastPvpTurnRef.current = maxTurn;
                            } else {
                                setLastPvpTurnNumber(0);
                                lastPvpTurnRef.current = 0;
                            }
                        } catch (err) {
                            console.warn('🎮 [PVP] Erreur synchro historique', err);
                            setLastPvpTurnNumber(0);
                            lastPvpTurnRef.current = 0;
                        }

                        setPvpMatchId(pvpMatch.match_id);
                        setIsPvpMyTurn(false);
                        setPvpOpponentAction(null);
                        setShowQuiz(false);

                        // Appliquer le tour après init
                        const myTurn = !!initRes.data.is_my_turn;
                        setIsPvpMyTurn(myTurn);
                        
                        // Initialiser la question si disponible
                        if (initRes.data.current_question) {
                            setCurrentPvPQuestion(initRes.data.current_question); // Note: init_battle ne renvoie pas current_question dans le JSON actuel, il faudra le rajouter ou attendre le poll
                            // Pour l'instant, le polling prendra le relais
                        }

                        // Initialiser le store avec message CUSTOM pour PVP
                        if(selectedPlayer && previewEnemy) {
                            initBattle(selectedPlayer, previewEnemy, "Combat PVP commence !");
                            setBattlePhase('FIGHTING');
                        }
                        
                        if (myTurn) {
                            addLog({ message: 'C\'est votre tour !', type: 'INFO' });
                        } else {
                            addLog({ message: 'Au tour de l\'adversaire...', type: 'INFO' });
                        }
                        return; // Important: ne pas exécuter le reste de la fonction (initBattle standard)
                    }
                }
            } catch (e) {
                console.error('🎮 [PVP] Erreur initialisation système de tours:', e);
            }
        } else {
            // Enregistrer la session de combat pour modes non-PVP
            try {
                await api.post('/battle_session.php', { 
                    action: 'start',
                    battle_type: battleMode
                });
            } catch (e) {
                console.warn('Impossible d\'enregistrer la session:', e);
            }
        }
        
        if(selectedPlayer && previewEnemy) {
            initBattle(selectedPlayer, previewEnemy);
            setBattlePhase('FIGHTING');
        }
    };

    const executeAttack = async (isUltimate = false, isCorrect = true, difficulty = 'HARD', forcedDamage?: number) => {
        let damage = 0;
        if (typeof forcedDamage === 'number') {
            damage = forcedDamage;
        } else {
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
            if (battleMode !== 'PVP') {
                endTurn();
            }
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
        
        // En mode PVP : enregistrer l'action
        if (battleMode === 'PVP' && pvpMatchId) {
            try {
                console.log('🎮 [PVP] Enregistrement de la réponse:', { isCorrect, dmgDealt, questionId });
                const submitRes = await api.post('/pvp_battle.php', {
                    action: 'submit_answer',
                    match_id: pvpMatchId,
                    question_id: questionId || 0,
                    answer_index: typeof answerIndex === 'number' ? answerIndex : 0,
                    is_correct: isCorrect,
                    damage_dealt: dmgDealt
                });

                if (submitRes.data?.turn_number) {
                    setLastPvpTurnNumber(submitRes.data.turn_number);
                }
                
                // Mon tour est terminé
                setIsPvpMyTurn(false);
                addLog({ message: 'En attente de l\'adversaire...', type: 'INFO' });
            } catch (e) {
                console.error('🎮 [PVP] Erreur enregistrement réponse:', e);
            }
        }
        
        if (battleMode !== 'PVP') {
            executeAttack(false, isCorrect, difficulty, undefined);
        }
    };

    const handleUltimate = () => {
        consumeSpecial();
        executeAttack(true, true, 'HARD');
    };

    const handleUseItem = async (item: Item) => {
        if (['HEAL', 'BUFF_ATK', 'BUFF_DEF', 'TRAITOR'].includes(item.effect_type)) {
            if (item.effect_type === 'TRAITOR') {
                // Potion traître : inflige des dégâts à l'ennemi
                playSfx('ATTACK');
                damageEntity('ENEMY', item.value);
                spawnFloatingText(`-${item.value} POISON!`, 'text-purple-400', false);
                addLog({ message: `Potion traître ! ${item.value} dégâts infligés !`, type: 'PLAYER' });
            } else if (item.effect_type === 'HEAL') {
                playSfx('POTION'); 
                healEntity('PLAYER', item.value);
                spawnFloatingText(`+${item.value}`, 'text-green-400', true);
            } else {
                playSfx('POTION');
            }
            try {
                 await api.post(`/collection.php`, { action: 'use_item', item_id: item.id, pokemon_id: playerPokemon?.id });
                 await fetchInventory();
            } catch(e) {}
            setShowInventory(false);
            if (battleMode !== 'PVP') {
                endTurn();
            } else {
                setIsPvpMyTurn(false);
            }
        }
    };

    const handleSwitchPokemon = (newPoke: Pokemon, isFromTeam: boolean) => {
        if (isFromTeam) {
            if (battleMode !== 'PVP') {
                useGameStore.setState({ playerPokemon: newPoke, isPlayerTurn: false });
            } else {
                useGameStore.setState({ playerPokemon: newPoke });
                setIsPvpMyTurn(false);
            }
            setShowTeam(false);
            addLog({ message: `Go ${newPoke.name} !`, type: 'PLAYER' });
        }
    };

    const handleExitBattle = async () => {
        // Libérer le slot de combat sur le serveur
        try {
            await api.post('/battle_rewards.php', { 
                action: 'end_session'
            });
        } catch (e) {
            console.warn('Impossible de libérer le slot de combat:', e);
        }
        
        setRewards(null);
        setLootRevealed(false);
        setCaptureAttempted(false);
        setCaptureSuccess(false);
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
        const captureChance = 0.6 + (1 - hpPercent) * 0.4; // 60% min, jusqu'à 100%
        const success = Math.random() < captureChance;
        
        // Consommer la pokeball
        try {
            await api.post(`/collection.php`, {
                action: 'use_item',
                item_id: pokeball.id,
                pokemon_id: playerPokemon?.id
            });
            await fetchInventory();
        } catch (e) {
            console.error('Erreur consommation pokeball:', e);
        }
        
        if (success && enemyPokemon) {
            try {
                await api.post(`/collection.php`, {
                    action: 'capture_wild',
                    tyradex_id: enemyPokemon.tyradex_id,
                    level: enemyPokemon.level,
                    name: enemyPokemon.name
                });
                setCaptureSuccess(true);
                confetti({ particleCount: 300, spread: 180, origin: { y: 0.6 } });
            } catch (e) {
                console.error('Erreur capture:', e);
            }
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
        
        // PVP State
        isPvpMyTurn,
        pvpOpponentAction,
        currentPvPQuestion, // NEW
        
        // Actions
        startBattle,
        handleQuizComplete,
        handleUltimate,
        handleUseItem,
        handleSwitchPokemon,
        handleExitBattle,
        revealLoot,
        handleCapture
    };
};
