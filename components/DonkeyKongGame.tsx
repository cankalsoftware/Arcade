'use client';

import React, { useEffect, useRef, useState } from 'react';
import { useUser, SignInButton } from '@clerk/nextjs';
import { Button } from '@/components/ui/button';
import { useMutation } from 'convex/react';
import { api } from '@/convex/_generated/api';

const CANVAS_WIDTH = 600;
const CANVAS_HEIGHT = 500;
const GRAVITY = 0.4;
const JUMP_FORCE = -8;
const MOVE_SPEED = 3;
const CLIMB_SPEED = 2;

// Assets
const ASSETS = {
    jumpman: '/assets/donkey-kong/jumpman.svg',
    dk: '/assets/donkey-kong/dk.svg',
    barrel: '/assets/donkey-kong/barrel.svg',
    princess: '/assets/donkey-kong/princess.svg'
};

interface Entity {
    x: number;
    y: number;
    width: number;
    height: number;
    vx: number;
    vy: number;
    state: 'idle' | 'run' | 'jump' | 'climb' | 'dead';
    grounded: boolean;
    climbing: boolean;
}

interface Platform {
    x: number;
    y: number;
    width: number;
    height: number;
    type: 'floor' | 'ladder';
}

interface Barrel {
    x: number;
    y: number;
    vx: number;
    vy: number;
    radius: number;
    active: boolean;
}

