import chokidar, { FSWatcher } from 'chokidar';
import path from 'path';

import type { RsbuildPlugin } from '@rsbuild/core';
import { generateRoutes, GenerateRoutesOptions } from './generate-routes';

// 导出为Rsbuild插件
export default (options: GenerateRoutesOptions = {}): RsbuildPlugin => {
  return {
    name: 'rsbuild-plugin-convention-routes',
    setup(api) {
      const outputPath = path.resolve(api.context.rootPath, options.outputPath || 'src/routes.ts');
      const sourcePath = path.resolve(api.context.rootPath, options.sourcePath || 'src/pages');
      let watcher: FSWatcher | null = null;

      // 重新生成路由的功能
      async function regenerateRoutes() {
        console.log('Detected file changes, regenerating routes...');
        generateRoutes({ ...options, sourcePath, outputPath });
      }

      // 初始生成路由
      api.onBeforeCreateCompiler(async () => {
        await generateRoutes({ ...options, sourcePath, outputPath });

        // 仅在开发环境下监听文件变化
        if (process.env.NODE_ENV === 'development') {
          watcher = chokidar.watch(sourcePath, {
            ignored: /(^|[\/\\])\../, // 忽略以点开头的文件
            persistent: true,
          });

          watcher.on('ready', () => {
            console.log(`Watching for changes in ${sourcePath}...`);

            // 初始扫描完成后才开始监听文件变化
            watcher!
              .on('add', () => regenerateRoutes())
              .on('unlink', () => regenerateRoutes())
              .on('addDir', () => regenerateRoutes())
              .on('unlinkDir', () => regenerateRoutes())
              .on('error', (error) => console.error(`Watcher error: ${error}`));
          });
        }
      });

      // 关闭开发服务器时停止监听
      api.onExit(() => {
        if (watcher) {
          watcher.close();
          watcher = null;
          console.log('Stopped watching for file changes.');
        }
      });
    },
  };
};
