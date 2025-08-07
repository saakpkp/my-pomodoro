# 推奨コマンド

## 開発用コマンド

### 基本的な開発コマンド
```bash
# 開発サーバーの起動（通常は http://localhost:3000）
npm run dev

# プロダクションビルド
npm run build

# プロダクションサーバーの起動
npm run start

# Lint の実行
npm run lint
```

### システムコマンド（macOS/Darwin）
```bash
# ファイル操作
ls          # ディレクトリ一覧
cd          # ディレクトリ移動
find        # ファイル検索
grep        # テキスト検索

# Git 操作
git status  # 状態確認
git add     # ファイル追加
git commit  # コミット
git push    # プッシュ
```

## タスク完了時に実行すべきコマンド

1. **Lint チェック**: `npm run lint`
2. **ビルド確認**: `npm run build`（必要に応じて）

## 開発ワークフロー

1. `npm run dev` で開発サーバーを起動
2. コードを編集
3. 変更確認
4. `npm run lint` でコード品質チェック
5. 必要に応じて `npm run build` でビルド確認