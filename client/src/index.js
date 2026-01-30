import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';

// 获取 HTML 中定义的挂载点
const container = document.getElementById('root');

// 使用 React 18 的 createRoot API
const root = createRoot(container);

// 渲染主应用组件
// StrictMode 会在开发模式下运行两次渲染以检查副作用，生产模式不受影响
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);