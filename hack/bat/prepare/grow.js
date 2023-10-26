/** @param {NS} ns */
export async function main(ns) {
	let target = ns.args[0];
	let threads = ns.args[1] || 1;

	while (ns.getServerMaxMoney(target) !== ns.getServerMoneyAvailable(target)) {
		if(ns.getServerSecurityLevel(target) - ns.getServerMinSecurityLevel(target) > 0.05*threads
			|| ns.getServerSecurityLevel(target) - ns.getServerMinSecurityLevel(target) > 20) {
			await ns.weaken(target, {threads:threads});
		}
		await ns.grow(target, {threads:threads});
	}

	while (ns.getServerSecurityLevel(target) !== ns.getServerMinSecurityLevel(target)) {
		await ns.weaken(target, {threads:threads});
	}
}