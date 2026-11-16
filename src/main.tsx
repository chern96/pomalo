import { render } from 'preact';
import './styles.css';
import { App } from './ui/App';
import { initPwa } from './app/pwa';
import { requestPersistence } from './state/storage';

render(<App />, document.getElementById('app')!);
initPwa();
void requestPersistence();
