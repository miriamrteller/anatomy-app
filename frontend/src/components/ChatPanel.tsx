/**
 * ChatPanel Component
 *
 * Features:
 * - Input and buttons at top
 * - Response display scrollable in middle
 * - History scrollable at bottom
 * - Adjustable width
 */

import { useState } from "react";
import { useChat } from "../hooks/useChat";

interface ChatPanelProps {
  isExpanded?: boolean;
  onToggleWidth?: () => void;
}

export function ChatPanel({ isExpanded = false, onToggleWidth }: ChatPanelProps) {
  const { response, isLoading, error, history, send, cancel, clear } =
    useChat();
  const [input, setInput] = useState("");
  const [isHistoryExpanded, setIsHistoryExpanded] = useState(false);
  const [isResponseMinimized, setIsResponseMinimized] = useState(false);

  const handleSend = async () => {
    if (!input.trim()) return;

    try {
      await send(input);
      setInput("");
    } catch (err) {
      console.error("Failed to send question:", err);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey && !isLoading) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleClear = () => {
    clear();
    setInput("");
    setIsHistoryExpanded(false);
  };

  return (
    <div className="bg-white rounded-lg shadow flex flex-col h-full overflow-hidden p-4 gap-3">
      {/* Header and Input - Top */}
      <div className="flex-shrink-0 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-800">Chat</h2>
          {onToggleWidth && (
            <button
              onClick={onToggleWidth}
              className="text-xs font-medium text-gray-600 hover:text-blue-600 transition"
              title="Toggle width"
            >
              ↔
            </button>
          )}
        </div>

        <div className="flex gap-2">
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
            <button
              onClick={cancel}
              className="bg-red-500 hover:bg-red-600 text-white px-3 py-2 rounded text-sm font-medium transition flex-shrink-0"
            >
              Stop
            </button>
          ) : (
            <button
              onClick={handleSend}
              disabled={!input.trim()}
              className="bg-blue-500 hover:bg-blue-600 text-white px-3 py-2 rounded text-sm font-medium transition disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0"
            >
              Send
            </button>
          )}
          <button
            onClick={handleClear}
            className="bg-gray-300 hover:bg-gray-400 text-gray-800 px-3 py-2 rounded text-sm font-medium transition flex-shrink-0"
          >
            Clear
          </button>
        </div>
      </div>

      {/* Response Display - Middle (scrollable) */}
      {(response || isLoading || error) && (
        <div className={`flex flex-col border border-gray-200 rounded-lg overflow-hidden transition-all duration-200 ${
          isResponseMinimized ? 'flex-shrink-0 h-auto' : 'flex-1 min-h-0'
        }`}>
          <div className="bg-gray-50 px-3 py-2 flex items-center justify-between flex-shrink-0 border-b">
            <span className="text-xs font-medium text-gray-600">Answer:</span>
            <button
              onClick={() => setIsResponseMinimized(!isResponseMinimized)}
              className="text-xs text-gray-600 hover:text-blue-600 transition"
              title="Toggle response"
            >
              {isResponseMinimized ? '▼' : '▲'}
            </button>
          </div>

          {!isResponseMinimized && (
            <div className="flex-1 bg-gray-50 p-3 overflow-y-auto">
              {error && (
                <div className="text-sm text-red-600 font-medium">
                  <span>❌ Error: </span>
                  <span>{error}</span>
                </div>
              )}

              {isLoading && !response && !error && (
                <div className="text-sm text-gray-400 italic">
                  <span>⏳ Waiting for response...</span>
                </div>
              )}

              {response && (
                <div className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">
                  {response}
                  {isLoading && <span className="animate-pulse">█</span>}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* History - Bottom (scrollable) */}
      {history.length > 0 && (
        <div className="flex-shrink-0">
          <details
            open={isHistoryExpanded}
            onToggle={(e) => setIsHistoryExpanded(e.currentTarget.open)}
            className="border border-gray-200 rounded-lg overflow-hidden"
          >
            <summary className="cursor-pointer px-3 py-2 bg-gray-50 hover:bg-gray-100 text-sm font-medium text-gray-700 select-none">
              📋 History ({history.length}) {isHistoryExpanded ? "▼" : "▶"}
            </summary>

            <div className="overflow-y-auto divide-y divide-gray-200 max-h-40">
              {history.map((message, idx) => (
                <div key={message.id} className="p-2 hover:bg-gray-50 text-xs">
                  <div className="font-semibold text-blue-600 mb-1">
                    Q{idx + 1}: {message.question}
                  </div>

                  <div className="text-gray-600 line-clamp-2">
                    {message.response}
                  </div>

                  <div className="text-gray-400 mt-1 flex gap-2 text-xs">
                    <span>
                      {new Date(message.timestamp).toLocaleTimeString()}
                    </span>
                    <span>•</span>
                    <span>{message.duration}ms</span>
                  </div>
                </div>
              ))}
            </div>
          </details>
        </div>
      )}
    </div>
  );
}
