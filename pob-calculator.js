// pob-calculator.js - 模擬 PoB 主程式解析與計算邏輯的獨立引擎
const PoBCalculator = {
  classMap: {
    "1": "女巫 (Witch)", "2": "暗影刺客 (Shadow)", "3": "遊俠 (Ranger)",
    "4": "決鬥者 (Duelist)", "5": "野蠻人 (Marauder)", "6": "聖堂武僧 (Templar)", "7": "貴族 (Scion)",
    "Witch": "女巫", "Shadow": "暗影", "Ranger": "遊俠", "Duelist": "決鬥者", "Marauder": "野蠻人", "Templar": "聖堂", "Scion": "貴族"
  },

  analyze(rawCode) {
    if (typeof pako === 'undefined') {
      throw new Error("pako.js 尚未載入！");
    }
    if (!rawCode) {
      throw new Error("PoB 匯出碼不得為空。");
    }

    // 1. Base64 與 zlib 解壓縮 (對應 PoB 主程式的匯出解碼邏輯)
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
      throw new Error("XML 結構解析失敗，請確認代碼是否完整。");
    }

    // 2. 擷取核心 Build 參數
    const buildNode = xmlDoc.querySelector("Build");
    let level = buildNode ? parseInt(buildNode.getAttribute("level")) || 1 : 1;
    let ascendClass = buildNode ? (buildNode.getAttribute("ascendClassName") || "未昇華") : "未昇華";
    let rawClass = buildNode ? (buildNode.getAttribute("className") || "") : "";
    let className = this.classMap[rawClass] || rawClass || "流亡者";

    // 3. 模擬 PoB 物品詞綴掃描 (<Item>)
    let totalLife = 0;
    let totalRes = 0;
    let totalStr = 0;
    let totalDex = 0;
    let totalInt = 0;
    let itemCount = 0;

    xmlDoc.querySelectorAll("Item").forEach(item => {
      itemCount++;
      let text = item.textContent || "";
      
      let lifeMatch = text.match(/\+(\d+)\s+to maximum Life/i);
      let resMatch = text.match(/\+(\d+)%\s+to.*Resist/i);
      let strMatch = text.match(/\+(\d+)\s+to Strength/i);
      let dexMatch = text.match(/\+(\d+)\s+to Dexterity/i);
      let intMatch = text.match(/\+(\d+)\s+to Intelligence/i);

      if (lifeMatch) totalLife += parseInt(lifeMatch[1]);
      if (resMatch) totalRes += parseInt(resMatch[1]);
      if (strMatch) totalStr += parseInt(strMatch[1]);
      if (dexMatch) totalDex += parseInt(dexMatch[1]);
      if (intMatch) totalInt += parseInt(intMatch[1]);
    });

    // 4. 擷取技能寶石清單 (<Gem>)
    let gems = [];
    xmlDoc.querySelectorAll("Gem").forEach(gem => {
      let name = gem.getAttribute("nameSpec") || gem.getAttribute("name");
      let gemLevel = gem.getAttribute("level") || "20";
      if (name) {
        gems.push({ name, level: gemLevel });
      }
    });

    // 5. 基礎數值模擬加總（對應主程式公式框架）
    let estLife = level * 12 + totalLife + 500;
    let baseInt = 20 + totalInt; // 基礎屬性加裝備
    let intAlert = baseInt < 111; // 模擬高等輔助寶石智力門檻

    return {
      level,
      className,
      ascendClass,
      itemCount,
      totalLife,
      totalRes,
      totalStr,
      totalDex,
      baseInt,
      intAlert,
      estLife,
      gems
    };
  }
};
