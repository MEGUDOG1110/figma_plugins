const BASE_URL_KEY = 'svg-link-base-url';
const LINK_KIND_KEY = 'svg-link-kind';
let savedBaseUrl = '';

type PluginMessage =
  | { type: 'set-base-url'; url: string }
  | { type: 'set-link-kind'; nodeId: string; kind: LinkKind }
  | { type: 'set-all-link-kinds'; nodeIds: string[]; kind: LinkKind }
  | { type: 'export-svg' }
  | { type: 'close' };

type LinkKind = 'link' | 'anchor';

type LinkRegion = {
  url: string;
  label: string;
  x: number;
  y: number;
  width: number;
  height: number;
};

type ParsedLink = {
  kind: LinkKind;
  path: string;
  label: string;
};

figma.showUI(__html__, { width: 420, height: 640, themeColors: true });

function selectedNodes(): readonly SceneNode[] {
  return figma.currentPage.selection;
}

function sendSelectionState(): void {
  const selection = selectedNodes();
  const baseUrl = getBaseUrl();
  const links: Array<{ nodeId: string; frameName: string; url: string; kind: LinkKind }> = [];
  let requiresBaseUrl = false;
  selection.forEach((root) => {
    walk(root, (node) => {
      const link = parseLinkNode(node);
      if (link) {
        if (link.kind === 'link') requiresBaseUrl = true;
        links.push({
          nodeId: node.id,
          frameName: node.name,
          url: buildLinkUrl(baseUrl, link),
          kind: link.kind,
        });
      }
    });
  });

  figma.ui.postMessage({
    type: 'selection-state',
    count: selection.length,
    names: selection.slice(0, 3).map((node) => node.name),
    links,
    baseUrl,
    requiresBaseUrl,
  });
}

function walk(node: SceneNode, callback: (node: SceneNode) => void): void {
  callback(node);
  if ('children' in node) {
    for (const child of node.children) walk(child, callback);
  }
}

