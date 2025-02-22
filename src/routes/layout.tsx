import { useMemuItems } from '@/utils/hooks/useMemu';
import { Outlet, useLocation, useMatches } from '@modern-js/runtime/router';
import './index.css';

import { Layout, Menu, theme } from 'antd';
import { useMemo } from 'react';

const { Sider, Content } = Layout;

const App = () => {
  const {
    token: { colorBgContainer, borderRadiusLG },
  } = theme.useToken();
  const matches = useMatches();

  const defaultSelectedKeys = useMemo(() => {
    const lastMatch = matches[matches.length - 1];
    if (!lastMatch) {
      return [];
    }

    const path = lastMatch.pathname;

    if (path === '/') {
      return [];
    }
    const parts = path.split('/');
    parts.shift();

    const paths = parts.reduce((acc: string[], curr, index) => {
      const currentPath =
        index === 0 ? `/${curr}` : `${acc[index - 1]}/${curr}`;
      return [...acc, currentPath];
    }, []);
    return paths;
  }, [matches]);

  console.log(defaultSelectedKeys);

  const items = useMemuItems();
  return (
    <Layout
      style={{
        background: colorBgContainer,
        borderRadius: borderRadiusLG,
      }}
    >
      <Sider style={{ background: colorBgContainer }} width={200}>
        <Menu
          mode="inline"
          style={{ height: '100%' }}
          items={items}
          defaultSelectedKeys={defaultSelectedKeys}
          defaultOpenKeys={defaultSelectedKeys}
        />
      </Sider>
      <Content style={{ padding: '0 24px', minHeight: 280 }}>
        <Outlet />
      </Content>
    </Layout>
  );
};

export default App;
