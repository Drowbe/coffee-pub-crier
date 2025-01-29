// ================================================================== 
// ===== GLOBAL =====================================================
// ================================================================== 
// Put any functions or reusable code here for use in ALL modules.
// This code should be identical in every COFFEEPUB module.
//
// If you need to share code withing THIS module, it should go in
// the "common.js" file.
// ================================================================== 

// ================================================================== 
// ===== VARIABLE EXPORTS ===========================================
// ================================================================== 

// CORE CONSTANTS
export const MODULE_AUTHOR = 'COFFEE PUB'
// GLOBAL VARS
export const COFFEEPUB = {
    // SHARED MODULE VARIABLES
    blnDebugOn: false, // Display debug bessages
    blnFancyConsole: false, // Display Colorful Console
    strConsoleDebugStyle: "simple", // Display colors but not boxes
    strDEFAULTCARDTHEME: "cardsdefault", // Default Card Theme
    strDEFAULTSOUNDFILE: "modules/coffee-pub-blacksmith/sounds/interface-open-01.mp3",
    strDEFAULTSOUNDVOLUME: "0.7",
    arrTHEMECHOICES: [], // Theme list for drop downs
    arrMACROCHOICES: [], // Macro list for drop downs
    arrTABLECHOICES: [], // Table list for drop downs
    arrCOMPENDIUMCHOICES: [], // Compendium list for drop downs
    arrBACKGROUNDIMAGECHOICES: [], // Background Image list for drop downs
    arrICONCHOICES: [], // Icon list for drop downs
    arrSOUNDCHOICES: [], // Sound list for drop downs
}

// ================================================================== 
// ===== VARIABLE IMPORTS ===========================================
// ================================================================== 

// Grab the module data
import { MODULE_TITLE, MODULE_ID } from './const.js';

// ================================================================== 
// ===== GLOBAL FUNCTIONS ===========================================
// ================================================================== 

// ************************************
// ** UTILITY Convert Seconds
// ************************************
export function convertSecondsToString(numSeconds) {
    if (numSeconds === "0" || isNaN(numSeconds)) {
      return "Permanent";
    }
    // Calculate the total number of rounds
    let rounds = Math.floor(numSeconds / 6);
    let years, months, weeks, days, hours, minutes, seconds;
    minutes = Math.floor(numSeconds / 60);
    numSeconds %= 60;
    hours = Math.floor(minutes / 60);
    minutes %= 60;
    days = Math.floor(hours / 24);
    hours %= 24;
    weeks = Math.floor(days / 7);
    days %= 7;
    months = Math.floor(weeks / 4.34524);
    weeks %= 4.34524;
    years = Math.floor(months / 12);
    months %= 12;
    let timeString = '';
    if (years > 0) timeString += `${years} YR `;
    if (months > 0) timeString += `${months} MO `;
    if (weeks > 0) timeString += `${Math.floor(weeks)} WK `;
    if (days > 0) timeString += `${days} DAY `;
    if (hours > 0) timeString += `${hours} HR `;
    if (minutes > 0) timeString += `${minutes} MIN `;
    if (numSeconds > 0) timeString += `${numSeconds} SEC `;
    // Add rounds to the output string
    timeString += `(${rounds} ROUNDS)`;
    return timeString;
  }

// ************************************
// ** UTILITY Convert Array to String
// ************************************

export function objectToString(obj) {
    let str = '';
    for (let key in obj) {
        if (str !== '') {
            str += '|'; 
        }
        str += key + '=' + obj[key];
    }
    return str;
}


// ************************************
// ** UTILITY Convert String to Array
// ************************************

export function stringToObject(str) {
    //postConsoleAndNotification("Converting string to object: ", str, false, true, false);
    let obj = {};
    if (str) {
        let pairs = str.split('|');
        for (let pair of pairs) {
            let [key, value] = pair.split('=');
            obj[key] = value;
        }
    } else {
        postConsoleAndNotification("Can't convert an empty string: ", str, false, false, false);
    }
    return obj;
}

// ************************************
// ** UTILITY Convert string to Sentence Case
// ************************************ 
export function toSentenceCase(str) {
    if ((str === null) || (str === ''))
        return false;
    else
        str = str.toString();
 
    return str.replace(/\w\S*/g,
        function (txt) {
            return txt.charAt(0).toUpperCase() +
                txt.substr(1).toLowerCase();
        });
}

