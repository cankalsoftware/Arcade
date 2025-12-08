'use client';

import React, { useEffect, useRef, useState } from 'react';
import { useUser, SignInButton } from '@clerk/nextjs';
import { Button } from '@/components/ui/button';
import { useMutation } from 'convex/react';
import { api } from '@/convex/_generated/api';
import NextImage from 'next/image';
import MobileControls, { ControlAction } from '@/components/ui/MobileControls';

const CANVAS_WIDTH = 400;
const CANVAS_HEIGHT = 600;
const CAR_WIDTH = 40;
const CAR_HEIGHT = 70;
const LANE_WIDTH = CANVAS_WIDTH / 3;

// Car Assets
const CAR_TYPES = [
    { src: '/assets/racing/car-red.svg', name: 'Speedster', color: '#ff0000' },
    { src: '/assets/racing/car-green.svg', name: 'Tank', color: '#00ff00' },
    { src: '/assets/racing/car-blue.svg', name: 'Cruiser', color: '#0000ff' }
];

// Obstacle Assets
const OBSTACLE_TYPES = {
    rock: '/assets/racing/rock.svg',
    oil: '/assets/racing/oil.svg',
    barrier: '/assets/racing/barrier.svg'
};

// Difficulty Config
const getLevelConfig = (lvl: number) => {
    return {
        baseSpeed: 5 + (lvl * 0.5),
        obstacleChance: 0.02 + (Math.floor((lvl - 1) / 10) * 0.01),
    };
};

interface Obstacle {
    x: number;
    y: number;
    width: number;
    height: number;
    type: 'rock' | 'oil' | 'barrier';
    passed: boolean;
}

