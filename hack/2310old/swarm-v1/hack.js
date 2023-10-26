/** @param {NS} ns */
export async function main(ns) {
	let target = ns.args[0] || ns.getHostname();

	while (true) {
		while(ns.getServerSecurityLevel(target) > ns.getServerMinSecurityLevel(target) * 2) {
			await ns.weaken(target);
		}

		var lastGain = await ns.hack(target);
		do {
			var nowGain = await ns.hack(target);
			var keepHacking = nowGain===0 || ns.getServerMoneyAvailable(target) > ns.getServerMaxMoney(target) * 7 / 8;
			
			if (nowGain!==0){
				lastGain=nowGain;
			}
		} while(keepHacking);

		while(ns.getServerSecurityLevel(target) > ns.getServerMinSecurityLevel(target) * 2) {
			await ns.weaken(target);
		}
		
		while(ns.getServerMaxMoney(target) !== ns.getServerMoneyAvailable(target)) {
			await ns.grow(target);
		}
	}
}