// ************************************
// ** UTILITY Get Actor ID by Name
// ************************************ 
export function getActorId(actorName) {
    return game.actors.getName(actorName)?.id ?? "";
}

// ************************************
// ** UTILITY Get Token Image with Name
// ************************************ 
export function getTokenImage(tokenDoc) {
    if (!tokenDoc) return null;
    
    // For V12, first try to get img directly
    if (tokenDoc.img) return tokenDoc.img;
    
    // If no direct img, try texture path
    if (tokenDoc.texture?.src) return tokenDoc.texture.src;
    
    // If neither exists, return null
    return null;
}

// ************************************
// ** UTILITY Get Portrait Image with Name
// ************************************ 
export function getPortraitImage(actor) {
    // Get the actor's portrait data.
    const portraitData = actor.img || actor.prototypeToken.texture.src; // Check both possible fields

    postConsoleAndNotification("IN getPortraitImage. portraitData:", portraitData, false, true, false);

    // If the portrait data is not set, return an empty string.
    if (!portraitData) {
        return "";
    }
    // Return the portrait image URL.
    return portraitData;
}

// ************************************
// ** UTILITY Get Token ID with Name
// ************************************ 
export function getTokenId(tokenName) {
    // Get the list of all tokens on the canvas.
    const tokens = canvas.tokens.placeables;
  
    // Find the token with the given name.
    const token = tokens.find(e => e.name === tokenName);
  
    // If the token was found, return its ID.
    if (token) {
        return token.id;
    }
    // If the token was not found, return an empty string.
    return "";
}

// ************************************
// ** UTILITY Truncate String
// ************************************ 
// adds a "..." to a string if it is too long
export function trimString(str, maxLength) {
    // check if the string length is more than the maximum length
    if (str.length > maxLength) {
        // if more, cut the string at the maximum length and append with '...'
        str = str.substring(0, maxLength - 3) + '...';
    }
    // if not, return the original string
    return str;
}

// ************************************
// ** UTILITY Convert date to words
// ************************************ 
export function generateFormattedDate() {
    
    // Format the current date to: "(year-month-day hour:minute AM/PM)"
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth() + 1; // January is 0!
    const day = now.getDate();
    const hours = now.getHours() <= 12 ? now.getHours() : now.getHours() - 12;
    const minutes = now.getMinutes();
    const am_pm = now.getHours() >= 12 ? 'PM' : 'AM';
    // If hours or minutes are less than 10, prepend a '0'
    const paddedHours = hours < 10 ? `0${hours}` : hours;
    const paddedMinutes = minutes < 10 ? `0${minutes}` : minutes;

    // Formatted time in 12-hour format
    const formattedTime = `${paddedHours}:${paddedMinutes} ${am_pm}`;
    const formattedDate = `(${year}-${month}-${day} ${formattedTime})`;
    generateFormattedDate = formattedDate;
    return generateFormattedDate;
}


// ************************************
// ** UTILITY Reset Settings
// ************************************

export function resetModuleSettings(moduleId) {
    // Get the module
    const module = game.modules.get(moduleId);
    postConsoleAndNotification("A Setting Reset has been called for: ", module, false, false, true) 
    // Reset all settings to their default values
    module.settings.reset();
    postConsoleAndNotification("Module settings reset: ", module, false, false, true) 
} 

