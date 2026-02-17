import { useState, useEffect } from "react";
import { useNavigate } from "react-router";
import { Button } from "../components/ui/button";
import { Menu, X } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "../components/ui/sheet";

export function Home() {
  const navigate = useNavigate();
  const [winCount, setWinCount] = useState(0);
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  useEffect(() => {
    const count = localStorage.getItem("ronpa_win_count");
    if (count) {
      setWinCount(parseInt(count));
    }
  }, []);

  const handleStartChat = () => {
    navigate("/chat");
  };

  const clearHistory = () => {
    if (confirm("論破回数をリセットしますか？")) {
      localStorage.setItem("ronpa_win_count", "0");
      setWinCount(0);
    }
  };

  return (
    <div className="fixed inset-0 flex flex-col bg-white overflow-y-auto">
      <header className="flex justify-between items-center p-4 md:p-6">
        <div className="w-10"></div>
        <div></div>
        <button
          onClick={() => setIsMenuOpen(!isMenuOpen)}
          className="p-2 hover:bg-gray-50 rounded-lg transition-colors"
          aria-label="メニュー"
        >
          {isMenuOpen ? (
            <X className="w-6 h-6" />
          ) : (
            <Menu className="w-6 h-6" />
          )}
        </button>
      </header>

      <div className="flex-1 flex items-center justify-center p-4 md:p-8">
        <div className="max-w-2xl w-full space-y-8 md:space-y-12 text-center">
          <div className="inline-block px-4 md:px-6 py-2 md:py-3 border border-gray-200 rounded-full">
            <p className="text-xs md:text-sm text-gray-600">
              論破回数: <span className="font-bold">{winCount}</span>
            </p>
          </div>

          <div className="space-y-3 md:space-y-4">
            <h1 className="text-5xl md:text-6xl font-bold tracking-tight">RonpAI</h1>
            <p className="text-sm md:text-base text-gray-400">Can you RONPA against AI？</p>
          </div>

          <div>
            <Button
              onClick={handleStartChat}
              size="lg"
              className="rounded-full px-8 md:px-12 py-5 md:py-6 text-base md:text-lg bg-black hover:bg-gray-800"
            >
              はじめる
            </Button>
          </div>
        </div>
      </div>

      <Sheet open={isMenuOpen} onOpenChange={setIsMenuOpen}>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>メニュー</SheetTitle>
            <SheetDescription>
              アプリの設定とデータ管理
            </SheetDescription>
          </SheetHeader>
          <div className="mt-8 px-4 space-y-6">
            <div className="space-y-2">
              <p className="text-sm text-gray-500">論破回数</p>
              <p className="text-3xl font-bold">{winCount}回</p>
            </div>
            <div className="pt-4 space-y-3 max-w-xs">
              <Button variant="outline" className="w-full rounded-full" onClick={() => { setIsMenuOpen(false); navigate("/history"); }}>
                対話履歴
              </Button>
              <Button variant="outline" className="w-full rounded-full" onClick={clearHistory}>
                データをリセット
              </Button>
              <Button variant="outline" className="w-full rounded-full" disabled>
                ログアウト（準備中）
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
