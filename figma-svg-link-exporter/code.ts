const BASE_URL_KEY = 'svg-link-base-url';
let savedBaseUrl = '';

type PluginMessage =
  | { type: 'set-base-url'; url: string }
  | { type: 'export-svg' }
  | { type: 'close' };

type LinkRegion = {
  url: string;
  label: string;
  x: number;
  y: number;
  width: number;
  height: number;
};

figma.showUI(__html__, { width: 420, height: 640, themeColors: true });

function selectedNodes(): readonly SceneNode[] {
  return figma.currentPage.selection;
}

function sendSelectionState(): void {
  const selection = selectedNodes();
  const baseUrl = getBaseUrl();
  const links: Array<{ frameName: string; url: string }> = [];
  selection.forEach((root) => {
    walk(root, (node) => {
      const link = parseLinkNode(node);
      if (link) links.push({ frameName: node.name, url: buildUrl(baseUrl, link.path) });
    });
  });

  figma.ui.postMessage({
    type: 'selection-state',
    count: selection.length,
    names: selection.slice(0, 3).map((node) => node.name),
    links,
    baseUrl,
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

function parseLinkNode(node: SceneNode): { path: string; label: string } | null {
  if (!node.name.startsWith('link:')) return null;

  const [rawPath, rawLabel] = node.name.slice(5).split('|', 2);
  const path = rawPath.trim().replace(/^\/+|\/+$/g, '');
  if (!/^[a-zA-Z0-9_-]+$/.test(path)) return null;

  return {
    path,
    label: rawLabel?.trim() || findText(node) || path,
  };
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
      url: buildUrl(baseUrl, link.path),
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
  if (!getBaseUrl()) {
    figma.notify('先にベースURLを設定してください', { error: true });
    return;
  }
  const selection = selectedNodes();
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
    if (!/^https?:\/\//i.test(url)) {
      figma.notify('http:// または https:// から始まるURLを入力してください', { error: true });
      return;
    }
    await figma.clientStorage.setAsync(BASE_URL_KEY, url);
    savedBaseUrl = url;
    figma.notify('ベースURLを保存しました');
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
