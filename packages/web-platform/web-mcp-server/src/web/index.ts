import '@lynx-js/web-core';
import '@lynx-js/web-elements/all';
import '@lynx-js/web-core/index.css';
import '@lynx-js/web-elements/index.css';
import './index.css';
import { JSON_TEMPLATE_BASE } from '../../constants.js';
import type { LynxView } from '@lynx-js/web-core';

const lynxView = document.createElement('lynx-view');
document.body.appendChild(lynxView) as LynxView;
const searchParams = new URLSearchParams(document.location.search);
const casename = searchParams.get('casename');
lynxView.setAttribute('url', JSON_TEMPLATE_BASE + casename);
