export const concatPath = (parent: string, path: string) => {
  if (!parent) return path;
  // 移除父路径结尾的斜杠和子路径开头的斜杠，避免重复
  const cleanParent = parent.endsWith('/') ? parent.slice(0, -1) : parent;
  const cleanPath = path.startsWith('/') ? path.slice(1) : path;
  return `${cleanParent}/${cleanPath}`;
};

export interface NestedPath {
  path: string;
  relativePath: string; // 新增相对路径字段
  children: NestedPath[];
}

export function normalizeToNestPaths(paths: string[]): NestedPath[] {
  const nodeMap = new Map<string, NestedPath>();
  const result: NestedPath[] = [];

  const sortedPaths = [...paths].sort(
    (a, b) => a.split('/').length - b.split('/').length,
  );

  sortedPaths.forEach(path => {
    const normalized = path.replace(/^\/+|\/+$/g, '');
    const fullPath = `/${normalized}`;

    if (nodeMap.has(fullPath)) return;

    // 计算相对路径
    const lastSlashIndex = fullPath.lastIndexOf('/');
    const relativePath =
      lastSlashIndex > 0 ? fullPath.slice(lastSlashIndex + 1) : normalized;

    const node: NestedPath = {
      path: fullPath,
      relativePath, // 添加相对路径
      children: [],
    };
    nodeMap.set(fullPath, node);

    const parentPath =
      lastSlashIndex > 0 ? fullPath.slice(0, lastSlashIndex) || '/' : null;

    if (parentPath && nodeMap.has(parentPath)) {
      // biome-ignore lint/style/noNonNullAssertion: <explanation>
      nodeMap.get(parentPath)!.children.push(node);
    } else {
      result.push(node);
    }
  });

  return result;
}
