/** @param {NS} ns */
export async function main(ns) {
	let target = ns.args[0];
	let threads = ns.args[1] || 1;

	let incSecurityLevel = 0;
	while(ns.getServerMaxMoney(target) > ns.getServerMoneyAvailable(target)) {
		while(incSecurityLevel < 0.05*threads && ns.getServerMaxMoney(target) > ns.getServerMoneyAvailable(target)) {
			await ns.grow(target, {threads:threads});
			incSecurityLevel += 0.004*threads;
		}

		if(ns.getServerSecurityLevel(target) !== ns.getServerMinSecurityLevel(target)) {
			await ns.weaken(target, {threads:threads});
			incSecurityLevel -= 0.05*threads;
		}
	}
}