// ************************************
// ** BLACKSMITH VARIABLE SHARING
// ************************************
// This code will be executed whenever any BLACKSMITH variable in the "coffee-pub-blacksmith" module is pushed
// postConsoleAndNotification("The updated BLACKSMITH object is...", newBlacksmith, false, true, false);
export function registerBlacksmithUpdatedHook() {
    Hooks.on("blacksmithUpdated", (newBlacksmith) => {
        // BLACKSMITH VARIABLE COLLECTION
        // RICH CONSOLE
        COFFEEPUB.blnFancyConsole = newBlacksmith.blnFancyConsole;
        //postConsoleAndNotification("The updated COFFEEPUB.blnFancyConsole: ", COFFEEPUB.blnFancyConsole, false, true, false);
        // DEBUG ON/OFF
        COFFEEPUB.blnDebugOn = newBlacksmith.blnDebugOn;
        //postConsoleAndNotification("The updated COFFEEPUB.blnDebugOn: ", COFFEEPUB.blnDebugOn, false, true, false);
        // DEBUG STYLE
        COFFEEPUB.strConsoleDebugStyle = newBlacksmith.strConsoleDebugStyle;
        //postConsoleAndNotification("The updated COFFEEPUB.strConsoleDebugStyle: ", COFFEEPUB.strConsoleDebugStyle, false, true, false);
        // Get the default theme
        COFFEEPUB.strDEFAULTCARDTHEME = newBlacksmith.strDefaultCardTheme;
        //postConsoleAndNotification("The updated COFFEEPUB.strDEFAULTCARDTHEME: ", COFFEEPUB.strDEFAULTCARDTHEME, false, true, false);
        // Get the Themes list
        COFFEEPUB.arrTHEMECHOICES = newBlacksmith.arrThemeChoices;
        //postConsoleAndNotification("The updated COFFEEPUB.arrTHEMECHOICES: ", COFFEEPUB.arrTHEMECHOICES, false, true, false);
        // Get the Macro list
        COFFEEPUB.arrMACROCHOICES = newBlacksmith.arrMacroChoices;
        //postConsoleAndNotification("The updated COFFEEPUB.arrMACROCHOICES: ", COFFEEPUB.arrMACROCHOICES, false, true, false);
        // Get the Table list
        COFFEEPUB.arrCOMPENDIUMCHOICES = newBlacksmith.arrCompendiumChoices;
        //postConsoleAndNotification("The updated COFFEEPUB.arrCOMPENDIUMCHOICES: ", COFFEEPUB.arrCOMPENDIUMCHOICES, false, true, false);
        // Get the Table list
        COFFEEPUB.arrTABLECHOICES = newBlacksmith.arrTableChoices;
        //postConsoleAndNotification("The updated COFFEEPUB.arrTABLECHOICES: ", COFFEEPUB.arrTABLECHOICES, false, true, false);
        // Get the Image list
        COFFEEPUB.arrBACKGROUNDIMAGECHOICES = newBlacksmith.arrBackgroundImageChoices;
        //postConsoleAndNotification("The updated COFFEEPUB.arrBACKGROUNDIMAGECHOICES: ", COFFEEPUB.arrBACKGROUNDIMAGECHOICES, false, true, false)
        // Get the Image list
        COFFEEPUB.arrICONCHOICES = newBlacksmith.arrIconChoices;
        //postConsoleAndNotification("The updated COFFEEPUB.arrICONCHOICES: ", COFFEEPUB.arrICONCHOICES, false, true, false);
        // Get the Sound list
        COFFEEPUB.arrSOUNDCHOICES = newBlacksmith.arrSoundChoices;
        //postConsoleAndNotification("The updated COFFEEPUB.arrSOUNDCHOICES: ", COFFEEPUB.arrSOUNDCHOICES, false, true, false);
        // Get the OpenAI Variables
        COFFEEPUB.strOpenAIAPIKey = newBlacksmith.strOpenAIAPIKey;
        COFFEEPUB.strOpenAIModel = newBlacksmith.strOpenAIModel;
        COFFEEPUB.strOpenAIGameSystems = newBlacksmith.strOpenAIGameSystems;
        COFFEEPUB.strOpenAIPrompt = newBlacksmith.strOpenAIPrompt;
        COFFEEPUB.strOpenAITemperature = newBlacksmith.strOpenAITemperature;
        postConsoleAndNotification("Updated the OpenAI Variables.", "", false, true, false);
        postConsoleAndNotification("Completed updating the BLACKSMITH object.", "", false, true, false);
    });
}

// ************************************
// ** UTILITY Play Sound 
// ************************************

/**
 * Clamp a number between a minimum and maximum value.
 * @param {number} value - The number to clamp.
 * @param {number} min - The minimum value.
 * @param {number} max - The maximum value.
 * @returns {number} - The clamped value.
 */
function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
}

/**
 * Play a sound with specified path and volume.
 * @param {string} [sound='sound'] - The path to the sound file.
 * @param {number} [volume=0.7] - The volume of the sound (0 to 1).
 * @returns {Promise<void>}
 */
export async function playSound(sound = 'sound', volume = 0.7) {
    if (sound === 'none') return;

    try {
        await foundry.audio.AudioHelper.play({
            src: sound,
            volume: clamp(volume, 0, 1),
            autoplay: true,
            loop: false
        }, true);
    } catch (error) {
        console.error(`Failed to play sound: ${sound}`, error);
    }
}

