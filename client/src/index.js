import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';   // main.js contains  Router setup


// Find the root div in public/index.html
const root = ReactDOM.createRoot(document.getElementById('root'));


root.render(
    <App />
);
