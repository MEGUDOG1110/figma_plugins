# SVG Link Exporter

Figmaのレイヤー名と任意のベースURLからリンクを生成し、クリック領域を含むSVGを書き出すプラグインです。

## 使い方

1. プラグインでベースURLを設定する
2. ラベルを囲むフレーム名を `link:パス` に変更する
3. 書き出したいフレームを1つ以上選択する
4. 「選択フレームを書き出す」を押す

例えばベースURLを `https://www.example.com/onsen/` に設定した場合、`link:sample_onsen` は次のURLになります。

`https://www.example.com/onsen/sample_onsen/`

アクセシビリティ用の日本語名には、フレーム内で最初に見つかったテキストを使用します。`link:` がないレイヤーはリンク対象になりません。

従来の `link:yunokawa_onsen|湯の川温泉` 形式にも対応しています。

Figmaのレイヤー名はリンク判定にだけ使用し、書き出したSVGのIDには含めません。

ベースURLはFigmaの `clientStorage` にローカル保存されます。

## 開発

```bash
npm install
npm run build
npm run watch
```

Figmaデスクトップ版の `Plugins > Development` からこのプラグインを実行します。
