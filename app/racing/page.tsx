'use client';

import Link from 'next/link';
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import RacingGame from '@/components/RacingGame';
import Leaderboard from "@/components/Leaderboard";

export default function RacingPage() {
    return (
        <div className="min-h-screen bg-gray-950 flex flex-col items-center py-8 px-4 gap-4 text-white relative">
            <div className="w-full max-w-7xl flex items-center justify-between">
                <Link href="/">
                    <Button variant="ghost" className="text-white hover:text-red-400 gap-2">
                        <ArrowLeft size={20} /> Back to Arcade
                    </Button>
                </Link>
                <h1 className="text-4xl font-mono text-red-500 absolute left-1/2 -translate-x-1/2">RETRO RACING</h1>
                <div className="w-[100px]"></div>
            </div>

            <main className="flex flex-col xl:flex-row gap-12 items-start justify-center w-full max-w-7xl">
                <div className="flex-1 flex justify-center w-full">
                    <RacingGame />
                </div>

                <div className="w-full xl:w-auto flex justify-center">
                    <Leaderboard gameType="racing" />
                </div>
            </main>
        </div>
    );
}
