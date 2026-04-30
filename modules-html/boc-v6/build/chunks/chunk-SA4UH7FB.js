import {
  __commonJS
} from "./chunk-GLFX53DW.js";

// src/contract/ContractController.js
var require_ContractController = __commonJS({
  "src/contract/ContractController.js"(exports, module) {
    function _localCreateContract(opts) {
      const total = opts.totalAmount;
      const vat = Math.round(total * 0.1);
      return {
        id: "contract_" + Date.now() + "_" + Math.random().toString(36).slice(2, 8),
        estimateId: opts.estimateId,
        tenantId: opts.tenantId || "HQ",
        customerName: opts.customerName || "",
        customerPhone: opts.customerPhone || "",
        customerAddress: opts.customerAddress || "",
        totalAmount: total,
        vatAmount: vat,
        finalAmount: total + vat,
        signedAt: null,
        status: "DRAFT",
        isSimulated: opts.isSimulated === true,
        createdAt: Date.now()
      };
    }
    var ContractController = class {
      constructor(opts) {
        this.estimate = opts.estimate;
        this.contract = null;
        this.listeners = /* @__PURE__ */ new Set();
      }
      subscribe(handler) {
        this.listeners.add(handler);
        return () => this.listeners.delete(handler);
      }
      _emit(type, payload) {
        this.listeners.forEach((h) => h(type, payload));
      }
      _validateCustomer(opts) {
        const errors = [];
        if (!opts.customerName || !opts.customerName.trim()) errors.push("\uACE0\uAC1D\uBA85 \uD544\uC218");
        if (!opts.customerPhone || !opts.customerPhone.trim()) errors.push("\uC5F0\uB77D\uCC98 \uD544\uC218");
        return errors;
      }
      getSummary() {
        const e = this.estimate;
        return {
          contractAmount: e.contract,
          vatAmount: Math.round(e.contract * 0.1),
          finalAmount: e.final,
          supply: e.supply,
          margin: e.margin,
          areaSqm: e.areaSqm,
          sqmPrice: e.sqmPrice,
          pyPrice: e.pyPrice
        };
      }
      async createDraft(customerOpts) {
        const errors = this._validateCustomer(customerOpts);
        if (errors.length > 0) return { ok: false, errors };
        const estimateId = this.estimate.id || "est_" + Date.now();
        const totalAmount = this.estimate.contract;
        if (typeof window !== "undefined" && window.boc && window.boc.contract) {
          try {
            const res = await window.boc.contract.create({
              estimateId,
              totalAmount,
              tenantId: "HQ",
              customerName: customerOpts.customerName || "",
              customerPhone: customerOpts.customerPhone || "",
              customerAddress: customerOpts.customerAddress || ""
            });
            if (res && res.ok) {
              this.contract = res.contract;
              this._emit("CONTRACT_CREATED", this.contract);
              return { ok: true, contract: this.contract };
            }
          } catch (e) {
            console.error("[ContractController] IPC \uC2E4\uD328:", e);
          }
        }
        this.contract = _localCreateContract({
          estimateId,
          totalAmount,
          tenantId: "HQ",
          customerName: customerOpts.customerName || "",
          customerPhone: customerOpts.customerPhone || "",
          customerAddress: customerOpts.customerAddress || "",
          isSimulated: !this.estimate.id
        });
        this._emit("CONTRACT_CREATED", this.contract);
        return { ok: true, contract: this.contract, local: true };
      }
      sign() {
        if (!this.contract) return { ok: false, error: "\uACC4\uC57D \uC5C6\uC74C" };
        if (this.contract.status !== "DRAFT") return { ok: false, error: "DRAFT \uC0C1\uD0DC\uB9CC \uC11C\uBA85 \uAC00\uB2A5" };
        this.contract.status = "SIGNED";
        this.contract.signedAt = Date.now();
        this._emit("CONTRACT_SIGNED", this.contract);
        return { ok: true, contract: this.contract };
      }
      cancel() {
        if (!this.contract) return { ok: false, error: "\uACC4\uC57D \uC5C6\uC74C" };
        if (!["DRAFT", "SIGNED"].includes(this.contract.status)) {
          return { ok: false, error: "\uCDE8\uC18C \uBD88\uAC00 \uC0C1\uD0DC" };
        }
        this.contract.status = "CANCELED";
        this._emit("CONTRACT_CANCELED", this.contract);
        return { ok: true, contract: this.contract };
      }
    };
    module.exports = { ContractController };
  }
});

// src/contract/EstimatePDF.js
var require_EstimatePDF = __commonJS({
  "src/contract/EstimatePDF.js"(exports, module) {
    function formatKRW(n) {
      return (n || 0).toLocaleString("ko-KR") + "\uC6D0";
    }
    function buildPrintHTML(estimate, contract, input) {
      const today = (/* @__PURE__ */ new Date()).toLocaleDateString("ko-KR");
      const customerName = contract ? contract.customerName || "(\uBBF8\uC791\uC131)" : "(\uBBF8\uC791\uC131)";
      const customerPhone = contract ? contract.customerPhone || "-" : "-";
      const customerAddress = contract ? contract.customerAddress || "-" : "-";
      const contractAmount = estimate.contractAmount || estimate.contract || 0;
      const vatAmount = estimate.vatAmount || Math.round(contractAmount * 0.1);
      const finalAmount = estimate.finalAmount || estimate.final || 0;
      return `<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <title>ECOREAN \uACAC\uC801\uC11C</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Malgun Gothic', sans-serif; color: #222; background: #fff; padding: 20mm; font-size: 10pt; }
    h1 { font-size: 20pt; text-align: center; margin-bottom: 6px; color: #1a1a1a; letter-spacing: 2px; }
    .subtitle { text-align: center; color: #888; font-size: 9pt; margin-bottom: 4px; }
    .company { text-align: center; font-size: 10pt; margin-bottom: 20px; color: #555; }
    .gold-line { border: none; border-top: 2px solid #c9a84c; margin: 10px 0 20px; }
    .section { margin-bottom: 18px; }
    .section h2 { font-size: 10pt; background: #f5f0e8; padding: 4px 10px; margin-bottom: 8px; border-left: 3px solid #c9a84c; }
    .info-grid { display: grid; grid-template-columns: 130px 1fr; gap: 5px 10px; }
    .info-grid .label { color: #777; }
    .amount-table { width: 100%; border-collapse: collapse; font-size: 10pt; }
    .amount-table th { background: #f5f0e8; padding: 6px 10px; text-align: left; border: 1px solid #ddd; font-weight: 600; }
    .amount-table td { padding: 6px 10px; border: 1px solid #ddd; }
    .amount-table .total-row td { font-weight: bold; background: #fffbe8; font-size: 11pt; }
    .right { text-align: right; }
    .meta-row { font-size: 8pt; color: #888; margin-top: 6px; }
    .sign-section { margin-top: 36px; border-top: 1px solid #ddd; padding-top: 16px; display: flex; justify-content: space-between; }
    .sign-box { text-align: center; width: 45%; }
    .sign-box .sign-title { font-size: 9pt; color: #555; margin-bottom: 30px; }
    .sign-box .sign-line { border-top: 1px solid #222; padding-top: 4px; font-size: 9pt; color: #888; }
    .footer { margin-top: 20px; text-align: center; font-size: 8pt; color: #bbb; }
    @media print { body { padding: 12mm; } }
  </style>
</head>
<body>
  <h1>\uC778\uD14C\uB9AC\uC5B4 \uACF5\uC0AC \uACAC\uC801\uC11C</h1>
  <div class="subtitle">ECOREAN BOC v6.0 \uC790\uB3D9 \uC0DD\uC131</div>
  <div class="company">\uC5D0\uCF54\uB9AC\uC5B8 \uC778\uD14C\uB9AC\uC5B4 (ECOREAN)</div>
  <hr class="gold-line">

  <div class="section">
    <h2>\uACE0\uAC1D \uC815\uBCF4</h2>
    <div class="info-grid">
      <span class="label">\uACE0\uAC1D\uBA85</span><span>${customerName}</span>
      <span class="label">\uC5F0\uB77D\uCC98</span><span>${customerPhone}</span>
      <span class="label">\uACF5\uC0AC \uC8FC\uC18C</span><span>${customerAddress}</span>
      <span class="label">\uACAC\uC801\uC77C</span><span>${today}</span>
    </div>
  </div>

  <div class="section">
    <h2>\uACF5\uC0AC \uC870\uAC74</h2>
    <div class="info-grid">
      <span class="label">\uC8FC\uAC70 \uD615\uD0DC</span><span>${input && input.residence || "-"}</span>
      <span class="label">\uBA74\uC801</span><span>${input && input.pyeong || "-"} \uD3C9 (${estimate.areaSqm ? estimate.areaSqm.toFixed(1) : "-"} \u33A1)</span>
      <span class="label">\uCEE8\uC149</span><span>${input && input.concept || "-"}</span>
      <span class="label">\uC2DC\uACF5 \uC139\uC158</span><span>${input && input.sections && input.sections.join(", ") || "-"}</span>
    </div>
  </div>

  <div class="section">
    <h2>\uAE08\uC561 \uB0B4\uC5ED</h2>
    <table class="amount-table">
      <thead>
        <tr><th>\uD56D\uBAA9</th><th class="right">\uAE08\uC561</th></tr>
      </thead>
      <tbody>
        <tr>
          <td>\uACF5\uAE09\uAC00 (\uC790\uC7AC + \uC778\uAC74\uBE44 \uD569\uACC4)</td>
          <td class="right">${formatKRW(estimate.supply)}</td>
        </tr>
        <tr>
          <td>\uB3C4\uAE09\uD569\uACC4 (\uBCF4\uC815\uACC4\uC218 \uC801\uC6A9 + \uAC04\uC811\uBE44)</td>
          <td class="right">${formatKRW(contractAmount)}</td>
        </tr>
        <tr>
          <td>\uBD80\uAC00\uC138 VAT (10%)</td>
          <td class="right">${formatKRW(vatAmount)}</td>
        </tr>
        <tr class="total-row">
          <td>\uCD5C\uC885 \uD569\uACC4 (VAT \uD3EC\uD568)</td>
          <td class="right">${formatKRW(finalAmount)}</td>
        </tr>
      </tbody>
    </table>
    <div class="meta-row">
      \u33A1\uB2F9 ${formatKRW(estimate.sqmPrice)} &nbsp;|&nbsp;
      \uD3C9\uB2F9 ${formatKRW(estimate.pyPrice)} &nbsp;|&nbsp;
      \uB9C8\uC9C4 ${estimate.margin || 0}%
    </div>
  </div>

  <div class="sign-section">
    <div class="sign-box">
      <div class="sign-title">\uBC1C\uC8FC\uCC98 (\uACE0\uAC1D)</div>
      <div class="sign-line">${customerName} &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; (\uC778)</div>
    </div>
    <div class="sign-box">
      <div class="sign-title">\uC218\uC8FC\uCC98 (\uC5D0\uCF54\uB9AC\uC5B8)</div>
      <div class="sign-line">\uC5D0\uCF54\uB9AC\uC5B8 \uC778\uD14C\uB9AC\uC5B4 \uB300\uD45C &nbsp;&nbsp; (\uC778)</div>
    </div>
  </div>

  <div class="footer">
    \uBCF8 \uACAC\uC801\uC11C\uB294 ECOREAN BOC v6.0\uC5D0\uC11C \uC790\uB3D9 \uC0DD\uC131\uB418\uC5C8\uC2B5\uB2C8\uB2E4. \uC720\uD6A8\uAE30\uAC04: \uACAC\uC801\uC77C\uB85C\uBD80\uD130 30\uC77C
  </div>
</body>
</html>`;
    }
    function printEstimate(estimate, contract, input) {
      try {
        const w = window.open("", "_blank", "width=820,height=700");
        if (!w) {
          alert("\uD31D\uC5C5\uC774 \uCC28\uB2E8\uB418\uC5C8\uC2B5\uB2C8\uB2E4. \uD31D\uC5C5 \uD5C8\uC6A9 \uD6C4 \uB2E4\uC2DC \uC2DC\uB3C4\uD558\uC138\uC694.");
          return;
        }
        w.document.write(buildPrintHTML(estimate, contract, input || {}));
        w.document.close();
        w.focus();
        setTimeout(() => {
          w.print();
        }, 500);
      } catch (e) {
        console.error("[EstimatePDF] \uCD9C\uB825 \uC2E4\uD328:", e);
      }
    }
    var EstimatePDF = { printEstimate, buildPrintHTML };
    module.exports = { EstimatePDF };
  }
});

