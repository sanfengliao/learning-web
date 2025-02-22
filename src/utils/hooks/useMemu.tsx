import { getGlobalRoutes } from '@modern-js/runtime/context';
import { Link, RouteObject } from '@modern-js/runtime/router';
import type { MenuProps } from 'antd';
import { useMemo } from 'react';
import { type NestedPath, concatPath, normalizeToNestPaths } from './path';

const parseRoutesToPaths = (
  routes: ReturnType<typeof getGlobalRoutes>,
  parent = '',
): string[] => {
  if (!routes) {
    return [];
  }

  const paths = routes.map(route => {
    const { path, children, index } = route;
    const curPath = index ? parent : concatPath(parent, path || '');
    if (children) {
      const childrenPaths = parseRoutesToPaths(children, curPath);
      return childrenPaths;
    }
    return [curPath];
  });
  return paths.flat(2).filter(Boolean) as string[];
};

const parseNestedPathToMenuItem = (items: NestedPath[]): MenuProps['items'] => {
  return items.map(item => {
    const { path, relativePath, children } = item;
    return {
      key: path,
      label: <Link to={path}> {relativePath || '首页'}</Link>,
      children: children.length && parseNestedPathToMenuItem(children),
    };
  });
};

export const useMemuItems = () => {
  const routes = getGlobalRoutes();
  const menuItems = useMemo(() => {
    const paths = normalizeToNestPaths(parseRoutesToPaths(routes));
    return parseNestedPathToMenuItem(paths);
  }, [routes]);
  return menuItems;
};