export default function RacingGame() {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const { user } = useUser();
    const submitScore = useMutation(api.scores.submitScore);

    // Game State
    const [gameState, setGameState] = useState<'START' | 'PLAYING' | 'GAME_OVER' | 'VICTORY' | 'AUTH_REQUIRED'>('START');
    const [score, setScore] = useState(0);
    const [level, setLevel] = useState(1);
    const [selectedCar, setSelectedCar] = useState(0);
    // const [speed, setSpeed] = useState(0); // Unused
    const [dodged, setDodged] = useState(0);
    const [time, setTime] = useState(0);

    // Refs
    const playerRef = useRef({ x: CANVAS_WIDTH / 2 - CAR_WIDTH / 2, y: CANVAS_HEIGHT - 100, lane: 1 });
    const obstaclesRef = useRef<Obstacle[]>([]);
    const reqRef = useRef<number>(0);
    const scoreRef = useRef(0);
    const speedRef = useRef(0);
    const levelRef = useRef(1);
    const dodgedRef = useRef(0);
    const timeRef = useRef(0);
    const lastTimeRef = useRef(0);
    const keysRef = useRef<{ [key: string]: boolean }>({});
    const carImagesRef = useRef<HTMLImageElement[]>([]);
    const obstacleImagesRef = useRef<{ [key: string]: HTMLImageElement }>({});

    // Load Images
    useEffect(() => {
        // Load Cars
        CAR_TYPES.forEach((car, index) => {
            const img = new Image();
            img.src = car.src;
            carImagesRef.current[index] = img;
        });

        // Load Obstacles
        Object.entries(OBSTACLE_TYPES).forEach(([type, src]) => {
            const img = new Image();
            img.src = src;
            obstacleImagesRef.current[type] = img;
        });
    }, []);



    const resetGame = React.useCallback((fullReset = false) => {
        if (fullReset) {
            setLevel(1);
            levelRef.current = 1;
            setScore(0);
            scoreRef.current = 0;
        }

        const config = getLevelConfig(levelRef.current);
        speedRef.current = config.baseSpeed;
        // setSpeed(config.baseSpeed);

        dodgedRef.current = 0;
        setDodged(0);
        timeRef.current = 0;
        setTime(0);
        lastTimeRef.current = performance.now();

        playerRef.current = { x: CANVAS_WIDTH / 2 - CAR_WIDTH / 2, y: CANVAS_HEIGHT - 100, lane: 1 };
        obstaclesRef.current = [];
    }, []);

    // Input Handling
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            keysRef.current[e.code] = true;
            if (['ArrowLeft', 'ArrowRight', 'Space'].includes(e.code)) e.preventDefault();
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

    const handleMobileInput = (action: ControlAction, active: boolean) => {
        const keyMap: Record<ControlAction, string> = {
            'UP': 'ArrowUp', // Unused but safe
            'DOWN': 'ArrowDown', // Unused
            'LEFT': 'ArrowLeft',
            'RIGHT': 'ArrowRight',
            'A': 'Space', // Boost
            'B': 'Space',
        };
        const key = keyMap[action];
        if (key) {
            keysRef.current[key] = active;
        }
    };

    const handleLevelComplete = React.useCallback(() => {
        const nextLevel = levelRef.current + 1;

        // Auth Check
        if (nextLevel > 2 && !user) {
            setGameState('AUTH_REQUIRED');
            cancelAnimationFrame(reqRef.current);
            return;
        }

        if (nextLevel > 50) {
            setGameState('VICTORY');
            submitScore({ score: scoreRef.current, level: 50, gameType: 'racing' });
            return;
        }

        setLevel(nextLevel);
        levelRef.current = nextLevel;
        resetGame();
        resetGame();
    }, [user, submitScore, resetGame]);

    const handleGameOver = React.useCallback(() => {
        setGameState('GAME_OVER');
        submitScore({ score: scoreRef.current, level: levelRef.current, gameType: 'racing' });
    }, [submitScore]);

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
            const config = getLevelConfig(levelRef.current);

            // Time Tracking
            const deltaTime = timestamp - lastTimeRef.current;
            if (deltaTime >= 1000) {
                timeRef.current += 1;
                setTime(timeRef.current);
                lastTimeRef.current = timestamp;
            }

            // Speed Boost
            let currentSpeed = config.baseSpeed;
            if (keysRef.current['Space']) {
                currentSpeed *= 1.5;
            }
            speedRef.current = currentSpeed;
            // setSpeed(Math.round(currentSpeed));

            // Movement
            if (keysRef.current['ArrowLeft'] && playerRef.current.x > 0) {
                playerRef.current.x -= 5;
            }
            if (keysRef.current['ArrowRight'] && playerRef.current.x < CANVAS_WIDTH - CAR_WIDTH) {
                playerRef.current.x += 5;
            }

            // Score
            scoreRef.current += Math.round(currentSpeed / 10);
            setScore(scoreRef.current);

            // Level Complete Condition: 10 Dodges OR 60 Seconds
            if (dodgedRef.current >= 10 || timeRef.current >= 60) {
                handleLevelComplete();
                return;
            }

            // Spawn Obstacles
            if (Math.random() < config.obstacleChance) {
                const lane = Math.floor(Math.random() * 3);
                const typeRoll = Math.random();
                let type: 'rock' | 'oil' | 'barrier' = 'rock';
                if (typeRoll > 0.6) type = 'barrier';
                if (typeRoll > 0.9) type = 'oil';

                obstaclesRef.current.push({
                    x: lane * LANE_WIDTH + (LANE_WIDTH - 40) / 2,
                    y: -50,
                    width: 40,
                    height: 40,
                    type,
                    passed: false
                });
            }

            // Update Obstacles
            for (let i = obstaclesRef.current.length - 1; i >= 0; i--) {
                const obs = obstaclesRef.current[i];
                obs.y += currentSpeed;

                // Collision Detection
                if (
                    playerRef.current.x < obs.x + obs.width &&
                    playerRef.current.x + CAR_WIDTH > obs.x &&
                    playerRef.current.y < obs.y + obs.height &&
                    playerRef.current.y + CAR_HEIGHT > obs.y
                ) {
                    handleGameOver();
                    return;
                }

                // Dodge Detection (Passed Player)
                if (!obs.passed && obs.y > playerRef.current.y + CAR_HEIGHT) {
                    obs.passed = true;
                    dodgedRef.current += 1;
                    setDodged(dodgedRef.current);
                }

                // Remove off-screen
                if (obs.y > CANVAS_HEIGHT) {
                    obstaclesRef.current.splice(i, 1);
                }
            }
        };

        const draw = () => {
            // Road
            ctx.fillStyle = '#333';
            ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

            // Lane Markers
            ctx.strokeStyle = '#fff';
            ctx.setLineDash([20, 20]);
            ctx.lineDashOffset = -Date.now() / 10 * (speedRef.current / 5); // Simple animation based on speed
            ctx.beginPath();
            ctx.moveTo(LANE_WIDTH, 0);
            ctx.lineTo(LANE_WIDTH, CANVAS_HEIGHT);
            ctx.moveTo(LANE_WIDTH * 2, 0);
            ctx.lineTo(LANE_WIDTH * 2, CANVAS_HEIGHT);
            ctx.stroke();

            // Player Car
            const carImg = carImagesRef.current[selectedCar];
            if (carImg && carImg.complete) {
                ctx.drawImage(carImg, playerRef.current.x, playerRef.current.y, CAR_WIDTH, CAR_HEIGHT);
            } else {
                ctx.fillStyle = CAR_TYPES[selectedCar].color;
                ctx.fillRect(playerRef.current.x, playerRef.current.y, CAR_WIDTH, CAR_HEIGHT);
            }

            // Obstacles
            obstaclesRef.current.forEach(obs => {
                const obsImg = obstacleImagesRef.current[obs.type];
                if (obsImg && obsImg.complete) {
                    ctx.drawImage(obsImg, obs.x, obs.y, obs.width, obs.height);
                } else {
                    // Fallback
                    if (obs.type === 'rock') ctx.fillStyle = '#888';
                    if (obs.type === 'barrier') ctx.fillStyle = '#d00';
                    if (obs.type === 'oil') ctx.fillStyle = '#000';
                    ctx.fillRect(obs.x, obs.y, obs.width, obs.height);
                }
            });
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
    }, [gameState, selectedCar, user, submitScore, handleGameOver, handleLevelComplete]);

    const startGame = () => {
        resetGame(true);
        setGameState('PLAYING');
    };

    return (
        <div className="flex flex-col items-center gap-4 pb-60 min-[1380px]:pb-0">
            <div className="flex justify-center gap-6 min-[1380px]:justify-between w-full max-w-[400px] text-xs min-[1380px]:text-xl font-mono text-red-500 px-4 min-[1380px]:px-0">
                <div>SCORE: {score}</div>
                <div>LEVEL: {level}</div>
            </div>
            <div className="flex justify-center gap-6 min-[1380px]:justify-between w-full max-w-[400px] text-[10px] min-[1380px]:text-sm font-mono text-yellow-400 px-4 min-[1380px]:px-0">
                <div>DODGED: {dodged}/10</div>
                <div>TIME: {time}s</div>
            </div>

            <div className="relative border-4 border-gray-700 rounded-lg bg-black shadow-[0_0_20px_rgba(255,0,0,0.3)] w-full max-w-[400px] aspect-[2/3]">
                <canvas
                    ref={canvasRef}
                    width={CANVAS_WIDTH}
                    height={CANVAS_HEIGHT}
                    className="block w-full h-full object-contain"
                />

                {gameState === 'START' && (
                    <div className="absolute inset-0 bg-black/80 flex flex-col items-center justify-center text-center">
                        <h2 className="text-4xl font-bold text-red-600 mb-4 animate-pulse">RACING</h2>
                        <p className="text-gray-400 mb-4">Select Your Car:</p>
                        <div className="flex gap-4 mb-8">
                            {CAR_TYPES.map((car, idx) => (
                                <div
                                    key={idx}
                                    onClick={() => setSelectedCar(idx)}
                                    className={`p-2 border-2 cursor-pointer transition-all ${selectedCar === idx ? 'border-white scale-110' : 'border-transparent opacity-50'}`}
                                >
                                    <NextImage src={car.src} alt={car.name} width={40} height={64} className="w-10 h-16 object-contain" />
                                    <div className="text-xs mt-1 text-white">{car.name}</div>
                                </div>
                            ))}
                        </div>
                        <Button onClick={startGame} className="bg-red-600 hover:bg-red-700 text-white font-bold px-8 py-4 text-xl">
                            START ENGINE
                        </Button>
                    </div>
                )}

                {/* Game Over */}
                {gameState === 'GAME_OVER' && (
                    <div className="absolute inset-0 bg-black/90 flex flex-col items-center justify-center text-center">
                        <h2 className="text-4xl font-bold text-red-500 mb-4">CRASHED!</h2>
                        <p className="text-white text-xl mb-8">Final Score: {score}</p>
                        <Button onClick={startGame} className="bg-white hover:bg-gray-200 text-black font-bold px-8 py-4">
                            TRY AGAIN
                        </Button>
                    </div>
                )}

                {/* Victory */}
                {gameState === 'VICTORY' && (
                    <div className="absolute inset-0 bg-black/90 flex flex-col items-center justify-center text-center">
                        <h2 className="text-4xl font-bold text-yellow-400 mb-4">CHAMPION!</h2>
                        <p className="text-white text-xl mb-8">You beat all 50 levels!</p>
                        <Button onClick={startGame} className="bg-yellow-500 hover:bg-yellow-600 text-black font-bold px-8 py-4">
                            RACE AGAIN
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
                ARROWS to Steer • SPACE to Boost
            </div>

            <MobileControls onInput={handleMobileInput} gameType="RACING" className="min-[1380px]:hidden" />
        </div>
    );
}
