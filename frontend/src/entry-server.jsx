import React from 'react';
import { renderToString } from 'react-dom/server';
import { StaticRouter } from 'react-router';
import App from './App.jsx';

export async function render(url, context = {}) {
  // If your app needs async data for a route, resolve it here before rendering.
  // For simple pages this will just render the app to string.
  const element = (
    <StaticRouter location={url} context={context}>
      <App />
    </StaticRouter>
  );

  const html = renderToString(element);
  return { html, context };
}

export default render;
