# Figma Plugins

Figmaプラグインの開発・公開用リポジトリです。各プラグインは独立したディレクトリに分けて管理しています。

## Plugins

### <img src="./svg-link-exporter/assets/icon-128.png" alt="" width="48" align="middle"> [SVG Link Exporter](./svg-link-exporter/)

Figmaのレイヤー名と任意のベースURLからリンクを生成し、リンク付きSVGを一括で書き出すプラグインです。

- `link:パス` というレイヤー名からURLを生成
- フレーム内のテキストをリンクのアクセシブルな名前として使用
- 複数フレームの一括書き出しに対応
- ベースURLをFigma内に保存

使い方の詳細は[プラグインのREADME](./svg-link-exporter/README.md)を参照してください。

## Development

### 必要な環境

- Node.js
- npm
- Figmaデスクトップアプリ

### セットアップ

```bash
git clone https://github.com/MEGUDOG1110/figma_plugins.git
cd figma_plugins/svg-link-exporter
npm install
npm run build
```

Figmaデスクトップアプリで次の手順を実行します。

1. `Plugins` → `Development` → `Import plugin from manifest...` を開く
2. `svg-link-exporter/manifest.json` を選択する
3. Developmentメニューから `SVG Link Exporter` を起動する

開発中にTypeScriptの変更を継続的にビルドする場合は、次のコマンドを使用します。

```bash
npm run watch
```

## Commands

各プラグインのディレクトリ内で実行します。

| コマンド | 内容 |
| --- | --- |
| `npm run build` | TypeScriptをビルド |
| `npm run watch` | ファイル変更を監視してビルド |
| `npm run lint` | ESLintによるコード検査 |
| `npm run lint:fix` | ESLintで修正可能な問題を自動修正 |

## Repository Structure

```text
figma_plugins/
├── README.md
└── svg-link-exporter/
    ├── manifest.json
    ├── code.ts
    ├── ui.html
    └── assets/
```
