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
        this.estimate = JSON.parse(JSON.stringify(opts.estimate));
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
    function maskPhone(phone) {
      if (!phone) return "-";
      return phone.replace(/(\d{3})-?(\d{3,4})-?(\d{4})/, "$1-****-$3");
    }
    function buildPrintHTML(estimate, contract, input) {
      const today = (/* @__PURE__ */ new Date()).toLocaleDateString("ko-KR");
      const customerName = contract ? contract.customerName || "(\uBBF8\uC791\uC131)" : "(\uBBF8\uC791\uC131)";
      const customerPhone = maskPhone(contract ? contract.customerPhone : "");
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
          <td>\uB3C4\uAE09\uD569\uACC4 (\uC790\uC7AC + \uC778\uAC74\uBE44 + \uAC04\uC811\uBE44)</td>
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
      \uD3C9\uB2F9 ${formatKRW(estimate.pyPrice)}
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
    function _maskPhone(phone) {
      if (!phone) return "-";
      return phone.replace(/(\d{3})-?(\d{3,4})-?(\d{4})/, "$1-****-$3");
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
            <div class="form-group privacy-consent">
              <label style="flex-direction:row; align-items:flex-start; gap:8px; cursor:pointer;">
                <input type="checkbox" id="contract-consent" style="width:auto; margin-top:3px;">
                <span style="font-size:0.82rem; color:var(--text-dim); line-height:1.5;">
                  [\uD544\uC218] \uC778\uD14C\uB9AC\uC5B4 \uACF5\uC0AC \uACAC\uC801\xB7\uACC4\uC57D\uC744 \uC704\uD55C \uAC1C\uC778\uC815\uBCF4(\uC131\uBA85\xB7\uC5F0\uB77D\uCC98\xB7\uC8FC\uC18C) \uC218\uC9D1\xB7\uC774\uC6A9\uC5D0 \uB3D9\uC758\uD569\uB2C8\uB2E4.
                  \uC218\uC9D1\uB41C \uC815\uBCF4\uB294 \uACC4\uC57D \uBAA9\uC801\uC73C\uB85C\uB9CC \uC0AC\uC6A9\uB418\uBA70, \uACC4\uC57D \uC885\uB8CC \uD6C4 5\uB144\uAC04 \uBCF4\uAD00 \uD6C4 \uD30C\uAE30\uB429\uB2C8\uB2E4.
                </span>
              </label>
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
        const consent = this.containerEl.querySelector("#contract-consent").checked;
        const errEl = this.containerEl.querySelector("#contract-error");
        const btn = this.containerEl.querySelector("#btn-create-draft");
        if (!consent) {
          errEl.textContent = "\uAC1C\uC778\uC815\uBCF4 \uC218\uC9D1\xB7\uC774\uC6A9 \uB3D9\uC758\uAC00 \uD544\uC694\uD569\uB2C8\uB2E4.";
          errEl.style.display = "block";
          return;
        }
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
          <div class="result-item"><span>\uC5F0\uB77D\uCC98</span><span>${_maskPhone(contract.customerPhone)}</span></div>
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
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsiLi4vLi4vc3JjL2NvbnRyYWN0L0NvbnRyYWN0Q29udHJvbGxlci5qcyIsICIuLi8uLi9zcmMvY29udHJhY3QvRXN0aW1hdGVQREYuanMiLCAiLi4vLi4vc3JjL2NvbnRyYWN0L0NvbnRyYWN0UGFnZS5qcyJdLAogICJzb3VyY2VzQ29udGVudCI6IFsiLy8gRUNPUkVBTiBCT0MgdjYuMCBcdTIwMTQgQ29udHJhY3QgQ29udHJvbGxlciAoVUkgXHVCODA4XHVDNzc0XHVDNUI0KVxuLy8gSVBDIFx1QzZCMFx1QzEyMCAoRWxlY3Ryb24pLCBcdUI4NUNcdUNFRUMgZmFsbGJhY2sgKFx1QzJEQ1x1QkJBQywgREIgXHVCQkY4XHVDODAwXHVDN0E1KVxuLy8gVE9ETyBQNjogXHVBQ0UwXHVBQzFEIFx1QUMxQ1x1Qzc3OFx1QzgxNVx1QkNGNCBBRVMtMjU2LUdDTSBcdUM1NTRcdUQ2MzhcdUQ2NTQgXHUyMTkyIFBoYXNlIDVcdUM1RDBcdUMxMUMgXHVBRDZDXHVENjA0IFx1QzYwOFx1QzgxNVxuXG5mdW5jdGlvbiBfbG9jYWxDcmVhdGVDb250cmFjdChvcHRzKSB7XG4gIGNvbnN0IHRvdGFsID0gb3B0cy50b3RhbEFtb3VudDtcbiAgY29uc3QgdmF0ID0gTWF0aC5yb3VuZCh0b3RhbCAqIDAuMTApO1xuICByZXR1cm4ge1xuICAgIGlkOiAnY29udHJhY3RfJyArIERhdGUubm93KCkgKyAnXycgKyBNYXRoLnJhbmRvbSgpLnRvU3RyaW5nKDM2KS5zbGljZSgyLCA4KSxcbiAgICBlc3RpbWF0ZUlkOiBvcHRzLmVzdGltYXRlSWQsXG4gICAgdGVuYW50SWQ6IG9wdHMudGVuYW50SWQgfHwgJ0hRJyxcbiAgICBjdXN0b21lck5hbWU6IG9wdHMuY3VzdG9tZXJOYW1lIHx8ICcnLFxuICAgIGN1c3RvbWVyUGhvbmU6IG9wdHMuY3VzdG9tZXJQaG9uZSB8fCAnJyxcbiAgICBjdXN0b21lckFkZHJlc3M6IG9wdHMuY3VzdG9tZXJBZGRyZXNzIHx8ICcnLFxuICAgIHRvdGFsQW1vdW50OiB0b3RhbCxcbiAgICB2YXRBbW91bnQ6IHZhdCxcbiAgICBmaW5hbEFtb3VudDogdG90YWwgKyB2YXQsXG4gICAgc2lnbmVkQXQ6IG51bGwsXG4gICAgc3RhdHVzOiAnRFJBRlQnLFxuICAgIGlzU2ltdWxhdGVkOiBvcHRzLmlzU2ltdWxhdGVkID09PSB0cnVlLFxuICAgIGNyZWF0ZWRBdDogRGF0ZS5ub3coKVxuICB9O1xufVxuXG5jbGFzcyBDb250cmFjdENvbnRyb2xsZXIge1xuICBjb25zdHJ1Y3RvcihvcHRzKSB7XG4gICAgLy8gUDU6IFx1QUNDNFx1QzU3RCBcdUMwRERcdUMxMzEgXHVDMkRDXHVDODEwIFx1QUNBQ1x1QzgwMSBcdUMyQTRcdUIwQzVcdUMwRjcgKFx1QjUyNVx1Q0U3NFx1RDUzQykgXHUyMDE0IFx1Qzc3NFx1RDZDNCBcdUFDQUNcdUM4MDEgXHVCQ0MwXHVBQ0JEXHVDNzc0IFx1QUNDNFx1QzU3RFx1QzVEMCBcdUM2MDFcdUQ1QTUgXHVDOEZDXHVDOUMwIFx1QzU0QVx1QjNDNFx1Qjg1RFxuICAgIHRoaXMuZXN0aW1hdGUgPSBKU09OLnBhcnNlKEpTT04uc3RyaW5naWZ5KG9wdHMuZXN0aW1hdGUpKTtcbiAgICB0aGlzLmNvbnRyYWN0ID0gbnVsbDtcbiAgICB0aGlzLmxpc3RlbmVycyA9IG5ldyBTZXQoKTtcbiAgfVxuXG4gIHN1YnNjcmliZShoYW5kbGVyKSB7XG4gICAgdGhpcy5saXN0ZW5lcnMuYWRkKGhhbmRsZXIpO1xuICAgIHJldHVybiAoKSA9PiB0aGlzLmxpc3RlbmVycy5kZWxldGUoaGFuZGxlcik7XG4gIH1cblxuICBfZW1pdCh0eXBlLCBwYXlsb2FkKSB7XG4gICAgdGhpcy5saXN0ZW5lcnMuZm9yRWFjaChoID0+IGgodHlwZSwgcGF5bG9hZCkpO1xuICB9XG5cbiAgX3ZhbGlkYXRlQ3VzdG9tZXIob3B0cykge1xuICAgIGNvbnN0IGVycm9ycyA9IFtdO1xuICAgIGlmICghb3B0cy5jdXN0b21lck5hbWUgfHwgIW9wdHMuY3VzdG9tZXJOYW1lLnRyaW0oKSkgZXJyb3JzLnB1c2goJ1x1QUNFMFx1QUMxRFx1QkE4NSBcdUQ1NDRcdUMyMTgnKTtcbiAgICBpZiAoIW9wdHMuY3VzdG9tZXJQaG9uZSB8fCAhb3B0cy5jdXN0b21lclBob25lLnRyaW0oKSkgZXJyb3JzLnB1c2goJ1x1QzVGMFx1Qjc3RFx1Q0M5OCBcdUQ1NDRcdUMyMTgnKTtcbiAgICByZXR1cm4gZXJyb3JzO1xuICB9XG5cbiAgZ2V0U3VtbWFyeSgpIHtcbiAgICBjb25zdCBlID0gdGhpcy5lc3RpbWF0ZTtcbiAgICByZXR1cm4ge1xuICAgICAgY29udHJhY3RBbW91bnQ6IGUuY29udHJhY3QsXG4gICAgICB2YXRBbW91bnQ6IE1hdGgucm91bmQoZS5jb250cmFjdCAqIDAuMTApLFxuICAgICAgZmluYWxBbW91bnQ6IGUuZmluYWwsXG4gICAgICBzdXBwbHk6IGUuc3VwcGx5LFxuICAgICAgbWFyZ2luOiBlLm1hcmdpbixcbiAgICAgIGFyZWFTcW06IGUuYXJlYVNxbSxcbiAgICAgIHNxbVByaWNlOiBlLnNxbVByaWNlLFxuICAgICAgcHlQcmljZTogZS5weVByaWNlXG4gICAgfTtcbiAgfVxuXG4gIGFzeW5jIGNyZWF0ZURyYWZ0KGN1c3RvbWVyT3B0cykge1xuICAgIGNvbnN0IGVycm9ycyA9IHRoaXMuX3ZhbGlkYXRlQ3VzdG9tZXIoY3VzdG9tZXJPcHRzKTtcbiAgICBpZiAoZXJyb3JzLmxlbmd0aCA+IDApIHJldHVybiB7IG9rOiBmYWxzZSwgZXJyb3JzIH07XG5cbiAgICBjb25zdCBlc3RpbWF0ZUlkID0gdGhpcy5lc3RpbWF0ZS5pZCB8fCAoJ2VzdF8nICsgRGF0ZS5ub3coKSk7XG4gICAgY29uc3QgdG90YWxBbW91bnQgPSB0aGlzLmVzdGltYXRlLmNvbnRyYWN0O1xuXG4gICAgLy8gSVBDIFx1QzZCMFx1QzEyMCAoRWxlY3Ryb24gXHVENjU4XHVBQ0JEKVxuICAgIGlmICh0eXBlb2Ygd2luZG93ICE9PSAndW5kZWZpbmVkJyAmJiB3aW5kb3cuYm9jICYmIHdpbmRvdy5ib2MuY29udHJhY3QpIHtcbiAgICAgIHRyeSB7XG4gICAgICAgIGNvbnN0IHJlcyA9IGF3YWl0IHdpbmRvdy5ib2MuY29udHJhY3QuY3JlYXRlKHtcbiAgICAgICAgICBlc3RpbWF0ZUlkLFxuICAgICAgICAgIHRvdGFsQW1vdW50LFxuICAgICAgICAgIHRlbmFudElkOiAnSFEnLFxuICAgICAgICAgIGN1c3RvbWVyTmFtZTogY3VzdG9tZXJPcHRzLmN1c3RvbWVyTmFtZSB8fCAnJyxcbiAgICAgICAgICBjdXN0b21lclBob25lOiBjdXN0b21lck9wdHMuY3VzdG9tZXJQaG9uZSB8fCAnJyxcbiAgICAgICAgICBjdXN0b21lckFkZHJlc3M6IGN1c3RvbWVyT3B0cy5jdXN0b21lckFkZHJlc3MgfHwgJydcbiAgICAgICAgfSk7XG4gICAgICAgIGlmIChyZXMgJiYgcmVzLm9rKSB7XG4gICAgICAgICAgdGhpcy5jb250cmFjdCA9IHJlcy5jb250cmFjdDtcbiAgICAgICAgICB0aGlzLl9lbWl0KCdDT05UUkFDVF9DUkVBVEVEJywgdGhpcy5jb250cmFjdCk7XG4gICAgICAgICAgcmV0dXJuIHsgb2s6IHRydWUsIGNvbnRyYWN0OiB0aGlzLmNvbnRyYWN0IH07XG4gICAgICAgIH1cbiAgICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgICAgY29uc29sZS5lcnJvcignW0NvbnRyYWN0Q29udHJvbGxlcl0gSVBDIFx1QzJFNFx1RDMyODonLCBlKTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICAvLyBcdUI4NUNcdUNFRUMgZmFsbGJhY2tcbiAgICB0aGlzLmNvbnRyYWN0ID0gX2xvY2FsQ3JlYXRlQ29udHJhY3Qoe1xuICAgICAgZXN0aW1hdGVJZCxcbiAgICAgIHRvdGFsQW1vdW50LFxuICAgICAgdGVuYW50SWQ6ICdIUScsXG4gICAgICBjdXN0b21lck5hbWU6IGN1c3RvbWVyT3B0cy5jdXN0b21lck5hbWUgfHwgJycsXG4gICAgICBjdXN0b21lclBob25lOiBjdXN0b21lck9wdHMuY3VzdG9tZXJQaG9uZSB8fCAnJyxcbiAgICAgIGN1c3RvbWVyQWRkcmVzczogY3VzdG9tZXJPcHRzLmN1c3RvbWVyQWRkcmVzcyB8fCAnJyxcbiAgICAgIGlzU2ltdWxhdGVkOiAhdGhpcy5lc3RpbWF0ZS5pZFxuICAgIH0pO1xuICAgIHRoaXMuX2VtaXQoJ0NPTlRSQUNUX0NSRUFURUQnLCB0aGlzLmNvbnRyYWN0KTtcbiAgICByZXR1cm4geyBvazogdHJ1ZSwgY29udHJhY3Q6IHRoaXMuY29udHJhY3QsIGxvY2FsOiB0cnVlIH07XG4gIH1cblxuICBzaWduKCkge1xuICAgIGlmICghdGhpcy5jb250cmFjdCkgcmV0dXJuIHsgb2s6IGZhbHNlLCBlcnJvcjogJ1x1QUNDNFx1QzU3RCBcdUM1QzZcdUM3NEMnIH07XG4gICAgaWYgKHRoaXMuY29udHJhY3Quc3RhdHVzICE9PSAnRFJBRlQnKSByZXR1cm4geyBvazogZmFsc2UsIGVycm9yOiAnRFJBRlQgXHVDMEMxXHVEMERDXHVCOUNDIFx1QzExQ1x1QkE4NSBcdUFDMDBcdUIyQTUnIH07XG4gICAgdGhpcy5jb250cmFjdC5zdGF0dXMgPSAnU0lHTkVEJztcbiAgICB0aGlzLmNvbnRyYWN0LnNpZ25lZEF0ID0gRGF0ZS5ub3coKTtcbiAgICB0aGlzLl9lbWl0KCdDT05UUkFDVF9TSUdORUQnLCB0aGlzLmNvbnRyYWN0KTtcbiAgICByZXR1cm4geyBvazogdHJ1ZSwgY29udHJhY3Q6IHRoaXMuY29udHJhY3QgfTtcbiAgfVxuXG4gIGNhbmNlbCgpIHtcbiAgICBpZiAoIXRoaXMuY29udHJhY3QpIHJldHVybiB7IG9rOiBmYWxzZSwgZXJyb3I6ICdcdUFDQzRcdUM1N0QgXHVDNUM2XHVDNzRDJyB9O1xuICAgIGlmICghWydEUkFGVCcsICdTSUdORUQnXS5pbmNsdWRlcyh0aGlzLmNvbnRyYWN0LnN0YXR1cykpIHtcbiAgICAgIHJldHVybiB7IG9rOiBmYWxzZSwgZXJyb3I6ICdcdUNERThcdUMxOEMgXHVCRDg4XHVBQzAwIFx1QzBDMVx1RDBEQycgfTtcbiAgICB9XG4gICAgdGhpcy5jb250cmFjdC5zdGF0dXMgPSAnQ0FOQ0VMRUQnO1xuICAgIHRoaXMuX2VtaXQoJ0NPTlRSQUNUX0NBTkNFTEVEJywgdGhpcy5jb250cmFjdCk7XG4gICAgcmV0dXJuIHsgb2s6IHRydWUsIGNvbnRyYWN0OiB0aGlzLmNvbnRyYWN0IH07XG4gIH1cbn1cblxubW9kdWxlLmV4cG9ydHMgPSB7IENvbnRyYWN0Q29udHJvbGxlciB9O1xuIiwgIi8vIEVDT1JFQU4gQk9DIHY2LjAgXHUyMDE0IFx1QUNBQ1x1QzgwMVx1QzExQyBQREYgXHVDRDlDXHVCODI1ICh3aW5kb3cucHJpbnQgXHVBRTMwXHVCQzE4KVxuXG5mdW5jdGlvbiBmb3JtYXRLUlcobikge1xuICByZXR1cm4gKG4gfHwgMCkudG9Mb2NhbGVTdHJpbmcoJ2tvLUtSJykgKyAnXHVDNkQwJztcbn1cblxuZnVuY3Rpb24gbWFza1Bob25lKHBob25lKSB7XG4gIGlmICghcGhvbmUpIHJldHVybiAnLSc7XG4gIHJldHVybiBwaG9uZS5yZXBsYWNlKC8oXFxkezN9KS0/KFxcZHszLDR9KS0/KFxcZHs0fSkvLCAnJDEtKioqKi0kMycpO1xufVxuXG5mdW5jdGlvbiBidWlsZFByaW50SFRNTChlc3RpbWF0ZSwgY29udHJhY3QsIGlucHV0KSB7XG4gIGNvbnN0IHRvZGF5ID0gbmV3IERhdGUoKS50b0xvY2FsZURhdGVTdHJpbmcoJ2tvLUtSJyk7XG4gIGNvbnN0IGN1c3RvbWVyTmFtZSAgICA9IGNvbnRyYWN0ID8gKGNvbnRyYWN0LmN1c3RvbWVyTmFtZSB8fCAnKFx1QkJGOFx1Qzc5MVx1QzEzMSknKSA6ICcoXHVCQkY4XHVDNzkxXHVDMTMxKSc7XG4gIGNvbnN0IGN1c3RvbWVyUGhvbmUgICA9IG1hc2tQaG9uZShjb250cmFjdCA/IGNvbnRyYWN0LmN1c3RvbWVyUGhvbmUgOiAnJyk7XG4gIGNvbnN0IGN1c3RvbWVyQWRkcmVzcyA9IGNvbnRyYWN0ID8gKGNvbnRyYWN0LmN1c3RvbWVyQWRkcmVzcyB8fCAnLScpIDogJy0nO1xuICBjb25zdCBjb250cmFjdEFtb3VudCAgPSBlc3RpbWF0ZS5jb250cmFjdEFtb3VudCB8fCBlc3RpbWF0ZS5jb250cmFjdCB8fCAwO1xuICBjb25zdCB2YXRBbW91bnQgICAgICAgPSBlc3RpbWF0ZS52YXRBbW91bnQgfHwgTWF0aC5yb3VuZChjb250cmFjdEFtb3VudCAqIDAuMSk7XG4gIGNvbnN0IGZpbmFsQW1vdW50ICAgICA9IGVzdGltYXRlLmZpbmFsQW1vdW50IHx8IGVzdGltYXRlLmZpbmFsIHx8IDA7XG5cbiAgcmV0dXJuIGA8IURPQ1RZUEUgaHRtbD5cbjxodG1sIGxhbmc9XCJrb1wiPlxuPGhlYWQ+XG4gIDxtZXRhIGNoYXJzZXQ9XCJVVEYtOFwiPlxuICA8dGl0bGU+RUNPUkVBTiBcdUFDQUNcdUM4MDFcdUMxMUM8L3RpdGxlPlxuICA8c3R5bGU+XG4gICAgKiB7IG1hcmdpbjogMDsgcGFkZGluZzogMDsgYm94LXNpemluZzogYm9yZGVyLWJveDsgfVxuICAgIGJvZHkgeyBmb250LWZhbWlseTogJ01hbGd1biBHb3RoaWMnLCBzYW5zLXNlcmlmOyBjb2xvcjogIzIyMjsgYmFja2dyb3VuZDogI2ZmZjsgcGFkZGluZzogMjBtbTsgZm9udC1zaXplOiAxMHB0OyB9XG4gICAgaDEgeyBmb250LXNpemU6IDIwcHQ7IHRleHQtYWxpZ246IGNlbnRlcjsgbWFyZ2luLWJvdHRvbTogNnB4OyBjb2xvcjogIzFhMWExYTsgbGV0dGVyLXNwYWNpbmc6IDJweDsgfVxuICAgIC5zdWJ0aXRsZSB7IHRleHQtYWxpZ246IGNlbnRlcjsgY29sb3I6ICM4ODg7IGZvbnQtc2l6ZTogOXB0OyBtYXJnaW4tYm90dG9tOiA0cHg7IH1cbiAgICAuY29tcGFueSB7IHRleHQtYWxpZ246IGNlbnRlcjsgZm9udC1zaXplOiAxMHB0OyBtYXJnaW4tYm90dG9tOiAyMHB4OyBjb2xvcjogIzU1NTsgfVxuICAgIC5nb2xkLWxpbmUgeyBib3JkZXI6IG5vbmU7IGJvcmRlci10b3A6IDJweCBzb2xpZCAjYzlhODRjOyBtYXJnaW46IDEwcHggMCAyMHB4OyB9XG4gICAgLnNlY3Rpb24geyBtYXJnaW4tYm90dG9tOiAxOHB4OyB9XG4gICAgLnNlY3Rpb24gaDIgeyBmb250LXNpemU6IDEwcHQ7IGJhY2tncm91bmQ6ICNmNWYwZTg7IHBhZGRpbmc6IDRweCAxMHB4OyBtYXJnaW4tYm90dG9tOiA4cHg7IGJvcmRlci1sZWZ0OiAzcHggc29saWQgI2M5YTg0YzsgfVxuICAgIC5pbmZvLWdyaWQgeyBkaXNwbGF5OiBncmlkOyBncmlkLXRlbXBsYXRlLWNvbHVtbnM6IDEzMHB4IDFmcjsgZ2FwOiA1cHggMTBweDsgfVxuICAgIC5pbmZvLWdyaWQgLmxhYmVsIHsgY29sb3I6ICM3Nzc7IH1cbiAgICAuYW1vdW50LXRhYmxlIHsgd2lkdGg6IDEwMCU7IGJvcmRlci1jb2xsYXBzZTogY29sbGFwc2U7IGZvbnQtc2l6ZTogMTBwdDsgfVxuICAgIC5hbW91bnQtdGFibGUgdGggeyBiYWNrZ3JvdW5kOiAjZjVmMGU4OyBwYWRkaW5nOiA2cHggMTBweDsgdGV4dC1hbGlnbjogbGVmdDsgYm9yZGVyOiAxcHggc29saWQgI2RkZDsgZm9udC13ZWlnaHQ6IDYwMDsgfVxuICAgIC5hbW91bnQtdGFibGUgdGQgeyBwYWRkaW5nOiA2cHggMTBweDsgYm9yZGVyOiAxcHggc29saWQgI2RkZDsgfVxuICAgIC5hbW91bnQtdGFibGUgLnRvdGFsLXJvdyB0ZCB7IGZvbnQtd2VpZ2h0OiBib2xkOyBiYWNrZ3JvdW5kOiAjZmZmYmU4OyBmb250LXNpemU6IDExcHQ7IH1cbiAgICAucmlnaHQgeyB0ZXh0LWFsaWduOiByaWdodDsgfVxuICAgIC5tZXRhLXJvdyB7IGZvbnQtc2l6ZTogOHB0OyBjb2xvcjogIzg4ODsgbWFyZ2luLXRvcDogNnB4OyB9XG4gICAgLnNpZ24tc2VjdGlvbiB7IG1hcmdpbi10b3A6IDM2cHg7IGJvcmRlci10b3A6IDFweCBzb2xpZCAjZGRkOyBwYWRkaW5nLXRvcDogMTZweDsgZGlzcGxheTogZmxleDsganVzdGlmeS1jb250ZW50OiBzcGFjZS1iZXR3ZWVuOyB9XG4gICAgLnNpZ24tYm94IHsgdGV4dC1hbGlnbjogY2VudGVyOyB3aWR0aDogNDUlOyB9XG4gICAgLnNpZ24tYm94IC5zaWduLXRpdGxlIHsgZm9udC1zaXplOiA5cHQ7IGNvbG9yOiAjNTU1OyBtYXJnaW4tYm90dG9tOiAzMHB4OyB9XG4gICAgLnNpZ24tYm94IC5zaWduLWxpbmUgeyBib3JkZXItdG9wOiAxcHggc29saWQgIzIyMjsgcGFkZGluZy10b3A6IDRweDsgZm9udC1zaXplOiA5cHQ7IGNvbG9yOiAjODg4OyB9XG4gICAgLmZvb3RlciB7IG1hcmdpbi10b3A6IDIwcHg7IHRleHQtYWxpZ246IGNlbnRlcjsgZm9udC1zaXplOiA4cHQ7IGNvbG9yOiAjYmJiOyB9XG4gICAgQG1lZGlhIHByaW50IHsgYm9keSB7IHBhZGRpbmc6IDEybW07IH0gfVxuICA8L3N0eWxlPlxuPC9oZWFkPlxuPGJvZHk+XG4gIDxoMT5cdUM3NzhcdUQxNENcdUI5QUNcdUM1QjQgXHVBQ0Y1XHVDMEFDIFx1QUNBQ1x1QzgwMVx1QzExQzwvaDE+XG4gIDxkaXYgY2xhc3M9XCJzdWJ0aXRsZVwiPkVDT1JFQU4gQk9DIHY2LjAgXHVDNzkwXHVCM0Q5IFx1QzBERFx1QzEzMTwvZGl2PlxuICA8ZGl2IGNsYXNzPVwiY29tcGFueVwiPlx1QzVEMFx1Q0Y1NFx1QjlBQ1x1QzVCOCBcdUM3NzhcdUQxNENcdUI5QUNcdUM1QjQgKEVDT1JFQU4pPC9kaXY+XG4gIDxociBjbGFzcz1cImdvbGQtbGluZVwiPlxuXG4gIDxkaXYgY2xhc3M9XCJzZWN0aW9uXCI+XG4gICAgPGgyPlx1QUNFMFx1QUMxRCBcdUM4MTVcdUJDRjQ8L2gyPlxuICAgIDxkaXYgY2xhc3M9XCJpbmZvLWdyaWRcIj5cbiAgICAgIDxzcGFuIGNsYXNzPVwibGFiZWxcIj5cdUFDRTBcdUFDMURcdUJBODU8L3NwYW4+PHNwYW4+JHtjdXN0b21lck5hbWV9PC9zcGFuPlxuICAgICAgPHNwYW4gY2xhc3M9XCJsYWJlbFwiPlx1QzVGMFx1Qjc3RFx1Q0M5ODwvc3Bhbj48c3Bhbj4ke2N1c3RvbWVyUGhvbmV9PC9zcGFuPlxuICAgICAgPHNwYW4gY2xhc3M9XCJsYWJlbFwiPlx1QUNGNVx1QzBBQyBcdUM4RkNcdUMxOEM8L3NwYW4+PHNwYW4+JHtjdXN0b21lckFkZHJlc3N9PC9zcGFuPlxuICAgICAgPHNwYW4gY2xhc3M9XCJsYWJlbFwiPlx1QUNBQ1x1QzgwMVx1Qzc3Qzwvc3Bhbj48c3Bhbj4ke3RvZGF5fTwvc3Bhbj5cbiAgICA8L2Rpdj5cbiAgPC9kaXY+XG5cbiAgPGRpdiBjbGFzcz1cInNlY3Rpb25cIj5cbiAgICA8aDI+XHVBQ0Y1XHVDMEFDIFx1Qzg3MFx1QUM3NDwvaDI+XG4gICAgPGRpdiBjbGFzcz1cImluZm8tZ3JpZFwiPlxuICAgICAgPHNwYW4gY2xhc3M9XCJsYWJlbFwiPlx1QzhGQ1x1QUM3MCBcdUQ2MTVcdUQwREM8L3NwYW4+PHNwYW4+JHsoaW5wdXQgJiYgaW5wdXQucmVzaWRlbmNlKSB8fCAnLSd9PC9zcGFuPlxuICAgICAgPHNwYW4gY2xhc3M9XCJsYWJlbFwiPlx1QkE3NFx1QzgwMTwvc3Bhbj48c3Bhbj4keyhpbnB1dCAmJiBpbnB1dC5weWVvbmcpIHx8ICctJ30gXHVEM0M5ICgke2VzdGltYXRlLmFyZWFTcW0gPyBlc3RpbWF0ZS5hcmVhU3FtLnRvRml4ZWQoMSkgOiAnLSd9IFx1MzNBMSk8L3NwYW4+XG4gICAgICA8c3BhbiBjbGFzcz1cImxhYmVsXCI+XHVDRUU4XHVDMTQ5PC9zcGFuPjxzcGFuPiR7KGlucHV0ICYmIGlucHV0LmNvbmNlcHQpIHx8ICctJ308L3NwYW4+XG4gICAgICA8c3BhbiBjbGFzcz1cImxhYmVsXCI+XHVDMkRDXHVBQ0Y1IFx1QzEzOVx1QzE1ODwvc3Bhbj48c3Bhbj4keyhpbnB1dCAmJiBpbnB1dC5zZWN0aW9ucyAmJiBpbnB1dC5zZWN0aW9ucy5qb2luKCcsICcpKSB8fCAnLSd9PC9zcGFuPlxuICAgIDwvZGl2PlxuICA8L2Rpdj5cblxuICA8ZGl2IGNsYXNzPVwic2VjdGlvblwiPlxuICAgIDxoMj5cdUFFMDhcdUM1NjEgXHVCMEI0XHVDNUVEPC9oMj5cbiAgICA8dGFibGUgY2xhc3M9XCJhbW91bnQtdGFibGVcIj5cbiAgICAgIDx0aGVhZD5cbiAgICAgICAgPHRyPjx0aD5cdUQ1NkRcdUJBQTk8L3RoPjx0aCBjbGFzcz1cInJpZ2h0XCI+XHVBRTA4XHVDNTYxPC90aD48L3RyPlxuICAgICAgPC90aGVhZD5cbiAgICAgIDx0Ym9keT5cbiAgICAgICAgPHRyPlxuICAgICAgICAgIDx0ZD5cdUIzQzRcdUFFMDlcdUQ1NjlcdUFDQzQgKFx1Qzc5MFx1QzdBQyArIFx1Qzc3OFx1QUM3NFx1QkU0NCArIFx1QUMwNFx1QzgxMVx1QkU0NCk8L3RkPlxuICAgICAgICAgIDx0ZCBjbGFzcz1cInJpZ2h0XCI+JHtmb3JtYXRLUlcoY29udHJhY3RBbW91bnQpfTwvdGQ+XG4gICAgICAgIDwvdHI+XG4gICAgICAgIDx0cj5cbiAgICAgICAgICA8dGQ+XHVCRDgwXHVBQzAwXHVDMTM4IFZBVCAoMTAlKTwvdGQ+XG4gICAgICAgICAgPHRkIGNsYXNzPVwicmlnaHRcIj4ke2Zvcm1hdEtSVyh2YXRBbW91bnQpfTwvdGQ+XG4gICAgICAgIDwvdHI+XG4gICAgICAgIDx0ciBjbGFzcz1cInRvdGFsLXJvd1wiPlxuICAgICAgICAgIDx0ZD5cdUNENUNcdUM4ODUgXHVENTY5XHVBQ0M0IChWQVQgXHVEM0VDXHVENTY4KTwvdGQ+XG4gICAgICAgICAgPHRkIGNsYXNzPVwicmlnaHRcIj4ke2Zvcm1hdEtSVyhmaW5hbEFtb3VudCl9PC90ZD5cbiAgICAgICAgPC90cj5cbiAgICAgIDwvdGJvZHk+XG4gICAgPC90YWJsZT5cbiAgICA8ZGl2IGNsYXNzPVwibWV0YS1yb3dcIj5cbiAgICAgIFx1MzNBMVx1QjJGOSAke2Zvcm1hdEtSVyhlc3RpbWF0ZS5zcW1QcmljZSl9ICZuYnNwO3wmbmJzcDtcbiAgICAgIFx1RDNDOVx1QjJGOSAke2Zvcm1hdEtSVyhlc3RpbWF0ZS5weVByaWNlKX1cbiAgICA8L2Rpdj5cbiAgPC9kaXY+XG5cbiAgPGRpdiBjbGFzcz1cInNpZ24tc2VjdGlvblwiPlxuICAgIDxkaXYgY2xhc3M9XCJzaWduLWJveFwiPlxuICAgICAgPGRpdiBjbGFzcz1cInNpZ24tdGl0bGVcIj5cdUJDMUNcdUM4RkNcdUNDOTggKFx1QUNFMFx1QUMxRCk8L2Rpdj5cbiAgICAgIDxkaXYgY2xhc3M9XCJzaWduLWxpbmVcIj4ke2N1c3RvbWVyTmFtZX0gJm5ic3A7Jm5ic3A7Jm5ic3A7Jm5ic3A7Jm5ic3A7Jm5ic3A7Jm5ic3A7Jm5ic3A7Jm5ic3A7Jm5ic3A7IChcdUM3NzgpPC9kaXY+XG4gICAgPC9kaXY+XG4gICAgPGRpdiBjbGFzcz1cInNpZ24tYm94XCI+XG4gICAgICA8ZGl2IGNsYXNzPVwic2lnbi10aXRsZVwiPlx1QzIxOFx1QzhGQ1x1Q0M5OCAoXHVDNUQwXHVDRjU0XHVCOUFDXHVDNUI4KTwvZGl2PlxuICAgICAgPGRpdiBjbGFzcz1cInNpZ24tbGluZVwiPlx1QzVEMFx1Q0Y1NFx1QjlBQ1x1QzVCOCBcdUM3NzhcdUQxNENcdUI5QUNcdUM1QjQgXHVCMzAwXHVENDVDICZuYnNwOyZuYnNwOyAoXHVDNzc4KTwvZGl2PlxuICAgIDwvZGl2PlxuICA8L2Rpdj5cblxuICA8ZGl2IGNsYXNzPVwiZm9vdGVyXCI+XG4gICAgXHVCQ0Y4IFx1QUNBQ1x1QzgwMVx1QzExQ1x1QjI5NCBFQ09SRUFOIEJPQyB2Ni4wXHVDNUQwXHVDMTFDIFx1Qzc5MFx1QjNEOSBcdUMwRERcdUMxMzFcdUI0MThcdUM1QzhcdUMyQjVcdUIyQzhcdUIyRTQuIFx1QzcyMFx1RDZBOFx1QUUzMFx1QUMwNDogXHVBQ0FDXHVDODAxXHVDNzdDXHVCODVDXHVCRDgwXHVEMTMwIDMwXHVDNzdDXG4gIDwvZGl2PlxuPC9ib2R5PlxuPC9odG1sPmA7XG59XG5cbmZ1bmN0aW9uIHByaW50RXN0aW1hdGUoZXN0aW1hdGUsIGNvbnRyYWN0LCBpbnB1dCkge1xuICB0cnkge1xuICAgIGNvbnN0IHcgPSB3aW5kb3cub3BlbignJywgJ19ibGFuaycsICd3aWR0aD04MjAsaGVpZ2h0PTcwMCcpO1xuICAgIGlmICghdykge1xuICAgICAgYWxlcnQoJ1x1RDMxRFx1QzVDNVx1Qzc3NCBcdUNDMjhcdUIyRThcdUI0MThcdUM1QzhcdUMyQjVcdUIyQzhcdUIyRTQuIFx1RDMxRFx1QzVDNSBcdUQ1QzhcdUM2QTkgXHVENkM0IFx1QjJFNFx1QzJEQyBcdUMyRENcdUIzQzRcdUQ1NThcdUMxMzhcdUM2OTQuJyk7XG4gICAgICByZXR1cm47XG4gICAgfVxuICAgIHcuZG9jdW1lbnQud3JpdGUoYnVpbGRQcmludEhUTUwoZXN0aW1hdGUsIGNvbnRyYWN0LCBpbnB1dCB8fCB7fSkpO1xuICAgIHcuZG9jdW1lbnQuY2xvc2UoKTtcbiAgICB3LmZvY3VzKCk7XG4gICAgc2V0VGltZW91dCgoKSA9PiB7IHcucHJpbnQoKTsgfSwgNTAwKTtcbiAgfSBjYXRjaCAoZSkge1xuICAgIGNvbnNvbGUuZXJyb3IoJ1tFc3RpbWF0ZVBERl0gXHVDRDlDXHVCODI1IFx1QzJFNFx1RDMyODonLCBlKTtcbiAgfVxufVxuXG5jb25zdCBFc3RpbWF0ZVBERiA9IHsgcHJpbnRFc3RpbWF0ZSwgYnVpbGRQcmludEhUTUwgfTtcbm1vZHVsZS5leHBvcnRzID0geyBFc3RpbWF0ZVBERiB9O1xuIiwgIi8vIEVDT1JFQU4gQk9DIHY2LjAgXHUyMDE0IENvbnRyYWN0IFBhZ2UgKFx1QUNDNFx1QzU3RCBcdUM3OTFcdUMxMzEgVUkpXG5jb25zdCB7IENvbnRyYWN0Q29udHJvbGxlciB9ID0gcmVxdWlyZSgnLi9Db250cmFjdENvbnRyb2xsZXIuanMnKTtcbmNvbnN0IHsgRXN0aW1hdGVQREYgfSA9IHJlcXVpcmUoJy4vRXN0aW1hdGVQREYuanMnKTtcblxuZnVuY3Rpb24gZm10KG4pIHtcbiAgcmV0dXJuIChuIHx8IDApLnRvTG9jYWxlU3RyaW5nKCdrby1LUicpICsgJ1x1QzZEMCc7XG59XG5cbmZ1bmN0aW9uIF9tYXNrUGhvbmUocGhvbmUpIHtcbiAgaWYgKCFwaG9uZSkgcmV0dXJuICctJztcbiAgcmV0dXJuIHBob25lLnJlcGxhY2UoLyhcXGR7M30pLT8oXFxkezMsNH0pLT8oXFxkezR9KS8sICckMS0qKioqLSQzJyk7XG59XG5cbmNsYXNzIENvbnRyYWN0UGFnZSB7XG4gIGNvbnN0cnVjdG9yKG9wdHMpIHtcbiAgICB0aGlzLmNvbnRhaW5lckVsID0gb3B0cy5jb250YWluZXJFbDtcbiAgICB0aGlzLmVzdGltYXRlID0gb3B0cy5lc3RpbWF0ZTtcbiAgICB0aGlzLmlucHV0ID0gb3B0cy5pbnB1dCB8fCB7fTtcbiAgICB0aGlzLmNvbnRyb2xsZXIgPSBuZXcgQ29udHJhY3RDb250cm9sbGVyKHsgZXN0aW1hdGU6IHRoaXMuZXN0aW1hdGUgfSk7XG4gICAgdGhpcy5fcmVuZGVyKCk7XG4gICAgdGhpcy5jb250cm9sbGVyLnN1YnNjcmliZSgoZXZ0LCBwYXlsb2FkKSA9PiB7XG4gICAgICBpZiAoZXZ0ID09PSAnQ09OVFJBQ1RfQ1JFQVRFRCcgfHwgZXZ0ID09PSAnQ09OVFJBQ1RfU0lHTkVEJyB8fCBldnQgPT09ICdDT05UUkFDVF9DQU5DRUxFRCcpIHtcbiAgICAgICAgdGhpcy5fcmVuZGVyQ29udHJhY3RSZXN1bHQocGF5bG9hZCk7XG4gICAgICB9XG4gICAgfSk7XG4gIH1cblxuICBfcmVuZGVyKCkge1xuICAgIGNvbnN0IHMgPSB0aGlzLmNvbnRyb2xsZXIuZ2V0U3VtbWFyeSgpO1xuICAgIHRoaXMuY29udGFpbmVyRWwuaW5uZXJIVE1MID0gYFxuICAgICAgPGRpdiBjbGFzcz1cImNvbnRyYWN0LXBhZ2VcIj5cbiAgICAgICAgPGRpdiBjbGFzcz1cInBhZ2UtaGVhZGVyXCI+XG4gICAgICAgICAgPGgyPlx1QUNDNFx1QzU3RFx1QzExQyBcdUM3OTFcdUMxMzE8L2gyPlxuICAgICAgICAgIDxkaXYgY2xhc3M9XCJzdWJ0aXRsZVwiPlx1QUNBQ1x1QzgwMSBcdUM2NDRcdUMxMzEgXHUyMTkyIFx1QUNDNFx1QzU3RCBcdUNEMDhcdUM1NDggXHVDNzkxXHVDMTMxIChQaGFzZSA0IFdlZWsgNSk8L2Rpdj5cbiAgICAgICAgPC9kaXY+XG5cbiAgICAgICAgPGRpdiBjbGFzcz1cImNvbnRyYWN0LWdyaWRcIj5cbiAgICAgICAgICA8ZGl2IGNsYXNzPVwiY2FyZCBlc3RpbWF0ZS1zdW1tYXJ5LWNhcmRcIj5cbiAgICAgICAgICAgIDxoMz5cdUFDQUNcdUM4MDEgXHVDNjk0XHVDNTdEPC9oMz5cbiAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJzdW1tYXJ5LXJvd1wiPlxuICAgICAgICAgICAgICA8c3Bhbj5cdUFDRjVcdUFFMDlcdUFDMDA8L3NwYW4+PHNwYW4+JHtmbXQocy5zdXBwbHkpfTwvc3Bhbj5cbiAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgPGRpdiBjbGFzcz1cInN1bW1hcnktcm93XCI+XG4gICAgICAgICAgICAgIDxzcGFuPlx1QjNDNFx1QUUwOVx1RDU2OVx1QUNDNCAoVkFUIFx1QzgwNCk8L3NwYW4+PHNwYW4gY2xhc3M9XCJoaWdobGlnaHRcIj4ke2ZtdChzLmNvbnRyYWN0QW1vdW50KX08L3NwYW4+XG4gICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJzdW1tYXJ5LXJvd1wiPlxuICAgICAgICAgICAgICA8c3Bhbj5WQVQgKDEwJSk8L3NwYW4+PHNwYW4+JHtmbXQocy52YXRBbW91bnQpfTwvc3Bhbj5cbiAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgPGRpdiBjbGFzcz1cInN1bW1hcnktcm93IHRvdGFsXCI+XG4gICAgICAgICAgICAgIDxzcGFuPlx1Q0Q1Q1x1Qzg4NVx1QUUwOFx1QzU2MSAoVkFUIFx1RDNFQ1x1RDU2OCk8L3NwYW4+PHNwYW4gY2xhc3M9XCJnb2xkXCI+JHtmbXQocy5maW5hbEFtb3VudCl9PC9zcGFuPlxuICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICA8ZGl2IGNsYXNzPVwic3VtbWFyeS1tZXRhXCI+XG4gICAgICAgICAgICAgIDxzcGFuPlx1RDNDOVx1QjJGOSAke2ZtdChzLnB5UHJpY2UpfTwvc3Bhbj5cbiAgICAgICAgICAgICAgPHNwYW4+XHVCOUM4XHVDOUM0ICR7cy5tYXJnaW4gfHwgMH0lPC9zcGFuPlxuICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgPC9kaXY+XG5cbiAgICAgICAgICA8ZGl2IGNsYXNzPVwiY2FyZCBjdXN0b21lci1mb3JtLWNhcmRcIiBpZD1cImN1c3RvbWVyLWZvcm0td3JhcFwiPlxuICAgICAgICAgICAgPGgzPlx1QUNFMFx1QUMxRCBcdUM4MTVcdUJDRjQ8L2gzPlxuICAgICAgICAgICAgPGRpdiBjbGFzcz1cImZvcm0tZ3JvdXBcIj5cbiAgICAgICAgICAgICAgPGxhYmVsPlx1QUNFMFx1QUMxRFx1QkE4NSAqPC9sYWJlbD5cbiAgICAgICAgICAgICAgPGlucHV0IHR5cGU9XCJ0ZXh0XCIgaWQ9XCJjb250cmFjdC1uYW1lXCIgcGxhY2Vob2xkZXI9XCJcdUQ2NERcdUFFMzhcdUIzRDlcIj5cbiAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgPGRpdiBjbGFzcz1cImZvcm0tZ3JvdXBcIj5cbiAgICAgICAgICAgICAgPGxhYmVsPlx1QzVGMFx1Qjc3RFx1Q0M5OCAqPC9sYWJlbD5cbiAgICAgICAgICAgICAgPGlucHV0IHR5cGU9XCJ0ZXh0XCIgaWQ9XCJjb250cmFjdC1waG9uZVwiIHBsYWNlaG9sZGVyPVwiMDEwLTAwMDAtMDAwMFwiPlxuICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICA8ZGl2IGNsYXNzPVwiZm9ybS1ncm91cFwiPlxuICAgICAgICAgICAgICA8bGFiZWw+XHVBQ0Y1XHVDMEFDIFx1QzhGQ1x1QzE4QzwvbGFiZWw+XG4gICAgICAgICAgICAgIDxpbnB1dCB0eXBlPVwidGV4dFwiIGlkPVwiY29udHJhY3QtYWRkcmVzc1wiIHBsYWNlaG9sZGVyPVwiXHVDMTFDXHVDNkI4XHVDMkRDIFx1QUMxNVx1QjBBOFx1QUQ2QyAuLi5cIj5cbiAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgPGRpdiBjbGFzcz1cImZvcm0tZ3JvdXAgcHJpdmFjeS1jb25zZW50XCI+XG4gICAgICAgICAgICAgIDxsYWJlbCBzdHlsZT1cImZsZXgtZGlyZWN0aW9uOnJvdzsgYWxpZ24taXRlbXM6ZmxleC1zdGFydDsgZ2FwOjhweDsgY3Vyc29yOnBvaW50ZXI7XCI+XG4gICAgICAgICAgICAgICAgPGlucHV0IHR5cGU9XCJjaGVja2JveFwiIGlkPVwiY29udHJhY3QtY29uc2VudFwiIHN0eWxlPVwid2lkdGg6YXV0bzsgbWFyZ2luLXRvcDozcHg7XCI+XG4gICAgICAgICAgICAgICAgPHNwYW4gc3R5bGU9XCJmb250LXNpemU6MC44MnJlbTsgY29sb3I6dmFyKC0tdGV4dC1kaW0pOyBsaW5lLWhlaWdodDoxLjU7XCI+XG4gICAgICAgICAgICAgICAgICBbXHVENTQ0XHVDMjE4XSBcdUM3NzhcdUQxNENcdUI5QUNcdUM1QjQgXHVBQ0Y1XHVDMEFDIFx1QUNBQ1x1QzgwMVx1MDBCN1x1QUNDNFx1QzU3RFx1Qzc0NCBcdUM3MDRcdUQ1NUMgXHVBQzFDXHVDNzc4XHVDODE1XHVCQ0Y0KFx1QzEzMVx1QkE4NVx1MDBCN1x1QzVGMFx1Qjc3RFx1Q0M5OFx1MDBCN1x1QzhGQ1x1QzE4QykgXHVDMjE4XHVDOUQxXHUwMEI3XHVDNzc0XHVDNkE5XHVDNUQwIFx1QjNEOVx1Qzc1OFx1RDU2OVx1QjJDOFx1QjJFNC5cbiAgICAgICAgICAgICAgICAgIFx1QzIxOFx1QzlEMVx1QjQxQyBcdUM4MTVcdUJDRjRcdUIyOTQgXHVBQ0M0XHVDNTdEIFx1QkFBOVx1QzgwMVx1QzczQ1x1Qjg1Q1x1QjlDQyBcdUMwQUNcdUM2QTlcdUI0MThcdUJBNzAsIFx1QUNDNFx1QzU3RCBcdUM4ODVcdUI4Q0MgXHVENkM0IDVcdUIxNDRcdUFDMDQgXHVCQ0Y0XHVBRDAwIFx1RDZDNCBcdUQzMENcdUFFMzBcdUI0MjlcdUIyQzhcdUIyRTQuXG4gICAgICAgICAgICAgICAgPC9zcGFuPlxuICAgICAgICAgICAgICA8L2xhYmVsPlxuICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICA8ZGl2IGNsYXNzPVwiZm9ybS1lcnJvclwiIGlkPVwiY29udHJhY3QtZXJyb3JcIiBzdHlsZT1cImRpc3BsYXk6bm9uZTtcIj48L2Rpdj5cbiAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJmb3JtLWFjdGlvbnNcIj5cbiAgICAgICAgICAgICAgPGJ1dHRvbiBjbGFzcz1cInByaW1hcnlcIiBpZD1cImJ0bi1jcmVhdGUtZHJhZnRcIj5cdUFDQzRcdUM1N0RcdUMxMUMgXHVDRDA4XHVDNTQ4IFx1Qzc5MVx1QzEzMTwvYnV0dG9uPlxuICAgICAgICAgICAgICA8YnV0dG9uIGNsYXNzPVwiYnRuLXNlY29uZGFyeVwiIGlkPVwiYnRuLXByaW50LWVzdGltYXRlXCI+XHVEODNEXHVEQ0M0IFBERiBcdUFDQUNcdUM4MDFcdUMxMUM8L2J1dHRvbj5cbiAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgIDwvZGl2PlxuICAgICAgICA8L2Rpdj5cblxuICAgICAgICA8ZGl2IGlkPVwiY29udHJhY3QtcmVzdWx0XCIgc3R5bGU9XCJkaXNwbGF5Om5vbmU7XCI+PC9kaXY+XG4gICAgICA8L2Rpdj5cbiAgICBgO1xuXG4gICAgdGhpcy5jb250YWluZXJFbC5xdWVyeVNlbGVjdG9yKCcjYnRuLWNyZWF0ZS1kcmFmdCcpLmFkZEV2ZW50TGlzdGVuZXIoJ2NsaWNrJywgKCkgPT4ge1xuICAgICAgdGhpcy5fb25DcmVhdGVEcmFmdCgpO1xuICAgIH0pO1xuICAgIHRoaXMuY29udGFpbmVyRWwucXVlcnlTZWxlY3RvcignI2J0bi1wcmludC1lc3RpbWF0ZScpLmFkZEV2ZW50TGlzdGVuZXIoJ2NsaWNrJywgKCkgPT4ge1xuICAgICAgdGhpcy5fb25QcmludEVzdGltYXRlKCk7XG4gICAgfSk7XG4gIH1cblxuICBhc3luYyBfb25DcmVhdGVEcmFmdCgpIHtcbiAgICBjb25zdCBuYW1lICAgID0gdGhpcy5jb250YWluZXJFbC5xdWVyeVNlbGVjdG9yKCcjY29udHJhY3QtbmFtZScpLnZhbHVlLnRyaW0oKTtcbiAgICBjb25zdCBwaG9uZSAgID0gdGhpcy5jb250YWluZXJFbC5xdWVyeVNlbGVjdG9yKCcjY29udHJhY3QtcGhvbmUnKS52YWx1ZS50cmltKCk7XG4gICAgY29uc3QgYWRkcmVzcyA9IHRoaXMuY29udGFpbmVyRWwucXVlcnlTZWxlY3RvcignI2NvbnRyYWN0LWFkZHJlc3MnKS52YWx1ZS50cmltKCk7XG4gICAgY29uc3QgY29uc2VudCA9IHRoaXMuY29udGFpbmVyRWwucXVlcnlTZWxlY3RvcignI2NvbnRyYWN0LWNvbnNlbnQnKS5jaGVja2VkO1xuICAgIGNvbnN0IGVyckVsICAgPSB0aGlzLmNvbnRhaW5lckVsLnF1ZXJ5U2VsZWN0b3IoJyNjb250cmFjdC1lcnJvcicpO1xuICAgIGNvbnN0IGJ0biAgICAgPSB0aGlzLmNvbnRhaW5lckVsLnF1ZXJ5U2VsZWN0b3IoJyNidG4tY3JlYXRlLWRyYWZ0Jyk7XG5cbiAgICBpZiAoIWNvbnNlbnQpIHtcbiAgICAgIGVyckVsLnRleHRDb250ZW50ID0gJ1x1QUMxQ1x1Qzc3OFx1QzgxNVx1QkNGNCBcdUMyMThcdUM5RDFcdTAwQjdcdUM3NzRcdUM2QTkgXHVCM0Q5XHVDNzU4XHVBQzAwIFx1RDU0NFx1QzY5NFx1RDU2OVx1QjJDOFx1QjJFNC4nO1xuICAgICAgZXJyRWwuc3R5bGUuZGlzcGxheSA9ICdibG9jayc7XG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgYnRuLmRpc2FibGVkID0gdHJ1ZTtcbiAgICBidG4udGV4dENvbnRlbnQgPSAnXHVDNzkxXHVDMTMxIFx1QzkxMS4uLic7XG5cbiAgICBjb25zdCByID0gYXdhaXQgdGhpcy5jb250cm9sbGVyLmNyZWF0ZURyYWZ0KHsgY3VzdG9tZXJOYW1lOiBuYW1lLCBjdXN0b21lclBob25lOiBwaG9uZSwgY3VzdG9tZXJBZGRyZXNzOiBhZGRyZXNzIH0pO1xuXG4gICAgYnRuLmRpc2FibGVkID0gZmFsc2U7XG4gICAgYnRuLnRleHRDb250ZW50ID0gJ1x1QUNDNFx1QzU3RFx1QzExQyBcdUNEMDhcdUM1NDggXHVDNzkxXHVDMTMxJztcblxuICAgIGlmICghci5vaykge1xuICAgICAgZXJyRWwudGV4dENvbnRlbnQgPSByLmVycm9ycy5qb2luKCcgLyAnKTtcbiAgICAgIGVyckVsLnN0eWxlLmRpc3BsYXkgPSAnYmxvY2snO1xuICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICBlcnJFbC5zdHlsZS5kaXNwbGF5ID0gJ25vbmUnO1xuICB9XG5cbiAgX3JlbmRlckNvbnRyYWN0UmVzdWx0KGNvbnRyYWN0KSB7XG4gICAgY29uc3QgcmVzdWx0RWwgID0gdGhpcy5jb250YWluZXJFbC5xdWVyeVNlbGVjdG9yKCcjY29udHJhY3QtcmVzdWx0Jyk7XG4gICAgY29uc3QgZm9ybVdyYXAgID0gdGhpcy5jb250YWluZXJFbC5xdWVyeVNlbGVjdG9yKCcjY3VzdG9tZXItZm9ybS13cmFwJyk7XG4gICAgZm9ybVdyYXAuc3R5bGUub3BhY2l0eSA9ICcwLjUnO1xuICAgIGZvcm1XcmFwLnF1ZXJ5U2VsZWN0b3IoJyNidG4tY3JlYXRlLWRyYWZ0JykuZGlzYWJsZWQgPSB0cnVlO1xuXG4gICAgY29uc3QgaXNDYW5jZWxlZCA9IGNvbnRyYWN0LnN0YXR1cyA9PT0gJ0NBTkNFTEVEJztcblxuICAgIHJlc3VsdEVsLnN0eWxlLmRpc3BsYXkgPSAnYmxvY2snO1xuICAgIHJlc3VsdEVsLmlubmVySFRNTCA9IGBcbiAgICAgIDxkaXYgY2xhc3M9XCJjYXJkIGNvbnRyYWN0LXJlc3VsdC1jYXJkXCI+XG4gICAgICAgIDxkaXYgY2xhc3M9XCJyZXN1bHQtYmFkZ2UgJHtjb250cmFjdC5zdGF0dXMudG9Mb3dlckNhc2UoKX1cIj5cbiAgICAgICAgICAke2NvbnRyYWN0LnN0YXR1cyA9PT0gJ1NJR05FRCcgICA/ICdcdTI3MDUgXHVBQ0M0XHVDNTdEIFx1QzY0NFx1QjhDQyAoU0lHTkVEKScgICA6XG4gICAgICAgICAgICBjb250cmFjdC5zdGF0dXMgPT09ICdDQU5DRUxFRCcgPyAnXHUyNzRDIFx1QUNDNFx1QzU3RCBcdUNERThcdUMxOEMgKENBTkNFTEVEKScgOlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgJ1x1RDgzRFx1RENDNCBcdUFDQzRcdUM1N0QgXHVDRDA4XHVDNTQ4IChEUkFGVCknfVxuICAgICAgICA8L2Rpdj5cbiAgICAgICAgPGRpdiBjbGFzcz1cInJlc3VsdC1ncmlkXCI+XG4gICAgICAgICAgPGRpdiBjbGFzcz1cInJlc3VsdC1pdGVtXCI+PHNwYW4+XHVBQ0M0XHVDNTdEIElEPC9zcGFuPjxzcGFuIHN0eWxlPVwiZm9udC1zaXplOjAuNzVyZW07XCI+JHtjb250cmFjdC5pZH08L3NwYW4+PC9kaXY+XG4gICAgICAgICAgPGRpdiBjbGFzcz1cInJlc3VsdC1pdGVtXCI+PHNwYW4+XHVBQ0UwXHVBQzFEXHVCQTg1PC9zcGFuPjxzcGFuPiR7Y29udHJhY3QuY3VzdG9tZXJOYW1lfTwvc3Bhbj48L2Rpdj5cbiAgICAgICAgICA8ZGl2IGNsYXNzPVwicmVzdWx0LWl0ZW1cIj48c3Bhbj5cdUM1RjBcdUI3N0RcdUNDOTg8L3NwYW4+PHNwYW4+JHtfbWFza1Bob25lKGNvbnRyYWN0LmN1c3RvbWVyUGhvbmUpfTwvc3Bhbj48L2Rpdj5cbiAgICAgICAgICA8ZGl2IGNsYXNzPVwicmVzdWx0LWl0ZW1cIj48c3Bhbj5cdUFDRjVcdUMwQUMgXHVDOEZDXHVDMThDPC9zcGFuPjxzcGFuPiR7Y29udHJhY3QuY3VzdG9tZXJBZGRyZXNzIHx8ICctJ308L3NwYW4+PC9kaXY+XG4gICAgICAgICAgPGRpdiBjbGFzcz1cInJlc3VsdC1pdGVtXCI+PHNwYW4+XHVCM0M0XHVBRTA5XHVENTY5XHVBQ0M0PC9zcGFuPjxzcGFuPiR7Zm10KGNvbnRyYWN0LnRvdGFsQW1vdW50KX08L3NwYW4+PC9kaXY+XG4gICAgICAgICAgPGRpdiBjbGFzcz1cInJlc3VsdC1pdGVtXCI+PHNwYW4+VkFUPC9zcGFuPjxzcGFuPiR7Zm10KGNvbnRyYWN0LnZhdEFtb3VudCl9PC9zcGFuPjwvZGl2PlxuICAgICAgICAgIDxkaXYgY2xhc3M9XCJyZXN1bHQtaXRlbSB0b3RhbFwiPjxzcGFuPlx1Q0Q1Q1x1Qzg4NVx1QUUwOFx1QzU2MTwvc3Bhbj48c3Bhbj4ke2ZtdChjb250cmFjdC5maW5hbEFtb3VudCl9PC9zcGFuPjwvZGl2PlxuICAgICAgICAgIDxkaXYgY2xhc3M9XCJyZXN1bHQtaXRlbVwiPjxzcGFuPlx1QzBDMVx1RDBEQzwvc3Bhbj48c3BhbiBjbGFzcz1cInN0YXR1cy1iYWRnZSAke2NvbnRyYWN0LnN0YXR1c31cIj4ke2NvbnRyYWN0LnN0YXR1c308L3NwYW4+PC9kaXY+XG4gICAgICAgICAgJHtjb250cmFjdC5sb2NhbCA/ICc8ZGl2IGNsYXNzPVwicmVzdWx0LWl0ZW0gd2FyblwiIHN0eWxlPVwiZ3JpZC1jb2x1bW46MS8tMTtcIj48c3Bhbj5cdTI2QTBcdUZFMEY8L3NwYW4+PHNwYW4+XHVCODVDXHVDRUVDIFx1QzBERFx1QzEzMSAoSVBDIFx1QkJGOFx1QzVGMFx1QUNCMCBcdTIwMTQgREIgXHVCQkY4XHVDODAwXHVDN0E1KTwvc3Bhbj48L2Rpdj4nIDogJyd9XG4gICAgICAgIDwvZGl2PlxuICAgICAgICAkeyFpc0NhbmNlbGVkICYmIGNvbnRyYWN0LnN0YXR1cyA9PT0gJ0RSQUZUJyA/IGBcbiAgICAgICAgICA8ZGl2IGNsYXNzPVwicmVzdWx0LWFjdGlvbnNcIj5cbiAgICAgICAgICAgIDxidXR0b24gY2xhc3M9XCJwcmltYXJ5XCIgaWQ9XCJidG4tc2lnblwiPlx1MjcwRFx1RkUwRiBcdUMxMUNcdUJBODUgXHVDNjQ0XHVCOENDIChEUkFGVCBcdTIxOTIgU0lHTkVEKTwvYnV0dG9uPlxuICAgICAgICAgICAgPGJ1dHRvbiBjbGFzcz1cImJ0bi1kYW5nZXJcIiBpZD1cImJ0bi1jYW5jZWwtY29udHJhY3RcIj5cdUFDQzRcdUM1N0QgXHVDREU4XHVDMThDPC9idXR0b24+XG4gICAgICAgICAgPC9kaXY+XG4gICAgICAgIGAgOiAnJ31cbiAgICAgICAgPGRpdiBjbGFzcz1cInJlc3VsdC1hY3Rpb25zXCIgc3R5bGU9XCJtYXJnaW4tdG9wOiA4cHg7XCI+XG4gICAgICAgICAgPGJ1dHRvbiBjbGFzcz1cImJ0bi1zZWNvbmRhcnlcIiBpZD1cImJ0bi1wcmludC1zaWduZWRcIj5cdUQ4M0RcdURDQzQgXHVBQ0M0XHVDNTdEXHVDMTFDIFx1Q0Q5Q1x1QjgyNTwvYnV0dG9uPlxuICAgICAgICAgIDxidXR0b24gY2xhc3M9XCJidG4tc2Vjb25kYXJ5XCIgaWQ9XCJidG4tbmV3LWVzdGltYXRlXCIgb25jbGljaz1cImxvY2F0aW9uLnJlbG9hZCgpXCI+XHVDMEM4IFx1QUNBQ1x1QzgwMSBcdUI5Q0NcdUI0RTRcdUFFMzA8L2J1dHRvbj5cbiAgICAgICAgPC9kaXY+XG4gICAgICA8L2Rpdj5cbiAgICBgO1xuXG4gICAgaWYgKCFpc0NhbmNlbGVkICYmIGNvbnRyYWN0LnN0YXR1cyA9PT0gJ0RSQUZUJykge1xuICAgICAgcmVzdWx0RWwucXVlcnlTZWxlY3RvcignI2J0bi1zaWduJykuYWRkRXZlbnRMaXN0ZW5lcignY2xpY2snLCAoKSA9PiB7XG4gICAgICAgIGNvbnN0IHIgPSB0aGlzLmNvbnRyb2xsZXIuc2lnbigpO1xuICAgICAgICBpZiAoci5vaykgdGhpcy5fcmVuZGVyQ29udHJhY3RSZXN1bHQoci5jb250cmFjdCk7XG4gICAgICB9KTtcbiAgICAgIHJlc3VsdEVsLnF1ZXJ5U2VsZWN0b3IoJyNidG4tY2FuY2VsLWNvbnRyYWN0JykuYWRkRXZlbnRMaXN0ZW5lcignY2xpY2snLCAoKSA9PiB7XG4gICAgICAgIGlmIChjb25maXJtKCdcdUFDQzRcdUM1N0RcdUM3NDQgXHVDREU4XHVDMThDXHVENTU4XHVDMkRDXHVBQ0EwXHVDMkI1XHVCMkM4XHVBRTRDPycpKSB7XG4gICAgICAgICAgY29uc3QgciA9IHRoaXMuY29udHJvbGxlci5jYW5jZWwoKTtcbiAgICAgICAgICBpZiAoci5vaykgdGhpcy5fcmVuZGVyQ29udHJhY3RSZXN1bHQoci5jb250cmFjdCk7XG4gICAgICAgIH1cbiAgICAgIH0pO1xuICAgIH1cblxuICAgIHJlc3VsdEVsLnF1ZXJ5U2VsZWN0b3IoJyNidG4tcHJpbnQtc2lnbmVkJykuYWRkRXZlbnRMaXN0ZW5lcignY2xpY2snLCAoKSA9PiB7XG4gICAgICB0aGlzLl9vblByaW50RXN0aW1hdGUoY29udHJhY3QpO1xuICAgIH0pO1xuICB9XG5cbiAgX29uUHJpbnRFc3RpbWF0ZShjb250cmFjdCkge1xuICAgIGNvbnN0IHMgPSB0aGlzLmNvbnRyb2xsZXIuZ2V0U3VtbWFyeSgpO1xuICAgIEVzdGltYXRlUERGLnByaW50RXN0aW1hdGUoXG4gICAgICB7IC4uLnRoaXMuZXN0aW1hdGUsIC4uLnMgfSxcbiAgICAgIGNvbnRyYWN0IHx8IHRoaXMuY29udHJvbGxlci5jb250cmFjdCxcbiAgICAgIHRoaXMuaW5wdXRcbiAgICApO1xuICB9XG5cbiAgZGVzdHJveSgpIHt9XG59XG5cbm1vZHVsZS5leHBvcnRzID0geyBDb250cmFjdFBhZ2UgfTtcbiJdLAogICJtYXBwaW5ncyI6ICI7Ozs7O0FBQUE7QUFBQTtBQUlBLGFBQVMscUJBQXFCLE1BQU07QUFDbEMsWUFBTSxRQUFRLEtBQUs7QUFDbkIsWUFBTSxNQUFNLEtBQUssTUFBTSxRQUFRLEdBQUk7QUFDbkMsYUFBTztBQUFBLFFBQ0wsSUFBSSxjQUFjLEtBQUssSUFBSSxJQUFJLE1BQU0sS0FBSyxPQUFPLEVBQUUsU0FBUyxFQUFFLEVBQUUsTUFBTSxHQUFHLENBQUM7QUFBQSxRQUMxRSxZQUFZLEtBQUs7QUFBQSxRQUNqQixVQUFVLEtBQUssWUFBWTtBQUFBLFFBQzNCLGNBQWMsS0FBSyxnQkFBZ0I7QUFBQSxRQUNuQyxlQUFlLEtBQUssaUJBQWlCO0FBQUEsUUFDckMsaUJBQWlCLEtBQUssbUJBQW1CO0FBQUEsUUFDekMsYUFBYTtBQUFBLFFBQ2IsV0FBVztBQUFBLFFBQ1gsYUFBYSxRQUFRO0FBQUEsUUFDckIsVUFBVTtBQUFBLFFBQ1YsUUFBUTtBQUFBLFFBQ1IsYUFBYSxLQUFLLGdCQUFnQjtBQUFBLFFBQ2xDLFdBQVcsS0FBSyxJQUFJO0FBQUEsTUFDdEI7QUFB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a0dBR3lCLFNBQVMsRUFBRTtBQUFBLDBFQUN4QyxTQUFTLFlBQVk7QUFBQSwwRUFDckIsV0FBVyxTQUFTLGFBQWEsQ0FBQztBQUFBLGlGQUNoQyxTQUFTLG1CQUFtQixHQUFHO0FBQUEsZ0ZBQ2hDLElBQUksU0FBUyxXQUFXLENBQUM7QUFBQSwyREFDMUIsSUFBSSxTQUFTLFNBQVMsQ0FBQztBQUFBLHNGQUNoQixJQUFJLFNBQVMsV0FBVyxDQUFDO0FBQUEsd0ZBQ2IsU0FBUyxNQUFNLEtBQUssU0FBUyxNQUFNO0FBQUEsWUFDckcsU0FBUyxRQUFRLHdMQUF1SCxFQUFFO0FBQUE7QUFBQSxVQUU1SSxDQUFDLGNBQWMsU0FBUyxXQUFXLFVBQVU7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBLFlBSzNDLEVBQUU7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFRVixZQUFJLENBQUMsY0FBYyxTQUFTLFdBQVcsU0FBUztBQUM5QyxtQkFBUyxjQUFjLFdBQVcsRUFBRSxpQkFBaUIsU0FBUyxNQUFNO0FBQ2xFLGtCQUFNLElBQUksS0FBSyxXQUFXLEtBQUs7QUFDL0IsZ0JBQUksRUFBRSxHQUFJLE1BQUssc0JBQXNCLEVBQUUsUUFBUTtBQUFBLFVBQ2pELENBQUM7QUFDRCxtQkFBUyxjQUFjLHNCQUFzQixFQUFFLGlCQUFpQixTQUFTLE1BQU07QUFDN0UsZ0JBQUksUUFBUSxzRUFBZSxHQUFHO0FBQzVCLG9CQUFNLElBQUksS0FBSyxXQUFXLE9BQU87QUFDakMsa0JBQUksRUFBRSxHQUFJLE1BQUssc0JBQXNCLEVBQUUsUUFBUTtBQUFBLFlBQ2pEO0FBQUEsVUFDRixDQUFDO0FBQUEsUUFDSDtBQUVBLGlCQUFTLGNBQWMsbUJBQW1CLEVBQUUsaUJBQWlCLFNBQVMsTUFBTTtBQUMxRSxlQUFLLGlCQUFpQixRQUFRO0FBQUEsUUFDaEMsQ0FBQztBQUFBLE1BQ0g7QUFBQSxNQUVBLGlCQUFpQixVQUFVO0FBQ3pCLGNBQU0sSUFBSSxLQUFLLFdBQVcsV0FBVztBQUNyQyxvQkFBWTtBQUFBLFVBQ1YsRUFBRSxHQUFHLEtBQUssVUFBVSxHQUFHLEVBQUU7QUFBQSxVQUN6QixZQUFZLEtBQUssV0FBVztBQUFBLFVBQzVCLEtBQUs7QUFBQSxRQUNQO0FBQUEsTUFDRjtBQUFBLE1BRUEsVUFBVTtBQUFBLE1BQUM7QUFBQSxJQUNiO0FBRUEsV0FBTyxVQUFVLEVBQUUsYUFBYTtBQUFBO0FBQUE7IiwKICAibmFtZXMiOiBbXQp9Cg==
