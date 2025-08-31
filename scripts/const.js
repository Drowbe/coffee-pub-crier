// ================================================================== 
// ===== EXTRACTIONS ================================================
// ================================================================== 

// Get Module Data
export async function getModuleJson(relative = "../module.json") {
    const url = new URL(relative, import.meta.url).href; // resolves relative to THIS file
    // return await foundry.utils.fetchJsonWithTimeout(url);
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Failed to fetch ${url}: ${res.status}`);
    return await res.json();
}
const moduleData = await getModuleJson();
/**
 * Extracts the last segment of a module id and uppercases it.
 * Example: "coffee-pub-blacksmith" -> "BLACKSMITH"
 */
function getModuleCodeName(moduleId) {
    if (!moduleId || typeof moduleId !== "string") return "";
    const parts = moduleId.split("-");
    return parts.at(-1)?.toUpperCase() ?? "";
}
const strName = getModuleCodeName(moduleData.id);
// Post the data
console.log(moduleData.title, `Module ID: `, moduleData.id);
console.log(moduleData.title, `Module Name: `, strName);
console.log(moduleData.title, `Module Title: `, moduleData.title);
console.log(moduleData.title, `Module Version: `, moduleData.version);
console.log(moduleData.title, `Module Author: `, moduleData.authors[0]?.name);
console.log(moduleData.title, `Module Description: `, moduleData.description);

// ================================================================== 
// ===== EXPORTS ====================================================
// ================================================================== 

// MODULE CONSTANTS
export const MODULE = {
    ID: moduleData.id, 
    NAME: strName, // Extracted from moduleData.title
    TITLE: moduleData.title,
    VERSION: moduleData.version, 
    AUTHOR: moduleData.authors[0]?.name || 'COFFEE PUB',
    DESCRIPTION: moduleData.description,
};

// CRIER CONSTANTS
export const CRIER = {
	module: 'coffee-pub-crier',
	modulepath: 'modules/coffee-pub-crier/',
	soundpath: 'modules/coffee-pub-crier/sounds/',
	imagepath: 'modules/coffee-pub-crier/images/',

    missedKey: 'missedTurn',
    missedTurnNotification : 'missedTurnNotification',
    portraitStyle: 'portraitStyle',
    tokenBackground: 'tokenBackground',
    tokenScale: 'tokenScale',
    hideBloodyPortrait: 'hideBloodyPortrait',
    hidePlayer: 'hidePlayer',
    hideHealth: 'hideHealth',
    hideAbilities: 'hideAbilities',
    obfuscateNPCs: 'obfuscateNPCs',
    roundCycling: 'roundCycling',
    turnCycling: 'turnCycling',
    turnLayout: 'turnLayout',
    compact: 'compact',
    turnLabel: 'turnLabel',
    roundLabel: 'roundLabel',
    turnCardStyle: 'turnCardStyle',
    turnIconStyle: 'turnIconStyle',
    roundCardStyle: 'roundCardStyle',
    roundIconStyle: 'roundIconStyle',
    turnSound: 'turnSound',
    roundSound: 'roundSound',
    chatSpacing: 'chatSpacing',

    headingH1Crier: 'headingH1Crier',
    headingH2Rounds: 'headingH2Rounds',
    headingH3simpleRoundStyle: 'headingH3simpleRoundStyle',
    headingH3simpleRoundSettings: 'headingH3simpleRoundSettings',
    headingH2turns: 'headingH2turns',
    headingH3simpleTurnStyle: 'headingH3simpleTurnStyle',
    headingH3simpleTurnSettings: 'headingH3simpleTurnSettings',
    headingH3simpleTurnElements: 'headingH3simpleTurnElements',
};
