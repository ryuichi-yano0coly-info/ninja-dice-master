# Ninja Dice Master — 全画面プロトタイプ

`Readme/ndm_all_screens_prompts.md`（全7画面仕様）を軸に構築した、動作する Coin Master 風・和風ダイスゲームです。素材は image-gen（gpt-image-2 / low）で生成し、`remove_greenback.py` でグリーンバック（#00B140）を透過処理しています。React はローカル同梱・JSXは事前トランスパイル済みで、CDN 非依存・オフライン動作します。

## 実行方法

`file://` 直開きではなく、ローカルサーバー経由で開いてください。

```bash
cd prototypes/ninja-dice-master
python3 -m http.server 8777
# ブラウザで http://localhost:8777/ を開く（幅430pxのモバイル想定）
```

## 実装した7画面と遷移フロー

```
① メインロール ──roll──┬─ ぞろ目なし → コイン獲得（フロート表示）
                        ├─ Jackpot×2 → コンボ演出
                        └─ ぞろ目 → ② ぞろ目演出 ──┬─ Shield → メインへ（🛡️付与）
                                                     └─ 他 → ③ ボーナスロール ──┬─ Coin/Jackpot → 報酬 → メイン
                                                                                  ├─ Attack → ④ Attack選択 → ⑤ Attack結果 → メイン
                                                                                  └─ Steal → ⑥ Steal → メイン
① メインロール ⇄ ⑦ 城建設（TOPバーの🏯ボタンで行き来）
```

1. **メインロール** — 重み付きダイス、800msスピン→段階停止、獲得コインのフロート表示、キャラリアクション、オートロール（長押し）
2. **ぞろ目演出** — フラッシュ→BG_Bonus→出目別エフェクト（Attack/Steal/Shield/Jackpot/Coin）＋UI_Scrollバナー＋忍犬ジャンプ→自動遷移
3. **ボーナスロール** — 出目別テーブル（`BONUS_DICE_TABLES`）、ゴールドダイス回転、6タイルのハイライト
4. **Attack選択** — 相手の村の**建築物**（天守閣/蔵/石像/庭園、各レベルの段階画像で表示）に照準、タップで攻撃対象を決定
5. **Attack結果** — 成功/シールド防御の出し分け、コインカウントアップ、破壊演出
6. **Steal** — 4場所から3つ選択→順番にめくり→宝箱判定→倍率合算→受け取り
7. **村建設（コインマスター式）** — 天守閣・蔵・石像・庭園を**個別に**建設。ボタンを押すごとにレベルが上がり、建築物が段階的に完成へ近づく（各段階を専用画像で表示）。**全建築物は初期レベル0から開始**。全て完成でステージクリア→次のステージ（新しい村）

### 建築の段階画像
各建築物はレベルごとに専用の建築途中画像を持ちます（image-genで生成、透過処理済み）。
- 天守閣: `Castle_Build_1〜4` → `Castle_Himeji`（5段階）
- 蔵 / 石像 / 庭園: `Build_Storehouse_1〜3` / `Build_Statue_1〜3` / `Build_Garden_1〜3`（各3段階）
- 建設ボタンでレベル+1、コスト `500 / 1,500 / 4,500 / 13,500 …`（`buildCost`）
- 攻撃画面は同じ建築物データ（`BUILD_ITEMS`）を流用し、相手の村の各建築物を攻撃対象にできます

## 状態管理・共通ルール（仕様準拠）

- 共有状態（coins/shields/stage/rolls/opponent）は `App` で一元管理し、各画面へ props とコールバックで受け渡し
- 画面遷移は React Router を使わず `App` の `screen` state による条件分岐（軽量SPA）
- カラーパレット・出目別カラー（`FACE_COLOR`）を全画面で統一
- コインのカウントアップは共通の `useCountUp` / `addCoins`（ease-out cubic）に集約
- 全画像は `assets/images/` の透過PNGを参照、読み込み失敗時は絵文字にフォールバック

## デモ / プレビュー用URLパラメータ

**メイン画面でのロール演出**（`?demo=`）:

| 値 | 内容 |
|---|---|
| `win`     | 通常コイン獲得（バースト＋獲得額フロート） |
| `coin`    | コインぞろ目 → ボーナスロール(coin) |
| `zorume`  | ジャックポットぞろ目 → ボーナスロール(jackpot) |
| `attackz` | Attackぞろ目 → ボーナス→Attack選択フロー |
| `stealz`  | Stealぞろ目 → ボーナス→Stealフロー |
| `shield`  | シールドぞろ目（メインで🛡️付与） |
| `jackpot` | ジャックポット×2 コンボ |

**画面直接ジャンプ**（`?screen=`、モックデータ付き）: `bonus` / `attackSelect` / `attackResult` / `steal` / `castle`

例: `http://localhost:8777/?screen=castle` 、 `http://localhost:8777/?demo=zorume`

## デバッグ機能（役を強制指定）

メイン画面右の 🐞 ボタンでデバッグパネルを開閉できます。任意の役を選ぶと次のロールでその出目を強制します。

- コイン / アタック / スティール / シールド / ジャックポット の各ぞろ目
- ジャックポット×2 コンボ
- コイン獲得（通常）
- ランダム（通常抽選）

`?debugopen=1` でパネルを開いた状態、`?auto=1` でオートロール状態で起動します（動作確認用）。オートロール中は大ボタンが「■ 停止」に変わり、タップで即停止します。

## ビルド（JSX編集時）

ソースは `src/app.jsx`。ブラウザ内Babelは使わず、事前トランスパイル済み `app.js` を読み込みます。

```bash
./build.sh          # src/app.jsx -> app.js (React classic runtime)
```

## 素材の再生成・追加

1. `Readme/ndm_asset_prompts.md` のプロンプトで image-gen（gpt-image-2, quality=low）を実行
   - gpt-image-2 は透過非対応 → **グリーンバック生成** で `assets/raw/` に保存
   - アイコンは「画面全面グリーン＋中央にオブジェクト、NO frame」と指示すると綺麗に抜けます（1024×1024推奨）
   - 背景（`BG_*`）は不透明のまま `assets/images/` へ直接保存
2. 透過処理: `python3 remove_greenback.py`（`assets/raw` → `assets/images`）

## 未生成の素材（フォールバック動作中）

以下は仕様に登場しますが未生成で、絵文字/代替表示にフォールバックしています。必要なら同じ手順で追加してください。
`BG_Main_Night.png` / `Castle_Windsor.png`（ステージ4）/ `Castle_TajMahal.png`（ステージ5）
