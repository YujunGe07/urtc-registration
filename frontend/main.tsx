import '@fontsource-variable/geist';
import '@fontsource-variable/geist-mono';
import './fonts.css';
import { createRoot } from 'react-dom/client';
import Home from '../app/page';
import '../app/globals.css';
createRoot(document.getElementById('root')!).render(<Home />);
