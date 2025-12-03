'use client';

import React, { useEffect, useRef, useState } from 'react';
import { useUser, SignInButton } from '@clerk/nextjs';
import { Button } from '@/components/ui/button';
import { useMutation } from 'convex/react';
import { api } from '@/convex/_generated/api';

const GRID_SIZE = 40;
const COLS = 15;
const ROWS = 13; // 1 (Top) + 5 (River) + 1 (Safe) + 5 (Road) + 1 (Start)
const CANVAS_WIDTH = COLS * GRID_SIZE;
const CANVAS_HEIGHT = ROWS * GRID_SIZE;

// Assets
const ASSETS = {
    frog: '/assets/frogger/frog.svg',
    car: '/assets/frogger/car.svg',
    truck: '/assets/frogger/truck.svg',
    log: '/assets/frogger/log.svg',
    turtle: '/assets/frogger/turtle.svg'
};

interface Lane {
    y: number;
    type: 'road' | 'river' | 'safe' | 'home';
    speed: number;
    objects: GameObject[];
    objType?: 'car' | 'truck' | 'log' | 'turtle';
}

interface GameObject {
    x: number;
    width: number;
    type: string;
}

export default function FroggerGame() {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const { user } = useUser();
    const submitScore = useMutation(api.scores.submitScore);

    // Game State
    const [gameState, setGameState] = useState<'START' | 'PLAYING' | 'GAME_OVER' | 'VICTORY' | 'AUTH_REQUIRED'>('START');
    const [score, setScore] = useState(0);
    const [level, setLevel] = useState(1);
    const [lives, setLives] = useState(3);
    const [timeLeft, setTimeLeft] = useState(60);

    // Refs
    const frogRef = useRef({ x: 7 * GRID_SIZE, y: 12 * GRID_SIZE }); // Start at bottom center
    const lanesRef = useRef<Lane[]>([]);
    const reqRef = useRef<number>(0);
    const scoreRef = useRef(0);
    const imagesRef = useRef<{ [key: string]: HTMLImageElement }>({});
    const homesRef = useRef<boolean[]>([false, false, false, false, false]); // 5 Home bases
    const timeRef = useRef(60);
    const lastTimeRef = useRef(0);

    // Load Images
    useEffect(() => {
        Object.entries(ASSETS).forEach(([key, src]) => {
            const img = new Image();
            img.src = src;
            imagesRef.current[key] = img;
        });
    }, []);

    // Level Generation
    const initLevel = (lvl: number) => {
        const speedMult = 1 + (lvl * 0.1);
        const layout = Math.ceil(lvl / 10); // Change every 10 levels

        const lanes: Lane[] = [];

        // Row 0: Home (Goal)
        lanes.push({ y: 0, type: 'home', speed: 0, objects: [] });

        // Rows 1-5: River
        if (layout === 1) {
            // Classic
            lanes.push({ y: 1, type: 'river', speed: 1.5 * speedMult, objects: [], objType: 'log' });
            lanes.push({ y: 2, type: 'river', speed: -2 * speedMult, objects: [], objType: 'turtle' });
            lanes.push({ y: 3, type: 'river', speed: 2.5 * speedMult, objects: [], objType: 'log' });
            lanes.push({ y: 4, type: 'river', speed: -1.5 * speedMult, objects: [], objType: 'turtle' });
            lanes.push({ y: 5, type: 'river', speed: 1 * speedMult, objects: [], objType: 'log' });
        } else {
            // Harder / Mixed
            lanes.push({ y: 1, type: 'river', speed: 2 * speedMult, objects: [], objType: 'turtle' });
            lanes.push({ y: 2, type: 'river', speed: -2.5 * speedMult, objects: [], objType: 'log' });
            lanes.push({ y: 3, type: 'river', speed: 3 * speedMult, objects: [], objType: 'turtle' });
            lanes.push({ y: 4, type: 'river', speed: -2 * speedMult, objects: [], objType: 'log' });
            lanes.push({ y: 5, type: 'river', speed: 2 * speedMult, objects: [], objType: 'turtle' });
        }

        // Row 6: Safe (Median)
        lanes.push({ y: 6, type: 'safe', speed: 0, objects: [] });

        // Rows 7-11: Road
        if (layout === 1) {
            // Classic
            lanes.push({ y: 7, type: 'road', speed: -1.5 * speedMult, objects: [], objType: 'truck' });
            lanes.push({ y: 8, type: 'road', speed: 2 * speedMult, objects: [], objType: 'car' });
            lanes.push({ y: 9, type: 'road', speed: -1 * speedMult, objects: [], objType: 'car' });
            lanes.push({ y: 10, type: 'road', speed: 1.5 * speedMult, objects: [], objType: 'car' });
            lanes.push({ y: 11, type: 'road', speed: -2 * speedMult, objects: [], objType: 'truck' });
        } else {
            // Highway
            lanes.push({ y: 7, type: 'road', speed: -3 * speedMult, objects: [], objType: 'car' });
            lanes.push({ y: 8, type: 'road', speed: 3 * speedMult, objects: [], objType: 'car' });
            lanes.push({ y: 9, type: 'road', speed: -2.5 * speedMult, objects: [], objType: 'truck' });
            lanes.push({ y: 10, type: 'road', speed: 2.5 * speedMult, objects: [], objType: 'car' });
            lanes.push({ y: 11, type: 'road', speed: -2 * speedMult, objects: [], objType: 'truck' });
        }

        // Row 12: Start (Safe)
        lanes.push({ y: 12, type: 'safe', speed: 0, objects: [] });

        // Populate Objects
        lanes.forEach(lane => {
            if (lane.speed !== 0 && lane.objType) {
                const count = Math.floor(Math.random() * 2) + 2; // 2-3 objects per lane
                const gap = CANVAS_WIDTH / count;
                for (let i = 0; i < count; i++) {
                    lane.objects.push({
                        x: i * gap + Math.random() * 50,
                        width: lane.objType === 'log' || lane.objType === 'truck' ? 80 : 40,
                        type: lane.objType
                    });
                }
            }
        });

        lanesRef.current = lanes;
        frogRef.current = { x: 7 * GRID_SIZE, y: 12 * GRID_SIZE };
        homesRef.current = [false, false, false, false, false];
        timeRef.current = 60;
        setTimeLeft(60);
    };

    // Input Handling
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (gameState !== 'PLAYING') return;

            const frog = frogRef.current;
            if (e.code === 'ArrowUp') frog.y -= GRID_SIZE;
            else if (e.code === 'ArrowDown') frog.y += GRID_SIZE;
            else if (e.code === 'ArrowLeft') frog.x -= GRID_SIZE;
            else if (e.code === 'ArrowRight') frog.x += GRID_SIZE;

            // Bounds
            if (frog.x < 0) frog.x = 0;
            if (frog.x > CANVAS_WIDTH - GRID_SIZE) frog.x = CANVAS_WIDTH - GRID_SIZE;
            if (frog.y > CANVAS_HEIGHT - GRID_SIZE) frog.y = CANVAS_HEIGHT - GRID_SIZE;

            if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(e.code)) e.preventDefault();
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [gameState]);

    const handleDeath = React.useCallback(() => {
        if (lives > 1) {
            setLives(prev => prev - 1);
            frogRef.current = { x: 7 * GRID_SIZE, y: 12 * GRID_SIZE };
            timeRef.current = 60;
        } else {
            setGameState('GAME_OVER');
            submitScore({ score: scoreRef.current, level, gameType: 'frogger' });
        }
    }, [lives, level, submitScore]);

    const handleLevelComplete = React.useCallback(() => {
        const nextLevel = level + 1;

        // Auth Check
        if (nextLevel > 2 && !user) {
            setGameState('AUTH_REQUIRED');
            cancelAnimationFrame(reqRef.current);
            return;
        }

        if (nextLevel > 50) {
            setGameState('VICTORY');
            submitScore({ score: scoreRef.current + 1000, level: 50, gameType: 'frogger' });
            return;
        }

        scoreRef.current += 1000; // Level Bonus
        setScore(scoreRef.current);
        setLevel(nextLevel);
        initLevel(nextLevel);
    }, [level, user, submitScore]);

    const handleHome = React.useCallback(() => {
        scoreRef.current += 50;
        setScore(scoreRef.current);
        frogRef.current = { x: 7 * GRID_SIZE, y: 12 * GRID_SIZE };
        timeRef.current = 60;

        // Check if all homes filled (Simplified: Just count successful trips for now)
        const filledCount = homesRef.current.filter(h => h).length;
        if (filledCount < 4) {
            const newHomes = [...homesRef.current];
            newHomes[filledCount] = true;
            homesRef.current = newHomes;
        } else {
            handleLevelComplete();
        }
    }, [handleLevelComplete]);

    // Game Loop
    useEffect(() => {
        if (gameState !== 'PLAYING') {
            cancelAnimationFrame(reqRef.current);
            return;
        }

        const canvas = canvasRef.current;
        const ctx = canvas?.getContext('2d');
        if (!canvas || !ctx) return;

        const update = (timestamp: number) => {
            if (timestamp - lastTimeRef.current >= 1000) {
                timeRef.current -= 1;
                setTimeLeft(timeRef.current);
                lastTimeRef.current = timestamp;
                if (timeRef.current <= 0) handleDeath();
            }

            const frog = frogRef.current;
            const frogRow = Math.floor(frog.y / GRID_SIZE);

            // Update Lanes
            lanesRef.current.forEach(lane => {
                lane.objects.forEach(obj => {
                    obj.x += lane.speed;
                    // Wrap around
                    if (lane.speed > 0 && obj.x > CANVAS_WIDTH) obj.x = -obj.width;
                    if (lane.speed < 0 && obj.x < -obj.width) obj.x = CANVAS_WIDTH;
                });
            });

            // Collision Detection
            const currentLane = lanesRef.current[frogRow];

            if (currentLane) {
                if (currentLane.type === 'road') {
                    // Check car collision
                    let hit = false;
                    currentLane.objects.forEach(obj => {
                        if (frog.x < obj.x + obj.width &&
                            frog.x + GRID_SIZE > obj.x) {
                            hit = true;
                        }
                    });
                    if (hit) handleDeath();
                } else if (currentLane.type === 'river') {
                    // Check log/turtle ride
                    let onLog = false;
                    currentLane.objects.forEach(obj => {
                        if (frog.x + GRID_SIZE / 2 > obj.x &&
                            frog.x + GRID_SIZE / 2 < obj.x + obj.width) {
                            onLog = true;
                            // Move with log
                            frog.x += currentLane.speed;
                        }
                    });
                    if (!onLog) handleDeath(); // Drown
                } else if (currentLane.type === 'home') {
                    handleHome();
                }
            }

            // Bounds Check (after riding log)
            if (frog.x < 0 || frog.x > CANVAS_WIDTH - GRID_SIZE) handleDeath();
        };

        const draw = () => {
            // Background
            ctx.fillStyle = '#000';
            ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

            // Water
            ctx.fillStyle = '#1e3a8a';
            ctx.fillRect(0, GRID_SIZE, CANVAS_WIDTH, GRID_SIZE * 5);

            // Safe Zones
            ctx.fillStyle = '#a855f7'; // Purple median
            ctx.fillRect(0, GRID_SIZE * 6, CANVAS_WIDTH, GRID_SIZE);
            ctx.fillRect(0, GRID_SIZE * 12, CANVAS_WIDTH, GRID_SIZE);

            // Home Zone
            ctx.fillStyle = '#22c55e';
            ctx.fillRect(0, 0, CANVAS_WIDTH, GRID_SIZE);
            // Draw Homes
            homesRef.current.forEach((filled, i) => {
                if (filled) {
                    const img = imagesRef.current['frog'];
                    if (img) ctx.drawImage(img, i * (GRID_SIZE * 3) + GRID_SIZE, 0, GRID_SIZE, GRID_SIZE);
                }
            });

            // Lanes
            lanesRef.current.forEach((lane) => {
                lane.objects.forEach(obj => {
                    const img = imagesRef.current[obj.type];
                    if (img && img.complete) {
                        ctx.drawImage(img, obj.x, lane.y * GRID_SIZE + 5, obj.width, GRID_SIZE - 10);
                    } else {
                        ctx.fillStyle = lane.type === 'road' ? '#ef4444' : '#78350f';
                        ctx.fillRect(obj.x, lane.y * GRID_SIZE + 5, obj.width, GRID_SIZE - 10);
                    }
                });
            });

            // Frog
            const frog = frogRef.current;
            const fImg = imagesRef.current['frog'];
            if (fImg && fImg.complete) {
                ctx.drawImage(fImg, frog.x, frog.y, GRID_SIZE, GRID_SIZE);
            } else {
                ctx.fillStyle = '#22c55e';
                ctx.fillRect(frog.x, frog.y, GRID_SIZE, GRID_SIZE);
            }
        };

        const loop = (timestamp: number) => {
            update(timestamp);
            draw();
            if (gameState === 'PLAYING') {
                reqRef.current = requestAnimationFrame(loop);
            }
        };

        reqRef.current = requestAnimationFrame(loop);
        return () => cancelAnimationFrame(reqRef.current);
    }, [gameState, level, lives, user, submitScore, handleDeath, handleHome]);

    const startGame = () => {
        setLevel(1);
        setLives(3);
        setScore(0);
        scoreRef.current = 0;
        initLevel(1);
        setGameState('PLAYING');
    };

    return (
        <div className="flex flex-col items-center gap-4">
            <div className="flex justify-between w-full max-w-[600px] text-xl font-mono text-green-500">
                <div>SCORE: {score}</div>
                <div>LEVEL: {level}</div>
                <div>TIME: {timeLeft}</div>
            </div>

            <div className="relative border-4 border-green-900 rounded-lg bg-black shadow-[0_0_20px_rgba(0,255,0,0.3)]">
                <canvas
                    ref={canvasRef}
                    width={CANVAS_WIDTH}
                    height={CANVAS_HEIGHT}
                    className="block"
                />

                {/* Start Screen */}
                {gameState === 'START' && (
                    <div className="absolute inset-0 bg-black/90 flex flex-col items-center justify-center text-center p-4">
                        <h2 className="text-4xl font-bold text-green-500 mb-4 animate-pulse">FROGGER</h2>
                        <p className="text-gray-400 mb-8">Cross the Road & River!</p>
                        <Button onClick={startGame} className="bg-green-600 hover:bg-green-700 text-white font-bold px-8 py-4 text-xl">
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
                        <h2 className="text-4xl font-bold text-yellow-500 mb-4">YOU WON!</h2>
                        <p className="text-white text-xl mb-8">Master Frog!</p>
                        <Button onClick={startGame} className="bg-yellow-500 hover:bg-yellow-600 text-black font-bold px-8 py-4">
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
                ARROWS to Hop
            </div>
        </div>
    );
}
