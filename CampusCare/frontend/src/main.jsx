import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import ConfigMissing from './pages/ConfigMissing';
import { configureAmplify } from './services/config';
import './index.css';

const configured = configureAmplify();

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>{configured ? <App /> : <ConfigMissing />}</React.StrictMode>,
);
