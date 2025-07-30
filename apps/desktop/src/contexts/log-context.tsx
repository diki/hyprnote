import { createContext, useContext, useState, ReactNode } from "react";

interface LogEntry {
  id: string;
  timestamp: Date;
  level: "info" | "warn" | "error";
  message: string;
  data?: any;
}

interface LogContextType {
  logs: LogEntry[];
  addLog: (
    level: "info" | "warn" | "error",
    message: string,
    data?: any
  ) => void;
  clearLogs: () => void;
}

const LogContext = createContext<LogContextType | undefined>(undefined);

export function LogProvider({ children }: { children: ReactNode }) {
  const [logs, setLogs] = useState<LogEntry[]>([]);

  const addLog = (
    level: "info" | "warn" | "error",
    message: string,
    data?: any
  ) => {
    const newLog: LogEntry = {
      id: Date.now().toString(),
      timestamp: new Date(),
      level,
      message,
      data,
    };

    setLogs((prev) => [...prev, newLog]);

    // Also log to console for development
    if (level === "error") {
      console.error(`[CHAT DEBUG] ${message}`, data);
    } else if (level === "warn") {
      console.warn(`[CHAT DEBUG] ${message}`, data);
    } else {
      console.log(`[CHAT DEBUG] ${message}`, data);
    }
  };

  const clearLogs = () => {
    setLogs([]);
  };

  return (
    <LogContext.Provider value={{ logs, addLog, clearLogs }}>
      {children}
    </LogContext.Provider>
  );
}

export function useLog() {
  const context = useContext(LogContext);
  if (context === undefined) {
    throw new Error("useLog must be used within a LogProvider");
  }
  return context;
}
