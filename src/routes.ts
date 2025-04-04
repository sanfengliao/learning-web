// 此文件由generateRoutes函数自动生成，请勿手动修改
import { RouteObject } from 'react-router-dom';
import $Pages$layout from '@/pages/layout';
import $Pages$index from '@/pages/index';
import $Pages$webgpu$index from '@/pages/webgpu/index';
import $Pages$webgpu$Helloworld$index from '@/pages/webgpu/Helloworld/index';
import $Pages$webgpu$InterState$index from '@/pages/webgpu/InterState/index';
import $Pages$webgpu$StorageBuffer$index from '@/pages/webgpu/StorageBuffer/index';
import $Pages$webgpu$UniformBuffer$index from '@/pages/webgpu/UniformBuffer/index';
import $Pages$webgpu$VertexBuffer$index from '@/pages/webgpu/VertexBuffer/index';

const routes: RouteObject[] = [
  {
    path: '',
    Component: $Pages$layout,
    children: [
      {
        index: true,
        Component: $Pages$index,
      },
      {
        path: 'webgpu',
        children: [
          {
            index: true,
            Component: $Pages$webgpu$index,
          },
          {
            path: 'Helloworld',
            Component: $Pages$webgpu$Helloworld$index,
          },
          {
            path: 'InterState',
            Component: $Pages$webgpu$InterState$index,
          },
          {
            path: 'StorageBuffer',
            Component: $Pages$webgpu$StorageBuffer$index,
          },
          {
            path: 'UniformBuffer',
            Component: $Pages$webgpu$UniformBuffer$index,
          },
          {
            path: 'VertexBuffer',
            Component: $Pages$webgpu$VertexBuffer$index,
          },
        ],
      },
    ],
  },
];

export default routes;
