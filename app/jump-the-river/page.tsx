'use client';

import React from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import FroggerGame from '@/components/FroggerGame';
import Leaderboard from '@/components/Leaderboard';

export default function FroggerPage() {
    return (
        <div className="min-h-screen bg-black text-white p-8 pt-24">
            <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-8">

                {/* Game Column */}
                <div className="lg:col-span-2 space-y-4">
                    <div className="flex items-center gap-4">
                        <Link href="/">
                            <Button variant="ghost" className="text-green-500 hover:text-green-400 hover:bg-green-950/30">
                                <ArrowLeft className="mr-2 h-4 w-4" />
                                Back to Arcade
                            </Button>
                        </Link>
                        <h1 className="text-3xl font-bold text-green-500 font-mono tracking-wider">FROGGER</h1>
                    </div>

                    <FroggerGame />
                </div>

                {/* Leaderboard Column */}
                <div className="lg:col-span-1">
                    <Leaderboard gameType="frogger" />
                </div>
            </div>
        </div>
    );
}
