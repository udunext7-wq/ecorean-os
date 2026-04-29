// ECOREAN BOC v6.0 — Hash-based SPA Router

class Router {
  constructor() {
    this.routes = new Map();
    this.notFoundHandler = null;
    this.beforeHooks = [];
    this.currentPath = null;
  }

  register(path, handler, opts) {
    this.routes.set(path, {
      handler: handler,
      meta: (opts && opts.meta) || {}
    });
  }

  setNotFound(handler) {
    this.notFoundHandler = handler;
  }

  beforeEach(hook) {
    this.beforeHooks.push(hook);
  }

  start() {
    window.addEventListener('hashchange', this._onHashChange.bind(this));
    this._onHashChange();
  }

  navigate(path) {
    window.location.hash = path;
  }

  _onHashChange() {
    const hash = window.location.hash || '#/';
    const path = hash.replace(/^#/, '') || '/';

    for (let hook of this.beforeHooks) {
      const result = hook(path, this.currentPath);
      if (result === false) return;
    }

    const route = this.routes.get(path);
    if (route) {
      this.currentPath = path;
      route.handler(path, route.meta);
    } else if (this.notFoundHandler) {
      this.notFoundHandler(path);
    }
  }

  getCurrentPath() {
    return this.currentPath;
  }
}

module.exports = { Router: Router };
