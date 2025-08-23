// ================================================================== 
// ===== EXPORTS ====================================================
// ================================================================== 

// Import module.json
import moduleData from '../module.json' assert { type: 'json' };

export const MODULE = {
    ID: moduleData.id, // coffee-pub-crier
    NAME: 'CRIER', // CRIER or moduleData.title.toUpperCase().replace(/\s+/g, '_')
    TITLE: moduleData.title, // Coffee Pub Crier
    AUTHOR: moduleData.authors[0]?.name || 'COFFEE PUB',
    VERSION: moduleData.version,
    DESCRIPTION: moduleData.description 
};

// MIGRATION - we need to transition these to the new MODULE object
export const MODULE_TITLE = 'CRIER'
export const MODULE_ID = 'coffee-pub-crier'
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
