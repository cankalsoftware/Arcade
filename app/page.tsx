'use client'

import Link from 'next/link';
import { motion } from 'framer-motion';

export default function ArcadeLanding() {
  return (
    <div className="min-h-screen bg-[#050505] text-white font-sans overflow-x-hidden flex flex-col items-center relative selection:bg-cyan-500/30">

      {/* Retro Scanline Effect */}
      <div className="fixed inset-0 pointer-events-none z-10 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] bg-[length:100%_2px,3px_100%]" />

      {/* Background Grid */}
      <div className="fixed inset-0 pointer-events-none z-0 opacity-20"
        style={{
          backgroundImage: `linear-gradient(rgba(0, 255, 255, 0.1) 1px, transparent 1px),
                               linear-gradient(90deg, rgba(0, 255, 255, 0.1) 1px, transparent 1px)`,
          backgroundSize: '40px 40px'
        }}
      />

      <header className="text-center mt-16 mb-12 relative z-20">
        <h1 className="text-5xl md:text-7xl font-bold tracking-tighter text-transparent bg-clip-text bg-gradient-to-b from-white to-gray-400 drop-shadow-[0_0_15px_rgba(255,255,255,0.5)] animate-pulse">
          ARCADE CENTRAL
        </h1>
        <div className="text-xl md:text-2xl mt-4 text-cyan-400 tracking-[0.2em] font-mono uppercase drop-shadow-[0_0_5px_rgba(0,255,255,0.8)]">
          Select Your Challenge
        </div>
      </header>

      <div className="flex flex-wrap justify-center gap-12 p-8 max-w-7xl w-full relative z-20">

        {/* Space Invaders Card */}
        <Link href="/space-invaders" className="group">
          <motion.div
            whileHover={{ scale: 1.05, y: -10 }}
            className="w-[320px] h-[450px] bg-[#111] border-2 border-green-500 rounded-xl flex flex-col items-center justify-between p-8 relative overflow-hidden transition-all duration-300 shadow-[0_0_15px_rgba(0,255,0,0.2)] group-hover:shadow-[0_0_30px_rgba(0,255,0,0.6),inset_0_0_20px_rgba(0,255,0,0.2)] group-hover:bg-[#1a1a1a]"
          >
            <div className="text-6xl mb-4 filter drop-shadow-[0_0_10px_rgba(0,255,0,0.8)]">👾</div>
            <div className="text-center">
              <h2 className="text-2xl font-bold text-green-400 font-mono mb-2 leading-tight">SPACE<br />INVADERS</h2>
              <p className="text-gray-400 text-sm">Defend Earth from the alien horde!</p>
            </div>
            <div className="px-8 py-3 border-2 border-green-500 text-green-500 font-mono text-sm uppercase tracking-wider transition-all group-hover:bg-green-500 group-hover:text-black group-hover:shadow-[0_0_15px_rgba(0,255,0,1)]">
              Insert Coin
            </div>
          </motion.div>
        </Link>

        {/* Tetris Card */}
        <Link href="/tetris" className="group">
          <motion.div
            whileHover={{ scale: 1.05, y: -10 }}
            className="w-[320px] h-[450px] bg-[#111] border-2 border-yellow-400 rounded-xl flex flex-col items-center justify-between p-8 relative overflow-hidden transition-all duration-300 shadow-[0_0_15px_rgba(255,255,0,0.2)] group-hover:shadow-[0_0_30px_rgba(255,255,0,0.6),inset_0_0_20px_rgba(255,255,0,0.2)] group-hover:bg-[#1a1a1a]"
          >
            <div className="text-6xl mb-4 filter drop-shadow-[0_0_10px_rgba(255,255,0,0.8)]">🧱</div>
            <div className="text-center">
              <h2 className="text-2xl font-bold text-yellow-400 font-mono mb-2 leading-tight">TETRIS</h2>
              <p className="text-gray-400 text-sm">Stack the blocks, clear the lines!</p>
            </div>
            <div className="px-8 py-3 border-2 border-yellow-400 text-yellow-400 font-mono text-sm uppercase tracking-wider transition-all group-hover:bg-yellow-400 group-hover:text-black group-hover:shadow-[0_0_15px_rgba(255,255,0,1)]">
              Insert Coin
            </div>
          </motion.div>
        </Link>

        {/* Pac-Man Card */}
        <Link href="/pacman" className="group">
          <motion.div
            whileHover={{ scale: 1.05, y: -10 }}
            className="w-[320px] h-[450px] bg-[#111] border-2 border-pink-500 rounded-xl flex flex-col items-center justify-between p-8 relative overflow-hidden transition-all duration-300 shadow-[0_0_15px_rgba(255,0,255,0.2)] group-hover:shadow-[0_0_30px_rgba(255,0,255,0.6),inset_0_0_20px_rgba(255,0,255,0.2)] group-hover:bg-[#1a1a1a]"
          >
            <div className="text-6xl mb-4 filter drop-shadow-[0_0_10px_rgba(255,0,255,0.8)]">👻</div>
            <div className="text-center">
              <h2 className="text-2xl font-bold text-pink-500 font-mono mb-2 leading-tight">PAC-MAN</h2>
              <p className="text-gray-400 text-sm">Waka waka waka!</p>
            </div>
            <div className="px-8 py-3 border-2 border-pink-500 text-pink-500 font-mono text-sm uppercase tracking-wider transition-all group-hover:bg-pink-500 group-hover:text-black group-hover:shadow-[0_0_15px_rgba(255,0,255,1)]">
              Insert Coin
            </div>
          </motion.div>
        </Link>

        {/* Racing Card */}
        <Link href="/racing" className="group">
          <motion.div
            whileHover={{ scale: 1.05, y: -10 }}
            className="w-[320px] h-[450px] bg-[#111] border-2 border-red-500 rounded-xl flex flex-col items-center justify-between p-8 relative overflow-hidden transition-all duration-300 shadow-[0_0_15px_rgba(255,0,0,0.2)] group-hover:shadow-[0_0_30px_rgba(255,0,0,0.6),inset_0_0_20px_rgba(255,0,0,0.2)] group-hover:bg-[#1a1a1a]"
          >
            <div className="text-6xl mb-4 filter drop-shadow-[0_0_10px_rgba(255,0,0,0.8)]">🏎️</div>
            <div className="text-center">
              <h2 className="text-2xl font-bold text-red-500 font-mono mb-2 leading-tight">RETRO<br />RACING</h2>
              <p className="text-gray-400 text-sm">Need for Speed!</p>
            </div>
            <div className="px-8 py-3 border-2 border-red-500 text-red-500 font-mono text-sm uppercase tracking-wider transition-all group-hover:bg-red-500 group-hover:text-black group-hover:shadow-[0_0_15px_rgba(255,0,0,1)]">
              Insert Coin
            </div>
          </motion.div>
        </Link>

        {/* Donkey Kong Card */}
        <Link href="/donkey-kong" className="group">
          <motion.div
            whileHover={{ scale: 1.05, y: -10 }}
            className="w-[320px] h-[450px] bg-[#111] border-2 border-orange-500 rounded-xl flex flex-col items-center justify-between p-8 relative overflow-hidden transition-all duration-300 shadow-[0_0_15px_rgba(255,165,0,0.2)] group-hover:shadow-[0_0_30px_rgba(255,165,0,0.6),inset_0_0_20px_rgba(255,165,0,0.2)] group-hover:bg-[#1a1a1a]"
          >
            <div className="text-6xl mb-4 filter drop-shadow-[0_0_10px_rgba(255,165,0,0.8)]">🦍</div>
            <div className="text-center">
              <h2 className="text-2xl font-bold text-orange-500 font-mono mb-2 leading-tight">DONKEY<br />KONG</h2>
              <p className="text-gray-400 text-sm">Save the Princess!</p>
            </div>
            <div className="px-8 py-3 border-2 border-orange-500 text-orange-500 font-mono text-sm uppercase tracking-wider transition-all group-hover:bg-orange-500 group-hover:text-black group-hover:shadow-[0_0_15px_rgba(255,165,0,1)]">
              Insert Coin
            </div>
          </motion.div>
        </Link>

        {/* Frogger Card */}
        <Link href="/frogger" className="group">
          <motion.div
            whileHover={{ scale: 1.05, y: -10 }}
            className="w-[320px] h-[450px] bg-[#111] border-2 border-green-500 rounded-xl flex flex-col items-center justify-between p-8 relative overflow-hidden transition-all duration-300 shadow-[0_0_15px_rgba(34,197,94,0.2)] group-hover:shadow-[0_0_30px_rgba(34,197,94,0.6),inset_0_0_20px_rgba(34,197,94,0.2)] group-hover:bg-[#1a1a1a]"
          >
            <div className="text-6xl mb-4 filter drop-shadow-[0_0_10px_rgba(34,197,94,0.8)]">🐸</div>
            <div className="text-center">
              <h2 className="text-2xl font-bold text-green-500 font-mono mb-2 leading-tight">FROGGER</h2>
              <p className="text-gray-400 text-sm">Cross the Road!</p>
            </div>
            <div className="px-8 py-3 border-2 border-green-500 text-green-500 font-mono text-sm uppercase tracking-wider transition-all group-hover:bg-green-500 group-hover:text-black group-hover:shadow-[0_0_15px_rgba(34,197,94,1)]">
              Insert Coin
            </div>
          </motion.div>
        </Link>

      </div>
    </div>
  );
}