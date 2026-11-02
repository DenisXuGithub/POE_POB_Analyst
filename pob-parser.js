// PoB 職業對照表
const classMapping = {
  "1": "女巫 (Witch)", "2": "暗影刺客 (Shadow)", "3": "遊俠 (Ranger)",
  "4": "決鬥者 (Duelist)", "5": "野蠻人 (Marauder)", "6": "聖堂武僧 (Templar)", "7": "貴族 (Scion)",
  "Witch": "女巫 (Witch)", "Shadow": "暗影刺客 (Shadow)", "Ranger": "遊俠 (Ranger)",
  "Duelist": "決鬥者 (Duelist)", "Marauder": "野蠻人 (Marauder)", "Templar": "聖堂武僧 (Templar)", "Scion": "貴族 (Scion)"
};

function parseAndAnalyzePoB() {
  const rawInput = document.getElementById('pobCodeInput');
  const resultBox = document.getElementById('resultBox');

  if (typeof pako === 'undefined') {
    alert("系統錯誤：pako.js 程式庫未成功載入！");
    return;
  }

  const rawCode = rawInput.value.trim();
  if (!rawCode) {
    alert("請先在上方輸入框貼上 PoB 匯出碼！");
    return;
  }

  try {
    // 1. Base64 修正與解碼
    let base64 = rawCode.replace(/-/g, '+').replace(/_/g, '/');
    while (base64.length % 4 !== 0) base64 += '=';

    const binaryStr = atob(base64);
    const bytes = new Uint8Array(binaryStr.length);
    for (let i = 0; i < binaryStr.length; i++) {
      bytes[i] = binaryStr.charCodeAt(i);
    }

    // 2. pako zlib 解壓縮
    const decompressed = pako.inflate(bytes, { to: 'string' });
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(decompressed, "text/xml");

    if (xmlDoc.querySelector("parsererror")) {
      throw new Error("XML 解析失敗，確認代碼格式是否正確。");
    }

    // 3. 讀取 Build 基本資訊
    const buildNode = xmlDoc.querySelector("Build");
    let level = 1;
    let ascendName = "未昇華";
    let rawClassKey = "";

    if (buildNode) {
      level = parseInt(buildNode.getAttribute("level")) || 1;
      ascendName = buildNode.getAttribute("ascendClassName") || buildNode.getAttribute("ascendClass") || "未昇華";
      rawClassKey = buildNode.getAttribute("className") || buildNode.getAttribute("class") || buildNode.getAttribute("classId");
    }
    let className = classMapping[rawClassKey] || rawClassKey || "未知職業";

    // 4. 前端模擬加總引擎：掃描 XML 中的 <Item> 內文詞綴
    let totalLife = 0;
    let totalStr = 0;
    let totalDex = 0;
    let totalInt = 0;

    xmlDoc.querySelectorAll("Item").forEach(itemNode => {
      const itemText = itemNode.textContent || "";
      
      // 使用正規表達式抓取裝備上的數值詞綴
      // 例如: "+85 to maximum Life", "+32 to Intelligence", 等
      const lifeMatch = itemText.match(/\+(\d+)\s+to maximum Life/i);
      const strMatch = itemText.match(/\+(\d+)\s+to Strength/i);
      const dexMatch = itemText.match(/\+(\d+)\s+to Dexterity/i);
      const intMatch = itemText.match(/\+(\d+)\s+to Intelligence/i);
      const allAttrMatch = itemText.match(/\+(\d+)\s+to all Attributes/i);

      if (lifeMatch) totalLife += parseInt(lifeMatch[1]);
      
      let allAttr = allAttrMatch ? parseInt(allAttrMatch[1]) : 0;
      if (strMatch) totalStr += parseInt(strMatch[1]) + allAttr;
      if (dexMatch) totalDex += parseInt(dexMatch[1]) + allAttr;
      if (intMatch) totalInt += parseInt(intMatch[1]) + allAttr;
      if (!strMatch && allAttr > 0) totalStr += allAttr;
      if (!dexMatch && allAttr > 0) totalDex += allAttr;
      if (!intMatch && allAttr > 0) totalInt += allAttr;
    });

    // 加上基礎角色升級預設值（每級提供基本三圍與生命約略估算，或直接呈現裝備模擬值）
    // 這裡示範將裝備模擬加總呈現出來
    let finalLife = totalLife > 0 ? totalLife + (level * 12) : 1000 + (level * 12); // 無裝備時給予基礎生命
    let finalStr = totalStr + 20; // 基礎角色屬性
    let finalDex = totalDex + 20;
    let finalInt = totalInt + 20;

    // 5. 讀取技能寶石清單
    const gems = Array.from(xmlDoc.querySelectorAll("Gem")).map(gem => ({
      name: gem.getAttribute("nameSpec") || gem.getAttribute("name") || gem.getAttribute("gemId"),
      level: gem.getAttribute("level")
    })).filter(g => g.name);
    const uniqueGems = [...new Set(gems.map(g => g.name))];

    // 6. 渲染 UI 畫面
    document.getElementById('resTitle').innerText = `獨立引擎解析報告：${level} 級 ${className} (${ascendName})`;
    document.getElementById('resMeta').innerHTML = `
      <span class="badge">職業：${className}</span>
      <span class="badge">昇華：${ascendName}</span>
      <span class="badge">等級：${level} 級</span>
      <span class="badge">裝備模擬生命：+${totalLife}</span>
      <span class="badge">寶石數：${gems.length} 顆</span>
    `;

    // 判斷智力是否小於常用輔助需求（例如 111）
    let intAlert = (finalInt < 111);

    document.getElementById('statsGrid').innerHTML = `
      <div class="stat-card"><div class="label">模擬總生命 (Life)</div><div class="value safe">${Math.round(finalLife)}</div></div>
      <div class="stat-card"><div class="label">模擬力量 (Str)</div><div class="value">${Math.round(finalStr)}</div></div>
      <div class="stat-card"><div class="label">模擬敏捷 (Dex)</div><div class="value">${Math.round(finalDex)}</div></div>
      <div class="stat-card"><div class="label">模擬智力 (Int)</div><div class="value ${intAlert ? 'alert' : 'safe'}">${Math.round(finalInt)}</div></div>
      <div class="stat-card"><div class="label">裝備加總生命</div><div class="value">${totalLife}</div></div>
    `;

    // 屬性與智力審查
    let attrHTML = `<div class="analysis-box ${intAlert ? 'warning' : 'success'}">`;
    if (intAlert) {
      attrHTML += `<p><strong style="color: #f85149;">【前端模擬智力警示】當前模擬智力為 ${Math.round(finalInt)} (低於 111 門檻)</strong></p>`;
      attrHTML += `<p>透過裝備詞綴掃描發現智力總合偏低，需留意部分藍色寶石或光環可能因屬性不足而無法運作。</p>`;
    } else {
      attrHTML += `<p><span style="color: #3fb950;">【屬性模擬達標】當前模擬智力為 ${Math.round(finalInt)}。</span></p>`;
    }
    attrHTML += `</div>`;
    document.getElementById('attributeAudit').innerHTML = attrHTML;

    // 寶石清單渲染
    let gemHTML = `<ul>`;
    if (uniqueGems.length > 0) {
      uniqueGems.slice(0, 15).forEach(g => {
        gemHTML += `<li><strong>${g}</strong></li>`;
      });
    } else {
      gemHTML += `<li>未偵測到寶石資料。</li>`;
    }
    gemHTML += `</ul>`;
    document.getElementById('gemAudit').innerHTML = gemHTML;

    // 優化建議
    let planHTML = `<div class="analysis-box success"><ul>`;
    planHTML += `<li>此分析透過獨立的 <code>pob-parser.js</code> 執行前端 XML 解壓縮與裝備正則表達式（RegEx）詞綴加總。</li>`;
    planHTML += `<li>您可以隨時抽換或擴充 <code>pob-parser.js</code> 內的運算規則，而不需更動 HTML 結構。</li>`;
    planHTML += `</ul></div>`;
    document.getElementById('actionPlan').innerHTML = planHTML;

    resultBox.style.display = 'block';

  } catch (err) {
    console.error("解析錯誤：", err);
    alert("PoB 解析失敗，請確認代碼是否完整：" + err.message);
  }
}
