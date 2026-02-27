import React from 'react';

interface RLControlPanelProps {
    onSpawn: () => void;
    onSetTargetMode: () => void;
    isTargetMode: boolean;
    stats: {
        episode: number;
        totalReward: number;
        epsilon: number;
        learningRate: number;
        discountFactor: number;
    } | null;
    onUpdateParams: (params: { epsilon?: number, learningRate?: number, discountFactor?: number }) => void;
}

export const RLControlPanel: React.FC<RLControlPanelProps> = ({
    onSpawn,
    onSetTargetMode,
    isTargetMode,
    stats,
    onUpdateParams
}) => {
    return (
        <div className="w-80 bg-gray-900 border-l border-gray-800 flex flex-col text-white">
            <div className="p-4 border-b border-gray-800 bg-gray-800">
                <h2 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-400 to-purple-400">
                    AI Sandbox
                </h2>
                <div className="text-sm text-gray-400 mt-1">Train RL Agents in Real-Time</div>
            </div>

            <div className="p-4 space-y-6 flex-1 overflow-y-auto">
                {/* Actions */}
                <div className="space-y-3">
                    <h3 className="text-sm font-semibold text-gray-300 uppercase tracking-wider">Controls</h3>
                    <button
                        onClick={onSpawn}
                        className="w-full bg-indigo-600 hover:bg-indigo-700 transition px-4 py-2 rounded font-medium shadow-lg"
                    >
                        Spawn Q-Bot
                    </button>
                    <button
                        onClick={onSetTargetMode}
                        className={`w-full transition px-4 py-2 rounded font-medium shadow-lg ${isTargetMode ? 'bg-amber-500 hover:bg-amber-600 text-black' : 'bg-gray-700 hover:bg-gray-600'}`}
                    >
                        {isTargetMode ? 'Click Canvas to Set Target...' : 'Set Destination Flag'}
                    </button>
                </div>

                {/* Hyperparameters */}
                <div className="space-y-4 pt-4 border-t border-gray-800">
                    <h3 className="text-sm font-semibold text-gray-300 uppercase tracking-wider">Hyperparameters</h3>

                    <div>
                        <div className="flex justify-between text-xs mb-1 text-gray-400">
                            <span>Exploration (Epsilon)</span>
                            <span>{stats?.epsilon.toFixed(3) || '1.000'}</span>
                        </div>
                        <input
                            type="range"
                            min="0" max="1" step="0.01"
                            value={stats?.epsilon || 1}
                            onChange={(e) => onUpdateParams({ epsilon: parseFloat(e.target.value) })}
                            className="w-full accent-indigo-500"
                        />
                    </div>

                    <div>
                        <div className="flex justify-between text-xs mb-1 text-gray-400">
                            <span>Learning Rate (Alpha)</span>
                            <span>{stats?.learningRate.toFixed(2) || '0.10'}</span>
                        </div>
                        <input
                            type="range"
                            min="0.01" max="1" step="0.01"
                            value={stats?.learningRate || 0.1}
                            onChange={(e) => onUpdateParams({ learningRate: parseFloat(e.target.value) })}
                            className="w-full accent-indigo-500"
                        />
                    </div>

                    <div>
                        <div className="flex justify-between text-xs mb-1 text-gray-400">
                            <span>Discount Factor (Gamma)</span>
                            <span>{stats?.discountFactor.toFixed(2) || '0.90'}</span>
                        </div>
                        <input
                            type="range"
                            min="0.1" max="0.99" step="0.01"
                            value={stats?.discountFactor || 0.9}
                            onChange={(e) => onUpdateParams({ discountFactor: parseFloat(e.target.value) })}
                            className="w-full accent-indigo-500"
                        />
                    </div>
                </div>

                {/* Live Training Stats */}
                <div className="space-y-3 pt-4 border-t border-gray-800">
                    <h3 className="text-sm font-semibold text-gray-300 uppercase tracking-wider">Live Telemetry</h3>

                    {stats ? (
                        <div className="grid grid-cols-2 gap-3">
                            <div className="bg-gray-800 p-3 rounded shadow-inner border border-gray-700">
                                <div className="text-xs text-gray-400">Episode</div>
                                <div className="text-2xl font-bold text-indigo-400">{stats.episode}</div>
                            </div>
                            <div className="bg-gray-800 p-3 rounded shadow-inner border border-gray-700">
                                <div className="text-xs text-gray-400">Reward</div>
                                <div className={`text-2xl font-bold ${stats.totalReward < 0 ? 'text-red-400' : 'text-green-400'}`}>
                                    {stats.totalReward}
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="text-sm text-gray-500 text-center py-4 bg-gray-800 rounded border border-gray-700 border-dashed">
                            Spawn a bot to see telemetry
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
