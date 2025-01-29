// ================================================================== 
// ===== COMMON =====================================================
// ================================================================== 
//
// Put any functions or reusable code here for use in THIS module.
// This code is not shareable with other modules.
//
// Any SHARED code goes in "GLOBAL"... and each module shoudl get
// the exact same code set in it.
//
// ================================================================== 


/**
 * @param {Number} num
 * @param {Number} min
 * @param {Number} max
 * @returns {Number} Number wrapped within the provided range
 */
export function wrapNumber(num, min, max) {
	const range = max - min + 1, value = num - min + 1; // normalize to 1 to range+1
	const t = value % range - 1;
	return (t < 0 ? range + t : t) + min;
}

export const getPermissionLevels = () => {
    return CONST.DOCUMENT_OWNERSHIP_LEVELS;
};

export const getDocData = (doc) => doc;

export const getProtoToken = (actor) => actor ? actor.prototypeToken.img : undefined;

export const getDefaultPermission = (thing) => thing ? thing.ownership.default : undefined;

export const getUsers = (thing, testPerm) => thing ? Object.entries(thing.ownership)
	.filter(([_, level]) => level >= testPerm).map(([uid, _]) => uid) : [];