// src/contract/ContractPage.js
var require_ContractPage = __commonJS({
  "src/contract/ContractPage.js"(exports, module) {
    var { ContractController } = require_ContractController();
    var { EstimatePDF } = require_EstimatePDF();
    function fmt(n) {
      return (n || 0).toLocaleString("ko-KR") + "\uC6D0";
    }
    var ContractPage = class {
      constructor(opts) {
        this.containerEl = opts.containerEl;
        this.estimate = opts.estimate;
        this.input = opts.input || {};
        this.controller = new ContractController({ estimate: this.estimate });
        this._render();
        this.controller.subscribe((evt, payload) => {
          if (evt === "CONTRACT_CREATED" || evt === "CONTRACT_SIGNED" || evt === "CONTRACT_CANCELED") {
            this._renderContractResult(payload);
          }
        });
      }
      _render() {
        const s = this.controller.getSummary();
        this.containerEl.innerHTML = `
      <div class="contract-page">
        <div class="page-header">
          <h2>\uACC4\uC57D\uC11C \uC791\uC131</h2>
          <div class="subtitle">\uACAC\uC801 \uC644\uC131 \u2192 \uACC4\uC57D \uCD08\uC548 \uC791\uC131 (Phase 4 Week 5)</div>
        </div>

        <div class="contract-grid">
          <div class="card estimate-summary-card">
            <h3>\uACAC\uC801 \uC694\uC57D</h3>
            <div class="summary-row">
              <span>\uACF5\uAE09\uAC00</span><span>${fmt(s.supply)}</span>
            </div>
            <div class="summary-row">
              <span>\uB3C4\uAE09\uD569\uACC4 (VAT \uC804)</span><span class="highlight">${fmt(s.contractAmount)}</span>
            </div>
            <div class="summary-row">
              <span>VAT (10%)</span><span>${fmt(s.vatAmount)}</span>
            </div>
            <div class="summary-row total">
              <span>\uCD5C\uC885\uAE08\uC561 (VAT \uD3EC\uD568)</span><span class="gold">${fmt(s.finalAmount)}</span>
            </div>
            <div class="summary-meta">
              <span>\uD3C9\uB2F9 ${fmt(s.pyPrice)}</span>
              <span>\uB9C8\uC9C4 ${s.margin || 0}%</span>
            </div>
          </div>

          <div class="card customer-form-card" id="customer-form-wrap">
            <h3>\uACE0\uAC1D \uC815\uBCF4</h3>
            <div class="form-group">
              <label>\uACE0\uAC1D\uBA85 *</label>
              <input type="text" id="contract-name" placeholder="\uD64D\uAE38\uB3D9">
            </div>
            <div class="form-group">
              <label>\uC5F0\uB77D\uCC98 *</label>
              <input type="text" id="contract-phone" placeholder="010-0000-0000">
            </div>
            <div class="form-group">
              <label>\uACF5\uC0AC \uC8FC\uC18C</label>
              <input type="text" id="contract-address" placeholder="\uC11C\uC6B8\uC2DC \uAC15\uB0A8\uAD6C ...">
            </div>
            <div class="form-error" id="contract-error" style="display:none;"></div>
            <div class="form-actions">
              <button class="primary" id="btn-create-draft">\uACC4\uC57D\uC11C \uCD08\uC548 \uC791\uC131</button>
              <button class="btn-secondary" id="btn-print-estimate">\u{1F4C4} PDF \uACAC\uC801\uC11C</button>
            </div>
          </div>
        </div>

        <div id="contract-result" style="display:none;"></div>
      </div>
    `;
        this.containerEl.querySelector("#btn-create-draft").addEventListener("click", () => {
          this._onCreateDraft();
        });
        this.containerEl.querySelector("#btn-print-estimate").addEventListener("click", () => {
          this._onPrintEstimate();
        });
      }
      async _onCreateDraft() {
        const name = this.containerEl.querySelector("#contract-name").value.trim();
        const phone = this.containerEl.querySelector("#contract-phone").value.trim();
        const address = this.containerEl.querySelector("#contract-address").value.trim();
        const errEl = this.containerEl.querySelector("#contract-error");
        const btn = this.containerEl.querySelector("#btn-create-draft");
        btn.disabled = true;
        btn.textContent = "\uC791\uC131 \uC911...";
        const r = await this.controller.createDraft({ customerName: name, customerPhone: phone, customerAddress: address });
        btn.disabled = false;
        btn.textContent = "\uACC4\uC57D\uC11C \uCD08\uC548 \uC791\uC131";
        if (!r.ok) {
          errEl.textContent = r.errors.join(" / ");
          errEl.style.display = "block";
          return;
        }
        errEl.style.display = "none";
      }
      _renderContractResult(contract) {
        const resultEl = this.containerEl.querySelector("#contract-result");
        const formWrap = this.containerEl.querySelector("#customer-form-wrap");
        formWrap.style.opacity = "0.5";
        formWrap.querySelector("#btn-create-draft").disabled = true;
        const isCanceled = contract.status === "CANCELED";
        resultEl.style.display = "block";
        resultEl.innerHTML = `
      <div class="card contract-result-card">
        <div class="result-badge ${contract.status.toLowerCase()}">
          ${contract.status === "SIGNED" ? "\u2705 \uACC4\uC57D \uC644\uB8CC (SIGNED)" : contract.status === "CANCELED" ? "\u274C \uACC4\uC57D \uCDE8\uC18C (CANCELED)" : "\u{1F4C4} \uACC4\uC57D \uCD08\uC548 (DRAFT)"}
        </div>
        <div class="result-grid">
          <div class="result-item"><span>\uACC4\uC57D ID</span><span style="font-size:0.75rem;">${contract.id}</span></div>
          <div class="result-item"><span>\uACE0\uAC1D\uBA85</span><span>${contract.customerName}</span></div>
          <div class="result-item"><span>\uC5F0\uB77D\uCC98</span><span>${contract.customerPhone}</span></div>
          <div class="result-item"><span>\uACF5\uC0AC \uC8FC\uC18C</span><span>${contract.customerAddress || "-"}</span></div>
          <div class="result-item"><span>\uB3C4\uAE09\uD569\uACC4</span><span>${fmt(contract.totalAmount)}</span></div>
          <div class="result-item"><span>VAT</span><span>${fmt(contract.vatAmount)}</span></div>
          <div class="result-item total"><span>\uCD5C\uC885\uAE08\uC561</span><span>${fmt(contract.finalAmount)}</span></div>
          <div class="result-item"><span>\uC0C1\uD0DC</span><span class="status-badge ${contract.status}">${contract.status}</span></div>
          ${contract.local ? '<div class="result-item warn" style="grid-column:1/-1;"><span>\u26A0\uFE0F</span><span>\uB85C\uCEEC \uC0DD\uC131 (IPC \uBBF8\uC5F0\uACB0 \u2014 DB \uBBF8\uC800\uC7A5)</span></div>' : ""}
        </div>
        ${!isCanceled && contract.status === "DRAFT" ? `
          <div class="result-actions">
            <button class="primary" id="btn-sign">\u270D\uFE0F \uC11C\uBA85 \uC644\uB8CC (DRAFT \u2192 SIGNED)</button>
            <button class="btn-danger" id="btn-cancel-contract">\uACC4\uC57D \uCDE8\uC18C</button>
          </div>
        ` : ""}
        <div class="result-actions" style="margin-top: 8px;">
          <button class="btn-secondary" id="btn-print-signed">\u{1F4C4} \uACC4\uC57D\uC11C \uCD9C\uB825</button>
          <button class="btn-secondary" id="btn-new-estimate" onclick="location.reload()">\uC0C8 \uACAC\uC801 \uB9CC\uB4E4\uAE30</button>
        </div>
      </div>
    `;
        if (!isCanceled && contract.status === "DRAFT") {
          resultEl.querySelector("#btn-sign").addEventListener("click", () => {
            const r = this.controller.sign();
            if (r.ok) this._renderContractResult(r.contract);
          });
          resultEl.querySelector("#btn-cancel-contract").addEventListener("click", () => {
            if (confirm("\uACC4\uC57D\uC744 \uCDE8\uC18C\uD558\uC2DC\uACA0\uC2B5\uB2C8\uAE4C?")) {
              const r = this.controller.cancel();
              if (r.ok) this._renderContractResult(r.contract);
            }
          });
        }
        resultEl.querySelector("#btn-print-signed").addEventListener("click", () => {
          this._onPrintEstimate(contract);
        });
      }
      _onPrintEstimate(contract) {
        const s = this.controller.getSummary();
        EstimatePDF.printEstimate(
          { ...this.estimate, ...s },
          contract || this.controller.contract,
          this.input
        );
      }
      destroy() {
      }
    };
    module.exports = { ContractPage };
  }
});

