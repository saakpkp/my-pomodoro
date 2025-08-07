# コードスタイル・規約

## 命名規則

### 変数・関数名
- **キャメルケース**を使用（英語）
- 例: `userName`, `calculateTotal`, `handleSubmit`

### ファイル・フォルダ名
- **kebab-case** 推奨（英語）
- 例: `user-profile.tsx`, `timer-component/`

### コンポーネント名
- **PascalCase**を使用（英語）
- 例: `PomodoroTimer`, `UserProfile`

## TypeScript 設定

### 厳格な型チェック
- `strict: true` 設定済み
- 型の明示的な指定を推奨
- `any` 型の使用は避ける

### パスエイリアス
- `@/*` は `./src/*` にマッピング済み
- 相対パスより絶対パス（エイリアス）を推奨

## React/Next.js 規約

### App Router パターン
- `src/app/` ディレクトリ構造を使用
- ページは `page.tsx`、レイアウトは `layout.tsx`

### コンポーネント構造
```typescript
// 関数コンポーネントを使用
export default function ComponentName() {
  return (
    // JSX
  );
}
```

## CSS スタイリング

### CSS Modules
- `*.module.css` ファイルを使用
- クラス名は `styles.className` でアクセス

### フォント設定
- Geist Sans（`--font-geist-sans`）
- Geist Mono（`--font-geist-mono`）

## コメント・ドキュメント

### コメント言語
- **日本語**でコメントを記述
- console.log メッセージも日本語
- エラーメッセージも可能な限り日本語

### 例
```typescript
// ポモドーロタイマーの状態を管理
const [timerState, setTimerState] = useState('idle');

console.log('タイマーが開始されました');
```