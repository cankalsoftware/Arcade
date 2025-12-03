'use client';

import { api } from "@/convex/_generated/api";
import { useQuery } from "convex/react";

export default function Leaderboard({ gameType }: { gameType?: string }) {
    const scores = useQuery(api.scores.getTopScores, { limit: 10, gameType });

    return (
        <div className="bg-gray-900 p-6 rounded-lg shadow-lg w-full max-w-md border border-gray-700">
            <h2 className="text-2xl font-bold mb-4 text-center text-green-400 font-mono">LEADERBOARD</h2>
            {scores === undefined ? (
                <div className="text-center text-gray-400">Loading...</div>
            ) : scores.length === 0 ? (
                <div className="text-center text-gray-400">No scores yet. Be the first!</div>
            ) : (
                <ul className="space-y-2">
                    {scores.map((score, index) => (
                        <li key={score._id} className="flex justify-between items-center bg-gray-800 p-2 rounded border border-gray-700">
                            <span className="flex items-center gap-3">
                                <span className={`font-bold w-6 text-center ${index < 3 ? 'text-yellow-400' : 'text-gray-500'}`}>
                                    #{index + 1}
                                </span>
                                <span className="text-white font-mono truncate max-w-[150px]">{score.userName}</span>
                            </span>
                            <div className="text-right">
                                <div className="text-green-400 font-bold font-mono">{score.score}</div>
                                <div className="text-xs text-gray-500">Lvl {score.level}</div>
                            </div>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
}
