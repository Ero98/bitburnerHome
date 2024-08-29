/** @param {NS} ns */
export async function main(ns) {
	ns.disableLog("ALL");
	const tCount = ns.args[0];
	const host = ns.args[1] || ns.getHostname();

	const minSec=ns.getServerMinSecurityLevel(host);
	const maxMon=ns.getServerMaxMoney(host);

	const maxWeakenAmount = ns.weakenAnalyze(tCount);
	let maxGrowth = 0;
	let maxHack = 0;

	let unmendHacked = 0;
	while(true) {
		const curSec=ns.getServerSecurityLevel(host);
		const curMon=Math.floor(ns.getServerMoneyAvailable(host));
		const canGrowth=(maxMon-curMon)/curMon+1;

		//decide action
		let action;
		if (curSec-minSec >= maxWeakenAmount) {
			action='weaken';
		} else {
			if (canGrowth >= maxGrowth && unmendHacked >= 0) {
				action='grow';
			} else if (curMon >= maxHack){
				action='hack';
			} else {
				action='grow';
			}
		}

		ns.print("minSec: ", minSec
			," curSec: ", curSec, "\t"
			," maxMon: ", maxMon
			," curMon: ", curMon, "\t"
			," maxWek: ", maxWeakenAmount
			," maxGrw: ", maxGrowth
			," hakGrw: ", unmendHacked, "\t"
			," action: ", action
			," thread: ", tCount
		);

		//do action
		const effect = await doAction(ns, host, tCount, action);

		if (action==='hack' && maxHack < effect) {
			maxHack=effect;
		}

		//keep track of hack-grow difference
		if (action==='hack') {
			unmendHacked += Math.floor(effect);
		}
		if (action==='grow') {
			const newMon = ns.getServerMoneyAvailable(host);
			const oriMon = newMon/effect;
			unmendHacked -= Math.floor(newMon-oriMon);
		
			if (effect > maxGrowth) {
				maxGrowth = effect;
			}
		}
	}
}
/** @param {NS} ns */
export function doAction(ns, host, tCount, action) {
	switch(action) {
		case 'weaken': 
			return ns.weaken(host, {threads :tCount}); 
		case 'grow': 
			return ns.grow(host, {threads :tCount});
		case 'hack': 
			return ns.hack(host, {threads :tCount});
	}
}