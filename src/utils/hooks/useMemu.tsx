import routes from '@/routes';
import { MenuProps } from 'antd';
import { useMemo } from 'react';
import { Link, RouteObject } from 'react-router-dom';

type MenuItem = Required<MenuProps>['items'][number];

const parseRoutesToMenuItems = (routes: RouteObject[], parentPath = ''): MenuItem[] => {
  return routes.map((route) => {
    const { path, children } = route;
    const to = parentPath + `${path ? `/${path}` : ''}`;
    const item: MenuItem = {
      key: to || '/',
      label: <Link to={to}>{path || 'home'}</Link>,
      children: children ? parseRoutesToMenuItems(children, to) : undefined,
    };

    return item;
  });
};

export const useMenuItems = () => {
  return useMemo(() => {
    const menuItems = parseRoutesToMenuItems(routes);

    // @ts-ignore
    const children = menuItems.length === 1 && menuItems[0]!.children;
    if (children) {
      return children;
    }
    return menuItems;
  }, []);
};
