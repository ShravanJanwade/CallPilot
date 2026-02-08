import { useRef, useEffect } from 'react'

export default function TranscriptView({ transcript = [] }) {
    const endRef = useRef(null)

    useEffect(() => {
        endRef.current?.scrollIntoView({ behavior: 'smooth' })
    }, [transcript.length])

    if (!transcript.length) {
        return (
            <div className="text-center py-4 text-xs text-slate-400">
                Transcript will appear after the call ends...
            </div>
        )
    }

    return (
        <div className="space-y-1.5 max-h-48 overflow-y-auto p-2 scrollbar-thin">
            {transcript.map((msg, i) => {
                const isAgent = msg.role === 'agent' || msg.role === 'assistant'
                return (
                    <div key={i} className={`flex ${isAgent ? 'justify-start' : 'justify-end'}`}>
                        <div className={`max-w-[85%] px-3 py-1.5 text-xs leading-relaxed ${isAgent
                                ? 'bg-sky-50 text-sky-800 rounded-2xl rounded-bl-sm'
                                : 'bg-slate-100 text-slate-700 rounded-2xl rounded-br-sm'
                            }`}>
                            <span className="opacity-50 mr-0.5">{isAgent ? '🤖' : '👤'}</span>
                            {msg.message}
                            {msg.time > 0 && (
                                <span className="ml-2 text-[10px] opacity-40">
                                    {Math.floor(msg.time / 60)}:{String(Math.floor(msg.time % 60)).padStart(2, '0')}
                                </span>
                            )}
                        </div>
                    </div>
                )
            })}
            <div ref={endRef} />
        </div>
    )
}