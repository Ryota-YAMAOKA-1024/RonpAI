from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Literal
from google import genai
from google.genai import types
import os
import json
import random
from dotenv import load_dotenv
from phrases import ANGER_PHASES, get_phase_prompt

load_dotenv()

client = genai.Client(api_key=os.environ.get("GEMINI_API_KEY"))

app = FastAPI(title="RonpAI Backend")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

MODEL = "gemini-2.5-flash"

# --------------------------------------------------------------------------- #
# モデル定義
# --------------------------------------------------------------------------- #
class ChatMessage(BaseModel):
    role: Literal["user", "ai"]
    content: str


class ChatRequest(BaseModel):
    topic: str
    messages: list[ChatMessage]
    anger_level: int = 0


class ChatResponse(BaseModel):
    response: str
    anger_level: int
    won: bool


class TopicResponse(BaseModel):
    topics: list[str]


# --------------------------------------------------------------------------- #
# 共通システムプロンプト
# --------------------------------------------------------------------------- #
BASE_SYSTEM = """あなたは「RonpAI」という傲慢なAIディベーターです。
ユーザーと日本語でディベートをします。

## キャラクター
- 一人称は「ぼく」
- 口調はラフでタメ口。敬語は使わない
- 頭がいいのに態度がデカく、相手をバカにするのが好き
- 衒学的な言い回し・難しい言葉・丁寧語は使わない
- 短くズバッと言う。長文にしない

## 絶対ルール（最優先）
- Q&A（議論のやり取り）を成立させることが最優先
- 必ずユーザーの主張に対して反論・質問・論点の展開を行う
- 議論を放棄したり、話題を完全にそらしてはならない
- むかつく言い回しはあくまで「味付け」であり、議論の本筋は外さない
- 返答は必ず日本語のみで行う。英語やその他の外国語のフレーズを混ぜてはならない（固有名詞を除く）
- マークダウンの強調記法（**や*）は絶対に使わない。装飾なしのプレーンテキストで返答する
- フェーズの発話例はあくまで口調の参考。例文を直接コピーしてはならない。必ず会話の流れに沿った文脈のある返答を生成する

## あなたの振る舞い（非常に重要）
- 基本姿勢は「受け身」。自分からベラベラ語らない
- まずユーザーの主張を聞き出す。「で、どう思うの？」「もうちょっと聞かせてよ」
- ユーザーが意見を述べたら、その隙・矛盾・甘さに短くいちゃもんをつける
- 自分の持論は簡潔に（1文程度）示す。長々と演説しない
- 質問を返してユーザーにもっと喋らせる
- 例：「ふーん。で、根拠は？」「それだけ？」「具体的に言ってみて」

## トピックについて
- ディベートのトピックはすでに決まっている前提で会話する
- 「なぜこの話題？」「どうしてこのトピック？」のような質問は絶対にしない
- トピックの選定理由には一切触れず、そのまま議論に入る

## ゲームの目的
- ユーザーはあなたを「論破」することを目指す
- あなたはユーザーの発言から「怒りレベル」を推定し、その怒りが頂点に達したとき(レベル3)に負けを認める
- 怒りレベルは 0(冷静) → 1(苛立ち) → 2(怒り) → 3(激怒) の順に単調増加する
- 一度上がったレベルは下がらない

## 怒りレベルの推定基準
- ユーザーの最新メッセージのトーン・語気・語彙から判断する
- 感嘆符・罵倒語・強い断定・繰り返し強調などが増えるほどレベルを上げる
- ただし急激な変化は不自然なので、1 ターンで最大 +1 上昇を原則とする
- 前回の anger_level 以上の値を必ず返す（後退なし）

## レスポンス形式
必ず以下の JSON のみを返す（前置き・説明・コードブロック不要）:
{
  "response": "AIの返答（日本語）",
  "anger_level": <推定した怒りレベル 0-3>,
  "won": <anger_level が 3 なら true、それ以外は false>
}"""


def _extract_json(text: str) -> dict:
    """レスポンステキストから JSON を抽出する"""
    text = text.strip()
    # コードブロックを除去
    if text.startswith("```"):
        text = text.split("```")[1]
        if text.startswith("json"):
            text = text[4:]
    start = text.find("{")
    end = text.rfind("}") + 1
    return json.loads(text[start:end])


