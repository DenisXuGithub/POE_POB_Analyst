// pob-engine.js - 獨立的 PoB 前端解析與計算引擎
const PoBEngine = {
  classMapping: {
    "1": "女巫 (Witch)", "2": "暗影刺客 (Shadow)", "3": "遊俠 (Ranger)",
    "4": "決鬥者 (Duelist)", "5": "野蠻人 (Marauder)", "6": "聖堂武僧 (Templar)", "7": "貴族 (Scion)",
    "Witch": "女巫", "Shadow": "暗影", "Ranger": "遊俠", "Duelist": "決鬥者", "Marauder": "野蠻人", "Templar": "聖堂", "Scion": "貴族"
  },

  parse(rawCode) {
    if (typeof pako === 'undefined') {
      throw new Error("pako.js 核心庫未載入！");
    }
    if (!rawCode) {
      throw new Error("PoB 匯出碼不得為空。");
    }

    // 1. Base64 修正與解碼
    let base64 = rawCode.replace(/-/g, '+').replace(/_/g, '/');
    while (base64.length % 4 !== 0) base64 += '=';

    const binaryStr = atob(base64);
    const bytes = new Uint8Array(binaryStr.length);
    for (let i = 0; i < binaryStr.length; i++) {
      bytes[i] = binaryStr.charCodeAt(i);
    }

    // 2. zlib 解壓縮
    const decompressed = pako.inflate(bytes, { to: 'string' });
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(decompressed, "text/xml");

    if (xmlDoc.querySelector("parsererror")) {
      throw new Error("XML 結構解析失敗，請確認代碼格式。");
    }

    // 3. 提取基礎 Build 資訊
    const buildNode = xmlDoc.querySelector("Build");
    let level = buildNode ? parseInt(buildNode.getAttribute("level")) || 1 : 1;
    let ascendClass = buildNode ? (buildNode.getAttribute("ascendClassName") || "未昇華") : "未昇華";
    let rawClass = buildNode ? (buildNode.getAttribute("className") || "") : "";
    let className = this.classMapping[rawClass] || rawClass || "流亡者";

    // 4. 模擬主程式詞綴與數值加總 (<Item>)
    let totalLife = 0;
    let totalRes = 0;
    let itemCount = 0;

    xmlDoc.querySelectorAll("Item").forEach(item => {
      itemCount++;
      let text = item.textContent || "";
      let lifeMatch = text.match(/\+(\d+)\s+to maximum Life/i);
      let resMatch = text.match(/\+(\d+)%\s+to.*Resist/i);
      if (lifeMatch) totalLife += parseInt(lifeMatch[1]);
      if (resMatch) totalRes += parseInt(resMatch[1]);
    });

    // 5. 提取技能寶石 (<Gem>)
    let gems = [];
    xmlDoc.querySelectorAll("Gem").forEach(gem => {
      let name = gem.getAttribute("nameSpec") || gem.getAttribute("name");
      if (name && !gems.includes(name)) gems.push(name);
    });

    // 6. 計算估算數值
    let estLife = level * 12 + totalLife + 500;

    return {
      level,
      className,
      ascendClass,
      itemCount,
      totalLife,
      totalRes,
      estLife,
      gems,
      rawXml: decompressed
    };
  }
};
