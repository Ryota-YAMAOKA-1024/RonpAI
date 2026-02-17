import { useState, useEffect } from "react";
import { useNavigate } from "react-router";
import { ArrowLeft } from "lucide-react";

interface Message {
  role: "user" | "ai";
  content: string;
}

interface HistoryEntry {
  topic: string;
  messageCount: number;
  messages: Message[];
  date: string;
}

export function History() {
  const navigate = useNavigate();
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [selected, setSelected] = useState<HistoryEntry | null>(null);

  useEffect(() => {
    const data = JSON.parse(localStorage.getItem("ronpa_history") || "[]");
    setHistory(data);
  }, []);

  const formatDate = (iso: string) => {
    const d = new Date(iso);
    return `${d.getMonth() + 1}/${d.getDate()} ${d.getHours()}:${String(d.getMinutes()).padStart(2, "0")}`;
  };

  if (selected) {
    return (
      <div className="fixed inset-0 flex flex-col bg-white">
        <header className="flex items-center p-3 md:p-6 border-b border-gray-100">
          <button
            onClick={() => setSelected(null)}
            className="p-2 hover:bg-gray-50 rounded-lg transition-colors"
            aria-label="戻る"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="ml-3 text-sm font-semibold truncate">{selected.topic}</h1>
        </header>

        <div className="flex-1 overflow-y-auto p-3 md:p-6">
          <div className="max-w-3xl mx-auto space-y-3">
            {selected.messages.map((msg, i) => (
              <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                <div
                  className={`max-w-[85%] md:max-w-[75%] rounded-3xl px-4 md:px-6 py-3 md:py-4 ${
                    msg.role === "user" ? "bg-black text-white" : "bg-gray-100 text-black"
                  }`}
                >
                  <p className="whitespace-pre-wrap text-sm md:text-base">{msg.content}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 flex flex-col bg-white">
      <header className="flex items-center p-3 md:p-6 border-b border-gray-100">
        <button
          onClick={() => navigate("/")}
          className="p-2 hover:bg-gray-50 rounded-lg transition-colors"
          aria-label="戻る"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="ml-3 text-base font-semibold">対話履歴</h1>
      </header>

      <div className="flex-1 overflow-y-auto">
        {history.length === 0 ? (
          <p className="text-center text-gray-400 text-sm mt-16">まだ履歴がありません</p>
        ) : (
          <ul className="divide-y divide-gray-100">
            {history.map((entry, i) => (
              <li key={i}>
                <button
                  onClick={() => setSelected(entry)}
                  className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-gray-50 transition-colors"
                >
                  <span className="text-sm flex-1 mr-4 truncate">{entry.topic}</span>
                  <span className="text-xs text-gray-400 whitespace-nowrap">
                    {entry.messageCount}回 · {formatDate(entry.date)}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
