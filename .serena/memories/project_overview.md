# プロジェクト概要

## プロジェクト名
my-pomodoro

## プロジェクトの目的
ポモドーロタイマーアプリケーション（Next.js ベース）

## 技術スタック

### フロントエンド
- **Next.js 15.4.5** (App Router)
- **React 19.1.0**
- **TypeScript 5**

### 開発ツール
- ESLint (Next.js 推奨設定)
- Next.js built-in linting

### フォント
- Geist Sans / Geist Mono (Vercel 公式フォント)

## プロジェクト構造
```
my-pomodoro/
├── src/
│   └── app/
│       ├── page.tsx          # メインページ
│       ├── layout.tsx        # ルートレイアウト
│       ├── globals.css       # グローバルスタイル
│       ├── page.module.css   # ページ固有のスタイル
│       └── favicon.ico
├── public/                   # 静的ファイル
├── package.json
├── tsconfig.json
├── eslint.config.mjs
├── next.config.ts
├── CLAUDE.md                # Claude Code 向けガイダンス
└── README.md
```

## 現在の状態
- create-next-app で生成されたデフォルトの Next.js アプリケーション
- まだポモドーロタイマーの機能は実装されていない
- App Router パターンを使用