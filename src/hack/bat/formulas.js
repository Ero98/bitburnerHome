/** 
 * @param {NS} ns 
 * @param {Server} server
 * @param {Person} player
 */
export function getHackPercent(ns, server, player) {
	if (hasFormula(ns)) {
		return ns.formulas.hacking.hackPercent(server, player);
	} else {
		return ns.hackAnalyze(server.hostname);
	}
}

/** 
 * @param {NS} ns 
 * @param {Server} server
 * @param {Person} player
 */
export function getHackChance(ns, server, player) {
	if (hasFormula(ns)) {
		return ns.formulas.hacking.hackChance(server, player)
	} else {
		return ns.hackAnalyzeChance(server.hostname);
	}
}

/** 
 * @param {NS} ns 
 * @param {Server} server
 * @param {Person} player
 */
export function getGrowThreads(ns, server, player, hackThd) {
	if (hasFormula(ns)) {
		return ns.formulas.hacking.growThreads(server, player, server.moneyMax);
	} else {
		const hackPercent = ns.hackAnalyze(server.hostname);
		const hackMon = hackPercent * server.moneyAvailable * hackThd;
		const monAfterHack = server.moneyAvailable - hackMon;
		const multiplier = hackMon/(monAfterHack + 1) + 1;

		return ns.growthAnalyze(server.hostname, multiplier);
	}
}

/** 
 * @param {NS} ns 
 * @param {Server} server
 * @param {Person} player
 */
export function getWeakenTime(ns, server, player) {
	if (hasFormula(ns)) {
		return ns.formulas.hacking.weakenTime(server, player);
	} else {
		return ns.getWeakenTime(server.hostname);
	}
}

/** 
 * @param {NS} ns 
 * @param {Server} server
 * @param {Person} player
 */
export function getHackTime(ns, server, player) {
	if (hasFormula(ns)) {
		return ns.formulas.hacking.hackTime(server, player);
	} else {
		return ns.getHackTime(server.hostname);
	}
}

/** 
 * @param {NS} ns 
 * @param {Server} server
 * @param {Person} player
 */
export function getGrowTime(ns, server, player) {
	if (hasFormula(ns)) {
		return ns.formulas.hacking.growTime(server, player);
	} else {
		return ns.getGrowTime(server.hostname);
	}
}

/**
 * @param {NS} ns 
 */ 
function hasFormula(ns) {
	return ns.fileExists("/Formulas.exe");
}