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

      <div className="flex flex-wrap justify-center gap-8 p-8 max-w-7xl w-full relative z-20">

        {/* Alien Attack Card */}
        <Link href="/alien-attack" className="group">
          <motion.div
            whileHover={{ scale: 1.05, y: -8 }}
            className="w-[320px] h-[460px] bg-[#0d1117] border-2 border-green-500/60 rounded-2xl flex flex-col items-center justify-between p-7 relative overflow-hidden transition-all duration-300 shadow-[0_0_20px_rgba(34,197,94,0.15)] group-hover:shadow-[0_0_35px_rgba(34,197,94,0.5),inset_0_0_25px_rgba(34,197,94,0.15)] group-hover:border-green-400 group-hover:bg-[#111c14]"
          >
            <div className="w-full flex justify-between items-center">
              <span className="text-[11px] font-mono font-bold px-2.5 py-1 bg-green-500/20 text-green-400 rounded-full border border-green-500/40 uppercase tracking-widest">CLASSIC</span>
              <span className="text-xs font-mono text-gray-400">50 LEVELS</span>
            </div>

            <div className="relative w-28 h-28 flex items-center justify-center my-2">
              <div className="absolute inset-0 bg-green-500/20 rounded-full filter blur-xl group-hover:blur-2xl transition-all" />
              <img
                src="/assets/alien-attack/player1.png"
                alt="Alien Attack"
                className="w-24 h-24 object-contain relative z-10 filter drop-shadow-[0_0_15px_rgba(34,197,94,0.8)] transform group-hover:scale-110 transition-transform duration-300"
              />
            </div>

            <div className="text-center">
              <h2 className="text-2xl font-bold text-green-400 font-mono mb-2 leading-tight tracking-wider">
                ALIEN ATTACK
              </h2>
              <p className="text-gray-400 text-sm font-sans">Defend Earth from wave after wave of invaders!</p>
            </div>

            <div className="w-full py-3 border-2 border-green-500 text-green-400 font-mono text-sm uppercase tracking-wider text-center rounded-xl transition-all font-bold group-hover:bg-green-500 group-hover:text-black group-hover:shadow-[0_0_20px_rgba(34,197,94,0.9)]">
              Insert Coin
            </div>
          </motion.div>
        </Link>

        {/* The Brick Wall Card */}
        <Link href="/the-brick-wall" className="group">
          <motion.div
            whileHover={{ scale: 1.05, y: -8 }}
            className="w-[320px] h-[460px] bg-[#0d1117] border-2 border-yellow-500/60 rounded-2xl flex flex-col items-center justify-between p-7 relative overflow-hidden transition-all duration-300 shadow-[0_0_20px_rgba(234,179,8,0.15)] group-hover:shadow-[0_0_35px_rgba(234,179,8,0.5),inset_0_0_25px_rgba(234,179,8,0.15)] group-hover:border-yellow-400 group-hover:bg-[#1a180e]"
          >
            <div className="w-full flex justify-between items-center">
              <span className="text-[11px] font-mono font-bold px-2.5 py-1 bg-yellow-500/20 text-yellow-400 rounded-full border border-yellow-500/40 uppercase tracking-widest">PUZZLE</span>
              <span className="text-xs font-mono text-gray-400">ENDLESS</span>
            </div>

            <div className="relative w-28 h-28 flex items-center justify-center my-2">
              <div className="absolute inset-0 bg-yellow-500/20 rounded-full filter blur-xl group-hover:blur-2xl transition-all" />
              <img
                src="/assets/the-brick-wall/brick.svg"
                alt="The Brick Wall"
                className="w-24 h-24 object-contain relative z-10 filter drop-shadow-[0_0_15px_rgba(234,179,8,0.8)] transform group-hover:scale-110 transition-transform duration-300"
              />
            </div>

            <div className="text-center">
              <h2 className="text-2xl font-bold text-yellow-400 font-mono mb-2 leading-tight tracking-wider">
                THE BRICK WALL
              </h2>
              <p className="text-gray-400 text-sm font-sans">Stack blocks, create lines, beat high scores!</p>
            </div>

            <div className="w-full py-3 border-2 border-yellow-400 text-yellow-400 font-mono text-sm uppercase tracking-wider text-center rounded-xl transition-all font-bold group-hover:bg-yellow-400 group-hover:text-black group-hover:shadow-[0_0_20px_rgba(234,179,8,0.9)]">
              Insert Coin
            </div>
          </motion.div>
        </Link>

        {/* Marshmallow Trail Card */}
        <Link href="/marshmallow-trail" className="group">
          <motion.div
            whileHover={{ scale: 1.05, y: -8 }}
            className="w-[320px] h-[460px] bg-[#0d1117] border-2 border-pink-500/60 rounded-2xl flex flex-col items-center justify-between p-7 relative overflow-hidden transition-all duration-300 shadow-[0_0_20px_rgba(236,72,153,0.15)] group-hover:shadow-[0_0_35px_rgba(236,72,153,0.5),inset_0_0_25px_rgba(236,72,153,0.15)] group-hover:border-pink-400 group-hover:bg-[#1a0f18]"
          >
            <div className="w-full flex justify-between items-center">
              <span className="text-[11px] font-mono font-bold px-2.5 py-1 bg-pink-500/20 text-pink-400 rounded-full border border-pink-500/40 uppercase tracking-widest">MAZE</span>
              <span className="text-xs font-mono text-gray-400">50 LEVELS</span>
            </div>

            <div className="relative w-28 h-28 flex items-center justify-center my-2">
              <div className="absolute inset-0 bg-pink-500/20 rounded-full filter blur-xl group-hover:blur-2xl transition-all" />
              <img
                src="/assets/marshmallow-trail/player.svg"
                alt="Marshmallow Trail"
                className="w-24 h-24 object-contain relative z-10 filter drop-shadow-[0_0_15px_rgba(236,72,153,0.8)] transform group-hover:scale-110 transition-transform duration-300"
              />
            </div>

            <div className="text-center">
              <h2 className="text-2xl font-bold text-pink-400 font-mono mb-2 leading-tight tracking-wider">
                MARSHMALLOW TRAIL
              </h2>
              <p className="text-gray-400 text-sm font-sans">Munch the trail and outsmart the hungry ghosts!</p>
            </div>

            <div className="w-full py-3 border-2 border-pink-500 text-pink-400 font-mono text-sm uppercase tracking-wider text-center rounded-xl transition-all font-bold group-hover:bg-pink-500 group-hover:text-black group-hover:shadow-[0_0_20px_rgba(236,72,153,0.9)]">
              Insert Coin
            </div>
          </motion.div>
        </Link>

        {/* Retro Racing Card */}
        <Link href="/racing" className="group">
          <motion.div
            whileHover={{ scale: 1.05, y: -8 }}
            className="w-[320px] h-[460px] bg-[#0d1117] border-2 border-red-500/60 rounded-2xl flex flex-col items-center justify-between p-7 relative overflow-hidden transition-all duration-300 shadow-[0_0_20px_rgba(239,68,68,0.15)] group-hover:shadow-[0_0_35px_rgba(239,68,68,0.5),inset_0_0_25px_rgba(239,68,68,0.15)] group-hover:border-red-400 group-hover:bg-[#1a0f0f]"
          >
            <div className="w-full flex justify-between items-center">
              <span className="text-[11px] font-mono font-bold px-2.5 py-1 bg-red-500/20 text-red-400 rounded-full border border-red-500/40 uppercase tracking-widest">SPEED</span>
              <span className="text-xs font-mono text-gray-400">NITRO</span>
            </div>

            <div className="relative w-28 h-28 flex items-center justify-center my-2">
              <div className="absolute inset-0 bg-red-500/20 rounded-full filter blur-xl group-hover:blur-2xl transition-all" />
              <img
                src="/assets/racing/car-red.svg"
                alt="Retro Racing"
                className="w-20 h-24 object-contain relative z-10 filter drop-shadow-[0_0_15px_rgba(239,68,68,0.8)] transform group-hover:scale-110 transition-transform duration-300"
              />
            </div>

            <div className="text-center">
              <h2 className="text-2xl font-bold text-red-500 font-mono mb-2 leading-tight tracking-wider">
                RETRO RACING
              </h2>
              <p className="text-gray-400 text-sm font-sans">High-octane formula racing and obstacle dodging!</p>
            </div>

            <div className="w-full py-3 border-2 border-red-500 text-red-500 font-mono text-sm uppercase tracking-wider text-center rounded-xl transition-all font-bold group-hover:bg-red-500 group-hover:text-black group-hover:shadow-[0_0_20px_rgba(239,68,68,0.9)]">
              Insert Coin
            </div>
          </motion.div>
        </Link>

        {/* Dodge The Barrels Card */}
        <Link href="/dodge-the-barrels" className="group">
          <motion.div
            whileHover={{ scale: 1.05, y: -8 }}
            className="w-[320px] h-[460px] bg-[#0d1117] border-2 border-orange-500/60 rounded-2xl flex flex-col items-center justify-between p-7 relative overflow-hidden transition-all duration-300 shadow-[0_0_20px_rgba(249,115,22,0.15)] group-hover:shadow-[0_0_35px_rgba(249,115,22,0.5),inset_0_0_25px_rgba(249,115,22,0.15)] group-hover:border-orange-400 group-hover:bg-[#1a130c]"
          >
            <div className="w-full flex justify-between items-center">
              <span className="text-[11px] font-mono font-bold px-2.5 py-1 bg-orange-500/20 text-orange-400 rounded-full border border-orange-500/40 uppercase tracking-widest">ARCADE</span>
              <span className="text-xs font-mono text-gray-400">50 LEVELS</span>
            </div>

            <div className="relative w-28 h-28 flex items-center justify-center my-2">
              <div className="absolute inset-0 bg-orange-500/20 rounded-full filter blur-xl group-hover:blur-2xl transition-all" />
              <img
                src="/assets/dodge-the-barrels/gorilla.svg"
                alt="Dodge The Barrels"
                className="w-24 h-24 object-contain relative z-10 filter drop-shadow-[0_0_15px_rgba(249,115,22,0.8)] transform group-hover:scale-110 transition-transform duration-300"
              />
            </div>

            <div className="text-center">
              <h2 className="text-2xl font-bold text-orange-400 font-mono mb-2 leading-tight tracking-wider">
                DODGE THE BARRELS
              </h2>
              <p className="text-gray-400 text-sm font-sans">Climb the girders, leap rolling barrels &amp; save the princess!</p>
            </div>

            <div className="w-full py-3 border-2 border-orange-500 text-orange-400 font-mono text-sm uppercase tracking-wider text-center rounded-xl transition-all font-bold group-hover:bg-orange-500 group-hover:text-black group-hover:shadow-[0_0_20px_rgba(249,115,22,0.9)]">
              Insert Coin
            </div>
          </motion.div>
        </Link>

        {/* Jump The River Card */}
        <Link href="/jump-the-river" className="group">
          <motion.div
            whileHover={{ scale: 1.05, y: -8 }}
            className="w-[320px] h-[460px] bg-[#0d1117] border-2 border-emerald-500/60 rounded-2xl flex flex-col items-center justify-between p-7 relative overflow-hidden transition-all duration-300 shadow-[0_0_20px_rgba(16,185,129,0.15)] group-hover:shadow-[0_0_35px_rgba(16,185,129,0.5),inset_0_0_25px_rgba(16,185,129,0.15)] group-hover:border-emerald-400 group-hover:bg-[#0e1c15]"
          >
            <div className="w-full flex justify-between items-center">
              <span className="text-[11px] font-mono font-bold px-2.5 py-1 bg-emerald-500/20 text-emerald-400 rounded-full border border-emerald-500/40 uppercase tracking-widest">ACTION</span>
              <span className="text-xs font-mono text-gray-400">50 LEVELS</span>
            </div>

            <div className="relative w-28 h-28 flex items-center justify-center my-2">
              <div className="absolute inset-0 bg-emerald-500/20 rounded-full filter blur-xl group-hover:blur-2xl transition-all" />
              <img
                src="/assets/jump-the-river/frog.svg"
                alt="Jump The River"
                className="w-24 h-24 object-contain relative z-10 filter drop-shadow-[0_0_15px_rgba(16,185,129,0.8)] transform group-hover:scale-110 transition-transform duration-300"
              />
            </div>

            <div className="text-center">
              <h2 className="text-2xl font-bold text-emerald-400 font-mono mb-2 leading-tight tracking-wider">
                JUMP THE RIVER
              </h2>
              <p className="text-gray-400 text-sm font-sans">Cross busy highways and navigate rushing rivers safely!</p>
            </div>

            <div className="w-full py-3 border-2 border-emerald-500 text-emerald-400 font-mono text-sm uppercase tracking-wider text-center rounded-xl transition-all font-bold group-hover:bg-emerald-500 group-hover:text-black group-hover:shadow-[0_0_20px_rgba(16,185,129,0.9)]">
              Insert Coin
            </div>
          </motion.div>
        </Link>

        {/* Diamond Hunt Card */}
        <Link href="/diamond-hunt" className="group">
          <motion.div
            whileHover={{ scale: 1.05, y: -8 }}
            className="w-[320px] h-[460px] bg-[#0d1117] border-2 border-amber-500/60 rounded-2xl flex flex-col items-center justify-between p-7 relative overflow-hidden transition-all duration-300 shadow-[0_0_20px_rgba(245,158,11,0.15)] group-hover:shadow-[0_0_35px_rgba(245,158,11,0.5),inset_0_0_25px_rgba(245,158,11,0.15)] group-hover:border-amber-400 group-hover:bg-[#1a140c]"
          >
            <div className="w-full flex justify-between items-center">
              <span className="text-[11px] font-mono font-bold px-2.5 py-1 bg-amber-500/20 text-amber-400 rounded-full border border-amber-500/40 uppercase tracking-widest">MINING</span>
              <span className="text-xs font-mono text-gray-400">TREASURE</span>
            </div>

            <div className="relative w-28 h-28 flex items-center justify-center my-2">
              <div className="absolute inset-0 bg-amber-500/20 rounded-full filter blur-xl group-hover:blur-2xl transition-all" />
              <img
                src="/assets/diamond-hunt/diamond.svg"
                alt="Diamond Hunt"
                className="w-24 h-24 object-contain relative z-10 filter drop-shadow-[0_0_18px_rgba(6,182,212,0.9)] transform group-hover:scale-110 transition-transform duration-300"
              />
            </div>

            <div className="text-center">
              <h2 className="text-2xl font-bold text-amber-400 font-mono mb-2 leading-tight tracking-wider">
                DIAMOND HUNT
              </h2>
              <p className="text-gray-400 text-sm font-sans">Dig deep underground, find diamonds &amp; pop monsters!</p>
            </div>

            <div className="w-full py-3 border-2 border-amber-500 text-amber-400 font-mono text-sm uppercase tracking-wider text-center rounded-xl transition-all font-bold group-hover:bg-amber-500 group-hover:text-black group-hover:shadow-[0_0_20px_rgba(245,158,11,0.9)]">
              Insert Coin
            </div>
          </motion.div>
        </Link>

      </div>
    </div>
  );
}