# SVG Link Exporter UI benchmark

2026-07-29時点の公開スクリーンショット、ドキュメント、公開リポジトリを使ったデスクリサーチ。実機インストールによる品質保証ではなく、SVG Link ExporterのUI設計に使えるパターンを比較するための記録である。

## 評価軸

- SVG・アセット書き出しとの用途適合: 30
- 420×640pxでの情報階層: 20
- 複数対象の一覧・一括操作: 15
- 未設定・実行中・完了の状態表示: 15
- Figma UIへの親和性: 10
- キーボード・テーマ・可読性: 10

## 主な調査元

- [Figma標準のExport仕様](https://help.figma.com/hc/en-us/articles/360040028114-Export-static-designs-from-Figma)
- [Figma公式のPlugin UI指針](https://developers.figma.com/docs/plugins/figma-components/)
- [Figma公式のCommunity Resources一覧](https://github.com/figma/community-resources/blob/main/plugins/README.md)
- [Figma Plugin Samples](https://github.com/figma/plugin-samples)
- [Batchr](https://batchr.io/)
- [Export Kit](https://fountn.design/resource/export-kit-one-click-export-all/)
- [Tokens Studio Inspect UI](https://docs.tokens.studio/debug/inspect-tokens)
- [Figma to Studio](https://help.studio.design/ja/articles/8277073-figma-to-studio)
- [Vertjaの国内利用例](https://igawa.co/memos/figma%E3%81%AE%E7%B8%A6%E6%9B%B8%E3%81%8D%E3%83%97%E3%83%A9%E3%82%B0%E3%82%A4%E3%83%B3%E3%80%82vertja%E3%81%A7%E6%97%A5%E6%9C%AC%E8%AA%9E%E3%82%92%E7%B8%A6%E6%9B%B8%E3%81%8D%E3%81%AB%E3%80%82/)
- [Text to variablesの国内開発例](https://www.booklista.co.jp/corp/wp-content/uploads/2024/04/press_release_20240405.pdf)

## 75例のスクリーニング

| # | 事例 | 市場/種別 | 参考にしたパターン | 評価 |
|---:|---|---|---|---:|
| 1 | Batchr | 海外・Export | アセット一覧、バッチ操作、フッターCTA | 95 |
| 2 | Figma native Export modal | 公式 | 高密度な行、選択とプレビューの近接 | 94 |
| 3 | Export Kit | 海外・Export | プリセット、フォーマットバッジ、ワンクリックCTA | 92 |
| 4 | Tokens Studio Inspect | 海外・DS | ツールバー、一括操作、長い一覧 | 90 |
| 5 | Figma to Studio | 国内・Export | 選択→確認→実行の静かなフロー | 88 |
| 6 | TinyImage Compressor | 海外・Export | プレビュー、容量フィードバック | 86 |
| 7 | Auto Detect Icons | 海外・Export | 自動検出結果と形式選択 | 85 |
| 8 | Design Tokens | 海外・Export | カテゴリ一括選択 | 84 |
| 9 | Figma Export | 海外・Export | ZIP書き出しの単一フロー | 83 |
| 10 | Bulk Asset & Batch Image Exporter | 海外・Export | 重複名と複数対象の整理 | 82 |
| 11 | Export Image Fills | 海外・Export | 形式切替とテーマ対応 | 81 |
| 12 | SVG Export | 海外・SVG | SVG特化の設定範囲 | 81 |
| 13 | SVG Exporter | 海外・SVG | 選択対象とコード出力 | 80 |
| 14 | Advanced SVG Export | 海外・SVG | 詳細設定の段階開示 | 80 |
| 15 | VIBE Batch Export | 海外・Export | 制約値とバッチ状態 | 79 |
| 16 | Android Resources Export | 海外・Export | 出力ルールのプリセット化 | 78 |
| 17 | Lazy Export | 海外・Export | デフォルト設定の一括適用 | 78 |
| 18 | Figma Sprite Generator | 海外・Export | アイコン一覧と複数出力 | 77 |
| 19 | Image Minifire | 海外・Export | 圧縮と出力の直線的な導線 | 77 |
| 20 | Compressed PDF Exporter | 海外・Export | 出力サイズのフィードバック | 76 |
| 21 | SVG to JSX | 海外・SVG | コード表示とコピーCTA | 76 |
| 22 | SVG Code | 海外・SVG | モノスペースのプレビュー | 75 |
| 23 | Iconify | 海外・Icon | 検索、結果グリッド、軽量フィルタ | 75 |
| 24 | Material Symbols | 海外・Icon | フィルタとバリアント切替 | 74 |
| 25 | Feather Icons | 海外・Icon | 最小限の検索と一覧 | 74 |
| 26 | Icons8 | 海外・Icon | カテゴリとプレビュー | 73 |
| 27 | Variables Import/Export | 公式Sample | 入出力の対称的な操作 | 73 |
| 28 | Design Lint | 海外・Utility | 問題一覧とズーム導線 | 72 |
| 29 | Similayer | 海外・Utility | 条件のコンパクトなグルーピング | 72 |
| 30 | Batch Styler | 海外・Utility | 一括変更の対象と結果数 | 71 |
| 31 | Styler | 海外・DS | スタイル一覧の情報密度 | 71 |
| 32 | Themer | 海外・DS | ライブラリ切替と適用状態 | 70 |
| 33 | Design System Organizer | 海外・DS | 階層と複数選択 | 70 |
| 34 | Foundation Studio | 海外・DS | ファウンデーション項目のカード | 69 |
| 35 | Polychrom | 海外・A11y | 選択対象の即時診断結果 | 69 |
| 36 | Stark | 海外・A11y | ツールスイートのナビゲーション | 68 |
| 37 | Able | 海外・A11y | 数値と合否の明確な差 | 68 |
| 38 | Include | 海外・A11y | アノテーションの導線 | 67 |
| 39 | Contrast | 海外・A11y | 大きな判定値と小さな詳細 | 67 |
| 40 | Color Blind | 海外・A11y | モード切替とプレビュー | 66 |
| 41 | A11y Focus Orderer | 海外・A11y | 順序付きリスト | 66 |
| 42 | Figma to Studio Page Mode | 国内・Export | 複数ページの検出と確認 | 65 |
| 43 | Anima | 海外・Code | 複数ステップと実行結果 | 65 |
| 44 | Locofy | 海外・Code | タブ、ステート、ブレークポイント | 64 |
| 45 | Builder.io Figma to Code | 海外・Code | 選択と出力のプレビュー | 64 |
| 46 | html.to.design | 海外・Import | URL入力と実行の単一フロー | 63 |
| 47 | TeleportHQ | 海外・Code | 出力ターゲットの選択 | 63 |
| 48 | Zeplin | 海外・Handoff | 同期対象と完了フィードバック | 62 |
| 49 | Storybook Connect | 海外・Handoff | コンポーネント関連付け | 62 |
| 50 | Content Reel | 海外・Content | カテゴリ一覧と適用CTA | 61 |
| 51 | Google Sheets Sync | 海外・Content | データ接続と同期状態 | 61 |
| 52 | Unsplash | 海外・Content | 検索優先の単純な構造 | 60 |
| 53 | Pexels | 海外・Content | 画像結果のスキャン性 | 60 |
| 54 | Mockuuups Studio | 海外・Mockup | デバイスフィルタとプレビュー | 59 |
| 55 | Artboard Studio | 海外・Mockup | 編集パネルと実行の分離 | 59 |
| 56 | Pitchdeck | 海外・Presentation | 順序付きフレーム一覧 | 58 |
| 57 | Charts | 海外・Generator | データとスタイルの段階分け | 58 |
| 58 | Figmotion | 海外・Motion | タイムラインの高密度表現 | 57 |
| 59 | Autoflow | 海外・Utility | 方向選択と即時実行 | 57 |
| 60 | Rename It | 海外・Utility | ルール入力と例示 | 56 |
| 61 | Find and Replace | 海外・Utility | 検索・置換の対称UI | 56 |
| 62 | Instance Finder | 海外・Utility | 検出件数と結果一覧 | 55 |
| 63 | Component Replacer | 海外・Utility | Before/After選択 | 55 |
| 64 | Table Creator | 海外・Generator | 小さな数値入力群 | 54 |
| 65 | Wireframe | 海外・Generator | カテゴリとテンプレート | 54 |
| 66 | Mapsicle | 海外・Map | マッププレビューとスタイル設定 | 53 |
| 67 | Figma Map Maker | 海外・Map | プロバイダーと表示オプション | 53 |
| 68 | Vertja | 国内向け・Text | 日本語の説明、保存/実行の分離 | 52 |
| 69 | Text to variables | 国内・Localization | 日本語コンテンツの操作導線 | 52 |
| 70 | Japanese Font Picker | 国内向け・Font | 日本語フォントの検索性 | 51 |
| 71 | Spelll | 海外・Text | 指摘一覧と修正導線 | 51 |
| 72 | Lorem Ipsum | 海外・Text | 最小限の実行UI | 50 |
| 73 | Demo Station | 海外・Export | 書き出し後のビューア設定 | 50 |
| 74 | Figma Measure | 海外・Utility | 小さなUIでの即時操作 | 49 |
| 75 | Document Statistics | 公式Sample | 数値サマリの明瞭さ | 49 |

## 採用する5例とハイブリッド方針

1. **Batchr**: 検出された対象を「出力ジョブ」として見せる一覧構造。
2. **Figma native Export modal**: フォームを小さく、結果と実行を近く置く。
3. **Export Kit**: 種別をピル型で表し、最後のCTAを一つに絞る。
4. **Tokens Studio Inspect**: 長い一覧の上に一括操作を置き、各行の操作と分ける。
5. **Figma to Studio**: 日本語の説明を短く保ち、選択状態を最初に伝える。

統合後は「サマリー → 設定 → 検出リンク → 固定CTA」の一方向フローとし、カードは設定とリンク行の境界を明確にする用途に限定する。ブランド色はURLとAnchorの識別、選択状態、主CTAにだけ使用する。
