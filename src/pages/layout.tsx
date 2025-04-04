import { useMenuItems } from '@/utils/hooks/useMemu';
import { Layout, Menu, theme } from 'antd';
import { useMemo } from 'react';
import { Outlet, useMatches } from 'react-router-dom';

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
      const currentPath = index === 0 ? `/${curr}` : `${acc[index - 1]}/${curr}`;
      return [...acc, currentPath];
    }, []);
    return paths;
  }, [matches]);

  console.log(defaultSelectedKeys);

  const menuItems = useMenuItems();

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
          items={menuItems}
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
