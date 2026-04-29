// ECOREAN BOC v6.0 — CAD Toolbar
// 도구 선택 + 스케일 입력 + 리셋

class CADToolbar {
  constructor(opts) {
    this.containerEl = opts.containerEl;
    this.canvas = opts.canvas;
    this.render();
  }

  render() {
    this.containerEl.innerHTML = `
      <div class="cad-toolbar">
        <button class="tool-btn active" data-tool="select">선택</button>
        <button class="tool-btn" data-tool="rect">📐 사각형</button>
        <div class="spacer"></div>
        <div class="scale-input">
          <span>스케일</span>
          <input type="number" id="scale-input" value="${this.canvas.scale}" min="10" max="200" step="10">
          <span>px = 1m</span>
        </div>
        <button id="cad-reset">초기화</button>
      </div>
    `;

    this.containerEl.querySelectorAll('[data-tool]').forEach(btn => {
      btn.addEventListener('click', () => {
        this.containerEl.querySelectorAll('[data-tool]').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.canvas.setTool(btn.dataset.tool);
      });
    });

    this.containerEl.querySelector('#scale-input').addEventListener('input', (e) => {
      const val = parseInt(e.target.value);
      if (val > 0) this.canvas.setScale(val);
    });

    this.containerEl.querySelector('#cad-reset').addEventListener('click', () => {
      if (confirm('평면도를 초기화할까요?')) this.canvas.reset();
    });
  }
}

module.exports = { CADToolbar: CADToolbar };
