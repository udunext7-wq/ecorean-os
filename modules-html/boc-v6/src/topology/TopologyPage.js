// ECOREAN BOC v6.0 — 시스템 토폴로지 화면
// [A][B][C] graph.json 12노드+24엣지 시각화
// Cytoscape.js (npm) — 오프라인 동작
// 원칙 15: try/catch

const cytoscape = require('cytoscape');

class TopologyPage {
  constructor(opts) {
    this.containerEl = opts.containerEl;
    this._cy = null;
    this._render();
    this._loadGraph();
  }

  _render() {
    this.containerEl.innerHTML = `
<div style="padding:22px;color:#F0EDE8;">
  <div style="border-bottom:1px solid #C9A84C;padding-bottom:11px;margin-bottom:15px;">
    <div style="font-size:17px;color:#C9A84C;letter-spacing:4px;font-weight:700;">TOPOLOGY</div>
    <div style="font-size:10px;color:#555;margin-top:2px;">ECOREAN BOC 시스템 구조 — 12노드 24엣지</div>
  </div>
  <div id="topo-legend" style="display:flex;gap:16px;margin-bottom:12px;flex-wrap:wrap;"></div>
  <div id="topo-cy" style="width:100%;height:560px;background:#0D0D0D;border:1px solid #1E1E1E;"></div>
  <div id="topo-detail" style="margin-top:12px;padding:10px 14px;background:#0F0F0F;border:1px solid #1E1E1E;font-size:11px;color:#666;min-height:48px;">
    노드를 클릭하면 상세 정보가 표시됩니다.
  </div>
</div>`;
  }

  async _loadGraph() {
    try {
      let graphData;
      try {
        const res = await fetch('../../../docs/graph.json');
        graphData = await res.json();
      } catch(_) {
        graphData = require('../../../../../docs/graph.json');
      }
      this._renderGraph(graphData);
    } catch(e) {
      console.error('[Topology]', e);
      const el = this.containerEl.querySelector('#topo-cy');
      if (el) el.innerHTML = `<div style="padding:40px;text-align:center;color:#C96D6D;">토폴로지 로드 실패: ${e.message}</div>`;
    }
  }

  _renderGraph(graphData) {
    const { nodes = [], edges = [], futureNodes = [] } = graphData;

    const TYPE_COLOR = {
      gate:   '#C9A84C',
      module: '#6DB96D',
      engine: '#6D9DB9',
      ml:     '#C96DB9',
      future: '#333'
    };

    const cyNodes = [
      ...nodes.map(n => ({
        data: {
          id:    n.id,
          label: n.label || n.id,
          type:  n.type  || 'module',
          desc:  n.description || '',
          sla:   n.sla ? `${n.sla.maxLatencyMs}ms` : '-',
          color: TYPE_COLOR[n.type] || '#999'
        }
      })),
      ...futureNodes.map(n => ({
        data: {
          id:    n.id,
          label: n.label || n.id,
          type:  'future',
          desc:  n.description || '(예정)',
          color: TYPE_COLOR.future
        }
      }))
    ];

    const cyEdges = edges.map((e, i) => ({
      data: {
        id:     `e${i}`,
        source: e.source || e.from,
        target: e.target || e.to,
        label:  e.label  || ''
      }
    }));

    this._cy = cytoscape({
      container: this.containerEl.querySelector('#topo-cy'),
      elements:  { nodes: cyNodes, edges: cyEdges },
      style: [
        {
          selector: 'node',
          style: {
            'background-color': 'data(color)',
            'label':            'data(label)',
            'color':            '#F0EDE8',
            'font-size':        '10px',
            'text-valign':      'center',
            'text-halign':      'center',
            'width':            '60px',
            'height':           '60px',
            'border-width':     '1px',
            'border-color':     '#2A2A2A',
            'text-wrap':        'wrap',
            'text-max-width':   '55px'
          }
        },
        {
          selector: 'node[type="future"]',
          style: {
            'background-color': '#1A1A1A',
            'border-style':     'dashed',
            'border-color':     '#333',
            'color':            '#444'
          }
        },
        {
          selector: 'edge',
          style: {
            'width':              '1.5px',
            'line-color':         '#2A2A2A',
            'target-arrow-color': '#2A2A2A',
            'target-arrow-shape': 'triangle',
            'curve-style':        'bezier',
            'font-size':          '8px',
            'color':              '#555'
          }
        },
        {
          selector: ':selected',
          style: {
            'border-color': '#C9A84C',
            'border-width':  '2px'
          }
        }
      ],
      layout: { name: 'cose', animate: true, padding: 30 }
    });

    this._cy.on('tap', 'node', (evt) => {
      const n      = evt.target.data();
      const detail = this.containerEl.querySelector('#topo-detail');
      if (detail) {
        detail.innerHTML = `
<span style="color:#C9A84C;font-weight:700">${n.label}</span>
<span style="margin-left:10px;font-size:9px;color:#555">[${n.type}]</span>
${n.sla ? `<span style="margin-left:8px;font-size:9px;color:#6D9DB9">SLA: ${n.sla}</span>` : ''}
<div style="margin-top:5px;color:#888">${n.desc}</div>`;
      }
    });

    const legend = this.containerEl.querySelector('#topo-legend');
    if (legend) {
      const types = [
        { type: 'gate',   label: 'Gate (입력)',   color: TYPE_COLOR.gate },
        { type: 'module', label: 'Module (처리)', color: TYPE_COLOR.module },
        { type: 'engine', label: 'Engine (계산)', color: TYPE_COLOR.engine },
        { type: 'ml',     label: 'ML (학습)',     color: TYPE_COLOR.ml },
        { type: 'future', label: 'Future (예정)', color: '#333' }
      ];
      legend.innerHTML = types.map(t =>
        `<div style="display:flex;align-items:center;gap:5px;font-size:10px;">
          <div style="width:12px;height:12px;background:${t.color};border-radius:2px;border:1px solid #333;"></div>
          <span style="color:#888">${t.label}</span>
        </div>`
      ).join('');
    }
  }
  unmount() {
    if (this._cy) { this._cy.destroy(); this._cy = null; }
    this.containerEl.innerHTML = '';
  }
}

module.exports = { TopologyPage };
