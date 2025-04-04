import { defineConfig } from '@rsbuild/core';
import { pluginReact } from '@rsbuild/plugin-react';
import pluginConventionRoutes from './build/plugins/convention-routes';

export default defineConfig({
  plugins: [pluginReact(), pluginConventionRoutes()],
});
