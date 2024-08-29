/** @param {NS} ns */
export async function main(ns) {
	const owned = ns.getPurchasedServers();
	const targetRam = ns.args[0];

	for (let i in owned) {
		ns.tprint(ns.upgradePurchasedServer(owned[i], targetRam));
	}
}