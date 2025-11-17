// Explicit index of blog modules.
// Add new blog imports here so the blog list is always deterministic.
import Blog1, { meta as meta1 } from './blog1.jsx';
import Blog2, { meta as meta2 } from './blog2.jsx';
import Blog3, { meta as meta3 } from './blog3.jsx';
import Blog4, { meta as meta4 } from './blog4.jsx';
import Blog5, { meta as meta5 } from './blog5.jsx';
import Blog6, { meta as meta6 } from './blog6.jsx';
import Blog7, { meta as meta7 } from './blog7.jsx';
import Blog8, { meta as meta8 } from './blog8.jsx';
import Blog9, { meta as meta9 } from './blog9.jsx';

export const blogIndex = [
    { component: Blog1, meta: meta1, path: './blog1.jsx' },
    { component: Blog2, meta: meta2, path: './blog2.jsx' },
    { component: Blog3, meta: meta3, path: './blog3.jsx' },
    { component: Blog4, meta: meta4, path: './blog4.jsx' },
    { component: Blog5, meta: meta5, path: './blog5.jsx' },
    { component: Blog6, meta: meta6, path: './blog6.jsx' },
    { component: Blog7, meta: meta7, path: './blog7.jsx' },
    { component: Blog8, meta: meta8, path: './blog8.jsx' },
    { component: Blog9, meta: meta9, path: './blog9.jsx' }
];

export default blogIndex;
