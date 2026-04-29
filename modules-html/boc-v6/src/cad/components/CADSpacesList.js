// ECOREAN BOC v6.0 — CAD Spaces List
// 그려진 도형 목록 + 공간 타입 할당 드롭다운

const { SPACES, getAllSpaceKeys } = require('@estimate-v6/matrices/Spaces.cjs');

class CADSpacesList {
  constructor(opts) {
    this.containerEl = opts.containerEl;
    this.canvas = opts.canvas;
    this.spaceKeys = getAllSpaceKeys();

    this.unsubscribe = this.canvas.onAreaChange(() => this.render());
    this.render();
  }

  render() {
    const shapes = this.canvas.model.getAllShapes();

    if (shapes.length === 0) {
      this.containerEl.innerHTML = `
        <div class="cad-spaces-list">
          <h4>공간 목록</h4>
          <p style="color: var(--text-dim); font-size: 12px;">
            평면도에 사각형을 그려서 공간을 추가하세요.<br>
            "사각형" 도구 클릭 → 캔버스에서 드래그
          </p>
        </div>
      `;
      return;
    }

    this.containerEl.innerHTML = `
      <div class="cad-spaces-list">
        <h4>공간 목록 (${shapes.length})</h4>
        ${shapes.map((shape) => {
          const typeKey = this.canvas.spaceTypeMap.get(shape.id) || '';
          const sqm = this.canvas.pxToSqm(shape.width * shape.height);
          return `
            <div class="cad-space-row">
              <div class="shape-id">${shape.id.slice(0, 12)}...</div>
              <select data-shape-id="${shape.id}">
                <option value="">공간 선택</option>
                ${this.spaceKeys.map(k => `
                  <option value="${k}" ${typeKey === k ? 'selected' : ''}>${SPACES[k].name} (${k})</option>
                `).join('')}
              </select>
              <div class="area">${sqm.toFixed(2)}</div>
              <div class="area-unit">㎡</div>
            </div>
          `;
        }).join('')}
      </div>
    `;

    this.containerEl.querySelectorAll('select[data-shape-id]').forEach(sel => {
      sel.addEventListener('change', (e) => {
        const shapeId = e.target.dataset.shapeId;
        const typeKey = e.target.value;
        if (typeKey) this.canvas.assignSpaceType(shapeId, typeKey);
      });
    });
  }

  destroy() {
    if (this.unsubscribe) this.unsubscribe();
  }
}

module.exports = { CADSpacesList: CADSpacesList };
