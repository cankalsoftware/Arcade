'use client';

import { api } from "@/convex/_generated/api";
import { useQuery } from "convex/react";

interface LeaderboardProps {
    gameType?: string;
    className?: string;
}

export default function Leaderboard({ gameType, className = '' }: LeaderboardProps) {
    const scores = useQuery(api.scores.getTopScores, { limit: 10, gameType });

    return (
        <div className={`bg-gray-900/90 backdrop-blur-md p-4 rounded-xl shadow-xl w-full border border-gray-800 flex flex-col min-h-0 ${className}`}>
            <h2 className="text-xl font-bold mb-3 text-center text-yellow-400 font-mono tracking-wider flex-none">
                🏆 LEADERBOARD
            </h2>
            {scores === undefined ? (
                <div className="flex-1 flex items-center justify-center text-gray-500 font-mono text-sm py-4">Loading...</div>
            ) : scores.length === 0 ? (
                <div className="flex-1 flex items-center justify-center text-gray-500 font-mono text-sm text-center py-4">No scores yet. Be the first!</div>
            ) : (
                <ul className="space-y-1.5 flex-1 min-h-0 overflow-y-auto pr-1">
                    {scores.map((score, index) => (
                        <li key={score._id} className="flex justify-between items-center bg-gray-800/80 hover:bg-gray-800 px-3 py-1.5 rounded-lg border border-gray-700/50 text-xs sm:text-sm">
                            <span className="flex items-center gap-2 min-w-0">
                                <span className={`font-bold w-5 text-center shrink-0 ${index === 0 ? 'text-yellow-400 font-extrabold' : index === 1 ? 'text-gray-300 font-bold' : index === 2 ? 'text-amber-600 font-bold' : 'text-gray-500'}`}>
                                    #{index + 1}
                                </span>
                                <span className="text-white font-mono truncate max-w-[110px] sm:max-w-[130px]">{score.userName}</span>
                            </span>
                            <div className="text-right shrink-0">
                                <div className="text-green-400 font-bold font-mono text-xs sm:text-sm">{score.score}</div>
                                <div className="text-[10px] text-gray-400">Lvl {score.level}</div>
                            </div>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
}
