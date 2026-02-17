import { useEffect } from "react";
import { useLocation, useNavigate } from "react-router";
import { Button } from "../components/ui/button";
import { Home, RotateCcw } from "lucide-react";

export function Result() {
  const location = useLocation();
  const navigate = useNavigate();
  const topic = location.state?.topic || "不明なトピック";
  const messageCount = location.state?.messageCount || 0;
  const newWinCount = location.state?.newWinCount;
  const messages = location.state?.messages || [];
  const sessionId = location.state?.sessionId;

  useEffect(() => {
    if (!sessionId) return;
    const savedId = localStorage.getItem("ronpa_last_session");
    if (savedId === sessionId) return;
    localStorage.setItem("ronpa_last_session", sessionId);

    if (newWinCount !== undefined) {
      localStorage.setItem("ronpa_win_count", newWinCount.toString());
    }
    const prev = JSON.parse(localStorage.getItem("ronpa_history") || "[]");
    const entry = { topic, messageCount, messages, date: new Date().toISOString() };
    localStorage.setItem("ronpa_history", JSON.stringify([entry, ...prev].slice(0, 50)));
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center bg-white p-4">
      <div className="max-w-2xl w-full space-y-8 md:space-y-12 text-center">
        <div className="space-y-4 md:space-y-6">
          <div className="space-y-3 md:space-y-4">
            <h1 className="text-4xl md:text-6xl font-bold">おめでとう</h1>
            <p className="text-lg md:text-2xl text-gray-600">
              AIを論破できました！
            </p>
          </div>
        </div>

        <div className="space-y-4 md:space-y-6 py-6 md:py-8 border-y border-gray-200">
          <div className="space-y-2">
            <p className="text-xs md:text-sm text-gray-400">お題</p>
            <p className="text-base md:text-xl">{topic}</p>
          </div>
          <div className="space-y-2">
            <p className="text-xs md:text-sm text-gray-400">やり取り</p>
            <p className="text-base md:text-xl">{messageCount}回</p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Button
            onClick={() => navigate("/")}
            variant="outline"
            size="lg"
            className="rounded-full px-8 border-black hover:bg-gray-50"
          >
            <Home className="w-4 h-4 mr-2" />
            ホーム
          </Button>
          <Button
            onClick={() => navigate("/chat", { state: { topic } })}
            size="lg"
            className="rounded-full px-8 bg-black hover:bg-gray-800"
          >
            <RotateCcw className="w-4 h-4 mr-2" />
            もう一度
          </Button>
        </div>
      </div>
    </div>
  );
}
