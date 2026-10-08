import { API_BASE_URL, IS_DEMO, IS_DEV } from './config.js';
import { presets } from './demo/presets.js';
import { createLiveSource } from './lib/api.js';
import { createDemoSource } from './lib/demo.js';

/**
 * Where recipes come from. Both sources share one interface:
 *   generate({ ingredients, diet, time }, { signal }) -> { recipes, notice, loadImage(index, { signal }) }
 */
export const recipeSource = IS_DEMO
  ? createDemoSource({ presets })
  : createLiveSource({ baseUrl: API_BASE_URL, dev: IS_DEV });
