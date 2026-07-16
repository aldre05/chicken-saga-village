// localStorage-mock.js — gameState.js calls the browser's global
// localStorage directly (no dependency injection), since it's a
// static, no-build-step, vanilla-JS game meant to run straight from
// index.html. To unit-test save/load logic under Node's built-in test
// runner (no browser, no jsdom dependency), this installs a minimal
// in-memory localStorage on `globalThis` before gameState.js is
// imported.
//
// Usage in a test file:
//   import './helpers/localStorage-mock.js'; // side-effecting import, must be first
//   import { loadGameState, saveGameState } from '../js/gameState.js';

class MemoryStorage {
  constructor() {
    this._data = new Map();
  }
  getItem(key) {
    return this._data.has(key) ? this._data.get(key) : null;
  }
  setItem(key, value) {
    this._data.set(key, String(value));
  }
  removeItem(key) {
    this._data.delete(key);
  }
  clear() {
    this._data.clear();
  }
  get length() {
    return this._data.size;
  }
  key(index) {
    return Array.from(this._data.keys())[index] ?? null;
  }
}

if (!globalThis.localStorage) {
  globalThis.localStorage = new MemoryStorage();
}

// Exported so tests can reset state between cases without leaking a
// save from one test into the next.
export function resetLocalStorage() {
  globalThis.localStorage.clear();
}
