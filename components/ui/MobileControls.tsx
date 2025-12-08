'use client';

import { ArrowUp, ArrowDown, ArrowLeft, ArrowRight, RotateCw, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import React from 'react';

export type ControlAction = 'UP' | 'DOWN' | 'LEFT' | 'RIGHT' | 'A' | 'B';

interface MobileControlsProps {
    onInput: (action: ControlAction, active: boolean) => void;
    gameType?: 'TETRIS' | 'PACMAN' | 'RACING' | 'SPACE_INVADERS' | 'FROGGER' | 'DONKEY_KONG';
    className?: string;
}

export default function MobileControls({ onInput, gameType = 'TETRIS', className = '' }: MobileControlsProps) {

    const handleInteraction = (action: ControlAction, active: boolean) => (e: React.SyntheticEvent) => {
        e.preventDefault();
        e.stopPropagation();
        onInput(action, active);
    };

    // Helper to bind events for a button
    const bindEvents = (action: ControlAction) => ({
        onMouseDown: handleInteraction(action, true),
        onMouseUp: handleInteraction(action, false),
        onMouseLeave: handleInteraction(action, false),
        onTouchStart: handleInteraction(action, true),
        onTouchEnd: handleInteraction(action, false),
    });

    return (
        <div className={`fixed inset-x-0 bottom-0 z-50 h-48 pointer-events-none select-none ${className}`}>
            {/* Left Zone: Left Arrow */}
            <div className="absolute left-4 bottom-4 pointer-events-auto">
                <Button
                    variant="outline"
                    size="icon"
                    className="h-20 w-20 rounded-2xl bg-white/10 backdrop-blur-md active:bg-white/30 border-white/20 shadow-lg"
                    {...bindEvents('LEFT')}
                >
                    <ArrowLeft className="w-10 h-10 text-white" />
                </Button>
            </div>

            {/* Center Zone: Up/Down Arrows - Stretched */}
            <div className="absolute left-28 right-28 bottom-4 flex flex-col gap-3 pointer-events-auto">
                <Button
                    variant="outline"
                    className="h-14 w-full rounded-2xl bg-white/10 backdrop-blur-md active:bg-white/30 border-white/20 shadow-lg"
                    {...bindEvents('UP')}
                >
                    <ArrowUp className="w-8 h-8 text-white" />
                </Button>
                <Button
                    variant="outline"
                    className="h-14 w-full rounded-2xl bg-white/10 backdrop-blur-md active:bg-white/30 border-white/20 shadow-lg"
                    {...bindEvents('DOWN')}
                >
                    <ArrowDown className="w-8 h-8 text-white" />
                </Button>
            </div>

            {/* Right Zone: Right Arrow & Action Button */}
            <div className="absolute right-4 bottom-4 flex flex-col items-center gap-4 pointer-events-auto">
                {/* Action Button (A) */}
                {(gameType === 'TETRIS' || gameType === 'DONKEY_KONG' || gameType === 'SPACE_INVADERS' || gameType === 'RACING') && (
                    <Button
                        variant="outline"
                        size="icon"
                        className={`h-16 w-16 rounded-2xl backdrop-blur-md border-white/20 shadow-xl ${gameType === 'TETRIS' ? 'bg-purple-500/60 active:bg-purple-500/80' :
                            gameType === 'DONKEY_KONG' ? 'bg-red-500/60 active:bg-red-500/80' :
                                gameType === 'SPACE_INVADERS' ? 'bg-green-500/60 active:bg-green-500/80' :
                                    'bg-blue-500/60 active:bg-blue-500/80'
                            }`}
                        {...bindEvents('A')}
                    >
                        {gameType === 'TETRIS' && <RotateCw className="w-8 h-8 text-white" />}
                        {gameType === 'DONKEY_KONG' && <span className="font-bold text-sm text-white">JUMP</span>}
                        {gameType === 'SPACE_INVADERS' && <Zap className="w-8 h-8 text-white" />}
                        {gameType === 'RACING' && <span className="font-bold text-xs text-white">BOOST</span>}
                    </Button>
                )}

                <Button
                    variant="outline"
                    size="icon"
                    className="h-20 w-20 rounded-2xl bg-white/10 backdrop-blur-md active:bg-white/30 border-white/20 shadow-lg"
                    {...bindEvents('RIGHT')}
                >
                    <ArrowRight className="w-10 h-10 text-white" />
                </Button>
            </div>
        </div>
    );
}
