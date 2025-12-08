'use client';

import { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
// --- Constants & Types ---
import {
    CANVAS_HEIGHT, PLAYER_WIDTH, PLAYER_HEIGHT,
    ENEMY_WIDTH, ENEMY_HEIGHT, BULLET_WIDTH, BULLET_HEIGHT, BUNKER_WIDTH, BUNKER_HEIGHT,
    GameState, Player, Projectile, Enemy, Bunker, PLAYER_SHIPS, ENEMY_SHIPS
} from '@/lib/game-utils';
import NextImage from 'next/image';
import { useUser, SignInButton } from "@clerk/nextjs";
import { Button } from "@/components/ui/button";
import MobileControls, { ControlAction } from '@/components/ui/MobileControls';

const getCanvasWidth = (level: number) => 800 + Math.floor((level - 1) / 10) * 100;

export default function SpaceInvadersGame() {
    const { user } = useUser();
    const [showAuthOverlay, setShowAuthOverlay] = useState(false);

    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [gameState, setGameState] = useState<GameState>('START');
    const [score, setScore] = useState(0);
    const [level, setLevel] = useState(1);
    const [lives, setLives] = useState(3);
    const [selectedShipIndex, setSelectedShipIndex] = useState(0);
    const [canvasWidth, setCanvasWidth] = useState(800);
    const canvasWidthRef = useRef(800);

    // Assets
    const playerImageRef = useRef<HTMLImageElement | null>(null);
    const enemyImageRef = useRef<HTMLImageElement | null>(null);
    const keysRef = useRef<{ [key: string]: boolean }>({});
    const enemiesRef = useRef<Enemy[]>([]);
    const bunkersRef = useRef<Bunker[]>([]);
    const bulletsRef = useRef<Projectile[]>([]);
    const enemyBulletsRef = useRef<Projectile[]>([]);
    const playerRef = useRef<Player>({ x: 375, y: 550, width: PLAYER_WIDTH, height: PLAYER_HEIGHT, speed: 5 });
    const lastShotTimeRef = useRef(0);
    const lastEnemyShotTimeRef = useRef(0);
    const enemyDirectionRef = useRef(1);
    const animationFrameRef = useRef<number>(0);

    // Convex
    const submitScore = useMutation(api.scores.submitScore);
    const saveGameMutation = useMutation(api.games.saveGame);
    const loadGameQuery = useQuery(api.games.loadGame);
    const clearSaveMutation = useMutation(api.games.clearSave);

    // Level Config
    const levelConfig = useMemo(() => ({
        config: {
            enemyRows: Math.min(6, 3 + Math.floor((level - 1) / 5)),
            enemyCols: Math.min(12, 6 + Math.floor((level - 1) / 3)),
            enemySpeed: 1 + level * 0.1,
            fireRate: Math.max(500, 2000 - level * 50),
            bunkers: Math.max(0, 4 - Math.floor((level - 1) / 10))
        }
    }), [level]);
    // Load assets
    const removeWhiteBackground = useCallback((img: HTMLImageElement): Promise<HTMLImageElement> => {
        return new Promise((resolve) => {
            const canvas = document.createElement('canvas');
            canvas.width = img.width;
            canvas.height = img.height;
            const ctx = canvas.getContext('2d');
            if (!ctx) {
                resolve(img);
                return;
            }
            ctx.drawImage(img, 0, 0);
            const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            const data = imageData.data;
            for (let i = 0; i < data.length; i += 4) {
                const r = data[i];
                const g = data[i + 1];
                const b = data[i + 2];
                // If pixel is close to white, make it transparent
                if (r > 240 && g > 240 && b > 240) {
                    data[i + 3] = 0;
                }
            }
            ctx.putImageData(imageData, 0, 0);
            const newImg = new Image();
            newImg.src = canvas.toDataURL();
            newImg.onload = () => resolve(newImg);
        });
    }, []);

    useEffect(() => {
        const pImg = new Image();
        pImg.onload = () => {
            // Apply fix for player 2 (index 1)
            if (selectedShipIndex === 1) {
                removeWhiteBackground(pImg).then(processed => {
                    playerImageRef.current = processed;
                });
            } else {
                playerImageRef.current = pImg;
            }
        };
        pImg.src = PLAYER_SHIPS[selectedShipIndex];
    }, [selectedShipIndex, removeWhiteBackground]);

    useEffect(() => {
        const eImg = new Image();
        const enemyImgIndex = (level - 1) % ENEMY_SHIPS.length;
        eImg.onload = () => {
            // Apply fix for enemy 2 (index 1) and enemy 6 (index 5)
            if (enemyImgIndex === 1 || enemyImgIndex === 5) {
                removeWhiteBackground(eImg).then(processed => {
                    enemyImageRef.current = processed;
                });
            } else {
                enemyImageRef.current = eImg;
            }
        };
        eImg.src = ENEMY_SHIPS[enemyImgIndex];
    }, [level, removeWhiteBackground]);

    // Input handling
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => { keysRef.current[e.code] = true; };
        const handleKeyUp = (e: KeyboardEvent) => { keysRef.current[e.code] = false; };
        window.addEventListener('keydown', handleKeyDown);
        window.addEventListener('keyup', handleKeyUp);
        return () => {
            window.removeEventListener('keydown', handleKeyDown);
            window.removeEventListener('keyup', handleKeyUp);
        };
    }, []);

    const handleMobileInput = (action: ControlAction, active: boolean) => {
        const keyMap: Record<ControlAction, string> = {
            'UP': 'ArrowUp', // Shoot alt
            'DOWN': 'ArrowDown',
            'LEFT': 'ArrowLeft',
            'RIGHT': 'ArrowRight',
            'A': 'Space', // Shoot
            'B': 'Space',
        };
        const key = keyMap[action];
        if (key) {
            keysRef.current[key] = active;
        }
    };

    const initEnemies = () => {
        if (!levelConfig) return;
        const { enemyRows, enemyCols } = levelConfig.config;
        const newEnemies: Enemy[] = [];

        // Center enemies
        const totalEnemyWidth = enemyCols * (ENEMY_WIDTH + 20) - 20;
        const startX = (canvasWidthRef.current - totalEnemyWidth) / 2;
        const startY = 50;
        const gapX = 20;
        const gapY = 20;

        for (let row = 0; row < enemyRows; row++) {
            for (let col = 0; col < enemyCols; col++) {
                newEnemies.push({
                    x: startX + col * (ENEMY_WIDTH + gapX),
                    y: startY + row * (ENEMY_HEIGHT + gapY),
                    width: ENEMY_WIDTH,
                    height: ENEMY_HEIGHT,
                    active: true,
                    row,
                    col
                });
            }
        }
        enemiesRef.current = newEnemies;
    };

    const initBunkers = () => {
        if (!levelConfig) return;
        const count = levelConfig.config.bunkers || 0;
        const newBunkers: Bunker[] = [];
        if (count === 0) {
            bunkersRef.current = [];
            return;
        }

        const gap = canvasWidthRef.current / (count + 1);
        for (let i = 0; i < count; i++) {
            newBunkers.push({
                x: gap * (i + 1) - BUNKER_WIDTH / 2,
                y: CANVAS_HEIGHT - 150,
                width: BUNKER_WIDTH,
                height: BUNKER_HEIGHT,
                damage: 0
            });
        }
        bunkersRef.current = newBunkers;
    };

    const startGame = (resume = false) => {
        if (!levelConfig) return;

        if (resume && loadGameQuery) {
            setScore(loadGameQuery.score);
            setLives(loadGameQuery.lives);
            setLevel(loadGameQuery.level);

            // Update width for loaded level
            const newWidth = getCanvasWidth(loadGameQuery.level);
            setCanvasWidth(newWidth);
            canvasWidthRef.current = newWidth;

            // Resume immediately
            setTimeout(() => {
                initEnemies();
                initBunkers();
                setGameState('PLAYING');
            }, 100);
        } else {
            // Go to ship selection
            setGameState('SHIP_SELECTION');
        }
    };

    const confirmShipSelection = () => {
        setScore(0);
        setLives(3);
        setLevel(1);

        // Reset width
        const startWidth = getCanvasWidth(1);
        setCanvasWidth(startWidth);
        canvasWidthRef.current = startWidth;

        bulletsRef.current = [];
        enemyBulletsRef.current = [];
        playerRef.current = { x: startWidth / 2 - PLAYER_WIDTH / 2, y: CANVAS_HEIGHT - 50, width: PLAYER_WIDTH, height: PLAYER_HEIGHT, speed: 5 };

        setTimeout(() => {
            initEnemies();
            initBunkers();
            setGameState('PLAYING');
        }, 100);
    };

    const nextLevel = useCallback(() => {
        // Auth Check
        if (level >= 2 && !user) {
            setShowAuthOverlay(true);
            return;
        }

        if (level >= 50) {
            setGameState('VICTORY');
            submitScore({ score, level, gameType: "space-invaders" });
            clearSaveMutation();
        } else {
            setGameState('LEVEL_TRANSITION');
            saveGameMutation({ level: level + 1, score, lives });
        }
    }, [level, user, score, lives, submitScore, clearSaveMutation, saveGameMutation]);

    const startNextLevel = () => {
        const nextLvl = level + 1;
        setLevel(nextLvl);

        // Update width
        const newWidth = getCanvasWidth(nextLvl);
        setCanvasWidth(newWidth);
        canvasWidthRef.current = newWidth;

        bulletsRef.current = [];
        enemyBulletsRef.current = [];

        // Center player
        playerRef.current.x = newWidth / 2 - PLAYER_WIDTH / 2;

        setTimeout(() => {
            initEnemies();
            initBunkers();
            setGameState('PLAYING');
        }, 100);
    };

    const saveAndQuit = () => {
        const nextLvl = Math.min(50, level + 1);
        saveGameMutation({ level: nextLvl, score, lives });
        setGameState('START');
    };

    // Game Loop
    useEffect(() => {
        if (gameState !== 'PLAYING' || !levelConfig || showAuthOverlay) return;

        const loop = (timestamp: number) => {
            const ctx = canvasRef.current?.getContext('2d');
            if (!ctx) return;

            // Clear canvas
            ctx.fillStyle = '#000';
            ctx.fillRect(0, 0, canvasWidthRef.current, CANVAS_HEIGHT);

            // Update Player
            if (keysRef.current['ArrowLeft'] || keysRef.current['KeyA']) {
                playerRef.current.x = Math.max(0, playerRef.current.x - playerRef.current.speed);
            }
            if (keysRef.current['ArrowRight'] || keysRef.current['KeyD']) {
                playerRef.current.x = Math.min(canvasWidthRef.current - PLAYER_WIDTH, playerRef.current.x + playerRef.current.speed);
            }

            // Player Shoot
            if ((keysRef.current['Space'] || keysRef.current['ArrowUp']) && timestamp - lastShotTimeRef.current > 500) {
                bulletsRef.current.push({
                    x: playerRef.current.x + PLAYER_WIDTH / 2 - BULLET_WIDTH / 2,
                    y: playerRef.current.y,
                    width: BULLET_WIDTH,
                    height: BULLET_HEIGHT,
                    dy: -7,
                    active: true
                });
                lastShotTimeRef.current = timestamp;
            }

            // Update Bullets
            bulletsRef.current.forEach(b => {
                b.y += b.dy;
                if (b.y < 0) b.active = false;
            });
            bulletsRef.current = bulletsRef.current.filter(b => b.active);

            // Update Enemies
            let hitWall = false;
            const activeEnemies = enemiesRef.current.filter(e => e.active);

            if (activeEnemies.length === 0) {
                nextLevel();
                return;
            }

            activeEnemies.forEach(e => {
                e.x += levelConfig.config.enemySpeed * enemyDirectionRef.current;
                if (e.x <= 0 || e.x + ENEMY_WIDTH >= canvasWidthRef.current) {
                    hitWall = true;
                }
            });

            if (hitWall) {
                enemyDirectionRef.current *= -1;
                activeEnemies.forEach(e => e.y += 20);
            }

            // Enemy Shoot
            if (timestamp - lastEnemyShotTimeRef.current > levelConfig.config.fireRate) {
                const randomEnemy = activeEnemies[Math.floor(Math.random() * activeEnemies.length)];
                if (randomEnemy) {
                    enemyBulletsRef.current.push({
                        x: randomEnemy.x + ENEMY_WIDTH / 2,
                        y: randomEnemy.y + ENEMY_HEIGHT,
                        width: BULLET_WIDTH,
                        height: BULLET_HEIGHT,
                        dy: 5,
                        active: true
                    });
                    lastEnemyShotTimeRef.current = timestamp;
                }
            }

            // Update Enemy Bullets
            enemyBulletsRef.current.forEach(b => {
                b.y += b.dy;
                if (b.y > CANVAS_HEIGHT) b.active = false;

                // Collision with Player
                if (
                    b.active &&
                    b.x < playerRef.current.x + playerRef.current.width &&
                    b.x + b.width > playerRef.current.x &&
                    b.y < playerRef.current.y + playerRef.current.height &&
                    b.y + b.height > playerRef.current.y
                ) {
                    b.active = false;
                    setLives(prev => {
                        const newLives = prev - 1;
                        if (newLives <= 0) {
                            setGameState('GAME_OVER');
                            submitScore({ score, level, gameType: "space-invaders" });
                            clearSaveMutation();
                        }
                        return newLives;
                    });
                }

                // Collision with Bunkers
                bunkersRef.current.forEach(bunker => {
                    if (
                        b.active && bunker.damage < 100 &&
                        b.x < bunker.x + bunker.width &&
                        b.x + b.width > bunker.x &&
                        b.y < bunker.y + bunker.height &&
                        b.y + b.height > bunker.y
                    ) {
                        b.active = false;
                        bunker.damage += 20;
                    }
                });
            });
            enemyBulletsRef.current = enemyBulletsRef.current.filter(b => b.active);

            // Collision: Bullets vs Enemies
            bulletsRef.current.forEach(b => {
                enemiesRef.current.forEach(e => {
                    if (
                        b.active && e.active &&
                        b.x < e.x + e.width &&
                        b.x + b.width > e.x &&
                        b.y < e.y + e.height &&
                        b.y + b.height > e.y
                    ) {
                        b.active = false;
                        e.active = false;
                        setScore(prev => prev + 100);
                    }
                });

                // Collision: Bullets vs Bunkers
                bunkersRef.current.forEach(bunker => {
                    if (
                        b.active && bunker.damage < 100 &&
                        b.x < bunker.x + bunker.width &&
                        b.x + b.width > bunker.x &&
                        b.y < bunker.y + bunker.height &&
                        b.y + b.height > bunker.y
                    ) {
                        b.active = false;
                        bunker.damage += 10;
                    }
                });
            });

            // Draw
            // Player
            if (playerImageRef.current) {
                // Apply hue rotation for Player 2 (index 1)
                if (selectedShipIndex === 1) {
                    ctx.filter = `hue-rotate(180deg) saturate(1.5)`;
                }
                ctx.drawImage(playerImageRef.current, playerRef.current.x, playerRef.current.y, playerRef.current.width, playerRef.current.height);
                ctx.filter = 'none';
            } else {
                ctx.fillStyle = '#0f0';
                ctx.fillRect(playerRef.current.x, playerRef.current.y, playerRef.current.width, playerRef.current.height);
            }

            // Enemies
            activeEnemies.forEach(e => {
                if (enemyImageRef.current) {
                    const enemyIndex = (level - 1) % ENEMY_SHIPS.length;

                    if (enemyIndex >= 4 || enemyIndex === 1) {
                        // Generate a stable hue rotation based on the index
                        const hue = (enemyIndex * 60) % 360;
                        ctx.filter = `hue-rotate(${hue}deg) saturate(1.5)`;
                    }

                    ctx.drawImage(enemyImageRef.current, e.x, e.y, e.width, e.height);

                    // Reset filter
                    ctx.filter = 'none';
                } else {
                    ctx.fillStyle = '#f00';
                    ctx.fillRect(e.x, e.y, e.width, e.height);
                }
            });

            // Bunkers
            bunkersRef.current.forEach(b => {
                if (b.damage < 100) {
                    ctx.fillStyle = `rgba(0, 255, 0, ${1 - b.damage / 100})`;
                    ctx.fillRect(b.x, b.y, b.width, b.height);
                }
            });

            // Bullets
            ctx.fillStyle = '#ff0';
            bulletsRef.current.forEach(b => ctx.fillRect(b.x, b.y, b.width, b.height));

            // Enemy Bullets
            ctx.fillStyle = '#fff';
            enemyBulletsRef.current.forEach(b => ctx.fillRect(b.x, b.y, b.width, b.height));

            animationFrameRef.current = requestAnimationFrame(loop);
        };

        animationFrameRef.current = requestAnimationFrame(loop);
        return () => cancelAnimationFrame(animationFrameRef.current);
    }, [gameState, levelConfig, level, score, submitScore, clearSaveMutation, nextLevel, showAuthOverlay, canvasWidth, selectedShipIndex]);

    return (
        <div className="flex flex-col items-center gap-4 relative pb-60 min-[1380px]:pb-0">
            <div className="flex justify-center gap-6 min-[1380px]:justify-between w-full max-w-[800px] text-white font-mono text-xs min-[1380px]:text-xl px-4 min-[1380px]:px-0">
                <div>SCORE: {score}</div>
                <div>LEVEL: {level}</div>
                <div>LIVES: {lives}</div>
            </div>

            <div className="relative">
                <canvas
                    ref={canvasRef}
                    width={canvasWidth}
                    height={CANVAS_HEIGHT}
                    className="block w-full h-full object-contain"
                />

                {showAuthOverlay && (
                    <div className="absolute inset-0 bg-black/95 flex flex-col items-center justify-center text-center p-8">
                        <h2 className="text-3xl font-bold text-red-500 mb-4">LEVEL 3 LOCKED</h2>
                        <p className="text-gray-300 mb-8">You need to be logged in to play past Level 2!</p>
                        <SignInButton mode="modal">
                            <Button className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-4 text-xl font-bold">
                                Sign In to Continue
                            </Button>
                        </SignInButton>
                        <Button
                            variant="ghost"
                            className="mt-4 text-gray-500 hover:text-white"
                            onClick={() => setShowAuthOverlay(false)}
                        >
                            Cancel
                        </Button>
                    </div>
                )}

                {gameState === 'START' && !showAuthOverlay && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 text-white">
                        <h1 className="text-6xl font-bold mb-8 text-green-500 font-mono tracking-widest">SPACE INVADERS</h1>
                        <button
                            onClick={() => startGame(false)}
                            className="px-8 py-4 bg-green-600 hover:bg-green-700 text-white rounded text-2xl font-bold transition-all transform hover:scale-105 mb-4"
                        >
                            NEW GAME
                        </button>
                        {loadGameQuery && (
                            <button
                                onClick={() => startGame(true)}
                                className="px-8 py-4 bg-blue-600 hover:bg-blue-700 text-white rounded text-2xl font-bold transition-all transform hover:scale-105"
                            >
                                RESUME GAME (Lvl {loadGameQuery.level})
                            </button>
                        )}
                        <p className="mt-4 text-gray-400">Use Arrow Keys to Move • Space to Shoot</p>
                    </div>
                )}

                {gameState === 'SHIP_SELECTION' && !showAuthOverlay && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/90 text-white">
                        <h2 className="text-4xl font-bold mb-8 text-blue-400">SELECT YOUR SHIP</h2>
                        <div className="flex gap-8 mb-8">
                            {PLAYER_SHIPS.map((ship, index) => (
                                <button
                                    key={index}
                                    onClick={() => setSelectedShipIndex(index)}
                                    className={`p-4 border-2 rounded-lg transition-all ${selectedShipIndex === index ? 'border-green-500 bg-green-500/20 scale-110' : 'border-gray-600 hover:border-gray-400'}`}
                                >
                                    <NextImage src={ship} alt={`Ship ${index + 1}`} width={64} height={64} className="w-16 h-16 object-contain" />
                                </button>
                            ))}
                        </div>
                        <button
                            onClick={confirmShipSelection}
                            className="px-8 py-4 bg-green-600 hover:bg-green-700 text-white rounded text-2xl font-bold transition-all"
                        >
                            LAUNCH
                        </button>
                    </div>
                )}

                {gameState === 'LEVEL_TRANSITION' && !showAuthOverlay && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/90 text-white">
                        <h2 className="text-4xl font-bold mb-4 text-green-400">LEVEL {level} COMPLETE!</h2>
                        <div className="flex gap-4">
                            <button
                                onClick={startNextLevel}
                                className="px-6 py-3 bg-green-600 hover:bg-green-700 text-white rounded text-xl font-bold"
                            >
                                NEXT LEVEL
                            </button>
                            <button
                                onClick={saveAndQuit}
                                className="px-6 py-3 bg-gray-600 hover:bg-gray-700 text-white rounded text-xl font-bold"
                            >
                                SAVE & QUIT
                            </button>
                        </div>
                    </div>
                )}

                {gameState === 'GAME_OVER' && !showAuthOverlay && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/90 text-white">
                        <h2 className="text-5xl font-bold mb-4 text-red-500">GAME OVER</h2>
                        <p className="text-2xl mb-8">Final Score: {score}</p>
                        <button
                            onClick={() => setGameState('START')}
                            className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded text-xl font-bold"
                        >
                            MAIN MENU
                        </button>
                    </div>
                )}

                {gameState === 'VICTORY' && !showAuthOverlay && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/90 text-white">
                        <h2 className="text-5xl font-bold mb-4 text-yellow-400">VICTORY!</h2>
                        <p className="text-2xl mb-8">Final Score: {score}</p>
                        <button
                            onClick={() => setGameState('START')}
                            className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded text-xl font-bold"
                        >
                            MAIN MENU
                        </button>
                    </div>
                )}
            </div>

            {/* Controls Legend */}
            <div className="mt-4 text-gray-400 font-mono text-sm flex flex-wrap justify-center gap-6 bg-gray-900/50 p-4 rounded-lg border border-gray-800">
                <div className="flex items-center gap-2">
                    <span className="bg-gray-800 px-2 py-1 rounded text-green-400">←</span> <span>Left</span>
                </div>
                <div className="flex items-center gap-2">
                    <span className="bg-gray-800 px-2 py-1 rounded text-green-400">→</span> <span>Right</span>
                </div>
                <div className="flex items-center gap-2">
                    <span className="bg-gray-800 px-2 py-1 rounded text-green-400">SPACE</span> <span>Shoot</span>
                </div>
            </div>

            <MobileControls onInput={handleMobileInput} gameType="SPACE_INVADERS" className="min-[1380px]:hidden" />
        </div>
    );
}
