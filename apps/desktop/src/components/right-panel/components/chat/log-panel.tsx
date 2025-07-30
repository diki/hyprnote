import { useState } from "react";
import { useLog } from "@/contexts/log-context";

export function LogPanel() {
  const { logs, clearLogs } = useLog();
  const [isExpanded, setIsExpanded] = useState(false);

  if (logs.length === 0) {
    return null;
  }

  const formatTime = (date: Date) => {
    return (
      date.toLocaleTimeString("en-US", {
        hour12: false,
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      }) +
      "." +
      date.getMilliseconds().toString().padStart(3, "0")
    );
  };

  const getLevelColor = (level: string) => {
    switch (level) {
      case "error":
        return "text-red-600 bg-red-50";
      case "warn":
        return "text-yellow-600 bg-yellow-50";
      default:
        return "text-blue-600 bg-blue-50";
    }
  };

  return (
    <div className="border-b border-gray-200 bg-gray-50">
      <div className="flex items-center justify-between px-3 py-2">
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex items-center gap-2 text-sm font-medium text-gray-700 hover:text-gray-900"
        >
          <span className="text-xs">🐛</span>
          Debug Logs ({logs.length})
          <span
            className={`transform transition-transform ${
              isExpanded ? "rotate-90" : ""
            }`}
          >
            ▶
          </span>
        </button>
        <button
          onClick={clearLogs}
          className="text-xs text-gray-500 hover:text-gray-700 px-2 py-1 rounded hover:bg-gray-200"
        >
          Clear
        </button>
      </div>

      {isExpanded && (
        <div className="max-h-48 overflow-y-auto border-t border-gray-200 bg-white">
          {logs.map((log) => (
            <div
              key={log.id}
              className={`px-3 py-1 text-xs border-b border-gray-100 ${getLevelColor(
                log.level
              )}`}
            >
              <div className="flex items-start gap-2">
                <span className="font-mono text-gray-500 shrink-0">
                  {formatTime(log.timestamp)}
                </span>
                <span className="font-semibold uppercase shrink-0">
                  {log.level}
                </span>
                <span className="flex-1">{log.message}</span>
              </div>
              {log.data && (
                <div className="mt-1 pl-16 font-mono text-gray-600 text-xs">
                  {typeof log.data === "string"
                    ? log.data
                    : JSON.stringify(log.data, null, 2)}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
