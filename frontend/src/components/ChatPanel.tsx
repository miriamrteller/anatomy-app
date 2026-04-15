/**
 * ChatPanel Component (Redesigned)
 * 
 * Layout: Input form at bottom, response display grows upward as message streams in
 * Features:
 * - Flexible height (grows with content)
 * - Response expands as tokens arrive
 * - Input at bottom
 * - Expandable history dropdown
 * - Clear button
 */

import { useState } from 'react'
import { useChat } from '../hooks/useChat'

export function ChatPanel() {
  const { response, isLoading, error, history, send, cancel, clear } = useChat()
  const [input, setInput] = useState('')
  const [isExpanded, setIsExpanded] = useState(false)

  /**
   * Handle form submission
   * Validates input, sends question, clears input
   */
  const handleSend = async () => {
    if (!input.trim()) return

    try {
      await send(input)
      setInput('')
    } catch (err) {
      console.error('Failed to send question:', err)
    }
  }

  /**
   * Handle Enter key in input
   * Allows quick submission without clicking button
   */
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey && !isLoading) {
      e.preventDefault()
      handleSend()
    }
  }

  /**
   * Handle clear - reset everything
   */
  const handleClear = () => {
    clear()
    setInput('')
    setIsExpanded(false)
  }

  return (
    <div className="w-full bg-white border-b border-gray-200 flex flex-col p-4 gap-3">
      {/* ===== HEADER ===== */}
      <div className="flex items-center justify-between flex-shrink-0">
        <h2 className="text-lg font-semibold text-gray-800">Chat</h2>
        <div className="text-sm text-gray-500">
          {history.length > 0 && `${history.length} message${history.length !== 1 ? 's' : ''}`}
        </div>
      </div>

      {/* ===== RESPONSE DISPLAY (Grows with content) ===== */}
      {(response || isLoading || error) && (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 overflow-y-auto max-h-80">
          {/* Error state */}
          {error && (
            <div className="text-sm text-red-600 font-medium">
              <span>❌ Error: </span>
              <span>{error}</span>
            </div>
          )}

          {/* Loading state */}
          {isLoading && !response && !error && (
            <div className="text-sm text-gray-400 italic">
              <span>⏳ Waiting for response...</span>
            </div>
          )}

          {/* Response text */}
          {response && (
            <div className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">
              {response}
              {isLoading && <span className="animate-pulse">█</span>}
            </div>
          )}
        </div>
      )}

      {/* ===== HISTORY DROPDOWN ===== */}
      {history.length > 0 && (
        <details
          open={isExpanded}
          onToggle={(e) => setIsExpanded(e.currentTarget.open)}
          className="border border-gray-200 rounded-lg flex-shrink-0 max-h-40 overflow-hidden"
        >
          <summary className="cursor-pointer px-3 py-2 bg-gray-50 hover:bg-gray-100 text-sm font-medium text-gray-700 select-none">
            📋 Last {history.length} Response{history.length !== 1 ? 's' : ''} {isExpanded ? '▼' : '▶'}
          </summary>

          <div className="overflow-y-auto divide-y divide-gray-200 max-h-36">
            {history.map((message, idx) => (
              <div key={message.id} className="p-2 hover:bg-gray-50 text-xs">
                {/* Question */}
                <div className="font-semibold text-blue-600 mb-1">
                  Q{idx + 1}: {message.question}
                </div>

                {/* Response preview (truncated) */}
                <div className="text-gray-600 line-clamp-2">
                  {message.response}
                </div>

                {/* Metadata */}
                <div className="text-gray-400 mt-1 flex gap-2">
                  <span>{new Date(message.timestamp).toLocaleTimeString()}</span>
                  <span>•</span>
                  <span>{message.duration}ms</span>
                  <span>•</span>
                  <span>{message.svgPathIds.length} struct.</span>
                </div>
              </div>
            ))}
          </div>
        </details>
      )}

      {/* ===== INPUT FORM (Always at bottom) ===== */}
      <div className="flex gap-2 flex-shrink-0">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Ask about anatomy..."
          disabled={isLoading}
          className="flex-1 border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:text-gray-500"
        />
        {isLoading ? (
          <>
            <button
              onClick={cancel}
              className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded text-sm font-medium transition"
            >
              Cancel
            </button>
          </>
        ) : (
          <button
            onClick={handleSend}
            disabled={!input.trim()}
            className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded text-sm font-medium transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Send
          </button>
        )}
        <button
          onClick={handleClear}
          className="bg-gray-300 hover:bg-gray-400 text-gray-800 px-3 py-2 rounded text-sm font-medium transition"
        >
          Clear
        </button>
      </div>
    </div>
  )
}
