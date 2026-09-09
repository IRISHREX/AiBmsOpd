if (typeof (window as any).global === 'undefined') {
  (window as any).global = window;
}
if (!window.process) {
  (window as any).process = { env: { NODE_ENV: 'development' } };
}

import { AppRegistry } from 'react-native';
import App from './App';

AppRegistry.registerComponent('App', () => App);
AppRegistry.runApplication('App', {
  initialProps: {},
  rootTag: document.getElementById('root'),
});
