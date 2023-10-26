/** @param {NS} ns */
export async function main(ns) {
	let SERVER= ns.args[0];
	let weakenFirst = ns.args[1];

	if (weakenFirst) {
		while(ns.getServerSecurityLevel(SERVER) !== ns.getServerMinSecurityLevel(SERVER)) {
			await ns.weaken(SERVER);
		}
	}

	while(await ns.grow(SERVER) > 0);
}