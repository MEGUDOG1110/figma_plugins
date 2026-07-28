export {};

type LinkKind = 'link' | 'anchor';

type LinkItem = {
  nodeId: string;
  frameName: string;
  url: string;
  kind: LinkKind;
};

type SelectionStateMessage = {
  type: 'selection-state';
  count: number;
  links: LinkItem[];
  baseUrl: string;
  requiresBaseUrl: boolean;
  svgLabels: Array<{ nodeId: string; label: string }>;
};

type ExportResultMessage = {
  type: 'export-result';
  files: Array<{ name: string; content: string; linkCount: number }>;
};

type UiMessage = SelectionStateMessage | ExportResultMessage;

type PluginMessage =
  | { type: 'set-base-url'; url: string }
  | { type: 'set-link-kind'; nodeId: string; kind: LinkKind }
  | { type: 'set-all-link-kinds'; nodeIds: string[]; kind: LinkKind }
  | { type: 'set-svg-label'; nodeIds: string[]; label: string }
  | { type: 'export-svg' };

function getElement<T extends HTMLElement>(id: string): T {
  const element = document.getElementById(id);
  if (!element) throw new Error(`Missing UI element: #${id}`);
  return element as T;
}

const selection = getElement<HTMLDivElement>('selection');
const linkCount = getElement<HTMLSpanElement>('link-count');
const links = getElement<HTMLUListElement>('links');
const bulkOptions = getElement<HTMLDivElement>('bulk-options');
const baseUrl = getElement<HTMLInputElement>('base-url');
const svgLabel = getElement<HTMLInputElement>('svg-label');
const exportButton = getElement<HTMLButtonElement>('export');
const status = getElement<HTMLDivElement>('status');

const post = (message: PluginMessage): void => parent.postMessage({ pluginMessage: message }, '*');
let currentLinks: LinkItem[] = [];
let savedBaseUrl = '';
let canExport = false;
let currentSelectionIds: string[] = [];
let savedSvgLabel: string | null = null;
let isComposingSvgLabel = false;

bulkOptions.onchange = (event) => {
  const target = event.target as HTMLInputElement;
  if (target.name !== 'bulk-kind') return;
  post({
    type: 'set-all-link-kinds',
    nodeIds: currentLinks.map((link) => link.nodeId),
    kind: target.value as LinkKind,
  });
};

const saveBaseUrl = () => {
  if (baseUrl.value.trim() !== savedBaseUrl) {
    post({ type: 'set-base-url', url: baseUrl.value });
  }
};
baseUrl.onblur = saveBaseUrl;
baseUrl.onkeydown = (event) => {
  if (event.key === 'Enter') baseUrl.blur();
};
const saveSvgLabel = () => {
  if (currentSelectionIds.length && svgLabel.value.trim() !== savedSvgLabel) {
    post({ type: 'set-svg-label', nodeIds: currentSelectionIds, label: svgLabel.value });
  }
};
svgLabel.onblur = saveSvgLabel;
svgLabel.addEventListener('compositionstart', () => { isComposingSvgLabel = true; });
svgLabel.addEventListener('compositionend', () => { isComposingSvgLabel = false; });
svgLabel.onkeydown = (event) => {
  if (
    event.key === 'Enter'
    && !event.isComposing
    && event.keyCode !== 229
    && !isComposingSvgLabel
  ) svgLabel.blur();
};
exportButton.onclick = () => {
  exportButton.disabled = true;
  status.textContent = 'SVGを生成しています…';
  post({ type: 'export-svg' });
};

window.onmessage = (event: MessageEvent<{ pluginMessage?: UiMessage }>) => {
  const message = event.data.pluginMessage;
  if (!message) return;

  if (message.type === 'selection-state') {
    currentLinks = message.links;
    currentSelectionIds = message.svgLabels.map((item) => item.nodeId);
    savedBaseUrl = message.baseUrl;
    if (document.activeElement !== baseUrl) baseUrl.value = message.baseUrl;
    const labels = [...new Set(message.svgLabels.map((item) => item.label))];
    const hasCommonLabel = labels.length === 1;
    savedSvgLabel = hasCommonLabel ? labels[0] : null;
    if (document.activeElement !== svgLabel && !isComposingSvgLabel) {
      svgLabel.value = savedSvgLabel ?? '';
    }
    svgLabel.disabled = message.count === 0;
    svgLabel.placeholder = labels.length > 1 ? '複数の値' : '例: フロアマップ';
    linkCount.textContent = `リンク対象 ${message.links.length}`;
    selection.textContent = message.count
      ? `${message.count}フレームを選択中`
      : 'フレームを選択してください';
    links.replaceChildren();
    bulkOptions.hidden = message.links.length === 0;
    bulkOptions.querySelectorAll<HTMLInputElement>('input').forEach((input) => {
      input.checked = message.links.length > 0
        && message.links.every((link) => link.kind === input.value);
    });
    if (message.links.length === 0) {
      const empty = document.createElement('li');
      empty.className = 'empty';
      empty.textContent = 'リンク対象はありません';
      links.appendChild(empty);
    } else {
      message.links.forEach((link) => {
        const item = document.createElement('li');
        item.className = `link-row kind-${link.kind}`;
        const info = document.createElement('div');
        info.className = 'link-info';
        const name = document.createElement('strong');
        const generatedUrl = document.createElement('small');
        name.textContent = link.frameName.replace(/^(link|anchor):/, '');
        generatedUrl.textContent = link.url.startsWith('#') || message.baseUrl
          ? link.url
          : 'ベースURLが未設定です';
        info.append(name, generatedUrl);

        const options = document.createElement('div');
        options.className = 'kind-options';
        (['link', 'anchor'] as const).forEach((kind) => {
          const label = document.createElement('label');
          const radio = document.createElement('input');
          radio.type = 'radio';
          radio.name = `kind-${link.nodeId}`;
          radio.value = kind;
          radio.checked = link.kind === kind;
          radio.setAttribute('aria-label', kind === 'link' ? '通常リンク' : 'ページ内アンカー');
          radio.onchange = () => post({ type: 'set-link-kind', nodeId: link.nodeId, kind });
          label.append(radio, kind === 'link' ? 'URL' : 'アンカー');
          options.appendChild(label);
        });
        item.append(info, options);
        links.appendChild(item);
      });
    }
    const needsBaseUrl = message.requiresBaseUrl && !message.baseUrl;
    canExport = message.count > 0 && !needsBaseUrl;
    exportButton.disabled = !canExport;
    exportButton.textContent = message.count
      ? `選択した${message.count}フレームを書き出す`
      : 'フレームを選択してください';
    status.textContent = needsBaseUrl ? '通常リンクにはベースURLが必要です' : '';
  }

  if (message.type === 'export-result') {
    message.files.forEach((file, index) => {
      setTimeout(() => {
        const blob = new Blob([file.content], { type: 'image/svg+xml;charset=utf-8' });
        const anchor = document.createElement('a');
        anchor.href = URL.createObjectURL(blob);
        anchor.download = file.name;
        anchor.click();
        setTimeout(() => URL.revokeObjectURL(anchor.href), 1000);
      }, index * 120);
    });
    const links = message.files.reduce((total, file) => total + file.linkCount, 0);
    status.textContent = `${message.files.length}ファイル、リンク${links}件を書き出しました。`;
    exportButton.disabled = !canExport;
  }
};
