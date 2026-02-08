import { Star, MapPin, Clock, Trophy } from 'lucide-react'
import { motion } from 'framer-motion'

export default function ResultsList({ results, bestMatch, onConfirm }) {
    return (
        <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
            <div className="p-4 border-b border-gray-100">
                <h3 className="font-semibold text-gray-900">Ranked Results</h3>
                <p className="text-xs text-gray-500">Based on your priorities</p>
            </div>

            <div className="divide-y divide-gray-100 max-h-96 overflow-y-auto">
                {results.map((result, index) => {
                    const isBest = bestMatch?.provider_id === result.provider_id

                    return (
                        <motion.div
                            key={result.provider_id}
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: index * 0.1 }}
                            className={`p-4 ${isBest ? 'bg-success/5' : ''}`}
                        >
                            <div className="flex items-start justify-between mb-2">
                                <div className="flex items-center gap-2">
                                    {isBest && (
                                        <span className="flex items-center gap-1 px-2 py-0.5 bg-success text-white text-xs font-medium rounded-full">
                                            <Trophy className="w-3 h-3" />
                                            Best Match
                                        </span>
                                    )}
                                    <span className="text-xs text-gray-400">#{index + 1}</span>
                                </div>
                            </div>

                            <p className="font-medium text-gray-900 mb-1">{result.provider_name}</p>

                            <div className="flex items-center gap-3 text-xs text-gray-500 mb-2">
                                <span className="flex items-center gap-1">
                                    <Star className="w-3 h-3 text-warning" />
                                    {result.rating?.toFixed(1)}
                                </span>
                                <span className="flex items-center gap-1">
                                    <MapPin className="w-3 h-3" />
                                    {result.distance_miles?.toFixed(1)} mi
                                </span>
                                {result.offered_slot && (
                                    <span className="flex items-center gap-1 text-success">
                                        <Clock className="w-3 h-3" />
                                        {new Date(result.offered_slot.start).toLocaleString()}
                                    </span>
                                )}
                            </div>

                            {/* Score Bar */}
                            <div className="mb-3">
                                <div className="flex justify-between text-xs mb-1">
                                    <span className="text-gray-500">Match Score</span>
                                    <span className="font-medium text-primary">{Math.round(result.total_score * 100)}%</span>
                                </div>
                                <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                                    <div
                                        className="h-full bg-gradient-to-r from-primary to-teal"
                                        style={{ width: `${result.total_score * 100}%` }}
                                    />
                                </div>
                            </div>

                            {/* Confirm Button */}
                            {result.offered_slot && (
                                <button
                                    onClick={() => onConfirm(result.provider_id)}
                                    className={`btn w-full text-sm ${isBest ? 'btn-success' : 'btn-primary'
                                        }`}
                                >
                                    {isBest ? 'Confirm Best Match' : 'Select This Provider'}
                                </button>
                            )}
                        </motion.div>
                    )
                })}

                {results.length === 0 && (
                    <div className="p-8 text-center">
                        <p className="text-gray-500 text-sm">
                            Results will appear as calls complete
                        </p>
                    </div>
                )}
            </div>
        </div>
    )
}