function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function safeFilename(name: string): string {
  const cleaned = name.trim().replace(/[\\/:*?"<>|]/g, '_');
  return `${cleaned || 'export'}.svg`;
}

function findText(node: SceneNode): string | null {
  if (node.type === 'TEXT' && node.characters.trim()) return node.characters.trim();
  if ('children' in node) {
    for (const child of node.children) {
      const text = findText(child);
      if (text) return text;
    }
  }
  return null;
}

function normalizeBaseUrl(url: string): string {
  const trimmed = url.trim();
  if (!trimmed) return '';
  return `${trimmed.replace(/\/+$/, '')}/`;
}

function getBaseUrl(): string {
  return savedBaseUrl;
}

function buildUrl(baseUrl: string, path: string): string {
  return baseUrl ? `${baseUrl}${path}/` : path;
}

function buildLinkUrl(baseUrl: string, link: ParsedLink): string {
  return link.kind === 'anchor' ? `#${link.path}` : buildUrl(baseUrl, link.path);
}

function parseLinkNode(node: SceneNode): ParsedLink | null {
  const prefixKind: LinkKind | null = node.name.startsWith('link:')
    ? 'link'
    : node.name.startsWith('anchor:')
      ? 'anchor'
      : null;
  if (!prefixKind) return null;

  const savedKind = node.getPluginData(LINK_KIND_KEY);
  const kind: LinkKind = savedKind === 'link' || savedKind === 'anchor' ? savedKind : prefixKind;

  const prefixLength = prefixKind === 'link' ? 5 : 7;
  const [rawPath, rawLabel] = node.name.slice(prefixLength).split('|', 2);
  const path = rawPath.trim().replace(/^\/+|\/+$/g, '');
  if (!/^[a-zA-Z0-9_-]+$/.test(path)) return null;

  return {
    kind,
    path,
    label: rawLabel?.trim() || findText(node) || path,
  };
}

async function setLinkKind(nodeId: string, kind: LinkKind): Promise<void> {
  const node = await figma.getNodeByIdAsync(nodeId);
  if (!node || node.type === 'DOCUMENT' || node.type === 'PAGE') return;
  const link = parseLinkNode(node);
  if (!link) return;
  node.setPluginData(LINK_KIND_KEY, kind);
  if (node.name.startsWith('anchor:')) node.name = `link:${node.name.slice(7)}`;
}

function collectLinks(root: SceneNode): LinkRegion[] {
  const rootBounds = root.absoluteBoundingBox;
  if (!rootBounds) return [];
  const baseUrl = getBaseUrl();

  const links: LinkRegion[] = [];
  walk(root, (node) => {
    const link = parseLinkNode(node);
    const bounds = node.absoluteBoundingBox;
    if (!link || !bounds || !node.visible) return;

    links.push({
      url: buildLinkUrl(baseUrl, link),
      label: link.label,
      x: bounds.x - rootBounds.x,
      y: bounds.y - rootBounds.y,
      width: bounds.width,
      height: bounds.height,
    });
  });
  return links;
}

function addLinksToSvg(svg: string, links: LinkRegion[]): string {
  if (links.length === 0) return svg;

  const markup = links
    .map((link) => {
      const x = Math.max(0, link.x);
      const y = Math.max(0, link.y);
      return [
        `<a href="${escapeXml(link.url)}" aria-label="${escapeXml(link.label)}">`,
        `<rect x="${x}" y="${y}" width="${link.width}" height="${link.height}" fill="transparent" pointer-events="all"/>`,
        '</a>',
      ].join('');
    })
    .join('');

  return svg.replace(/<\/svg>\s*$/, `${markup}</svg>`);
}

async function exportSelection(): Promise<void> {
  const selection = selectedNodes();
  let requiresBaseUrl = false;
  selection.forEach((root) => {
    walk(root, (node) => {
      if (parseLinkNode(node)?.kind === 'link') requiresBaseUrl = true;
    });
  });
  if (requiresBaseUrl && !getBaseUrl()) {
    figma.notify('先にベースURLを設定してください', { error: true });
    return;
  }
  if (selection.length === 0) {
    figma.notify('書き出すフレームを選択してください');
    return;
  }

  const files: Array<{ name: string; content: string; linkCount: number }> = [];
  for (const node of selection) {
    if (!('exportAsync' in node)) continue;
    const links = collectLinks(node);
    const svg = await node.exportAsync({
      format: 'SVG_STRING',
      svgOutlineText: true,
      svgIdAttribute: false,
    });
    files.push({
      name: safeFilename(node.name),
      content: addLinksToSvg(svg, links),
      linkCount: links.length,
    });
  }

  figma.ui.postMessage({ type: 'export-result', files });
  figma.notify(`${files.length}件のSVGを書き出しました`);
}

figma.on('selectionchange', sendSelectionState);

figma.ui.onmessage = async (msg: PluginMessage) => {
  if (msg.type === 'set-base-url') {
    const url = normalizeBaseUrl(msg.url);
    if (url && !/^https?:\/\//i.test(url)) {
      figma.notify('http:// または https:// から始まるURLを入力してください', { error: true });
      return;
    }
    await figma.clientStorage.setAsync(BASE_URL_KEY, url);
    savedBaseUrl = url;
    figma.notify(url ? 'ベースURLを保存しました' : 'ベースURLを削除しました');
    sendSelectionState();
  }

  if (msg.type === 'set-link-kind') {
    await setLinkKind(msg.nodeId, msg.kind);
    sendSelectionState();
  }

  if (msg.type === 'set-all-link-kinds') {
    await Promise.all(msg.nodeIds.map((nodeId) => setLinkKind(nodeId, msg.kind)));
    sendSelectionState();
  }

  if (msg.type === 'export-svg') await exportSelection();
  if (msg.type === 'close') figma.closePlugin();
};

async function initialize(): Promise<void> {
  try {
    const storedUrl = await figma.clientStorage.getAsync(BASE_URL_KEY);
    savedBaseUrl = normalizeBaseUrl(typeof storedUrl === 'string' ? storedUrl : '');
  } catch (error) {
    console.error('Failed to load settings', error);
    figma.notify('設定の読み込みに失敗しました', { error: true });
  }
  sendSelectionState();
}

void initialize();
