'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Button } from "@/components/ui/button";
import { ArrowLeft, Trophy } from "lucide-react";
import TheBrickWallGame from '@/components/TheBrickWallGame';
import Leaderboard from "@/components/Leaderboard";

export default function TheBrickWallPage() {
    const [showMobileLeaderboard, setShowMobileLeaderboard] = useState(false);

    return (
        <div className="h-[calc(100dvh-4rem)] max-h-[calc(100dvh-4rem)] w-full overflow-hidden bg-gray-950 flex flex-col p-2 sm:p-3 md:p-4 text-white">
            {/* Top Header Bar */}
            <div className="w-full flex-none flex items-center justify-between h-10 sm:h-12 border-b border-white/5 pb-2 mb-1">
                <Link href="/">
                    <Button variant="ghost" size="sm" className="text-white hover:text-yellow-400 gap-1.5 px-2 sm:px-3 text-xs sm:text-sm">
                        <ArrowLeft size={16} /> <span className="hidden sm:inline">Back to Arcade</span><span className="sm:hidden">Back</span>
                    </Button>
                </Link>
                <h1 className="text-base sm:text-xl md:text-2xl font-bold text-yellow-400 font-mono tracking-widest uppercase truncate px-2">
                    THE BRICK WALL
                </h1>
                <div className="flex items-center gap-2">
                    <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => setShowMobileLeaderboard(!showMobileLeaderboard)}
                        className="xl:hidden text-yellow-400 border-yellow-500/30 hover:bg-yellow-500/10 px-2 sm:px-3 text-xs gap-1"
                    >
                        <Trophy size={14} /> <span className="hidden sm:inline">Ranks</span>
                    </Button>
                    <div className="hidden xl:block w-[80px]"></div>
                </div>
            </div>

            {/* Main Area */}
            <div className="flex-1 min-h-0 w-full flex flex-row items-stretch justify-center gap-4">
                <div className="flex-1 min-h-0 h-full flex flex-col items-center justify-center relative">
                    <TheBrickWallGame />
                </div>

                <div className="hidden xl:flex flex-col w-72 2xl:w-80 h-full max-h-full min-h-0 py-1">
                    <Leaderboard gameType="thebrickwall" className="h-full" />
                </div>
            </div>

            {/* Mobile Leaderboard Modal */}
            {showMobileLeaderboard && (
                <div className="xl:hidden fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="relative w-full max-w-sm max-h-[80vh] flex flex-col">
                        <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={() => setShowMobileLeaderboard(false)}
                            className="self-end text-white hover:text-red-400 font-mono mb-2"
                        >
                            ✕ CLOSE
                        </Button>
                        <Leaderboard gameType="thebrickwall" className="max-h-[70vh]" />
                    </div>
                </div>
            )}
        </div>
    );
}
