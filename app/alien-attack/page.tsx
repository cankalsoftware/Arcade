'use client'

import Game from "@/components/SpaceInvadersGame";
import Leaderboard from "@/components/Leaderboard";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

export default function SpaceInvadersPage() {
  return (
    <div className="min-h-screen bg-gray-950 flex flex-col items-center py-8 px-4 gap-4">
      <div className="w-full max-w-7xl flex items-center justify-between">
        <Link href="/">
          <Button variant="ghost" className="text-white hover:text-green-400 gap-2">
            <ArrowLeft size={20} /> Back to Arcade
          </Button>
        </Link>
        <h1 className="text-4xl font-bold text-green-400 font-mono tracking-widest absolute left-1/2 -translate-x-1/2">SPACE INVADERS</h1>
        <div className="w-[100px]"></div>
      </div>

      <main className="flex flex-col xl:flex-row gap-12 items-start justify-center w-full max-w-7xl">
        <div className="flex-1 flex justify-center w-full">
          <Game />
        </div>

        <div className="w-full xl:w-auto flex justify-center">
          <Leaderboard />
        </div>
      </main>


    </div>
  );
}
