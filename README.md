# RonpAI — 論敗

AIとディベートしてブチギレたらAIが降参してくれて「論破」したことになり、それによって「論破」することの無意味さを実感できるアプリ。

## 技術スタック

### フロントエンド
- React 18 / TypeScript
- Vite
- TailwindCSS v4
- React Router
- Radix UI
- Lucide React
- Web Speech API (音声入力 / ja-JP)

### バックエンド
- Python / FastAPI
- Google Gemini 2.5 Flash (google-genai)
- Pydantic / Uvicorn / python-dotenv

### データ永続化
- localStorage (勝利回数・対話履歴)

## セットアップ

### 1. バックエンド

```bash
cd backend
cp .env.example .env
# .env に GEMINI_API_KEY を設定

source venv/bin/activate
uvicorn main:app --reload
```

### 2. フロントエンド

```bash
cd frontend
npm run dev
```

→ http://localhost:5173 でアクセス

## ファイル構成

```
RonpAI/
├── backend/
│   ├── main.py          # FastAPI + Gemini API
│   ├── phrases.py       # 怒りフェーズ別発話パターン定義
│   ├── requirements.txt
│   └── .env             # GEMINI_API_KEY を設定
└── frontend/
    └── src/app/pages/
        ├── Home.tsx
        ├── Chat.tsx     # 怒りレベル管理・API 連携
        └── Result.tsx
```

## ゲームの仕組み

| 怒りレベル | 状態 | AI の態度 |
|-----------|------|----------|
| 0 | 冷静 | 穏やかだが見下した態度 |
| 1 | 苛立ち | 冷笑的・揚げ足取り |
| 2 | 怒り | 辛辣・挑発的 |
| 3 | 激怒 | 降参 → **論破成功** |
