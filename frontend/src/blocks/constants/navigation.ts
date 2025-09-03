/**
 * @file Defines constants for the Navigation component.
 * @coder Gemini
 * @rewritetime 1 minute
 */
import { NavItemData } from '../types/navigation';

export const NAV_ITEMS: NavItemData[] = [
  { path: '/', label: 'Home', icon: '🏠' },
  { path: '/workspace', label: 'Workspace', icon: '⚡' },
  { path: '/prototype', label: 'Prototype', icon: '🎨' },
  { path: '/templates', label: 'Agent Lab', icon: '🧬' },
  { path: '/results', label: 'Archive', icon: '🗂️' },
  { path: '/settings', label: 'Control', icon: '🎛️' }
];
