import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

const extensions = [
  '.web.tsx',
  '.web.ts',
  '.web.jsx',
  '.web.js',
  '.tsx',
  '.ts',
  '.jsx',
  '.js',
  '.mjs',
  '.json',
]

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  esbuild: {
    loader: 'tsx',
    include: /.*\.jsx?$|.*\.tsx?$/,
    exclude: [],
  },
  resolve: {
    alias: [
      { find: 'react-native/Libraries/Utilities/codegenNativeComponent', replacement: path.resolve(__dirname, 'src/utils/noopShim.ts') },
      { find: 'react-native/Libraries/Utilities/codegenNativeCommands', replacement: path.resolve(__dirname, 'src/utils/noopShim.ts') },
      { find: '@react-native/assets-registry/registry', replacement: path.resolve(__dirname, 'src/utils/assetsRegistryShim.js') },
      { find: /^react-native$/, replacement: 'react-native-web' },
      { find: 'react-native', replacement: 'react-native-web' },
    ],
    extensions,
  },
  define: {
    'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV || 'development'),
    __DEV__: JSON.stringify(process.env.NODE_ENV !== 'production'),
    global: 'window',
  },
  optimizeDeps: {
    esbuildOptions: {
      resolveExtensions: extensions,
      loader: {
        '.js': 'jsx',
      },
    },
  },
  server: {
    host: '0.0.0.0',
    port: 3000,
  },
})