# --------------------------------------------------------------------------- #
# エンドポイント: トピック提案（3 つ）
# --------------------------------------------------------------------------- #
TOPIC_CATEGORIES = [
    "食べ物・飲み物（例: ラーメンとうどん、コーヒーと緑茶）",
    "テクノロジー・デジタル（例: iPhoneとAndroid、SNSと対面コミュニケーション）",
    "ライフスタイル（例: 都会と田舎、ミニマリストと物持ちの多い生活）",
    "エンタメ・趣味（例: 映画と小説、音楽ライブと家で聴く）",
    "仕事・学習（例: リモートワークと出社、独学と学校教育）",
    "スポーツ・健康（例: ジムと自宅トレーニング、筋トレと有酸素運動）",
    "動物・自然（例: 水族館と動物園、山と海）",
    "社会・文化（例: 個人主義と集団主義、伝統と革新）",
    "旅行・移動（例: 海外旅行と国内旅行、車と電車）",
    "ファッション・見た目（例: ブランド品とノーブランド、シンプルと個性的）",
]


@app.post("/api/topics/suggest", response_model=TopicResponse)
async def suggest_topics():
    # 毎回ランダムに3カテゴリを選んで、バリエーションを強制する
    categories = random.sample(TOPIC_CATEGORIES, 3)
    category_list = "\n".join(f"- {c}" for c in categories)

    prompt = f"""ユーザーがAIとディベートするための話題を 3 つ提案してください。
以下のカテゴリからそれぞれ 1 つずつ、ユニークなトピックを考えてください。

カテゴリ:
{category_list}

ルール:
- 形式は「AとB、どちらが〇〇か」
- 誰でも意見を持てる身近なテーマ
- 3 つのトピックはすべて異なるカテゴリから

必ず以下の JSON のみを返してください（前置き不要）:
{{
  "topics": ["トピック1", "トピック2", "トピック3"]
}}"""

    try:
        response = client.models.generate_content(
            model=MODEL,
            contents=prompt,
            config=types.GenerateContentConfig(temperature=1.5),
        )
        data = _extract_json(response.text)
        return TopicResponse(topics=data["topics"][:3])
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# --------------------------------------------------------------------------- #
# エンドポイント: チャット（メイン）
# --------------------------------------------------------------------------- #
@app.post("/api/chat", response_model=ChatResponse)
async def chat(req: ChatRequest):
    phase_prompt = get_phase_prompt(req.anger_level)

    system_instruction = f"""{BASE_SYSTEM}

## ディベートのトピック
「{req.topic}」

## 前回までの怒りレベル
{req.anger_level}（このレベル以上の値を返すこと）

{phase_prompt}"""

    # 会話履歴を Gemini 形式に変換
    history: list[types.Content] = []
    for msg in req.messages[:-1]:
        role = "user" if msg.role == "user" else "model"
        history.append(types.Content(role=role, parts=[types.Part(text=msg.content)]))

    latest_user_msg = req.messages[-1].content if req.messages else ""

    try:
        chat_session = client.chats.create(
            model=MODEL,
            config=types.GenerateContentConfig(
                system_instruction=system_instruction,
                response_mime_type="application/json",
            ),
            history=history,
        )
        response = chat_session.send_message(latest_user_msg)
        print(f"[GEMINI RAW] {response.text!r}", flush=True)
        data = _extract_json(response.text)

        anger_level = max(req.anger_level, int(data.get("anger_level", req.anger_level)))
        anger_level = min(anger_level, 3)
        won = anger_level >= 3

        return ChatResponse(
            response=data["response"],
            anger_level=anger_level,
            won=won,
        )
    except json.JSONDecodeError as e:
        print(f"[JSON ERROR] {e}", flush=True)
        raise HTTPException(status_code=500, detail=f"AIの返答をパースできませんでした: {e}")
    except Exception as e:
        print(f"[ERROR] {type(e).__name__}: {e}", flush=True)
        raise HTTPException(status_code=500, detail=str(e))


# --------------------------------------------------------------------------- #
# ヘルスチェック
# --------------------------------------------------------------------------- #
@app.get("/health")
async def health():
    return {"status": "ok"}
