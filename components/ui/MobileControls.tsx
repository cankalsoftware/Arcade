'use client';

import { ArrowUp, ArrowDown, ArrowLeft, ArrowRight, RotateCw, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import React from 'react';

export type ControlAction = 'UP' | 'DOWN' | 'LEFT' | 'RIGHT' | 'A' | 'B';

interface MobileControlsProps {
    onInput: (action: ControlAction, active: boolean) => void;
    gameType?: 'THE_BRICK_WALL' | 'MARSHMALLOW_TRAIL' | 'RACING' | 'ALIEN_ATTACK' | 'JUMP_THE_RIVER' | 'DODGE_THE_BARRELS' | 'DIAMOND_HUNT';
    className?: string;
}

export default function MobileControls({ onInput, gameType = 'THE_BRICK_WALL', className = '' }: MobileControlsProps) {

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
        <div className={`fixed inset-x-0 bottom-0 z-50 h-40 sm:h-44 pointer-events-none select-none ${className}`}>
            {/* Left Zone: Left Arrow */}
            <div className="absolute left-3 sm:left-6 bottom-3 sm:bottom-4 pointer-events-auto">
                <Button
                    variant="outline"
                    size="icon"
                    className="h-16 w-16 sm:h-20 sm:w-20 rounded-2xl bg-white/10 backdrop-blur-md active:bg-white/30 border-white/20 shadow-lg"
                    {...bindEvents('LEFT')}
                >
                    <ArrowLeft className="w-8 h-8 sm:w-10 sm:h-10 text-white" />
                </Button>
            </div>

            {/* Center Zone: Up/Down Arrows */}
            <div className="absolute left-22 right-22 sm:left-32 sm:right-32 bottom-3 sm:bottom-4 flex flex-col gap-2 pointer-events-auto max-w-xs mx-auto">
                <Button
                    variant="outline"
                    className="h-11 sm:h-13 w-full rounded-xl sm:rounded-2xl bg-white/10 backdrop-blur-md active:bg-white/30 border-white/20 shadow-lg"
                    {...bindEvents('UP')}
                >
                    <ArrowUp className="w-6 h-6 sm:w-8 sm:h-8 text-white" />
                </Button>
                <Button
                    variant="outline"
                    className="h-11 sm:h-13 w-full rounded-xl sm:rounded-2xl bg-white/10 backdrop-blur-md active:bg-white/30 border-white/20 shadow-lg"
                    {...bindEvents('DOWN')}
                >
                    <ArrowDown className="w-6 h-6 sm:w-8 sm:h-8 text-white" />
                </Button>
            </div>

            {/* Right Zone: Right Arrow & Action Button */}
            <div className="absolute right-3 sm:right-6 bottom-3 sm:bottom-4 flex flex-col items-center gap-2 sm:gap-3 pointer-events-auto">
                {/* Action Button (A) */}
                {(gameType === 'THE_BRICK_WALL' || gameType === 'DODGE_THE_BARRELS' || gameType === 'ALIEN_ATTACK' || gameType === 'RACING' || gameType === 'DIAMOND_HUNT') && (
                    <Button
                        variant="outline"
                        size="icon"
                        className={`h-12 w-12 sm:h-14 sm:w-14 rounded-xl sm:rounded-2xl backdrop-blur-md border-white/20 shadow-xl ${gameType === 'THE_BRICK_WALL' ? 'bg-purple-500/60 active:bg-purple-500/80' :
                            gameType === 'DODGE_THE_BARRELS' ? 'bg-red-500/60 active:bg-red-500/80' :
                                gameType === 'ALIEN_ATTACK' ? 'bg-green-500/60 active:bg-green-500/80' :
                                    gameType === 'DIAMOND_HUNT' ? 'bg-amber-600/60 active:bg-amber-600/80' :
                                        'bg-blue-500/60 active:bg-blue-500/80'
                            }`}
                        {...bindEvents('A')}
                    >
                        {gameType === 'THE_BRICK_WALL' && <RotateCw className="w-6 h-6 sm:w-7 sm:h-7 text-white" />}
                        {gameType === 'DODGE_THE_BARRELS' && <span className="font-bold text-xs sm:text-sm text-white">JUMP</span>}
                        {gameType === 'ALIEN_ATTACK' && <Zap className="w-6 h-6 sm:w-7 sm:h-7 text-white" />}
                        {gameType === 'RACING' && <span className="font-bold text-[10px] sm:text-xs text-white">BOOST</span>}
                        {gameType === 'DIAMOND_HUNT' && <span className="font-bold text-[10px] sm:text-xs text-white">PUMP</span>}
                    </Button>
                )}

                <Button
                    variant="outline"
                    size="icon"
                    className="h-16 w-16 sm:h-20 sm:w-20 rounded-2xl bg-white/10 backdrop-blur-md active:bg-white/30 border-white/20 shadow-lg"
                    {...bindEvents('RIGHT')}
                >
                    <ArrowRight className="w-8 h-8 sm:w-10 sm:h-10 text-white" />
                </Button>
            </div>
        </div>
    );
}
