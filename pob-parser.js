function parseAndAnalyzePoB() {
  const rawInput = document.getElementById('pobCodeInput');
  if (!rawInput) return;

  const rawCode = rawInput.value.trim();
  if (!rawCode) {
    alert("請先貼上 PoB 匯出碼！");
    return;
  }

  try {
    let base64 = rawCode.replace(/-/g, '+').replace(/_/g, '/');
    while (base64.length % 4 !== 0) base64 += '=';

    const binaryStr = atob(base64);
    const bytes = new Uint8Array(binaryStr.length);
    for (let i = 0; i < binaryStr.length; i++) {
      bytes[i] = binaryStr.charCodeAt(i);
    }

    const decompressed = pako.inflate(bytes, { to: 'string' });
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(decompressed, "text/xml");

    if (xmlDoc.querySelector("parsererror")) {
      throw new Error("XML 解析失敗。");
    }

    // 後續的解析、加總與 DOM 渲染邏輯寫在這裡...
    console.log("PoB XML 成功載入！");

  } catch (err) {
    console.error("解析錯誤：", err);
    alert("解析失敗：" + err.message);
  }
}