// // ************************************
// // ** UTILITY Roll Dice 
// // ************************************
/**
 * Show the 3D Dice animation for the Roll made by the User.
 *
 * @param {Roll} roll an instance of Roll class to show 3D dice animation.
 * @param {User} user the user who made the roll (game.user by default).
 * @param {Boolean} synchronize if the animation needs to be shown to other players. Default: false
 * @param {Array} whisper list of users or userId who can see the roll, set it to null if everyone can see. Default: null
 * @param {Boolean} blind if the roll is blind for the current user. Default: false 
 * @param {String} A chatMessage ID to reveal when the roll ends. Default: null
 * @param {Object} An object using the same data schema than ChatSpeakerData. 
 *        Needed to hide NPCs roll when the GM enables this setting.
 * @param options Object with 2 booleans: ghost (default: false) and secret (default: false)
 * @returns {Promise<boolean>} when resolved true if the animation was displayed, false if not.
 *game.dice3d.showForRoll(roll, user, synchronize, whisper, blind, chatMessageID, speaker, {ghost:false, secret:false})
 * @param {Roll|string|null} roll - Optional. Either a Roll object or a string defining the dice roll (like "2d20"). 
 * If not provided it will default roll "2d20".
 * EXAMPLES:
 * rollCoffeePubDice(); // here roll is undefined, so inside the function it'll default to null.
 * rollCoffeePubDice("3d20"); // roll parameter will be "3d20" inside the function.
 * rollCoffeePubDice(new Roll("1d8")); // roll parameter will be a Roll object inside the function.
 */
 export async function rollCoffeePubDice(roll = null) {
    // Only do this if they have Dice So Nice
    if(game.dice3d) {
        // Check if roll is passed in, if not generate a roll
        if (!roll) {
            roll = await new Roll("2d20").evaluate();
        } 
        // If a string is passed, parse it into a roll
        else if (typeof roll === 'string') {
            roll = await new Roll(roll).evaluate();
        }
        postConsoleAndNotification(`BIBLIOSOPH: rollCoffeePubDice roll`, roll, false, true, false);
        var user = game.user;
        var synchronize = true;
        var whisper = null;
        var blind = false;
        var chatMessageID = null;
        var speaker = null;

        // Show dice roll
        try {
            let displayed = await game.dice3d.showForRoll(roll, user, synchronize, whisper, blind, chatMessageID, speaker, {ghost:false, secret:false});
            if(!displayed) {
                postConsoleAndNotification(`Dice So Nice roll was not displayed for dice type ${roll}`, undefined, false, true, false);
            }
        } catch(err) {
            // Use my custom error function
            postConsoleAndNotification(`Error occurred in Dice So Nice`, err.message, false, true, false);
        };
    }
}