export {
  require_ContractController,
  require_EstimatePDF,
  require_ContractPage
};
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsiLi4vLi4vc3JjL2NvbnRyYWN0L0NvbnRyYWN0Q29udHJvbGxlci5qcyIsICIuLi8uLi9zcmMvY29udHJhY3QvRXN0aW1hdGVQREYuanMiLCAiLi4vLi4vc3JjL2NvbnRyYWN0L0NvbnRyYWN0UGFnZS5qcyJdLAogICJzb3VyY2VzQ29udGVudCI6IFsiLy8gRUNPUkVBTiBCT0MgdjYuMCBcdTIwMTQgQ29udHJhY3QgQ29udHJvbGxlciAoVUkgXHVCODA4XHVDNzc0XHVDNUI0KVxuLy8gSVBDIFx1QzZCMFx1QzEyMCAoRWxlY3Ryb24pLCBcdUI4NUNcdUNFRUMgZmFsbGJhY2sgKFx1QzJEQ1x1QkJBQywgREIgXHVCQkY4XHVDODAwXHVDN0E1KVxuXG5mdW5jdGlvbiBfbG9jYWxDcmVhdGVDb250cmFjdChvcHRzKSB7XG4gIGNvbnN0IHRvdGFsID0gb3B0cy50b3RhbEFtb3VudDtcbiAgY29uc3QgdmF0ID0gTWF0aC5yb3VuZCh0b3RhbCAqIDAuMTApO1xuICByZXR1cm4ge1xuICAgIGlkOiAnY29udHJhY3RfJyArIERhdGUubm93KCkgKyAnXycgKyBNYXRoLnJhbmRvbSgpLnRvU3RyaW5nKDM2KS5zbGljZSgyLCA4KSxcbiAgICBlc3RpbWF0ZUlkOiBvcHRzLmVzdGltYXRlSWQsXG4gICAgdGVuYW50SWQ6IG9wdHMudGVuYW50SWQgfHwgJ0hRJyxcbiAgICBjdXN0b21lck5hbWU6IG9wdHMuY3VzdG9tZXJOYW1lIHx8ICcnLFxuICAgIGN1c3RvbWVyUGhvbmU6IG9wdHMuY3VzdG9tZXJQaG9uZSB8fCAnJyxcbiAgICBjdXN0b21lckFkZHJlc3M6IG9wdHMuY3VzdG9tZXJBZGRyZXNzIHx8ICcnLFxuICAgIHRvdGFsQW1vdW50OiB0b3RhbCxcbiAgICB2YXRBbW91bnQ6IHZhdCxcbiAgICBmaW5hbEFtb3VudDogdG90YWwgKyB2YXQsXG4gICAgc2lnbmVkQXQ6IG51bGwsXG4gICAgc3RhdHVzOiAnRFJBRlQnLFxuICAgIGlzU2ltdWxhdGVkOiBvcHRzLmlzU2ltdWxhdGVkID09PSB0cnVlLFxuICAgIGNyZWF0ZWRBdDogRGF0ZS5ub3coKVxuICB9O1xufVxuXG5jbGFzcyBDb250cmFjdENvbnRyb2xsZXIge1xuICBjb25zdHJ1Y3RvcihvcHRzKSB7XG4gICAgdGhpcy5lc3RpbWF0ZSA9IG9wdHMuZXN0aW1hdGU7XG4gICAgdGhpcy5jb250cmFjdCA9IG51bGw7XG4gICAgdGhpcy5saXN0ZW5lcnMgPSBuZXcgU2V0KCk7XG4gIH1cblxuICBzdWJzY3JpYmUoaGFuZGxlcikge1xuICAgIHRoaXMubGlzdGVuZXJzLmFkZChoYW5kbGVyKTtcbiAgICByZXR1cm4gKCkgPT4gdGhpcy5saXN0ZW5lcnMuZGVsZXRlKGhhbmRsZXIpO1xuICB9XG5cbiAgX2VtaXQodHlwZSwgcGF5bG9hZCkge1xuICAgIHRoaXMubGlzdGVuZXJzLmZvckVhY2goaCA9PiBoKHR5cGUsIHBheWxvYWQpKTtcbiAgfVxuXG4gIF92YWxpZGF0ZUN1c3RvbWVyKG9wdHMpIHtcbiAgICBjb25zdCBlcnJvcnMgPSBbXTtcbiAgICBpZiAoIW9wdHMuY3VzdG9tZXJOYW1lIHx8ICFvcHRzLmN1c3RvbWVyTmFtZS50cmltKCkpIGVycm9ycy5wdXNoKCdcdUFDRTBcdUFDMURcdUJBODUgXHVENTQ0XHVDMjE4Jyk7XG4gICAgaWYgKCFvcHRzLmN1c3RvbWVyUGhvbmUgfHwgIW9wdHMuY3VzdG9tZXJQaG9uZS50cmltKCkpIGVycm9ycy5wdXNoKCdcdUM1RjBcdUI3N0RcdUNDOTggXHVENTQ0XHVDMjE4Jyk7XG4gICAgcmV0dXJuIGVycm9ycztcbiAgfVxuXG4gIGdldFN1bW1hcnkoKSB7XG4gICAgY29uc3QgZSA9IHRoaXMuZXN0aW1hdGU7XG4gICAgcmV0dXJuIHtcbiAgICAgIGNvbnRyYWN0QW1vdW50OiBlLmNvbnRyYWN0LFxuICAgICAgdmF0QW1vdW50OiBNYXRoLnJvdW5kKGUuY29udHJhY3QgKiAwLjEwKSxcbiAgICAgIGZpbmFsQW1vdW50OiBlLmZpbmFsLFxuICAgICAgc3VwcGx5OiBlLnN1cHBseSxcbiAgICAgIG1hcmdpbjogZS5tYXJnaW4sXG4gICAgICBhcmVhU3FtOiBlLmFyZWFTcW0sXG4gICAgICBzcW1QcmljZTogZS5zcW1QcmljZSxcbiAgICAgIHB5UHJpY2U6IGUucHlQcmljZVxuICAgIH07XG4gIH1cblxuICBhc3luYyBjcmVhdGVEcmFmdChjdXN0b21lck9wdHMpIHtcbiAgICBjb25zdCBlcnJvcnMgPSB0aGlzLl92YWxpZGF0ZUN1c3RvbWVyKGN1c3RvbWVyT3B0cyk7XG4gICAgaWYgKGVycm9ycy5sZW5ndGggPiAwKSByZXR1cm4geyBvazogZmFsc2UsIGVycm9ycyB9O1xuXG4gICAgY29uc3QgZXN0aW1hdGVJZCA9IHRoaXMuZXN0aW1hdGUuaWQgfHwgKCdlc3RfJyArIERhdGUubm93KCkpO1xuICAgIGNvbnN0IHRvdGFsQW1vdW50ID0gdGhpcy5lc3RpbWF0ZS5jb250cmFjdDtcblxuICAgIC8vIElQQyBcdUM2QjBcdUMxMjAgKEVsZWN0cm9uIFx1RDY1OFx1QUNCRClcbiAgICBpZiAodHlwZW9mIHdpbmRvdyAhPT0gJ3VuZGVmaW5lZCcgJiYgd2luZG93LmJvYyAmJiB3aW5kb3cuYm9jLmNvbnRyYWN0KSB7XG4gICAgICB0cnkge1xuICAgICAgICBjb25zdCByZXMgPSBhd2FpdCB3aW5kb3cuYm9jLmNvbnRyYWN0LmNyZWF0ZSh7XG4gICAgICAgICAgZXN0aW1hdGVJZCxcbiAgICAgICAgICB0b3RhbEFtb3VudCxcbiAgICAgICAgICB0ZW5hbnRJZDogJ0hRJyxcbiAgICAgICAgICBjdXN0b21lck5hbWU6IGN1c3RvbWVyT3B0cy5jdXN0b21lck5hbWUgfHwgJycsXG4gICAgICAgICAgY3VzdG9tZXJQaG9uZTogY3VzdG9tZXJPcHRzLmN1c3RvbWVyUGhvbmUgfHwgJycsXG4gICAgICAgICAgY3VzdG9tZXJBZGRyZXNzOiBjdXN0b21lck9wdHMuY3VzdG9tZXJBZGRyZXNzIHx8ICcnXG4gICAgICAgIH0pO1xuICAgICAgICBpZiAocmVzICYmIHJlcy5vaykge1xuICAgICAgICAgIHRoaXMuY29udHJhY3QgPSByZXMuY29udHJhY3Q7XG4gICAgICAgICAgdGhpcy5fZW1pdCgnQ09OVFJBQ1RfQ1JFQVRFRCcsIHRoaXMuY29udHJhY3QpO1xuICAgICAgICAgIHJldHVybiB7IG9rOiB0cnVlLCBjb250cmFjdDogdGhpcy5jb250cmFjdCB9O1xuICAgICAgICB9XG4gICAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgIGNvbnNvbGUuZXJyb3IoJ1tDb250cmFjdENvbnRyb2xsZXJdIElQQyBcdUMyRTRcdUQzMjg6JywgZSk7XG4gICAgICB9XG4gICAgfVxuXG4gICAgLy8gXHVCODVDXHVDRUVDIGZhbGxiYWNrXG4gICAgdGhpcy5jb250cmFjdCA9IF9sb2NhbENyZWF0ZUNvbnRyYWN0KHtcbiAgICAgIGVzdGltYXRlSWQsXG4gICAgICB0b3RhbEFtb3VudCxcbiAgICAgIHRlbmFudElkOiAnSFEnLFxuICAgICAgY3VzdG9tZXJOYW1lOiBjdXN0b21lck9wdHMuY3VzdG9tZXJOYW1lIHx8ICcnLFxuICAgICAgY3VzdG9tZXJQaG9uZTogY3VzdG9tZXJPcHRzLmN1c3RvbWVyUGhvbmUgfHwgJycsXG4gICAgICBjdXN0b21lckFkZHJlc3M6IGN1c3RvbWVyT3B0cy5jdXN0b21lckFkZHJlc3MgfHwgJycsXG4gICAgICBpc1NpbXVsYXRlZDogIXRoaXMuZXN0aW1hdGUuaWRcbiAgICB9KTtcbiAgICB0aGlzLl9lbWl0KCdDT05UUkFDVF9DUkVBVEVEJywgdGhpcy5jb250cmFjdCk7XG4gICAgcmV0dXJuIHsgb2s6IHRydWUsIGNvbnRyYWN0OiB0aGlzLmNvbnRyYWN0LCBsb2NhbDogdHJ1ZSB9O1xuICB9XG5cbiAgc2lnbigpIHtcbiAgICBpZiAoIXRoaXMuY29udHJhY3QpIHJldHVybiB7IG9rOiBmYWxzZSwgZXJyb3I6ICdcdUFDQzRcdUM1N0QgXHVDNUM2XHVDNzRDJyB9O1xuICAgIGlmICh0aGlzLmNvbnRyYWN0LnN0YXR1cyAhPT0gJ0RSQUZUJykgcmV0dXJuIHsgb2s6IGZhbHNlLCBlcnJvcjogJ0RSQUZUIFx1QzBDMVx1RDBEQ1x1QjlDQyBcdUMxMUNcdUJBODUgXHVBQzAwXHVCMkE1JyB9O1xuICAgIHRoaXMuY29udHJhY3Quc3RhdHVzID0gJ1NJR05FRCc7XG4gICAgdGhpcy5jb250cmFjdC5zaWduZWRBdCA9IERhdGUubm93KCk7XG4gICAgdGhpcy5fZW1pdCgnQ09OVFJBQ1RfU0lHTkVEJywgdGhpcy5jb250cmFjdCk7XG4gICAgcmV0dXJuIHsgb2s6IHRydWUsIGNvbnRyYWN0OiB0aGlzLmNvbnRyYWN0IH07XG4gIH1cblxuICBjYW5jZWwoKSB7XG4gICAgaWYgKCF0aGlzLmNvbnRyYWN0KSByZXR1cm4geyBvazogZmFsc2UsIGVycm9yOiAnXHVBQ0M0XHVDNTdEIFx1QzVDNlx1Qzc0QycgfTtcbiAgICBpZiAoIVsnRFJBRlQnLCAnU0lHTkVEJ10uaW5jbHVkZXModGhpcy5jb250cmFjdC5zdGF0dXMpKSB7XG4gICAgICByZXR1cm4geyBvazogZmFsc2UsIGVycm9yOiAnXHVDREU4XHVDMThDIFx1QkQ4OFx1QUMwMCBcdUMwQzFcdUQwREMnIH07XG4gICAgfVxuICAgIHRoaXMuY29udHJhY3Quc3RhdHVzID0gJ0NBTkNFTEVEJztcbiAgICB0aGlzLl9lbWl0KCdDT05UUkFDVF9DQU5DRUxFRCcsIHRoaXMuY29udHJhY3QpO1xuICAgIHJldHVybiB7IG9rOiB0cnVlLCBjb250cmFjdDogdGhpcy5jb250cmFjdCB9O1xuICB9XG59XG5cbm1vZHVsZS5leHBvcnRzID0geyBDb250cmFjdENvbnRyb2xsZXIgfTtcbiIsICIvLyBFQ09SRUFOIEJPQyB2Ni4wIFx1MjAxNCBcdUFDQUNcdUM4MDFcdUMxMUMgUERGIFx1Q0Q5Q1x1QjgyNSAod2luZG93LnByaW50IFx1QUUzMFx1QkMxOClcblxuZnVuY3Rpb24gZm9ybWF0S1JXKG4pIHtcbiAgcmV0dXJuIChuIHx8IDApLnRvTG9jYWxlU3RyaW5nKCdrby1LUicpICsgJ1x1QzZEMCc7XG59XG5cbmZ1bmN0aW9uIGJ1aWxkUHJpbnRIVE1MKGVzdGltYXRlLCBjb250cmFjdCwgaW5wdXQpIHtcbiAgY29uc3QgdG9kYXkgPSBuZXcgRGF0ZSgpLnRvTG9jYWxlRGF0ZVN0cmluZygna28tS1InKTtcbiAgY29uc3QgY3VzdG9tZXJOYW1lICAgID0gY29udHJhY3QgPyAoY29udHJhY3QuY3VzdG9tZXJOYW1lIHx8ICcoXHVCQkY4XHVDNzkxXHVDMTMxKScpIDogJyhcdUJCRjhcdUM3OTFcdUMxMzEpJztcbiAgY29uc3QgY3VzdG9tZXJQaG9uZSAgID0gY29udHJhY3QgPyAoY29udHJhY3QuY3VzdG9tZXJQaG9uZSB8fCAnLScpIDogJy0nO1xuICBjb25zdCBjdXN0b21lckFkZHJlc3MgPSBjb250cmFjdCA/IChjb250cmFjdC5jdXN0b21lckFkZHJlc3MgfHwgJy0nKSA6ICctJztcbiAgY29uc3QgY29udHJhY3RBbW91bnQgID0gZXN0aW1hdGUuY29udHJhY3RBbW91bnQgfHwgZXN0aW1hdGUuY29udHJhY3QgfHwgMDtcbiAgY29uc3QgdmF0QW1vdW50ICAgICAgID0gZXN0aW1hdGUudmF0QW1vdW50IHx8IE1hdGgucm91bmQoY29udHJhY3RBbW91bnQgKiAwLjEpO1xuICBjb25zdCBmaW5hbEFtb3VudCAgICAgPSBlc3RpbWF0ZS5maW5hbEFtb3VudCB8fCBlc3RpbWF0ZS5maW5hbCB8fCAwO1xuXG4gIHJldHVybiBgPCFET0NUWVBFIGh0bWw+XG48aHRtbCBsYW5nPVwia29cIj5cbjxoZWFkPlxuICA8bWV0YSBjaGFyc2V0PVwiVVRGLThcIj5cbiAgPHRpdGxlPkVDT1JFQU4gXHVBQ0FDXHVDODAxXHVDMTFDPC90aXRsZT5cbiAgPHN0eWxlPlxuICAgICogeyBtYXJnaW46IDA7IHBhZGRpbmc6IDA7IGJveC1zaXppbmc6IGJvcmRlci1ib3g7IH1cbiAgICBib2R5IHsgZm9udC1mYW1pbHk6ICdNYWxndW4gR290aGljJywgc2Fucy1zZXJpZjsgY29sb3I6ICMyMjI7IGJhY2tncm91bmQ6ICNmZmY7IHBhZGRpbmc6IDIwbW07IGZvbnQtc2l6ZTogMTBwdDsgfVxuICAgIGgxIHsgZm9udC1zaXplOiAyMHB0OyB0ZXh0LWFsaWduOiBjZW50ZXI7IG1hcmdpbi1ib3R0b206IDZweDsgY29sb3I6ICMxYTFhMWE7IGxldHRlci1zcGFjaW5nOiAycHg7IH1cbiAgICAuc3VidGl0bGUgeyB0ZXh0LWFsaWduOiBjZW50ZXI7IGNvbG9yOiAjODg4OyBmb250LXNpemU6IDlwdDsgbWFyZ2luLWJvdHRvbTogNHB4OyB9XG4gICAgLmNvbXBhbnkgeyB0ZXh0LWFsaWduOiBjZW50ZXI7IGZvbnQtc2l6ZTogMTBwdDsgbWFyZ2luLWJvdHRvbTogMjBweDsgY29sb3I6ICM1NTU7IH1cbiAgICAuZ29sZC1saW5lIHsgYm9yZGVyOiBub25lOyBib3JkZXItdG9wOiAycHggc29saWQgI2M5YTg0YzsgbWFyZ2luOiAxMHB4IDAgMjBweDsgfVxuICAgIC5zZWN0aW9uIHsgbWFyZ2luLWJvdHRvbTogMThweDsgfVxuICAgIC5zZWN0aW9uIGgyIHsgZm9udC1zaXplOiAxMHB0OyBiYWNrZ3JvdW5kOiAjZjVmMGU4OyBwYWRkaW5nOiA0cHggMTBweDsgbWFyZ2luLWJvdHRvbTogOHB4OyBib3JkZXItbGVmdDogM3B4IHNvbGlkICNjOWE4NGM7IH1cbiAgICAuaW5mby1ncmlkIHsgZGlzcGxheTogZ3JpZDsgZ3JpZC10ZW1wbGF0ZS1jb2x1bW5zOiAxMzBweCAxZnI7IGdhcDogNXB4IDEwcHg7IH1cbiAgICAuaW5mby1ncmlkIC5sYWJlbCB7IGNvbG9yOiAjNzc3OyB9XG4gICAgLmFtb3VudC10YWJsZSB7IHdpZHRoOiAxMDAlOyBib3JkZXItY29sbGFwc2U6IGNvbGxhcHNlOyBmb250LXNpemU6IDEwcHQ7IH1cbiAgICAuYW1vdW50LXRhYmxlIHRoIHsgYmFja2dyb3VuZDogI2Y1ZjBlODsgcGFkZGluZzogNnB4IDEwcHg7IHRleHQtYWxpZ246IGxlZnQ7IGJvcmRlcjogMXB4IHNvbGlkICNkZGQ7IGZvbnQtd2VpZ2h0OiA2MDA7IH1cbiAgICAuYW1vdW50LXRhYmxlIHRkIHsgcGFkZGluZzogNnB4IDEwcHg7IGJvcmRlcjogMXB4IHNvbGlkICNkZGQ7IH1cbiAgICAuYW1vdW50LXRhYmxlIC50b3RhbC1yb3cgdGQgeyBmb250LXdlaWdodDogYm9sZDsgYmFja2dyb3VuZDogI2ZmZmJlODsgZm9udC1zaXplOiAxMXB0OyB9XG4gICAgLnJpZ2h0IHsgdGV4dC1hbGlnbjogcmlnaHQ7IH1cbiAgICAubWV0YS1yb3cgeyBmb250LXNpemU6IDhwdDsgY29sb3I6ICM4ODg7IG1hcmdpbi10b3A6IDZweDsgfVxuICAgIC5zaWduLXNlY3Rpb24geyBtYXJnaW4tdG9wOiAzNnB4OyBib3JkZXItdG9wOiAxcHggc29saWQgI2RkZDsgcGFkZGluZy10b3A6IDE2cHg7IGRpc3BsYXk6IGZsZXg7IGp1c3RpZnktY29udGVudDogc3BhY2UtYmV0d2VlbjsgfVxuICAgIC5zaWduLWJveCB7IHRleHQtYWxpZ246IGNlbnRlcjsgd2lkdGg6IDQ1JTsgfVxuICAgIC5zaWduLWJveCAuc2lnbi10aXRsZSB7IGZvbnQtc2l6ZTogOXB0OyBjb2xvcjogIzU1NTsgbWFyZ2luLWJvdHRvbTogMzBweDsgfVxuICAgIC5zaWduLWJveCAuc2lnbi1saW5lIHsgYm9yZGVyLXRvcDogMXB4IHNvbGlkICMyMjI7IHBhZGRpbmctdG9wOiA0cHg7IGZvbnQtc2l6ZTogOXB0OyBjb2xvcjogIzg4ODsgfVxuICAgIC5mb290ZXIgeyBtYXJnaW4tdG9wOiAyMHB4OyB0ZXh0LWFsaWduOiBjZW50ZXI7IGZvbnQtc2l6ZTogOHB0OyBjb2xvcjogI2JiYjsgfVxuICAgIEBtZWRpYSBwcmludCB7IGJvZHkgeyBwYWRkaW5nOiAxMm1tOyB9IH1cbiAgPC9zdHlsZT5cbjwvaGVhZD5cbjxib2R5PlxuICA8aDE+XHVDNzc4XHVEMTRDXHVCOUFDXHVDNUI0IFx1QUNGNVx1QzBBQyBcdUFDQUNcdUM4MDFcdUMxMUM8L2gxPlxuICA8ZGl2IGNsYXNzPVwic3VidGl0bGVcIj5FQ09SRUFOIEJPQyB2Ni4wIFx1Qzc5MFx1QjNEOSBcdUMwRERcdUMxMzE8L2Rpdj5cbiAgPGRpdiBjbGFzcz1cImNvbXBhbnlcIj5cdUM1RDBcdUNGNTRcdUI5QUNcdUM1QjggXHVDNzc4XHVEMTRDXHVCOUFDXHVDNUI0IChFQ09SRUFOKTwvZGl2PlxuICA8aHIgY2xhc3M9XCJnb2xkLWxpbmVcIj5cblxuICA8ZGl2IGNsYXNzPVwic2VjdGlvblwiPlxuICAgIDxoMj5cdUFDRTBcdUFDMUQgXHVDODE1XHVCQ0Y0PC9oMj5cbiAgICA8ZGl2IGNsYXNzPVwiaW5mby1ncmlkXCI+XG4gICAgICA8c3BhbiBjbGFzcz1cImxhYmVsXCI+XHVBQ0UwXHVBQzFEXHVCQTg1PC9zcGFuPjxzcGFuPiR7Y3VzdG9tZXJOYW1lfTwvc3Bhbj5cbiAgICAgIDxzcGFuIGNsYXNzPVwibGFiZWxcIj5cdUM1RjBcdUI3N0RcdUNDOTg8L3NwYW4+PHNwYW4+JHtjdXN0b21lclBob25lfTwvc3Bhbj5cbiAgICAgIDxzcGFuIGNsYXNzPVwibGFiZWxcIj5cdUFDRjVcdUMwQUMgXHVDOEZDXHVDMThDPC9zcGFuPjxzcGFuPiR7Y3VzdG9tZXJBZGRyZXNzfTwvc3Bhbj5cbiAgICAgIDxzcGFuIGNsYXNzPVwibGFiZWxcIj5cdUFDQUNcdUM4MDFcdUM3N0M8L3NwYW4+PHNwYW4+JHt0b2RheX08L3NwYW4+XG4gICAgPC9kaXY+XG4gIDwvZGl2PlxuXG4gIDxkaXYgY2xhc3M9XCJzZWN0aW9uXCI+XG4gICAgPGgyPlx1QUNGNVx1QzBBQyBcdUM4NzBcdUFDNzQ8L2gyPlxuICAgIDxkaXYgY2xhc3M9XCJpbmZvLWdyaWRcIj5cbiAgICAgIDxzcGFuIGNsYXNzPVwibGFiZWxcIj5cdUM4RkNcdUFDNzAgXHVENjE1XHVEMERDPC9zcGFuPjxzcGFuPiR7KGlucHV0ICYmIGlucHV0LnJlc2lkZW5jZSkgfHwgJy0nfTwvc3Bhbj5cbiAgICAgIDxzcGFuIGNsYXNzPVwibGFiZWxcIj5cdUJBNzRcdUM4MDE8L3NwYW4+PHNwYW4+JHsoaW5wdXQgJiYgaW5wdXQucHllb25nKSB8fCAnLSd9IFx1RDNDOSAoJHtlc3RpbWF0ZS5hcmVhU3FtID8gZXN0aW1hdGUuYXJlYVNxbS50b0ZpeGVkKDEpIDogJy0nfSBcdTMzQTEpPC9zcGFuPlxuICAgICAgPHNwYW4gY2xhc3M9XCJsYWJlbFwiPlx1Q0VFOFx1QzE0OTwvc3Bhbj48c3Bhbj4keyhpbnB1dCAmJiBpbnB1dC5jb25jZXB0KSB8fCAnLSd9PC9zcGFuPlxuICAgICAgPHNwYW4gY2xhc3M9XCJsYWJlbFwiPlx1QzJEQ1x1QUNGNSBcdUMxMzlcdUMxNTg8L3NwYW4+PHNwYW4+JHsoaW5wdXQgJiYgaW5wdXQuc2VjdGlvbnMgJiYgaW5wdXQuc2VjdGlvbnMuam9pbignLCAnKSkgfHwgJy0nfTwvc3Bhbj5cbiAgICA8L2Rpdj5cbiAgPC9kaXY+XG5cbiAgPGRpdiBjbGFzcz1cInNlY3Rpb25cIj5cbiAgICA8aDI+XHVBRTA4XHVDNTYxIFx1QjBCNFx1QzVFRDwvaDI+XG4gICAgPHRhYmxlIGNsYXNzPVwiYW1vdW50LXRhYmxlXCI+XG4gICAgICA8dGhlYWQ+XG4gICAgICAgIDx0cj48dGg+XHVENTZEXHVCQUE5PC90aD48dGggY2xhc3M9XCJyaWdodFwiPlx1QUUwOFx1QzU2MTwvdGg+PC90cj5cbiAgICAgIDwvdGhlYWQ+XG4gICAgICA8dGJvZHk+XG4gICAgICAgIDx0cj5cbiAgICAgICAgICA8dGQ+XHVBQ0Y1XHVBRTA5XHVBQzAwIChcdUM3OTBcdUM3QUMgKyBcdUM3NzhcdUFDNzRcdUJFNDQgXHVENTY5XHVBQ0M0KTwvdGQ+XG4gICAgICAgICAgPHRkIGNsYXNzPVwicmlnaHRcIj4ke2Zvcm1hdEtSVyhlc3RpbWF0ZS5zdXBwbHkpfTwvdGQ+XG4gICAgICAgIDwvdHI+XG4gICAgICAgIDx0cj5cbiAgICAgICAgICA8dGQ+XHVCM0M0XHVBRTA5XHVENTY5XHVBQ0M0IChcdUJDRjRcdUM4MTVcdUFDQzRcdUMyMTggXHVDODAxXHVDNkE5ICsgXHVBQzA0XHVDODExXHVCRTQ0KTwvdGQ+XG4gICAgICAgICAgPHRkIGNsYXNzPVwicmlnaHRcIj4ke2Zvcm1hdEtSVyhjb250cmFjdEFtb3VudCl9PC90ZD5cbiAgICAgICAgPC90cj5cbiAgICAgICAgPHRyPlxuICAgICAgICAgIDx0ZD5cdUJEODBcdUFDMDBcdUMxMzggVkFUICgxMCUpPC90ZD5cbiAgICAgICAgICA8dGQgY2xhc3M9XCJyaWdodFwiPiR7Zm9ybWF0S1JXKHZhdEFtb3VudCl9PC90ZD5cbiAgICAgICAgPC90cj5cbiAgICAgICAgPHRyIGNsYXNzPVwidG90YWwtcm93XCI+XG4gICAgICAgICAgPHRkPlx1Q0Q1Q1x1Qzg4NSBcdUQ1NjlcdUFDQzQgKFZBVCBcdUQzRUNcdUQ1NjgpPC90ZD5cbiAgICAgICAgICA8dGQgY2xhc3M9XCJyaWdodFwiPiR7Zm9ybWF0S1JXKGZpbmFsQW1vdW50KX08L3RkPlxuICAgICAgICA8L3RyPlxuICAgICAgPC90Ym9keT5cbiAgICA8L3RhYmxlPlxuICAgIDxkaXYgY2xhc3M9XCJtZXRhLXJvd1wiPlxuICAgICAgXHUzM0ExXHVCMkY5ICR7Zm9ybWF0S1JXKGVzdGltYXRlLnNxbVByaWNlKX0gJm5ic3A7fCZuYnNwO1xuICAgICAgXHVEM0M5XHVCMkY5ICR7Zm9ybWF0S1JXKGVzdGltYXRlLnB5UHJpY2UpfSAmbmJzcDt8Jm5ic3A7XG4gICAgICBcdUI5QzhcdUM5QzQgJHtlc3RpbWF0ZS5tYXJnaW4gfHwgMH0lXG4gICAgPC9kaXY+XG4gIDwvZGl2PlxuXG4gIDxkaXYgY2xhc3M9XCJzaWduLXNlY3Rpb25cIj5cbiAgICA8ZGl2IGNsYXNzPVwic2lnbi1ib3hcIj5cbiAgICAgIDxkaXYgY2xhc3M9XCJzaWduLXRpdGxlXCI+XHVCQzFDXHVDOEZDXHVDQzk4IChcdUFDRTBcdUFDMUQpPC9kaXY+XG4gICAgICA8ZGl2IGNsYXNzPVwic2lnbi1saW5lXCI+JHtjdXN0b21lck5hbWV9ICZuYnNwOyZuYnNwOyZuYnNwOyZuYnNwOyZuYnNwOyZuYnNwOyZuYnNwOyZuYnNwOyZuYnNwOyZuYnNwOyAoXHVDNzc4KTwvZGl2PlxuICAgIDwvZGl2PlxuICAgIDxkaXYgY2xhc3M9XCJzaWduLWJveFwiPlxuICAgICAgPGRpdiBjbGFzcz1cInNpZ24tdGl0bGVcIj5cdUMyMThcdUM4RkNcdUNDOTggKFx1QzVEMFx1Q0Y1NFx1QjlBQ1x1QzVCOCk8L2Rpdj5cbiAgICAgIDxkaXYgY2xhc3M9XCJzaWduLWxpbmVcIj5cdUM1RDBcdUNGNTRcdUI5QUNcdUM1QjggXHVDNzc4XHVEMTRDXHVCOUFDXHVDNUI0IFx1QjMwMFx1RDQ1QyAmbmJzcDsmbmJzcDsgKFx1Qzc3OCk8L2Rpdj5cbiAgICA8L2Rpdj5cbiAgPC9kaXY+XG5cbiAgPGRpdiBjbGFzcz1cImZvb3RlclwiPlxuICAgIFx1QkNGOCBcdUFDQUNcdUM4MDFcdUMxMUNcdUIyOTQgRUNPUkVBTiBCT0MgdjYuMFx1QzVEMFx1QzExQyBcdUM3OTBcdUIzRDkgXHVDMEREXHVDMTMxXHVCNDE4XHVDNUM4XHVDMkI1XHVCMkM4XHVCMkU0LiBcdUM3MjBcdUQ2QThcdUFFMzBcdUFDMDQ6IFx1QUNBQ1x1QzgwMVx1Qzc3Q1x1Qjg1Q1x1QkQ4MFx1RDEzMCAzMFx1Qzc3Q1xuICA8L2Rpdj5cbjwvYm9keT5cbjwvaHRtbD5gO1xufVxuXG5mdW5jdGlvbiBwcmludEVzdGltYXRlKGVzdGltYXRlLCBjb250cmFjdCwgaW5wdXQpIHtcbiAgdHJ5IHtcbiAgICBjb25zdCB3ID0gd2luZG93Lm9wZW4oJycsICdfYmxhbmsnLCAnd2lkdGg9ODIwLGhlaWdodD03MDAnKTtcbiAgICBpZiAoIXcpIHtcbiAgICAgIGFsZXJ0KCdcdUQzMURcdUM1QzVcdUM3NzQgXHVDQzI4XHVCMkU4XHVCNDE4XHVDNUM4XHVDMkI1XHVCMkM4XHVCMkU0LiBcdUQzMURcdUM1QzUgXHVENUM4XHVDNkE5IFx1RDZDNCBcdUIyRTRcdUMyREMgXHVDMkRDXHVCM0M0XHVENTU4XHVDMTM4XHVDNjk0LicpO1xuICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICB3LmRvY3VtZW50LndyaXRlKGJ1aWxkUHJpbnRIVE1MKGVzdGltYXRlLCBjb250cmFjdCwgaW5wdXQgfHwge30pKTtcbiAgICB3LmRvY3VtZW50LmNsb3NlKCk7XG4gICAgdy5mb2N1cygpO1xuICAgIHNldFRpbWVvdXQoKCkgPT4geyB3LnByaW50KCk7IH0sIDUwMCk7XG4gIH0gY2F0Y2ggKGUpIHtcbiAgICBjb25zb2xlLmVycm9yKCdbRXN0aW1hdGVQREZdIFx1Q0Q5Q1x1QjgyNSBcdUMyRTRcdUQzMjg6JywgZSk7XG4gIH1cbn1cblxuY29uc3QgRXN0aW1hdGVQREYgPSB7IHByaW50RXN0aW1hdGUsIGJ1aWxkUHJpbnRIVE1MIH07XG5tb2R1bGUuZXhwb3J0cyA9IHsgRXN0aW1hdGVQREYgfTtcbiIsICIvLyBFQ09SRUFOIEJPQyB2Ni4wIFx1MjAxNCBDb250cmFjdCBQYWdlIChcdUFDQzRcdUM1N0QgXHVDNzkxXHVDMTMxIFVJKVxuY29uc3QgeyBDb250cmFjdENvbnRyb2xsZXIgfSA9IHJlcXVpcmUoJy4vQ29udHJhY3RDb250cm9sbGVyLmpzJyk7XG5jb25zdCB7IEVzdGltYXRlUERGIH0gPSByZXF1aXJlKCcuL0VzdGltYXRlUERGLmpzJyk7XG5cbmZ1bmN0aW9uIGZtdChuKSB7XG4gIHJldHVybiAobiB8fCAwKS50b0xvY2FsZVN0cmluZygna28tS1InKSArICdcdUM2RDAnO1xufVxuXG5jbGFzcyBDb250cmFjdFBhZ2Uge1xuICBjb25zdHJ1Y3RvcihvcHRzKSB7XG4gICAgdGhpcy5jb250YWluZXJFbCA9IG9wdHMuY29udGFpbmVyRWw7XG4gICAgdGhpcy5lc3RpbWF0ZSA9IG9wdHMuZXN0aW1hdGU7XG4gICAgdGhpcy5pbnB1dCA9IG9wdHMuaW5wdXQgfHwge307XG4gICAgdGhpcy5jb250cm9sbGVyID0gbmV3IENvbnRyYWN0Q29udHJvbGxlcih7IGVzdGltYXRlOiB0aGlzLmVzdGltYXRlIH0pO1xuICAgIHRoaXMuX3JlbmRlcigpO1xuICAgIHRoaXMuY29udHJvbGxlci5zdWJzY3JpYmUoKGV2dCwgcGF5bG9hZCkgPT4ge1xuICAgICAgaWYgKGV2dCA9PT0gJ0NPTlRSQUNUX0NSRUFURUQnIHx8IGV2dCA9PT0gJ0NPTlRSQUNUX1NJR05FRCcgfHwgZXZ0ID09PSAnQ09OVFJBQ1RfQ0FOQ0VMRUQnKSB7XG4gICAgICAgIHRoaXMuX3JlbmRlckNvbnRyYWN0UmVzdWx0KHBheWxvYWQpO1xuICAgICAgfVxuICAgIH0pO1xuICB9XG5cbiAgX3JlbmRlcigpIHtcbiAgICBjb25zdCBzID0gdGhpcy5jb250cm9sbGVyLmdldFN1bW1hcnkoKTtcbiAgICB0aGlzLmNvbnRhaW5lckVsLmlubmVySFRNTCA9IGBcbiAgICAgIDxkaXYgY2xhc3M9XCJjb250cmFjdC1wYWdlXCI+XG4gICAgICAgIDxkaXYgY2xhc3M9XCJwYWdlLWhlYWRlclwiPlxuICAgICAgICAgIDxoMj5cdUFDQzRcdUM1N0RcdUMxMUMgXHVDNzkxXHVDMTMxPC9oMj5cbiAgICAgICAgICA8ZGl2IGNsYXNzPVwic3VidGl0bGVcIj5cdUFDQUNcdUM4MDEgXHVDNjQ0XHVDMTMxIFx1MjE5MiBcdUFDQzRcdUM1N0QgXHVDRDA4XHVDNTQ4IFx1Qzc5MVx1QzEzMSAoUGhhc2UgNCBXZWVrIDUpPC9kaXY+XG4gICAgICAgIDwvZGl2PlxuXG4gICAgICAgIDxkaXYgY2xhc3M9XCJjb250cmFjdC1ncmlkXCI+XG4gICAgICAgICAgPGRpdiBjbGFzcz1cImNhcmQgZXN0aW1hdGUtc3VtbWFyeS1jYXJkXCI+XG4gICAgICAgICAgICA8aDM+XHVBQ0FDXHVDODAxIFx1QzY5NFx1QzU3RDwvaDM+XG4gICAgICAgICAgICA8ZGl2IGNsYXNzPVwic3VtbWFyeS1yb3dcIj5cbiAgICAgICAgICAgICAgPHNwYW4+XHVBQ0Y1XHVBRTA5XHVBQzAwPC9zcGFuPjxzcGFuPiR7Zm10KHMuc3VwcGx5KX08L3NwYW4+XG4gICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJzdW1tYXJ5LXJvd1wiPlxuICAgICAgICAgICAgICA8c3Bhbj5cdUIzQzRcdUFFMDlcdUQ1NjlcdUFDQzQgKFZBVCBcdUM4MDQpPC9zcGFuPjxzcGFuIGNsYXNzPVwiaGlnaGxpZ2h0XCI+JHtmbXQocy5jb250cmFjdEFtb3VudCl9PC9zcGFuPlxuICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICA8ZGl2IGNsYXNzPVwic3VtbWFyeS1yb3dcIj5cbiAgICAgICAgICAgICAgPHNwYW4+VkFUICgxMCUpPC9zcGFuPjxzcGFuPiR7Zm10KHMudmF0QW1vdW50KX08L3NwYW4+XG4gICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJzdW1tYXJ5LXJvdyB0b3RhbFwiPlxuICAgICAgICAgICAgICA8c3Bhbj5cdUNENUNcdUM4ODVcdUFFMDhcdUM1NjEgKFZBVCBcdUQzRUNcdUQ1NjgpPC9zcGFuPjxzcGFuIGNsYXNzPVwiZ29sZFwiPiR7Zm10KHMuZmluYWxBbW91bnQpfTwvc3Bhbj5cbiAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgPGRpdiBjbGFzcz1cInN1bW1hcnktbWV0YVwiPlxuICAgICAgICAgICAgICA8c3Bhbj5cdUQzQzlcdUIyRjkgJHtmbXQocy5weVByaWNlKX08L3NwYW4+XG4gICAgICAgICAgICAgIDxzcGFuPlx1QjlDOFx1QzlDNCAke3MubWFyZ2luIHx8IDB9JTwvc3Bhbj5cbiAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgIDwvZGl2PlxuXG4gICAgICAgICAgPGRpdiBjbGFzcz1cImNhcmQgY3VzdG9tZXItZm9ybS1jYXJkXCIgaWQ9XCJjdXN0b21lci1mb3JtLXdyYXBcIj5cbiAgICAgICAgICAgIDxoMz5cdUFDRTBcdUFDMUQgXHVDODE1XHVCQ0Y0PC9oMz5cbiAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJmb3JtLWdyb3VwXCI+XG4gICAgICAgICAgICAgIDxsYWJlbD5cdUFDRTBcdUFDMURcdUJBODUgKjwvbGFiZWw+XG4gICAgICAgICAgICAgIDxpbnB1dCB0eXBlPVwidGV4dFwiIGlkPVwiY29udHJhY3QtbmFtZVwiIHBsYWNlaG9sZGVyPVwiXHVENjREXHVBRTM4XHVCM0Q5XCI+XG4gICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJmb3JtLWdyb3VwXCI+XG4gICAgICAgICAgICAgIDxsYWJlbD5cdUM1RjBcdUI3N0RcdUNDOTggKjwvbGFiZWw+XG4gICAgICAgICAgICAgIDxpbnB1dCB0eXBlPVwidGV4dFwiIGlkPVwiY29udHJhY3QtcGhvbmVcIiBwbGFjZWhvbGRlcj1cIjAxMC0wMDAwLTAwMDBcIj5cbiAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgPGRpdiBjbGFzcz1cImZvcm0tZ3JvdXBcIj5cbiAgICAgICAgICAgICAgPGxhYmVsPlx1QUNGNVx1QzBBQyBcdUM4RkNcdUMxOEM8L2xhYmVsPlxuICAgICAgICAgICAgICA8aW5wdXQgdHlwZT1cInRleHRcIiBpZD1cImNvbnRyYWN0LWFkZHJlc3NcIiBwbGFjZWhvbGRlcj1cIlx1QzExQ1x1QzZCOFx1QzJEQyBcdUFDMTVcdUIwQThcdUFENkMgLi4uXCI+XG4gICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJmb3JtLWVycm9yXCIgaWQ9XCJjb250cmFjdC1lcnJvclwiIHN0eWxlPVwiZGlzcGxheTpub25lO1wiPjwvZGl2PlxuICAgICAgICAgICAgPGRpdiBjbGFzcz1cImZvcm0tYWN0aW9uc1wiPlxuICAgICAgICAgICAgICA8YnV0dG9uIGNsYXNzPVwicHJpbWFyeVwiIGlkPVwiYnRuLWNyZWF0ZS1kcmFmdFwiPlx1QUNDNFx1QzU3RFx1QzExQyBcdUNEMDhcdUM1NDggXHVDNzkxXHVDMTMxPC9idXR0b24+XG4gICAgICAgICAgICAgIDxidXR0b24gY2xhc3M9XCJidG4tc2Vjb25kYXJ5XCIgaWQ9XCJidG4tcHJpbnQtZXN0aW1hdGVcIj5cdUQ4M0RcdURDQzQgUERGIFx1QUNBQ1x1QzgwMVx1QzExQzwvYnV0dG9uPlxuICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgPC9kaXY+XG4gICAgICAgIDwvZGl2PlxuXG4gICAgICAgIDxkaXYgaWQ9XCJjb250cmFjdC1yZXN1bHRcIiBzdHlsZT1cImRpc3BsYXk6bm9uZTtcIj48L2Rpdj5cbiAgICAgIDwvZGl2PlxuICAgIGA7XG5cbiAgICB0aGlzLmNvbnRhaW5lckVsLnF1ZXJ5U2VsZWN0b3IoJyNidG4tY3JlYXRlLWRyYWZ0JykuYWRkRXZlbnRMaXN0ZW5lcignY2xpY2snLCAoKSA9PiB7XG4gICAgICB0aGlzLl9vbkNyZWF0ZURyYWZ0KCk7XG4gICAgfSk7XG4gICAgdGhpcy5jb250YWluZXJFbC5xdWVyeVNlbGVjdG9yKCcjYnRuLXByaW50LWVzdGltYXRlJykuYWRkRXZlbnRMaXN0ZW5lcignY2xpY2snLCAoKSA9PiB7XG4gICAgICB0aGlzLl9vblByaW50RXN0aW1hdGUoKTtcbiAgICB9KTtcbiAgfVxuXG4gIGFzeW5jIF9vbkNyZWF0ZURyYWZ0KCkge1xuICAgIGNvbnN0IG5hbWUgICAgPSB0aGlzLmNvbnRhaW5lckVsLnF1ZXJ5U2VsZWN0b3IoJyNjb250cmFjdC1uYW1lJykudmFsdWUudHJpbSgpO1xuICAgIGNvbnN0IHBob25lICAgPSB0aGlzLmNvbnRhaW5lckVsLnF1ZXJ5U2VsZWN0b3IoJyNjb250cmFjdC1waG9uZScpLnZhbHVlLnRyaW0oKTtcbiAgICBjb25zdCBhZGRyZXNzID0gdGhpcy5jb250YWluZXJFbC5xdWVyeVNlbGVjdG9yKCcjY29udHJhY3QtYWRkcmVzcycpLnZhbHVlLnRyaW0oKTtcbiAgICBjb25zdCBlcnJFbCAgID0gdGhpcy5jb250YWluZXJFbC5xdWVyeVNlbGVjdG9yKCcjY29udHJhY3QtZXJyb3InKTtcbiAgICBjb25zdCBidG4gICAgID0gdGhpcy5jb250YWluZXJFbC5xdWVyeVNlbGVjdG9yKCcjYnRuLWNyZWF0ZS1kcmFmdCcpO1xuXG4gICAgYnRuLmRpc2FibGVkID0gdHJ1ZTtcbiAgICBidG4udGV4dENvbnRlbnQgPSAnXHVDNzkxXHVDMTMxIFx1QzkxMS4uLic7XG5cbiAgICBjb25zdCByID0gYXdhaXQgdGhpcy5jb250cm9sbGVyLmNyZWF0ZURyYWZ0KHsgY3VzdG9tZXJOYW1lOiBuYW1lLCBjdXN0b21lclBob25lOiBwaG9uZSwgY3VzdG9tZXJBZGRyZXNzOiBhZGRyZXNzIH0pO1xuXG4gICAgYnRuLmRpc2FibGVkID0gZmFsc2U7XG4gICAgYnRuLnRleHRDb250ZW50ID0gJ1x1QUNDNFx1QzU3RFx1QzExQyBcdUNEMDhcdUM1NDggXHVDNzkxXHVDMTMxJztcblxuICAgIGlmICghci5vaykge1xuICAgICAgZXJyRWwudGV4dENvbnRlbnQgPSByLmVycm9ycy5qb2luKCcgLyAnKTtcbiAgICAgIGVyckVsLnN0eWxlLmRpc3BsYXkgPSAnYmxvY2snO1xuICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICBlcnJFbC5zdHlsZS5kaXNwbGF5ID0gJ25vbmUnO1xuICB9XG5cbiAgX3JlbmRlckNvbnRyYWN0UmVzdWx0KGNvbnRyYWN0KSB7XG4gICAgY29uc3QgcmVzdWx0RWwgID0gdGhpcy5jb250YWluZXJFbC5xdWVyeVNlbGVjdG9yKCcjY29udHJhY3QtcmVzdWx0Jyk7XG4gICAgY29uc3QgZm9ybVdyYXAgID0gdGhpcy5jb250YWluZXJFbC5xdWVyeVNlbGVjdG9yKCcjY3VzdG9tZXItZm9ybS13cmFwJyk7XG4gICAgZm9ybVdyYXAuc3R5bGUub3BhY2l0eSA9ICcwLjUnO1xuICAgIGZvcm1XcmFwLnF1ZXJ5U2VsZWN0b3IoJyNidG4tY3JlYXRlLWRyYWZ0JykuZGlzYWJsZWQgPSB0cnVlO1xuXG4gICAgY29uc3QgaXNDYW5jZWxlZCA9IGNvbnRyYWN0LnN0YXR1cyA9PT0gJ0NBTkNFTEVEJztcblxuICAgIHJlc3VsdEVsLnN0eWxlLmRpc3BsYXkgPSAnYmxvY2snO1xuICAgIHJlc3VsdEVsLmlubmVySFRNTCA9IGBcbiAgICAgIDxkaXYgY2xhc3M9XCJjYXJkIGNvbnRyYWN0LXJlc3VsdC1jYXJkXCI+XG4gICAgICAgIDxkaXYgY2xhc3M9XCJyZXN1bHQtYmFkZ2UgJHtjb250cmFjdC5zdGF0dXMudG9Mb3dlckNhc2UoKX1cIj5cbiAgICAgICAgICAke2NvbnRyYWN0LnN0YXR1cyA9PT0gJ1NJR05FRCcgICA/ICdcdTI3MDUgXHVBQ0M0XHVDNTdEIFx1QzY0NFx1QjhDQyAoU0lHTkVEKScgICA6XG4gICAgICAgICAgICBjb250cmFjdC5zdGF0dXMgPT09ICdDQU5DRUxFRCcgPyAnXHUyNzRDIFx1QUNDNFx1QzU3RCBcdUNERThcdUMxOEMgKENBTkNFTEVEKScgOlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgJ1x1RDgzRFx1RENDNCBcdUFDQzRcdUM1N0QgXHVDRDA4XHVDNTQ4IChEUkFGVCknfVxuICAgICAgICA8L2Rpdj5cbiAgICAgICAgPGRpdiBjbGFzcz1cInJlc3VsdC1ncmlkXCI+XG4gICAgICAgICAgPGRpdiBjbGFzcz1cInJlc3VsdC1pdGVtXCI+PHNwYW4+XHVBQ0M0XHVDNTdEIElEPC9zcGFuPjxzcGFuIHN0eWxlPVwiZm9udC1zaXplOjAuNzVyZW07XCI+JHtjb250cmFjdC5pZH08L3NwYW4+PC9kaXY+XG4gICAgICAgICAgPGRpdiBjbGFzcz1cInJlc3VsdC1pdGVtXCI+PHNwYW4+XHVBQ0UwXHVBQzFEXHVCQTg1PC9zcGFuPjxzcGFuPiR7Y29udHJhY3QuY3VzdG9tZXJOYW1lfTwvc3Bhbj48L2Rpdj5cbiAgICAgICAgICA8ZGl2IGNsYXNzPVwicmVzdWx0LWl0ZW1cIj48c3Bhbj5cdUM1RjBcdUI3N0RcdUNDOTg8L3NwYW4+PHNwYW4+JHtjb250cmFjdC5jdXN0b21lclBob25lfTwvc3Bhbj48L2Rpdj5cbiAgICAgICAgICA8ZGl2IGNsYXNzPVwicmVzdWx0LWl0ZW1cIj48c3Bhbj5cdUFDRjVcdUMwQUMgXHVDOEZDXHVDMThDPC9zcGFuPjxzcGFuPiR7Y29udHJhY3QuY3VzdG9tZXJBZGRyZXNzIHx8ICctJ308L3NwYW4+PC9kaXY+XG4gICAgICAgICAgPGRpdiBjbGFzcz1cInJlc3VsdC1pdGVtXCI+PHNwYW4+XHVCM0M0XHVBRTA5XHVENTY5XHVBQ0M0PC9zcGFuPjxzcGFuPiR7Zm10KGNvbnRyYWN0LnRvdGFsQW1vdW50KX08L3NwYW4+PC9kaXY+XG4gICAgICAgICAgPGRpdiBjbGFzcz1cInJlc3VsdC1pdGVtXCI+PHNwYW4+VkFUPC9zcGFuPjxzcGFuPiR7Zm10KGNvbnRyYWN0LnZhdEFtb3VudCl9PC9zcGFuPjwvZGl2PlxuICAgICAgICAgIDxkaXYgY2xhc3M9XCJyZXN1bHQtaXRlbSB0b3RhbFwiPjxzcGFuPlx1Q0Q1Q1x1Qzg4NVx1QUUwOFx1QzU2MTwvc3Bhbj48c3Bhbj4ke2ZtdChjb250cmFjdC5maW5hbEFtb3VudCl9PC9zcGFuPjwvZGl2PlxuICAgICAgICAgIDxkaXYgY2xhc3M9XCJyZXN1bHQtaXRlbVwiPjxzcGFuPlx1QzBDMVx1RDBEQzwvc3Bhbj48c3BhbiBjbGFzcz1cInN0YXR1cy1iYWRnZSAke2NvbnRyYWN0LnN0YXR1c31cIj4ke2NvbnRyYWN0LnN0YXR1c308L3NwYW4+PC9kaXY+XG4gICAgICAgICAgJHtjb250cmFjdC5sb2NhbCA/ICc8ZGl2IGNsYXNzPVwicmVzdWx0LWl0ZW0gd2FyblwiIHN0eWxlPVwiZ3JpZC1jb2x1bW46MS8tMTtcIj48c3Bhbj5cdTI2QTBcdUZFMEY8L3NwYW4+PHNwYW4+XHVCODVDXHVDRUVDIFx1QzBERFx1QzEzMSAoSVBDIFx1QkJGOFx1QzVGMFx1QUNCMCBcdTIwMTQgREIgXHVCQkY4XHVDODAwXHVDN0E1KTwvc3Bhbj48L2Rpdj4nIDogJyd9XG4gICAgICAgIDwvZGl2PlxuICAgICAgICAkeyFpc0NhbmNlbGVkICYmIGNvbnRyYWN0LnN0YXR1cyA9PT0gJ0RSQUZUJyA/IGBcbiAgICAgICAgICA8ZGl2IGNsYXNzPVwicmVzdWx0LWFjdGlvbnNcIj5cbiAgICAgICAgICAgIDxidXR0b24gY2xhc3M9XCJwcmltYXJ5XCIgaWQ9XCJidG4tc2lnblwiPlx1MjcwRFx1RkUwRiBcdUMxMUNcdUJBODUgXHVDNjQ0XHVCOENDIChEUkFGVCBcdTIxOTIgU0lHTkVEKTwvYnV0dG9uPlxuICAgICAgICAgICAgPGJ1dHRvbiBjbGFzcz1cImJ0bi1kYW5nZXJcIiBpZD1cImJ0bi1jYW5jZWwtY29udHJhY3RcIj5cdUFDQzRcdUM1N0QgXHVDREU4XHVDMThDPC9idXR0b24+XG4gICAgICAgICAgPC9kaXY+XG4gICAgICAgIGAgOiAnJ31cbiAgICAgICAgPGRpdiBjbGFzcz1cInJlc3VsdC1hY3Rpb25zXCIgc3R5bGU9XCJtYXJnaW4tdG9wOiA4cHg7XCI+XG4gICAgICAgICAgPGJ1dHRvbiBjbGFzcz1cImJ0bi1zZWNvbmRhcnlcIiBpZD1cImJ0bi1wcmludC1zaWduZWRcIj5cdUQ4M0RcdURDQzQgXHVBQ0M0XHVDNTdEXHVDMTFDIFx1Q0Q5Q1x1QjgyNTwvYnV0dG9uPlxuICAgICAgICAgIDxidXR0b24gY2xhc3M9XCJidG4tc2Vjb25kYXJ5XCIgaWQ9XCJidG4tbmV3LWVzdGltYXRlXCIgb25jbGljaz1cImxvY2F0aW9uLnJlbG9hZCgpXCI+XHVDMEM4IFx1QUNBQ1x1QzgwMSBcdUI5Q0NcdUI0RTRcdUFFMzA8L2J1dHRvbj5cbiAgICAgICAgPC9kaXY+XG4gICAgICA8L2Rpdj5cbiAgICBgO1xuXG4gICAgaWYgKCFpc0NhbmNlbGVkICYmIGNvbnRyYWN0LnN0YXR1cyA9PT0gJ0RSQUZUJykge1xuICAgICAgcmVzdWx0RWwucXVlcnlTZWxlY3RvcignI2J0bi1zaWduJykuYWRkRXZlbnRMaXN0ZW5lcignY2xpY2snLCAoKSA9PiB7XG4gICAgICAgIGNvbnN0IHIgPSB0aGlzLmNvbnRyb2xsZXIuc2lnbigpO1xuICAgICAgICBpZiAoci5vaykgdGhpcy5fcmVuZGVyQ29udHJhY3RSZXN1bHQoci5jb250cmFjdCk7XG4gICAgICB9KTtcbiAgICAgIHJlc3VsdEVsLnF1ZXJ5U2VsZWN0b3IoJyNidG4tY2FuY2VsLWNvbnRyYWN0JykuYWRkRXZlbnRMaXN0ZW5lcignY2xpY2snLCAoKSA9PiB7XG4gICAgICAgIGlmIChjb25maXJtKCdcdUFDQzRcdUM1N0RcdUM3NDQgXHVDREU4XHVDMThDXHVENTU4XHVDMkRDXHVBQ0EwXHVDMkI1XHVCMkM4XHVBRTRDPycpKSB7XG4gICAgICAgICAgY29uc3QgciA9IHRoaXMuY29udHJvbGxlci5jYW5jZWwoKTtcbiAgICAgICAgICBpZiAoci5vaykgdGhpcy5fcmVuZGVyQ29udHJhY3RSZXN1bHQoci5jb250cmFjdCk7XG4gICAgICAgIH1cbiAgICAgIH0pO1xuICAgIH1cblxuICAgIHJlc3VsdEVsLnF1ZXJ5U2VsZWN0b3IoJyNidG4tcHJpbnQtc2lnbmVkJykuYWRkRXZlbnRMaXN0ZW5lcignY2xpY2snLCAoKSA9PiB7XG4gICAgICB0aGlzLl9vblByaW50RXN0aW1hdGUoY29udHJhY3QpO1xuICAgIH0pO1xuICB9XG5cbiAgX29uUHJpbnRFc3RpbWF0ZShjb250cmFjdCkge1xuICAgIGNvbnN0IHMgPSB0aGlzLmNvbnRyb2xsZXIuZ2V0U3VtbWFyeSgpO1xuICAgIEVzdGltYXRlUERGLnByaW50RXN0aW1hdGUoXG4gICAgICB7IC4uLnRoaXMuZXN0aW1hdGUsIC4uLnMgfSxcbiAgICAgIGNvbnRyYWN0IHx8IHRoaXMuY29udHJvbGxlci5jb250cmFjdCxcbiAgICAgIHRoaXMuaW5wdXRcbiAgICApO1xuICB9XG5cbiAgZGVzdHJveSgpIHt9XG59XG5cbm1vZHVsZS5leHBvcnRzID0geyBDb250cmFjdFBhZ2UgfTtcbiJdLAogICJtYXBwaW5ncyI6ICI7Ozs7O0FBQUE7QUFBQTtBQUdBLGFBQVMscUJBQXFCLE1BQU07QUFDbEMsWUFBTSxRQUFRLEtBQUs7QUFDbkIsWUFBTSxNQUFNLEtBQUssTUFBTSxRQUFRLEdBQUk7QUFDbkMsYUFBTztBQUFBLFFBQ0wsSUFBSSxjQUFjLEtBQUssSUFBSSxJQUFJLE1BQU0sS0FBSyxPQUFPLEVBQUUsU0FBUyxFQUFFLEVBQUUsTUFBTSxHQUFHLENBQUM7QUFBQSxRQUMxRSxZQUFZLEtBQUs7QUFBQSxRQUNqQixVQUFVLEtBQUssWUFBWTtBQUFBLFFBQzNCLGNBQWMsS0FBSyxnQkFBZ0I7QUFBQSxRQUNuQyxlQUFlLEtBQUssaUJBQWlCO0FBQUEsUUFDckMsaUJBQWlCLEtBQUss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
