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

    missedTurns: 'missedTurns',
    portraitStyle: 'portraitStyle',
    showBloodyPortrait: 'showBloodyPortrait',
    health: 'health',
    abilities: 'abilities',
    activeEffects: 'activeEffects',
    penalties: 'penalties',
    obfuscateNPCs: 'obfuscateNPCs',
    roundCards: 'roundCards',
    combatCards: 'combatCards',
    turnCards: 'turnCards',
    compact: 'compact',

    // Superseded, kept registered but hidden so a world's stored values stay
    // valid and `migrateTurnSettings` can still read them.
    legacyTurnLayout: 'turnLayout',
    legacyTurnCycling: 'turnCycling',
    legacyHideBloodyPortrait: 'hideBloodyPortrait',
    legacyHideHealth: 'hideHealth',
    legacyHideAbilities: 'hideAbilities',
    legacyShowActiveEffects: 'showActiveEffects',
    legacyActiveEffectsAudience: 'activeEffectsAudience',
    legacyRoundCycling: 'roundCycling',
    legacyCombatStartCycling: 'combatStartCycling',
    legacyCombatEndCycling: 'combatEndCycling',
    legacyMissedTurn: 'missedTurn',
    legacyMissedTurnNotification: 'missedTurnNotification',
    legacyShowHealth: 'showHealth',
    legacyShowAbilities: 'showAbilities',
    legacyShowTurnPenalties: 'showTurnPenalties',
    turnLabel: 'turnLabel',
    roundLabel: 'roundLabel',
    turnCardStyle: 'turnCardStyle',
    turnIconStyle: 'turnIconStyle',
    roundCardStyle: 'roundCardStyle',
    roundIconStyle: 'roundIconStyle',
    turnSound: 'turnSound',
    roundSound: 'roundSound',
    combatStartSound: 'combatStartSound',
    combatEndSound: 'combatEndSound',
    combatStartLabel: 'combatStartLabel',
    combatEndLabel: 'combatEndLabel',
    combatCardStyle: 'combatCardStyle',
    combatIconStyle: 'combatIconStyle',
    chatSpacing: 'chatSpacing',
    roundInitialized: 'roundInitialized',

    headingH1Crier: 'headingH1Crier',
    headingH2Lifecycle: 'headingH2Lifecycle',
    headingH2Rounds: 'headingH2Rounds',
    headingH3simpleRoundStyle: 'headingH3simpleRoundStyle',
    headingH2turns: 'headingH2turns',
    headingH3simpleTurnStyle: 'headingH3simpleTurnStyle',
    headingH3simpleTurnElements: 'headingH3simpleTurnElements',
    headingH3MissedTurns: 'headingH3MissedTurns',
};
