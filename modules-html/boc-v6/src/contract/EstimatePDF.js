// ECOREAN BOC v6.0 — 견적서 PDF 출력 (window.print 기반)

function formatKRW(n) {
  return (n || 0).toLocaleString('ko-KR') + '원';
}

function maskPhone(phone) {
  if (!phone) return '-';
  return phone.replace(/(\d{3})-?(\d{3,4})-?(\d{4})/, '$1-****-$3');
}

function buildPrintHTML(estimate, contract, input) {
  const today = new Date().toLocaleDateString('ko-KR');
  const customerName    = contract ? (contract.customerName || '(미작성)') : '(미작성)';
  const customerPhone   = maskPhone(contract ? contract.customerPhone : '');
  const customerAddress = contract ? (contract.customerAddress || '-') : '-';
  const contractAmount  = estimate.contractAmount || estimate.contract || 0;
  const vatAmount       = estimate.vatAmount || Math.round(contractAmount * 0.1);
  const finalAmount     = estimate.finalAmount || estimate.final || 0;

  return `<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <title>ECOREAN 견적서</title>
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
  <h1>인테리어 공사 견적서</h1>
  <div class="subtitle">ECOREAN BOC v6.0 자동 생성</div>
  <div class="company">에코리언 인테리어 (ECOREAN)</div>
  <hr class="gold-line">

  <div class="section">
    <h2>고객 정보</h2>
    <div class="info-grid">
      <span class="label">고객명</span><span>${customerName}</span>
      <span class="label">연락처</span><span>${customerPhone}</span>
      <span class="label">공사 주소</span><span>${customerAddress}</span>
      <span class="label">견적일</span><span>${today}</span>
    </div>
  </div>

  <div class="section">
    <h2>공사 조건</h2>
    <div class="info-grid">
      <span class="label">주거 형태</span><span>${(input && input.residence) || '-'}</span>
      <span class="label">면적</span><span>${(input && input.pyeong) || '-'} 평 (${estimate.areaSqm ? estimate.areaSqm.toFixed(1) : '-'} ㎡)</span>
      <span class="label">컨셉</span><span>${(input && input.concept) || '-'}</span>
      <span class="label">시공 섹션</span><span>${(input && input.sections && input.sections.join(', ')) || '-'}</span>
    </div>
  </div>

  <div class="section">
    <h2>금액 내역</h2>
    <table class="amount-table">
      <thead>
        <tr><th>항목</th><th class="right">금액</th></tr>
      </thead>
      <tbody>
        <tr>
          <td>도급합계 (자재 + 인건비 + 간접비)</td>
          <td class="right">${formatKRW(contractAmount)}</td>
        </tr>
        <tr>
          <td>부가세 VAT (10%)</td>
          <td class="right">${formatKRW(vatAmount)}</td>
        </tr>
        <tr class="total-row">
          <td>최종 합계 (VAT 포함)</td>
          <td class="right">${formatKRW(finalAmount)}</td>
        </tr>
      </tbody>
    </table>
    <div class="meta-row">
      ㎡당 ${formatKRW(estimate.sqmPrice)} &nbsp;|&nbsp;
      평당 ${formatKRW(estimate.pyPrice)}
    </div>
  </div>

  <div class="sign-section">
    <div class="sign-box">
      <div class="sign-title">발주처 (고객)</div>
      <div class="sign-line">${customerName} &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; (인)</div>
    </div>
    <div class="sign-box">
      <div class="sign-title">수주처 (에코리언)</div>
      <div class="sign-line">에코리언 인테리어 대표 &nbsp;&nbsp; (인)</div>
    </div>
  </div>

  <div class="footer">
    본 견적서는 ECOREAN BOC v6.0에서 자동 생성되었습니다. 유효기간: 견적일로부터 30일
  </div>
</body>
</html>`;
}

function printEstimate(estimate, contract, input) {
  try {
    const w = window.open('', '_blank', 'width=820,height=700');
    if (!w) {
      alert('팝업이 차단되었습니다. 팝업 허용 후 다시 시도하세요.');
      return;
    }
    w.document.write(buildPrintHTML(estimate, contract, input || {}));
    w.document.close();
    w.focus();
    setTimeout(() => { w.print(); }, 500);
  } catch (e) {
    console.error('[EstimatePDF] 출력 실패:', e);
  }
}

const EstimatePDF = { printEstimate, buildPrintHTML };
module.exports = { EstimatePDF };