// ************************************
// ** UTILITY OPEN AI
// ************************************
// Not all of this is exported and is just used in the global.js file
// these are not exported.
let history = [];
function pushHistory(...args) {
	const maxHistoryLength = game.settings.get(MODULE_ID, 'openAIContextLength');

	history.push(...args);
	if (history.length > maxHistoryLength) {
		history = history.slice(history.length - maxHistoryLength);
	}

	return history;
}
// -- FUNCTION TO CALL OPENAI TXT --
async function callGptApiText(query) {
    postConsoleAndNotification("In callGptApiText(): query =", query, false, true, false);    
    
    // right off make sure there is data to process.
    if (!query) {
        // Nothing to process, let them know.
        return "What madness is this? You query me with slince? I received no words.";
    }
   
    var strErrorMessage = "";
	const apiKey = COFFEEPUB.strOpenAIAPIKey;
	const model = COFFEEPUB.strOpenAIModel;
	const prompt = COFFEEPUB.strOpenAIPrompt;
	const temperature = COFFEEPUB.strOpenAITemperature;
	const apiUrl = 'https://api.openai.com/v1/chat/completions';
	const promptMessage = {role: 'user', content: prompt};
	const queryMessage = {role: 'user', content: query};
	const messages = pushHistory().concat(promptMessage, queryMessage);
	const requestBody = {
		model,
		messages,
		temperature: temperature,
	};
	const requestOptions = {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
			'Authorization': `Bearer ${apiKey}`,
		},
		body: JSON.stringify(requestBody),
	};
	const is4xx = c => c >= 400 && c < 500;
	const handleFailedQuery = async (response, msg) => {
		let err = `${response?.status}`;
		try {
			const data = await response.json();
			postConsoleAndNotification("callGptApiText(): failure data =", data, false, false, false);    
			err = `${data?.error?.message} (${err})`;
            strErrorMessage = "My brain is foggy. We have run into an error: " + err;
		} catch (e) {
			postConsoleAndNotification("Could not decode failed API response.", e, false, false, false);  
            strErrorMessage = "The gods have frowned upon us. Could not decode failed API response: " + e; 
		}
		//throw new Error(`${msg}: ${err}`);
	};
    // This is where the actual Query begins.
	let response = {};
	for (
		let retries = 0, backoffTime = 5000;
		retries < 5 && !response?.ok;
		retries++, await new Promise(r => setTimeout(r, backoffTime))
	) {
		postConsoleAndNotification("callGptApiText(): waiting for reply. ", retries + " Tries", false, false, false);    
		response = await fetch(apiUrl, requestOptions);
		postConsoleAndNotification("callGptApiText(): response", response.message, false, false, false);    
		
		if (response?.status && is4xx(response?.status)) {
			await handleFailedQuery(response, "ChatGPT API failed");
            strErrorMessage = "Oh no, I've blacked out a moment. The ChatGPT API failed, damned thing: " + response.message;
		}
	}
	if (response?.ok) {
		const data = await response.json();
		postConsoleAndNotification("callGptApiText(): response data.", data, false, true, false);    

		const replyMessage = data.choices[0].message;
		pushHistory(queryMessage, replyMessage);
		return replyMessage.content.trim();
	} else {
        // There was an error
		await handleFailedQuery(response, "Well this isn't good. The ChatGPT API failed multiple times.");
        return strErrorMessage;
	}
}
// -- FUNCTION TO CALL OPENAI IMAGE --
async function callGptApiImage(query) {
    postConsoleAndNotification("In callGptApiImage(): query =", query, false, true, false);    
    const apiKey = COFFEEPUB.strOpenAIAPIKey;
    const apiUrl = 'https://api.openai.com/v1/images';
    const requestBody = {
        model: "dall-e-3",
        prompt: query,
        n: 1,
        size: "1024x1024",
    };
    const requestOptions = {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify(requestBody),
    };
    const response = await fetch(apiUrl, requestOptions);
    postConsoleAndNotification("In callGptApiImage(): response =", response, false, true, false);   
    const data = await response.json();
    postConsoleAndNotification("In callGptApiImage(): data =", data, false, true, false);   
    const image_url = data.data[0].url;
    postConsoleAndNotification("In callGptApiImage(): image_url =", image_url, false, true, false); 
    return image_url;  // Returns an URL to the Draft response where it could be used 
}
// This is Exported
// -- CALL FOR OPENAI QUERY --
export async function getOpenAIReplyAsHtml(query) {
    postConsoleAndNotification("In getOpenAIReplyAsHtml(query): query =", query, false, true, false);  
	
    const answer = await callGptApiText(query);
    //const answer = await callGptApiImage(query);

    var strFinalAnswer = "";
	postConsoleAndNotification("Answer", answer, false, true, false); 
	var html = /<\/?[a-z][\s\S]*>/i.test(answer) || !answer.includes('\n') ?
		answer : answer.replace(/\n/g, "<br>");

    strFinalAnswer = html.replaceAll("<p></p>", "").replace("```html", "").replace("```")
	return strFinalAnswer
}

// ************************************
// ** UTILITY Post to Console
// ************************************
// postConsoleAndNotification("This is the message.", Variable Goes Here, Divider (true/false), Debug (true/false), Notification (true/false))
// Obvious Note: Do not "debug" the "debug" using this function as it will call itself.

