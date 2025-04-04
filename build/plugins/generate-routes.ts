import * as fs from 'fs';
import * as path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';

// 定义路由配置接口
export interface RoutePathInfo {
  path?: string;
  componentPath?: string;
  index?: boolean;
  children?: RoutePathInfo[];
}
export interface RouteInfo {
  path?: string;
  Component?: string;
  index?: boolean;
  children?: RouteInfo[];
}

export interface GenerateRoutesOptions {
  sourcePath?: string;
  outputPath?: string;
  basePath?: string;
  isLazy?: boolean;
}

/**
 * 生成React Router约定式路由配置
 * @param sourcePath 源文件夹路径，通常是页面组件所在目录
 * @param outputPath 输出路由文件的路径
 */
export async function generateRoutes({
  sourcePath = 'src/pages',
  outputPath = 'src/routes.ts',
  basePath = '',
  isLazy = false,
}: GenerateRoutesOptions = {}) {
  // 确保源路径存在
  if (!fs.existsSync(sourcePath)) {
    console.error(`源路径不存在: ${sourcePath}`);
    return [];
  }

  // 递归获取目录结构
  const { routePathInfos, layoutPath } = getRoutePathInfosFromDir(sourcePath, path.dirname(outputPath));
  let rootRoutePathInfos = routePathInfos;
  if (layoutPath || basePath) {
    rootRoutePathInfos = [
      {
        path: basePath,
        componentPath: layoutPath,
        children: routePathInfos,
      },
    ];
  }

  const { routes, imports } = generateRoutesCode(rootRoutePathInfos, isLazy);

  // 生成路由文件内容
  const routesFileContent = `
// 此文件由generateRoutes函数自动生成，请勿手动修改
import { RouteObject } from 'react-router-dom';
${isLazy ? "import React from 'react'" : ''};
${imports.join('\n')}

const routes: RouteObject[] = ${JSON.stringify(routes, null, 2).replace(/"Component": "(.+?)"/g, '"Component": $1')};

export default routes;
`;

  // 确保输出目录存在
  const outputDir = path.dirname(outputPath);
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  // 写入路由文件
  fs.writeFileSync(outputPath, routesFileContent);

  // 使用 Biome 格式化生成的文件
  await formatWithBiome(outputPath);

  return routes;
}

/**
 * 使用 Biome 格式化生成的文件
 * @param filePath 要格式化的文件路径
 */
async function formatWithBiome(filePath: string): Promise<void> {
  const execAsync = promisify(exec);

  try {
    // 尝试使用项目目录下的 Biome 格式化文件
    await execAsync(`npx biome format --write "${filePath}"`);
  } catch (err) {
    console.warn('使用 Biome 格式化文件失败，可能没有安装 Biome 或配置不正确');
    throw err;
  }
}

/**
 * 递归生成路由配置
 * @param dirPath 当前处理的目录路径
 */
function getRoutePathInfosFromDir(
  dirPath: string,
  outputDir: string
): { routePathInfos: RoutePathInfo[]; layoutPath?: string } {
  // 读取目录内容
  const items = fs.readdirSync(dirPath);
  const routePathInfos: RoutePathInfo[] = [];
  const subDirs: string[] = [];

  // 检查布局文件
  let layoutFile: string | undefined;

  // 第一遍扫描布局文件和目录
  for (const item of items) {
    const itemPath = path.join(dirPath, item);
    const stats = fs.statSync(itemPath);

    if (stats.isDirectory()) {
      subDirs.push(item);
    } else if (stats.isFile() && (item === 'layout.tsx' || item === 'layout.jsx')) {
      layoutFile = itemPath;
    }
  }

  // 处理当前目录中的文件
  for (const item of items) {
    const itemPath = path.join(dirPath, item);
    const stats = fs.statSync(itemPath);

    // 跳过目录和布局文件
    if (stats.isDirectory() || item === 'layout.tsx' || item === 'layout.jsx') {
      continue;
    }

    // 仅处理.tsx和.jsx文件
    if (!item.endsWith('.tsx') && !item.endsWith('.jsx')) {
      continue;
    }

    // 获取路由名称（去掉扩展名）
    const routeName = item.replace(/\.(jsx|tsx)$/, '');
    const isIndexFile = routeName === 'index';

    // 获取组件导入路径
    const importPath = path
      .relative(outputDir, itemPath)
      .replace(/\\/g, '/')
      .replace(/\.(jsx|tsx)$/, '');

    // 创建路由对象
    if (isIndexFile) {
      // 索引文件
      const indexRoute: RoutePathInfo = {
        index: true,
        componentPath: importPath,
      };

      routePathInfos.push(indexRoute);
    } else {
      // 普通路由
      const routePath =
        routeName.startsWith('[') && routeName.endsWith(']')
          ? `:${routeName.slice(1, -1)}` // 动态参数
          : routeName;

      const route: RoutePathInfo = {
        path: routePath,
        componentPath: importPath,
      };

      routePathInfos.push(route);
    }
  }

  // 处理子目录（递归）
  for (const subDir of subDirs) {
    const subDirPath = path.join(dirPath, subDir);

    // 解析路由名（处理动态参数）
    const routePath =
      subDir.startsWith('[') && subDir.endsWith(']')
        ? `:${subDir.slice(1, -1)}` // 动态参数
        : subDir;

    // 生成子路由
    const { routePathInfos: childRouteInfoRoutes, layoutPath } = getRoutePathInfosFromDir(subDirPath, outputDir);

    if (childRouteInfoRoutes.length === 0) {
      continue; // 跳过空目录
    }

    const isOnlyIndexRoute = childRouteInfoRoutes.length === 1 && childRouteInfoRoutes[0].index;

    if (layoutPath || !isOnlyIndexRoute) {
      // 创建父级路由
      const parentRoute: RoutePathInfo = {
        path: routePath,
        children: childRouteInfoRoutes,
        componentPath: layoutPath,
      };
      routePathInfos.push(parentRoute);
    } else {
      const parentRoute: RoutePathInfo = {
        path: routePath,
        componentPath: childRouteInfoRoutes[0].componentPath,
      };
      routePathInfos.push(parentRoute);
    }
  }
  let layoutPath: string | undefined;
  if (layoutFile) {
    layoutPath = path
      .relative(outputDir, layoutFile)
      .replace(/\\/g, '/')
      .replace(/\.(jsx|tsx)$/, '');
  }

  return { routePathInfos, layoutPath };
}

// 生成路由代码
function generateRoutesCode(routePathInfos: RoutePathInfo[], isLazy: boolean) {
  const imports = [];
  const routes: RouteInfo[] = [];
  routePathInfos.forEach((route) => {
    const { path, componentPath, index, children } = route;
    let Component: string;
    if (componentPath) {
      const importPath = getImportPath(componentPath);
      if (isLazy) {
        Component = `React.lazy(() => import('${importPath}'))`;
      } else {
        const importName = getImportName(componentPath);
        Component = importName;
        imports.push(`import ${importName} from '${importPath}';`);
      }
    }
    const routeInfo: RouteInfo = {
      path,
      index,
      Component,
    };
    if (children) {
      const { routes, imports: childrenImports } = generateRoutesCode(children, isLazy);
      routeInfo.children = routes;
      imports.push(...childrenImports);
    }
    routes.push(routeInfo);
  });

  return {
    routes,
    imports,
  };
}

const getImportPath = (path) => {
  return `@/${path}`;
};

const getImportName = (path) => {
  return '$' + path.replace(/[\/\\.\[\]\-\s]/g, '$').replace(/^./, (match) => match.toUpperCase());
};
