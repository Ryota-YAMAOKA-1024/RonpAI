import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router";
import { Button } from "../components/ui/button";
import { Textarea } from "../components/ui/textarea";
import { Mic, Send, ArrowLeft } from "lucide-react";

interface Message {
  role: "user" | "ai";
  content: string;
  id?: string;
}

const API_BASE = "/api";

async function fetchTopics(): Promise<string[]> {
  const res = await fetch(`${API_BASE}/topics/suggest`, { method: "POST" });
  if (!res.ok) throw new Error("Failed to fetch topics");
  const data = await res.json();
  return data.topics;
}

async function sendChatMessage(
  topic: string,
  messages: Message[],
  angerLevel: number
): Promise<{ response: string; anger_level: number; won: boolean }> {
  const res = await fetch(`${API_BASE}/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ topic, messages, anger_level: angerLevel }),
  });
  if (!res.ok) throw new Error("Failed to send message");
  return res.json();
}

export function Chat() {
  const navigate = useNavigate();

  const [topic, setTopic] = useState<string>("");
  const [topicDecided, setTopicDecided] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "ai",
      content: "話したい話題はある？それともぼくからいくつか提案しようか？",
      id: "init",
    },
  ]);
  const [input, setInput] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const [angerLevel, setAngerLevel] = useState(0);
  const [suggestedTopics, setSuggestedTopics] = useState<string[]>([]);
  const [showTopicSuggestions, setShowTopicSuggestions] = useState(false);
  const [isAITyping, setIsAITyping] = useState(false);
  const [isLoadingTopics, setIsLoadingTopics] = useState(false);

  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const [headerH, setHeaderH] = useState(48);
  const [footerH, setFooterH] = useState(64);
  const headerRef = useRef<HTMLElement>(null);
  const footerRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);

  // ヘッダー・フッターの高さを計測
  useEffect(() => {
    const measure = () => {
      if (headerRef.current) setHeaderH(headerRef.current.offsetHeight);
      if (footerRef.current) setFooterH(footerRef.current.offsetHeight);
    };
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, []);

  // キーボード追従（iOS visualViewport API）
  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return;
    const handleViewport = () => {
      // offsetTop を使わない — iOS が勝手にスクロールしてもキーボード高さは変わらない
      const kbh = Math.round(window.innerHeight - vv.height);
      setKeyboardHeight(Math.max(0, kbh));
      // iOS がページごとスクロールするのを即座に戻す
      requestAnimationFrame(() => window.scrollTo(0, 0));
    };
    vv.addEventListener("resize", handleViewport);
    vv.addEventListener("scroll", handleViewport);
    return () => {
      vv.removeEventListener("resize", handleViewport);
      vv.removeEventListener("scroll", handleViewport);
    };
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, keyboardHeight]);

  useEffect(() => {
    if ("SpeechRecognition" in window || "webkitSpeechRecognition" in window) {
      const SpeechRecognition =
        (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.lang = "ja-JP";
      recognitionRef.current.continuous = false;
      recognitionRef.current.interimResults = false;

      recognitionRef.current.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        setInput(transcript);
        setIsRecording(false);
      };

      recognitionRef.current.onerror = () => setIsRecording(false);
      recognitionRef.current.onend = () => setIsRecording(false);
    }
  }, []);

  const toggleListening = () => {
    if (!recognitionRef.current) return;
    if (isRecording) {
      recognitionRef.current.stop();
      setIsRecording(false);
    } else {
      setIsRecording(true);
      recognitionRef.current.start();
    }
  };

  const handleTopicSelection = async (selectedTopic: string) => {
    setTopic(selectedTopic);
    setTopicDecided(true);
    setShowTopicSuggestions(false);

    const userMsg: Message = { role: "user", content: selectedTopic, id: Date.now().toString() };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setIsAITyping(true);

    try {
      const result = await sendChatMessage(selectedTopic, newMessages, 0);
      setMessages((prev: Message[]) => [
        ...prev,
        { role: "ai", content: result.response, id: Date.now().toString() },
      ]);
      setAngerLevel(result.anger_level);
    } catch {
      setMessages((prev: Message[]) => [
        ...prev,
        {
          role: "ai",
          content: `「${selectedTopic}」ね。面白い。それじゃあ、君の意見を聞かせてもらおうか。`,
          id: Date.now().toString(),
        },
      ]);
    } finally {
      setIsAITyping(false);
    }
  };

  const handleRequestTopics = async (userInput: string) => {
    const userMsg: Message = { role: "user", content: userInput, id: Date.now().toString() };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setIsLoadingTopics(true);
    setIsAITyping(true);

    try {
      const topics = await fetchTopics();
      setSuggestedTopics(topics);
      setShowTopicSuggestions(true);
      setMessages((prev: Message[]) => [
        ...prev,
        {
          role: "ai",
          content: "いいよ。じゃあ、この 3 つから選んでみて。",
          id: Date.now().toString(),
        },
      ]);
    } catch {
      setMessages((prev: Message[]) => [
        ...prev,
        {
          role: "ai",
          content: "ちょっとトピックが思いつかないな。自分で話したいことを言ってみて。",
          id: Date.now().toString(),
        },
      ]);
    } finally {
      setIsAITyping(false);
      setIsLoadingTopics(false);
    }
  };

  const handleSendMessage = async () => {
    if (!input.trim() || isAITyping) return;

    if (!topicDecided) {
      const lowerInput = input.toLowerCase();
      const wantsTopics =
        lowerInput.includes("提案") ||
        lowerInput.includes("いくつか") ||
        lowerInput.includes("教え") ||
        lowerInput.includes("候補");

      if (wantsTopics) {
        await handleRequestTopics(input);
        return;
      }

      await handleTopicSelection(input);
      setInput("");
      return;
    }

    const userMsg: Message = { role: "user", content: input, id: Date.now().toString() };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput("");
    setIsAITyping(true);

    try {
      const result = await sendChatMessage(topic, newMessages, angerLevel);
      const newAngerLevel = Math.max(angerLevel, result.anger_level);
      setAngerLevel(newAngerLevel);
      setMessages((prev: Message[]) => [
        ...prev,
        { role: "ai", content: result.response, id: Date.now().toString() },
      ]);

      if (result.won || newAngerLevel >= 3) {
        const currentCount = parseInt(localStorage.getItem("ronpa_win_count") || "0");
        const newCount = currentCount + 1;
        const aiMsg: Message = { role: "ai", content: result.response, id: Date.now().toString() };
        const finalMessages = [...newMessages, aiMsg];
        const sessionId = `${Date.now()}-${Math.random()}`;
        setTimeout(() => {
          navigate("/result", {
            state: {
              topic,
              messageCount: Math.ceil(newMessages.length / 2),
              newWinCount: newCount,
              messages: finalMessages,
              sessionId,
            },
          });
        }, 5000);
      }
    } catch {
      setMessages((prev: Message[]) => [
        ...prev,
        {
          role: "ai",
          content: "エラーが発生した。もう一度試してみて。",
          id: Date.now().toString(),
        },
      ]);
    } finally {
      setIsAITyping(false);
    }
  };

  return (
    <>
      {/* ヘッダー — 常に画面上端に固定 */}
      <header
        ref={headerRef}
        className="fixed top-0 inset-x-0 z-20 bg-white flex justify-between items-center p-3 md:p-6 border-b border-gray-100"
      >
        <button
          onClick={() => navigate("/")}
          className="p-2 hover:bg-gray-50 rounded-lg transition-colors"
          aria-label="戻る"
        >
          <ArrowLeft className="w-5 h-5 md:w-6 md:h-6" />
        </button>
        <h1 className="text-base md:text-lg font-semibold">RonpAI</h1>
        <div className="w-9 md:w-10"></div>
      </header>

      {/* メッセージエリア — ヘッダーとフッターの間をスクロール */}
      <div
        className="fixed inset-x-0 overflow-y-auto p-3 md:p-6"
        style={{ top: headerH, bottom: footerH + keyboardHeight }}
      >
        <div className="max-w-3xl mx-auto space-y-3 md:space-y-4">
          {messages.map((message, index) => (
            <div
              key={message.id || `message-${index}`}
              className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[85%] md:max-w-[75%] rounded-3xl px-4 md:px-6 py-3 md:py-4 ${
                  message.role === "user"
                    ? "bg-black text-white"
                    : "bg-gray-100 text-black"
                }`}
              >
                <p className="whitespace-pre-wrap text-sm md:text-base">{message.content}</p>
              </div>
            </div>
          ))}

          {isAITyping && (
            <div className="flex justify-start">
              <div className="bg-gray-100 rounded-3xl px-4 md:px-6 py-3 md:py-4">
                <div className="flex gap-1">
                  {[0, 150, 300].map((delay) => (
                    <div
                      key={delay}
                      className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                      style={{ animationDelay: `${delay}ms` }}
                    />
                  ))}
                </div>
              </div>
            </div>
          )}

          {showTopicSuggestions && !isLoadingTopics && (
            <div className="flex justify-start">
              <div className="flex flex-col gap-2 max-w-[85%] md:max-w-[75%]">
                {suggestedTopics.map((t, i) => (
                  <button
                    key={i}
                    onClick={() => handleTopicSelection(t)}
                    className="text-left px-4 py-3 bg-white border border-gray-200 rounded-2xl text-sm hover:bg-gray-50 transition-colors"
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* 入力エリア — 常にキーボードの真上に固定 */}
      <div
        ref={footerRef}
        className="fixed inset-x-0 z-20 bg-white border-t border-gray-100 p-3 md:p-6"
        style={{ bottom: keyboardHeight }}
      >
        <div className="max-w-3xl mx-auto flex gap-2 md:gap-3 items-end">
          <Button
            onClick={toggleListening}
            variant="outline"
            size="icon"
            className={`rounded-full flex-shrink-0 w-10 h-10 md:w-12 md:h-12 ${
              isRecording
                ? "bg-red-50 border-red-500 hover:bg-red-100"
                : "border-gray-200 hover:bg-gray-50"
            }`}
            aria-label={isRecording ? "録音停止" : "音声入力"}
          >
            <Mic
              className={`w-4 h-4 md:w-5 md:h-5 ${isRecording ? "text-red-500" : "text-gray-600"}`}
            />
          </Button>

          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                e.preventDefault();
                handleSendMessage();
              }
            }}
            placeholder="メッセージを入力..."
            className="resize-none border-0 bg-gray-100 rounded-3xl focus-visible:ring-0 focus-visible:ring-offset-0"
            style={{ fontSize: "16px" }}
            rows={1}
          />

          <Button
            onClick={handleSendMessage}
            size="icon"
            disabled={!input.trim() || isAITyping}
            className="rounded-full bg-black hover:bg-gray-800 disabled:opacity-50 flex-shrink-0 w-10 h-10 md:w-12 md:h-12"
            aria-label="送信"
          >
            <Send className="w-4 h-4 md:w-5 md:h-5" />
          </Button>
        </div>
        {isRecording && (
          <p className="text-sm text-center text-gray-500 mt-2">録音中...</p>
        )}
      </div>
    </>
  );
}
