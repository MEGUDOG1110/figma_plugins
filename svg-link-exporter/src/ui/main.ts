import { strToU8, zipSync } from 'fflate';

export {};

type LinkKind = 'link' | 'anchor';

type LinkItem = {
  nodeId: string;
  frameName: string;
  url: string;
  kind: LinkKind;
};

type LinkGroup = {
  nodeId: string;
  frameName: string;
  svgLabel: string;
  links: LinkItem[];
};

type SelectionStateMessage = {
  type: 'selection-state';
  count: number;
  groups: LinkGroup[];
  baseUrl: string;
  requiresBaseUrl: boolean;
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
const bulkOptions = getElement<HTMLFieldSetElement>('bulk-options');
const baseUrl = getElement<HTMLInputElement>('base-url');
const exportButton = getElement<HTMLButtonElement>('export');
const exportLabel = getElement<HTMLSpanElement>('export-label');
const status = getElement<HTMLDivElement>('status');

const post = (message: PluginMessage): void => parent.postMessage({ pluginMessage: message }, '*');
let currentLinks: LinkItem[] = [];
let savedBaseUrl = '';
let canExport = false;
let currentSelectionCount = 0;

function setStatus(message: string, tone?: 'warning' | 'success' | 'progress'): void {
  status.textContent = message;
  if (tone) status.dataset.tone = tone;
  else delete status.dataset.tone;
}

function setExportLabel(count: number): void {
  exportLabel.textContent = count
    ? `選択した${count}フレームを書き出す`
    : 'フレームを選択してください';
}

function downloadBlob(blob: Blob, filename: string): void {
  const anchor = document.createElement('a');
  const url = URL.createObjectURL(blob);
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function uniqueFilename(filename: string, usedNames: Set<string>): string {
  if (!usedNames.has(filename)) {
    usedNames.add(filename);
    return filename;
  }

  const extensionIndex = filename.lastIndexOf('.');
  const basename = extensionIndex > 0 ? filename.slice(0, extensionIndex) : filename;
  const extension = extensionIndex > 0 ? filename.slice(extensionIndex) : '';
  let sequence = 2;
  let candidate = `${basename}-${sequence}${extension}`;
  while (usedNames.has(candidate)) {
    sequence += 1;
    candidate = `${basename}-${sequence}${extension}`;
  }
  usedNames.add(candidate);
  return candidate;
}

function downloadExport(files: ExportResultMessage['files']): void {
  if (files.length === 1) {
    downloadBlob(
      new Blob([files[0].content], { type: 'image/svg+xml;charset=utf-8' }),
      files[0].name,
    );
    return;
  }

  const usedNames = new Set<string>();
  const zipEntries: Record<string, Uint8Array> = {};
  files.forEach((file) => {
    zipEntries[uniqueFilename(file.name, usedNames)] = strToU8(file.content);
  });
  const archive = zipSync(zipEntries, { level: 6 });
  downloadBlob(
    new Blob([archive.slice().buffer as ArrayBuffer], { type: 'application/zip' }),
    'svg-link-export.zip',
  );
}

function renderEmptyLinks(): void {
  const empty = document.createElement('li');
  empty.className = 'empty';

  const icon = document.createElement('span');
  icon.className = 'empty-icon';
  icon.setAttribute('aria-hidden', 'true');
  icon.textContent = '↗';

  const title = document.createElement('strong');
  title.textContent = 'リンク対象はありません';

  const detail = document.createElement('small');
  detail.textContent = 'link: から始まるレイヤーを検出します';

  empty.append(icon, title, detail);
  links.appendChild(empty);
}

function createKindOptions(
  name: string,
  items: LinkItem[],
  onChange: (kind: LinkKind) => void,
  accessibleName: string,
): HTMLDivElement {
  const options = document.createElement('div');
  options.className = 'kind-options';

  (['link', 'anchor'] as const).forEach((kind) => {
    const label = document.createElement('label');
    const radio = document.createElement('input');
    radio.type = 'radio';
    radio.name = name;
    radio.value = kind;
    radio.checked = items.length > 0 && items.every((item) => item.kind === kind);
    radio.setAttribute(
      'aria-label',
      `${accessibleName}を${kind === 'link' ? 'URL' : 'ページ内リンク'}にする`,
    );
    radio.onchange = () => onChange(kind);

    const text = document.createElement('span');
    text.textContent = kind === 'link' ? 'URL' : 'ページ内';
    label.append(radio, text);
    options.appendChild(label);
  });

  return options;
}

function createGroupKindOptions(group: LinkGroup): HTMLFieldSetElement {
  const fieldset = document.createElement('fieldset');
  fieldset.className = 'group-kind-options';
  const legend = document.createElement('legend');
  legend.textContent = 'すべて';
  fieldset.appendChild(legend);

  (['link', 'anchor'] as const).forEach((kind) => {
    const label = document.createElement('label');
    const radio = document.createElement('input');
    radio.type = 'radio';
    radio.name = `group-kind-${group.nodeId}`;
    radio.value = kind;
    radio.checked = group.links.length > 0
      && group.links.every((link) => link.kind === kind);
    radio.onchange = () => post({
      type: 'set-all-link-kinds',
      nodeIds: group.links.map((link) => link.nodeId),
      kind,
    });
    label.append(radio, kind === 'link' ? 'URL' : 'アンカー');
    fieldset.appendChild(label);
  });

  return fieldset;
}

function createLinkRow(link: LinkItem, configuredBaseUrl: string): HTMLLIElement {
  const item = document.createElement('li');
  item.className = `link-row kind-${link.kind}`;

  const info = document.createElement('div');
  info.className = 'link-info';
  const name = document.createElement('strong');
  const generatedUrl = document.createElement('small');
  name.textContent = link.frameName.replace(/^(link|anchor):/, '');
  generatedUrl.textContent = link.url.startsWith('#') || configuredBaseUrl
    ? link.url
    : 'ベースURLが未設定です';
  info.append(name, generatedUrl);

  const options = createKindOptions(
    `kind-${link.nodeId}`,
    [link],
    (kind) => post({ type: 'set-link-kind', nodeId: link.nodeId, kind }),
    name.textContent,
  );
  item.append(info, options);
  return item;
}

function createLinkGroup(group: LinkGroup, configuredBaseUrl: string): HTMLLIElement {
  const groupItem = document.createElement('li');
  groupItem.className = 'link-group';

  const details = document.createElement('details');
  details.className = 'link-group-details';
  details.open = true;
  const summary = document.createElement('summary');
  summary.className = 'link-group-summary';
  const title = document.createElement('strong');
  const descriptionPreview = document.createElement('span');
  const count = document.createElement('small');
  title.className = 'link-group-title';
  descriptionPreview.className = 'link-group-description-preview';
  count.className = 'link-group-count';
  title.textContent = group.frameName;
  descriptionPreview.textContent = group.svgLabel || 'SVGの説明は未設定';
  count.textContent = `${group.links.length}件`;

  const description = document.createElement('div');
  description.className = 'link-group-description';
  const descriptionLabel = document.createElement('label');
  const descriptionInput = document.createElement('input');
  const inputId = `svg-label-${group.nodeId}`;
  let isComposing = false;
  descriptionLabel.className = 'visually-hidden';
  descriptionLabel.htmlFor = inputId;
  descriptionLabel.textContent = `${group.frameName}のSVGの説明`;
  descriptionInput.id = inputId;
  descriptionInput.className = 'text-input';
  descriptionInput.type = 'text';
  descriptionInput.value = group.svgLabel;
  descriptionInput.placeholder = 'SVGの説明';
  descriptionInput.addEventListener('compositionstart', () => { isComposing = true; });
  descriptionInput.addEventListener('compositionend', () => { isComposing = false; });
  descriptionInput.onblur = () => {
    if (descriptionInput.value.trim() !== group.svgLabel) {
      post({
        type: 'set-svg-label',
        nodeIds: [group.nodeId],
        label: descriptionInput.value,
      });
    }
  };
  descriptionInput.onkeydown = (event) => {
    if (event.key === 'Enter' && !event.isComposing && event.keyCode !== 229 && !isComposing) {
      descriptionInput.blur();
    }
  };
  description.append(descriptionLabel, descriptionInput);
  summary.append(title, descriptionPreview, count);

  const groupActions = document.createElement('div');
  groupActions.className = 'link-group-actions';
  if (group.links.length > 0) {
    groupActions.appendChild(createGroupKindOptions(group));
  }

  const itemList = document.createElement('ul');
  itemList.className = 'link-items';
  if (group.links.length === 0) {
    const empty = document.createElement('li');
    empty.className = 'group-empty';
    empty.textContent = 'リンク対象はありません';
    itemList.appendChild(empty);
  } else {
    group.links.forEach((link) => itemList.appendChild(createLinkRow(link, configuredBaseUrl)));
  }

  details.append(summary, description);
  if (group.links.length > 0) details.append(groupActions);
  details.append(itemList);
  groupItem.appendChild(details);
  return groupItem;
}

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
exportButton.onclick = () => {
  exportButton.disabled = true;
  exportLabel.textContent = 'SVGを生成中…';
  setStatus('リンク領域を組み込んでいます…', 'progress');
  post({ type: 'export-svg' });
};

window.onmessage = (event: MessageEvent<{ pluginMessage?: UiMessage }>) => {
  const message = event.data.pluginMessage;
  if (!message) return;

  if (message.type === 'selection-state') {
    currentSelectionCount = message.count;
    currentLinks = message.groups.flatMap((group) => group.links);
    savedBaseUrl = message.baseUrl;
    if (document.activeElement !== baseUrl) baseUrl.value = message.baseUrl;
    linkCount.textContent = String(currentLinks.length);
    selection.textContent = message.count
      ? `${message.count}フレーム`
      : '未選択';
    selection.classList.toggle('has-selection', message.count > 0);
    links.replaceChildren();
    bulkOptions.hidden = currentLinks.length === 0;
    bulkOptions.querySelectorAll<HTMLInputElement>('input').forEach((input) => {
      input.checked = currentLinks.length > 0
        && currentLinks.every((link) => link.kind === input.value);
    });
    if (message.groups.length === 0) {
      renderEmptyLinks();
    } else {
      message.groups.forEach((group) => links.appendChild(createLinkGroup(group, message.baseUrl)));
    }
    const needsBaseUrl = message.requiresBaseUrl && !message.baseUrl;
    canExport = message.count > 0 && !needsBaseUrl;
    exportButton.disabled = !canExport;
    setExportLabel(message.count);
    setStatus(needsBaseUrl ? '通常リンクを書き出すにはベースURLが必要です' : '', needsBaseUrl ? 'warning' : undefined);
  }

  if (message.type === 'export-result') {
    downloadExport(message.files);
    const links = message.files.reduce((total, file) => total + file.linkCount, 0);
    setStatus(`${message.files.length}ファイル・リンク${links}件を書き出しました`, 'success');
    setExportLabel(currentSelectionCount);
    exportButton.disabled = !canExport;
  }
};
