import { RouterProvider, createBrowserRouter } from 'react-router-dom';
import routes from './routes';
import { ConfigProvider } from 'antd';

const router = createBrowserRouter(routes);

const App = () => {
  return (
    <ConfigProvider>
      <RouterProvider router={router} />
    </ConfigProvider>
  );
};

export default App;
