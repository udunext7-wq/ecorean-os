// ECOREAN BOC v5.6 — Drawing Engine 추상 클래스
// 목적: CAD 라이브러리 (Konva → Three.js → Fabric.js) 자유 교체 보장

class DrawingEngine {
  constructor(opts) {
    this.opts = opts || {};
    this.drawings = new Map();
    this.listeners = [];
  }

  init()    { throw new Error('init() 미구현'); }
  render()  { throw new Error('render() 미구현'); }
  destroy() { throw new Error('destroy() 미구현'); }

  add(drawing) {
    this.drawings.set(drawing.id, drawing);
    this._notify('ADDED', drawing);
  }

  update(id, patch) {
    const existing = this.drawings.get(id);
    if (!existing) return null;
    const updated = Object.assign({}, existing, patch, { updatedAt: Date.now() });
    this.drawings.set(id, updated);
    this._notify('UPDATED', updated);
    return updated;
  }

  remove(id) {
    const existing = this.drawings.get(id);
    if (!existing) return false;
    this.drawings.delete(id);
    this._notify('REMOVED', existing);
    return true;
  }

  get(id)        { return this.drawings.get(id); }
  getAll()       { return Array.from(this.drawings.values()); }
  getByLayer(layer)   { return Array.from(this.drawings.values()).filter(function(d) { return d.layer === layer; }); }
  getBySpace(spaceId) { return Array.from(this.drawings.values()).filter(function(d) { return d.spaceId === spaceId; }); }

  onChange(handler) { this.listeners.push(handler); }

  _notify(action, drawing) {
    this.listeners.forEach(function(h) {
      try { h(action, drawing); } catch (e) { console.error('[DrawingEngine] handler:', e.message); }
    });
  }
}

module.exports = { DrawingEngine };