export default function DonkeyKongGame() {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const { user } = useUser();
    const submitScore = useMutation(api.scores.submitScore);

    // Game State
    const [gameState, setGameState] = useState<'START' | 'PLAYING' | 'GAME_OVER' | 'VICTORY' | 'AUTH_REQUIRED'>('START');
    const [score, setScore] = useState(0);
    const [level, setLevel] = useState(1);
    const [lives, setLives] = useState(3);

    // Refs
    const playerRef = useRef<Entity>({
        x: 50, y: CANVAS_HEIGHT - 40, width: 20, height: 30,
        vx: 0, vy: 0, state: 'idle', grounded: true, climbing: false
    });
    const barrelsRef = useRef<Barrel[]>([]);
    const platformsRef = useRef<Platform[]>([]);
    const reqRef = useRef<number>(0);
    const scoreRef = useRef(0);
    const keysRef = useRef<{ [key: string]: boolean }>({});
    const imagesRef = useRef<{ [key: string]: HTMLImageElement }>({});
    const barrelTimerRef = useRef(0);
    const levelRef = useRef(1);

    // Load Images
    useEffect(() => {
        Object.entries(ASSETS).forEach(([key, src]) => {
            const img = new Image();
            img.src = src;
            imagesRef.current[key] = img;
        });
    }, []);

    // Level Generation
    const generateLevel = (lvl: number) => {
        const course = Math.ceil(lvl / 10); // 1-5
        const platforms: Platform[] = [];

        // Common Ground
        platforms.push({ x: 0, y: 480, width: 600, height: 20, type: 'floor' });

        if (course === 1) {
            // Course 1 (Levels 1-10): The Classic (User Request)
            // 3 main levels + shorter Kong level + Princess

            // Floor 1
            platforms.push({ x: 0, y: 380, width: 500, height: 20, type: 'floor' });
            platforms.push({ x: 450, y: 380, width: 20, height: 100, type: 'ladder' }); // Ground to F1

            // Floor 2
            platforms.push({ x: 100, y: 280, width: 500, height: 20, type: 'floor' });
            platforms.push({ x: 120, y: 280, width: 20, height: 100, type: 'ladder' }); // F1 to F2

            // Floor 3
            platforms.push({ x: 0, y: 180, width: 500, height: 20, type: 'floor' });
            platforms.push({ x: 470, y: 180, width: 20, height: 100, type: 'ladder' }); // F2 to F3

            // Kong Floor (Shorter/Cut)
            platforms.push({ x: 50, y: 100, width: 300, height: 20, type: 'floor' }); // DK stands here
            platforms.push({ x: 130, y: 100, width: 20, height: 80, type: 'ladder' }); // F3 to Kong

            // Princess Platform (Top)
            platforms.push({ x: 200, y: 40, width: 100, height: 10, type: 'floor' });
            platforms.push({ x: 240, y: 40, width: 20, height: 60, type: 'ladder' }); // Kong to Princess

        } else if (course === 2) {
            // Course 2 (Levels 11-20): The Factory (Gaps)
            platforms.push({ x: 0, y: 380, width: 250, height: 20, type: 'floor' });
            platforms.push({ x: 350, y: 380, width: 250, height: 20, type: 'floor' });
            platforms.push({ x: 280, y: 380, width: 20, height: 100, type: 'ladder' });

            platforms.push({ x: 100, y: 280, width: 400, height: 20, type: 'floor' });
            platforms.push({ x: 50, y: 280, width: 20, height: 100, type: 'ladder' });

            platforms.push({ x: 0, y: 180, width: 200, height: 20, type: 'floor' });
            platforms.push({ x: 300, y: 180, width: 300, height: 20, type: 'floor' });
            platforms.push({ x: 450, y: 180, width: 20, height: 100, type: 'ladder' });

            platforms.push({ x: 150, y: 80, width: 300, height: 20, type: 'floor' });
            platforms.push({ x: 200, y: 80, width: 20, height: 100, type: 'ladder' });

            // Princess
            platforms.push({ x: 250, y: 30, width: 100, height: 10, type: 'floor' });
            platforms.push({ x: 290, y: 30, width: 20, height: 50, type: 'ladder' });

        } else {
            // Course 3+ (Levels 21-50): The Summit (Steep)
            // Procedural-ish zig-zag with gaps
            for (let i = 0; i < 4; i++) {
                const y = 380 - (i * 100);
                const isEven = i % 2 === 0;
                platforms.push({
                    x: isEven ? 0 : 100,
                    y: y,
                    width: 500,
                    height: 20,
                    type: 'floor'
                });
                platforms.push({
                    x: isEven ? 550 : 50,
                    y: y,
                    width: 20,
                    height: 100,
                    type: 'ladder'
                });
            }
            // Princess
            platforms.push({ x: 250, y: 30, width: 100, height: 10, type: 'floor' });
            platforms.push({ x: 290, y: 30, width: 20, height: 50, type: 'ladder' }); // From top floor
        }

        platformsRef.current = platforms;
    };

    const initGame = (lvl: number) => {
        generateLevel(lvl);
        playerRef.current = {
            x: 50, y: 450, width: 20, height: 30,
            vx: 0, vy: 0, state: 'idle', grounded: true, climbing: false
        };
        barrelsRef.current = [];
        barrelTimerRef.current = 0;
    };

    // Input Handling
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            keysRef.current[e.code] = true;
            if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Space'].includes(e.code)) e.preventDefault();
        };
        const handleKeyUp = (e: KeyboardEvent) => {
            keysRef.current[e.code] = false;
        };
        window.addEventListener('keydown', handleKeyDown);
        window.addEventListener('keyup', handleKeyUp);
        return () => {
            window.removeEventListener('keydown', handleKeyDown);
            window.removeEventListener('keyup', handleKeyUp);
        };
    }, []);

    const handleLevelComplete = () => {
        const nextLevel = levelRef.current + 1;

        // Auth Check
        if (nextLevel > 2 && !user) {
            setGameState('AUTH_REQUIRED');
            cancelAnimationFrame(reqRef.current);
            return;
        }

        if (nextLevel > 50) {
            setGameState('VICTORY');
            submitScore({ score: scoreRef.current, level: 50, gameType: 'donkey-kong' });
            return;
        }

        setLevel(nextLevel);
        levelRef.current = nextLevel;
        initGame(nextLevel);
    };

    const handleGameOver = () => {
        if (lives > 1) {
            setLives(prev => prev - 1);
            initGame(levelRef.current); // Reset positions but keep level/score
        } else {
            setGameState('GAME_OVER');
            submitScore({ score: scoreRef.current, level: levelRef.current, gameType: 'donkey-kong' });
        }
    };

    // Game Loop
    useEffect(() => {
        if (gameState !== 'PLAYING') {
            cancelAnimationFrame(reqRef.current);
            return;
        }

        const canvas = canvasRef.current;
        const ctx = canvas?.getContext('2d');
        if (!canvas || !ctx) return;

        const update = () => {
            const player = playerRef.current;
            const lvl = levelRef.current;

            // Difficulty Scaling
            const barrelSpeed = 2 + (lvl * 0.1); // Increases with level
            const spawnRate = Math.max(60, 180 - (lvl * 3)); // Spawns faster with level

            // --- Player Movement ---
            if (keysRef.current['ArrowLeft']) player.vx = -MOVE_SPEED;
            else if (keysRef.current['ArrowRight']) player.vx = MOVE_SPEED;
            else player.vx = 0;

            // Climbing
            let onLadder = false;
            platformsRef.current.forEach(p => {
                if (p.type === 'ladder' &&
                    player.x + player.width > p.x && player.x < p.x + p.width &&
                    player.y + player.height > p.y && player.y < p.y + p.height + 10) {
                    onLadder = true;
                }
            });

            if (onLadder) {
                if (keysRef.current['ArrowUp']) {
                    player.vy = -CLIMB_SPEED;
                    player.climbing = true;
                } else if (keysRef.current['ArrowDown']) {
                    player.vy = CLIMB_SPEED;
                    player.climbing = true;
                } else {
                    if (player.climbing) player.vy = 0;
                }
            } else {
                player.climbing = false;
            }

            // Jumping & Gravity
            if (!player.climbing) {
                if (keysRef.current['Space'] && player.grounded) {
                    player.vy = JUMP_FORCE;
                    player.grounded = false;
                }
                player.vy += GRAVITY;
            }

            // Apply Velocity
            player.x += player.vx;
            player.y += player.vy;

            // --- Collisions ---
            player.grounded = false;
            platformsRef.current.forEach(p => {
                if (p.type === 'floor') {
                    // Floor Collision (Top)
                    if (player.vy >= 0 && // Falling
                        player.y + player.height <= p.y + p.height && // Was above/inside
                        player.y + player.height + player.vy >= p.y && // Will be below
                        player.x + player.width > p.x && player.x < p.x + p.width) { // Horizontal overlap

                        player.y = p.y - player.height;
                        player.vy = 0;
                        player.grounded = true;
                        player.climbing = false;
                    }
                }
            });

            // Bounds
            if (player.x < 0) player.x = 0;
            if (player.x > CANVAS_WIDTH - player.width) player.x = CANVAS_WIDTH - player.width;
            if (player.y > CANVAS_HEIGHT) handleGameOver(); // Fell off

            // --- Win Condition ---
            // Reaching the Princess platform (topmost)
            const princessPlat = platformsRef.current[platformsRef.current.length - 2]; // 2nd to last is princess floor
            if (player.y + player.height <= princessPlat.y &&
                player.x > princessPlat.x &&
                player.x < princessPlat.x + princessPlat.width) {
                handleLevelComplete();
            }

            // --- Barrels ---
            barrelTimerRef.current++;
            if (barrelTimerRef.current > spawnRate) {
                // Spawn at DK's position (approx)
                // Find Kong floor (usually 4th or 5th platform)
                // Default spawn: Top left-ish
                barrelsRef.current.push({
                    x: 100, y: 80, vx: barrelSpeed, vy: 0, radius: 10, active: true
                });
                barrelTimerRef.current = 0;
            }

            barrelsRef.current.forEach(b => {
                b.vy += GRAVITY;
                b.x += b.vx;
                b.y += b.vy;

                // Barrel Collisions with Platforms
                platformsRef.current.forEach(p => {
                    if (p.type === 'floor') {
                        if (b.vy >= 0 && b.y + b.radius >= p.y && b.y - b.radius < p.y + p.height &&
                            b.x > p.x && b.x < p.x + p.width) {
                            b.y = p.y - b.radius;
                            b.vy = 0;
                        }
                    }
                });

                // Wall bounce
                if (b.x < 0 || b.x > CANVAS_WIDTH) b.vx *= -1;

                // Remove off-screen
                if (b.y > CANVAS_HEIGHT) b.active = false;

                // Player Collision
                const dx = (player.x + player.width / 2) - b.x;
                const dy = (player.y + player.height / 2) - b.y;
                const dist = Math.sqrt(dx * dx + dy * dy);
                if (dist < b.radius + 10) {
                    handleGameOver();
                }
            });
            barrelsRef.current = barrelsRef.current.filter(b => b.active);

            // Score (Survival)
            if (barrelTimerRef.current % 60 === 0) {
                scoreRef.current += 10;
                setScore(scoreRef.current);
            }
        };

        const draw = () => {
            // Background
            ctx.fillStyle = '#000';
            ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

            // Platforms & Ladders
            platformsRef.current.forEach(p => {
                if (p.type === 'floor') {
                    ctx.fillStyle = '#d00'; // Girder color
                    ctx.fillRect(p.x, p.y, p.width, p.height);
                } else {
                    ctx.fillStyle = '#0ff'; // Ladder color
                    ctx.fillRect(p.x, p.y, p.width, p.height);
                    // Rungs
                    ctx.strokeStyle = '#000';
                    ctx.beginPath();
                    for (let y = p.y; y < p.y + p.height; y += 10) {
                        ctx.moveTo(p.x, y);
                        ctx.lineTo(p.x + p.width, y);
                    }
                    ctx.stroke();
                }
            });

            // Player
            const p = playerRef.current;
            const pImg = imagesRef.current['jumpman'];
            if (pImg && pImg.complete) {
                ctx.drawImage(pImg, p.x, p.y, p.width, p.height);
            } else {
                ctx.fillStyle = '#f00';
                ctx.fillRect(p.x, p.y, p.width, p.height);
            }

            // Donkey Kong
            const dkImg = imagesRef.current['dk'];
            if (dkImg && dkImg.complete) {
                ctx.drawImage(dkImg, 50, 40, 60, 60);
            }

            // Princess
            const prinImg = imagesRef.current['princess'];
            if (prinImg && prinImg.complete) {
                // Find princess platform
                const pp = platformsRef.current[platformsRef.current.length - 2];
                if (pp) ctx.drawImage(prinImg, pp.x + 30, pp.y - 30, 30, 30);
            }

            // Barrels
            barrelsRef.current.forEach(b => {
                const bImg = imagesRef.current['barrel'];
                if (bImg && bImg.complete) {
                    ctx.drawImage(bImg, b.x - b.radius, b.y - b.radius, b.radius * 2, b.radius * 2);
                } else {
                    ctx.fillStyle = '#a52';
                    ctx.beginPath();
                    ctx.arc(b.x, b.y, b.radius, 0, Math.PI * 2);
                    ctx.fill();
                }
            });
        };

        const loop = () => {
            update();
            draw();
            if (gameState === 'PLAYING') {
                reqRef.current = requestAnimationFrame(loop);
            }
        };

        reqRef.current = requestAnimationFrame(loop);
        return () => cancelAnimationFrame(reqRef.current);
    }, [gameState, level, user, submitScore, lives]);

    const startGame = () => {
        setLevel(1);
        levelRef.current = 1;
        setLives(3);
        setScore(0);
        scoreRef.current = 0;
        initGame(1);
        setGameState('PLAYING');
    };

    return (
        <div className="flex flex-col items-center gap-4">
            <div className="flex justify-between w-full max-w-[600px] text-xl font-mono text-red-500">
                <div>SCORE: {score}</div>
                <div>LEVEL: {level}</div>
                <div>LIVES: {lives}</div>
            </div>

            <div className="relative border-4 border-blue-900 rounded-lg bg-black shadow-[0_0_20px_rgba(0,0,255,0.3)]">
                <canvas
                    ref={canvasRef}
                    width={CANVAS_WIDTH}
                    height={CANVAS_HEIGHT}
                    className="block"
                />

                {/* Start Screen */}
                {gameState === 'START' && (
                    <div className="absolute inset-0 bg-black/90 flex flex-col items-center justify-center text-center p-4">
                        <h2 className="text-4xl font-bold text-orange-500 mb-4 animate-pulse">DONKEY KONG</h2>
                        <p className="text-gray-400 mb-8">Save the Princess!</p>
                        <Button onClick={startGame} className="bg-orange-600 hover:bg-orange-700 text-white font-bold px-8 py-4 text-xl">
                            INSERT COIN
                        </Button>
                    </div>
                )}

                {/* Game Over */}
                {gameState === 'GAME_OVER' && (
                    <div className="absolute inset-0 bg-black/90 flex flex-col items-center justify-center text-center">
                        <h2 className="text-4xl font-bold text-red-500 mb-4">GAME OVER</h2>
                        <p className="text-white text-xl mb-8">Score: {score}</p>
                        <Button onClick={startGame} className="bg-white hover:bg-gray-200 text-black font-bold px-8 py-4">
                            TRY AGAIN
                        </Button>
                    </div>
                )}

                {/* Victory */}
                {gameState === 'VICTORY' && (
                    <div className="absolute inset-0 bg-black/90 flex flex-col items-center justify-center text-center">
                        <h2 className="text-4xl font-bold text-pink-500 mb-4">YOU WON!</h2>
                        <p className="text-white text-xl mb-8">The Princess is Saved!</p>
                        <Button onClick={startGame} className="bg-pink-500 hover:bg-pink-600 text-black font-bold px-8 py-4">
                            PLAY AGAIN
                        </Button>
                    </div>
                )}

                {/* Auth Required */}
                {gameState === 'AUTH_REQUIRED' && (
                    <div className="absolute inset-0 bg-black/95 flex flex-col items-center justify-center text-center p-8">
                        <h2 className="text-3xl font-bold text-red-500 mb-4">LEVEL 3 LOCKED</h2>
                        <p className="text-gray-300 mb-8">Sign in to continue your career!</p>
                        <SignInButton mode="modal">
                            <Button className="bg-red-600 hover:bg-red-700 text-white font-bold px-8 py-4 text-xl">
                                SIGN IN
                            </Button>
                        </SignInButton>
                    </div>
                )}
            </div>

            <div className="text-gray-500 text-sm font-mono mt-4">
                ARROWS to Move/Climb • SPACE to Jump
            </div>
        </div>
    );
}