export function postConsoleAndNotification(message, result, blnDivider, blnDebug, blnNotification) {

    var strTitleColor = "color: #FF7340";
    var strFancyCaptionBorder = "border: 1px dotted #A4C76A";
    var strFancyCaptionBackground = "background: #2D3F11";
    var strFancyCaptionFontColor = "color: #A4C76A";
    var strModuleTitle = MODULE_TITLE;

// === COMMON/ADAPTED STYLES ===

    if (strModuleTitle == "BLACKSMITH") {
        // Normal
        strTitleColor = 'color: #FF7340';
        // Fancy
        strFancyCaptionBorder = "border: 1px dotted #A4C76A";
        strFancyCaptionBackground = "background: #2D3F11";
        strFancyCaptionFontColor = "color: #A4C76A";
    } else if (strModuleTitle == "CRIER") {
        // Normal
        strTitleColor = 'color: #9999ff';
        // Fancy
        strFancyCaptionBorder = "border: 1px dotted #7B7BBF";
        strFancyCaptionBackground = "background: #2B2B94";
        strFancyCaptionFontColor = "color: #9999ff";
    } else if (strModuleTitle == "BIBLIOSOPH") {
        // Normal
        strTitleColor = 'color: #cccc00';
        // Fancy
        strFancyCaptionBorder = "border: 1px dotted #E9E936";
        strFancyCaptionBackground = "background: #64640A";
        strFancyCaptionFontColor = "color: #cccc00";
    } else if (strModuleTitle == "SCRIBE") {
        // Normal
        strTitleColor = 'color: #33cccc';
        // Fancy
        strFancyCaptionBorder = "border: 1px dotted #2C9090";
        strFancyCaptionBackground = "background: #104545";
        strFancyCaptionFontColor = "color: #33cccc";
    } else if (strModuleTitle == "BUBO") {
        // Normal
        strTitleColor = 'color: #ff3377';
        // Fancy
        strFancyCaptionBorder = "border: 1px dotted #ED6B96";
        strFancyCaptionBackground = "background: #550922";
        strFancyCaptionFontColor = "color: #ff3377";
    } else {
        // Normal
        strTitleColor = 'color: #FF7340';
        // Fancy
        strFancyCaptionBorder = "border: 1px dotted #A4C76A";
        strFancyCaptionBackground = "background: #2D3F11";
        strFancyCaptionFontColor = "color: #A4C76A";
    }
    // === COMMON ICONS ===
    const MODULE_CONSOLE_COMMON_ICON_FLAME = String.fromCodePoint(0x1F525);
    const MODULE_CONSOLE_COMMON_ICON_MARTINI = String.fromCodePoint(0x1F378);
    const MODULE_CONSOLE_COMMON_ICON_TUMBLER = String.fromCodePoint(0x1F943);
    const MODULE_CONSOLE_COMMON_ICON_COFFEE = String.fromCodePoint(0x2615);
    const MODULE_CONSOLE_COMMON_ICON_BUG = String.fromCodePoint(0x1FAB0);
    const MODULE_CONSOLE_COMMON_ICON_SKULL = String.fromCodePoint(0x1F480);
    const MODULE_CONSOLE_COMMON_ICON_MAGNIFYING = String.fromCodePoint(0x1F50E);
    const MODULE_CONSOLE_COMMON_PIPE = '•';
    const MODULE_CONSOLE_COMMON_STYLE_PIPE = [
        'color: #D9D7CD',
        'font-weight:900',
        'margin-right: 3px',
        'margin-left: 3px',
    ].join(';');

    // === NORMAL CONSOLE STYLES ===

    var MODULE_CONSOLE_NORMAL_STYLE_AUTHOR = [
        'color: #A4C76A',
        'font-weight:900',
        'margin-right: 0px',
    ].join(';');
    var MODULE_CONSOLE_NORMAL_STYLE_MODULE = [
        strTitleColor,
        'font-weight:900',
        'margin-right: 8px',
    ].join(';');
    var MODULE_CONSOLE_NORMAL_STYLE_TEXT = [
        'color: #c1c1c1',
    ].join(';');
    var MODULE_CONSOLE_COMMON_DIVIDER = '%c=';
    var MODULE_CONSOLE_COMMON_STYLE_DIVIDER = [
        'color: #A4C76A',
        'background: #A4C76A',
        'font-size: 1px',
        'border: 1px solid #A4C76A',
        'border-radius: 1px',
        'padding-top: 0px',
        'padding-bottom: 0px',
        'padding-left: 200px',
        'padding-right: 200px',
        'margin-top: 4px',
        'margin-bottom: 4px',
    ].join(';');

    // === DEBUG CONSOLE STYLES ===
    
    // --- FANCY DEBUG ---
    var MODULE_CONSOLE_DEBUG_STYLE_FANCY_CAPTION = [
        strFancyCaptionFontColor,
        strFancyCaptionBackground,
        strFancyCaptionBorder,
        'font-size: 14px',
        'font-weight:900',
        'border-radius: 4px',
        'padding-top: 6px',
        'padding-bottom: 3px',
        'padding-left: 10px',
        'padding-right: 10px',
        'margin-top: 8px',
        'margin-bottom: 8px',
        'margin-left: 0px',
        'margin-right: 8px',
    ].join(';');
    var MODULE_CONSOLE_DEBUG_STYLE_FANCY_LABEL_MESSAGE = [
        'color: #FF7340',
        'font-weight:900',
        'margin-right: 3px',
    ].join(';');
    var MODULE_CONSOLE_DEBUG_STYLE_FANCY_TEXT_MESSAGE = [
        // 'color: #D8E8D9',
        'all: unset;',
    ].join(';');
    var MODULE_CONSOLE_DEBUG_STYLE_FANCY_LABEL_RESULT = [
        'color: #5CC9F5',
        'font-weight:900',
        'margin-right: 3px',
    ].join(';');
    // not used right now
    var MODULE_CONSOLE_DEBUG_STYLE_FANCY_TEXT_RESULT = [
        'all: unset;',
    ].join(';');

    // --- SIMPLE DEBUG ---

    var MODULE_CONSOLE_DEBUG_STYLE_SIMPLE_AUTHOR = [
        'color: #A4C76A',
        'font-weight:900',
        'margin-right: 0px',
    ].join(';');
    var MODULE_CONSOLE_DEBUG_STYLE_SIMPLE_MODULE = [
        strTitleColor,
        'font-weight:900',
        'margin-right: 8px',
    ].join(';');

    var MODULE_CONSOLE_DEBUG_STYLE_SIMPLE_LABEL_MESSAGE = [
        'color: #FF7340',
        'font-weight:900',
        'margin-right: 3px',
    ].join(';');
    var MODULE_CONSOLE_DEBUG_STYLE_SIMPLE_TEXT_MESSAGE = [
        'color: #D8E8D9',
    ].join(';');
    var MODULE_CONSOLE_DEBUG_STYLE_SIMPLE_LABEL_RESULT = [
        'color: #5CC9F5',
        'font-weight:900',
        'margin-right: 3px',
    ].join(';');
    var MODULE_CONSOLE_DEBUG_STYLE_SIMPLE_TEXT_RESULT = [
        'all: unset;',
    ].join(';');

    // --- PLAIN DEBUG ---

    var MODULE_CONSOLE_DEBUG_STYLE_PLAIN_AUTHOR = [
        'color: #A4C76A',
        'font-weight:900',
        'margin-right: 0px',
    ].join(';');
    var MODULE_CONSOLE_DEBUG_STYLE_PLAIN_MODULE = [
        strTitleColor,
        'font-weight:900',
        'margin-right: 8px',
    ].join(';');
    var MODULE_CONSOLE_DEBUG_STYLE_PLAIN_TEXT_MESSAGE = [
       'all: unset;',
    ].join(';');
    // Set variables
    var strConsoleMessage = "";
    var strNotificationMessage = "";
    var strResultFlag = "";
    var strMessageFlag = "";
    if (!blnDebug){
        blnDebug = false;
    }
    if (!blnNotification){
        blnNotification = false;
    }
    if (!blnDivider){
        blnDivider = false;
    }
    var strMessage = message;
    if (!strMessage){
        //They are not passing a message
    }
    var strResult = result;
    if (!strResult){
        //They are not passing a variable or array
    } 
    // Build the Debug
    strNotificationMessage = MODULE_AUTHOR + " " + MODULE_CONSOLE_COMMON_PIPE + " " + MODULE_TITLE + ": " + strMessage + " | " + strResult;
    if (blnDivider) {
        console.info(MODULE_CONSOLE_COMMON_DIVIDER, MODULE_CONSOLE_COMMON_STYLE_DIVIDER);
    }
    if (blnDebug == true) {
        // It is a debug message.
        if (COFFEEPUB.blnDebugOn) {
            // Debug Mode is ON so display it.
            if (COFFEEPUB.blnFancyConsole) {
                // Add the VALUE tag if needed
                if (strMessage){
                    //They are passing a variable or array
                    strMessageFlag = "%c\nMESSAGE:%c"; // 4,5
                } else {
                    strMessageFlag = "";
                    MODULE_CONSOLE_DEBUG_STYLE_FANCY_LABEL_MESSAGE = "";
                    MODULE_CONSOLE_DEBUG_STYLE_FANCY_TEXT_MESSAGE = "";
                }
                if (strResult){
                    //They are passing a variable or array
                    strResultFlag = "%c\nRESULTS:%c";
                } else {
                    strResultFlag = "";
                    MODULE_CONSOLE_DEBUG_STYLE_FANCY_LABEL_RESULT = "";
                    MODULE_CONSOLE_DEBUG_STYLE_FANCY_TEXT_RESULT = "";
                }
                if (COFFEEPUB.strConsoleDebugStyle == "fancy") {
                    // FANCY STYLE
                    // BUILD Content
                    strConsoleMessage = "%c" + MODULE_CONSOLE_COMMON_ICON_BUG + " " + MODULE_AUTHOR + " " + MODULE_CONSOLE_COMMON_PIPE  + " " + MODULE_TITLE + " DEBUG" + strMessageFlag + strMessage + strResultFlag;
                    // PUBLISH with Styles
                    console.info(strConsoleMessage, MODULE_CONSOLE_DEBUG_STYLE_FANCY_CAPTION, MODULE_CONSOLE_DEBUG_STYLE_FANCY_LABEL_MESSAGE, MODULE_CONSOLE_DEBUG_STYLE_FANCY_TEXT_MESSAGE, MODULE_CONSOLE_DEBUG_STYLE_FANCY_LABEL_RESULT,MODULE_CONSOLE_DEBUG_STYLE_FANCY_TEXT_RESULT, strResult);
                } else if (COFFEEPUB.strConsoleDebugStyle == "simple") {
                    // SIMPLE STYLE
                    // BUILD Content
                    strConsoleMessage = "%c" + MODULE_CONSOLE_COMMON_ICON_BUG + " " + MODULE_AUTHOR + "%c" + MODULE_CONSOLE_COMMON_PIPE + "%c" + MODULE_TITLE  + " DEBUG" + strMessageFlag + strMessage + strResultFlag;
                    // PUBLISH with Styles
                    console.info(strConsoleMessage, MODULE_CONSOLE_DEBUG_STYLE_SIMPLE_AUTHOR, MODULE_CONSOLE_COMMON_STYLE_PIPE, MODULE_CONSOLE_DEBUG_STYLE_SIMPLE_MODULE, MODULE_CONSOLE_DEBUG_STYLE_SIMPLE_LABEL_MESSAGE, MODULE_CONSOLE_DEBUG_STYLE_SIMPLE_TEXT_MESSAGE, MODULE_CONSOLE_DEBUG_STYLE_SIMPLE_LABEL_RESULT,MODULE_CONSOLE_DEBUG_STYLE_SIMPLE_TEXT_RESULT, strResult );
                } else {
                    // PLAIN STYLE
                    strConsoleMessage =  "%c" + MODULE_AUTHOR + " " + MODULE_CONSOLE_COMMON_PIPE + " %c" + MODULE_TITLE + " DEBUG: %c" + strMessage;
                    console.info(strConsoleMessage, MODULE_CONSOLE_DEBUG_STYLE_PLAIN_AUTHOR, MODULE_CONSOLE_DEBUG_STYLE_PLAIN_MODULE, MODULE_CONSOLE_DEBUG_STYLE_PLAIN_TEXT_MESSAGE, strResult);
                }
            } else {
                // UNSTYLED NOT-FANCY CONSOLE
                strConsoleMessage = MODULE_AUTHOR + " " + MODULE_CONSOLE_COMMON_PIPE + " " + MODULE_TITLE + " DEBUG: " + strMessage;
                console.info(strConsoleMessage, strResult);
            }
            if (blnNotification){
                ui.notifications.warn(strNotificationMessage, {permanent: true, console: false});
            }
        }   
    } else {
        // Normal Mode (NOT DEBUG)
        if (COFFEEPUB.blnFancyConsole) {
            strConsoleMessage = "%c" + MODULE_AUTHOR + "%c" + MODULE_CONSOLE_COMMON_PIPE + "%c" + MODULE_TITLE + "%c" + strMessage;
            console.info(strConsoleMessage, MODULE_CONSOLE_NORMAL_STYLE_AUTHOR, MODULE_CONSOLE_COMMON_STYLE_PIPE, MODULE_CONSOLE_NORMAL_STYLE_MODULE, MODULE_CONSOLE_NORMAL_STYLE_TEXT, strResult);
        } else {
            strConsoleMessage = MODULE_AUTHOR + " " + MODULE_CONSOLE_COMMON_PIPE + " " + MODULE_TITLE + ": " + strMessage;
            console.info(strConsoleMessage, strResult);
        }
        if (blnNotification){
            ui.notifications.info(strNotificationMessage, {permanent: false, console: false});
        }
    }
}