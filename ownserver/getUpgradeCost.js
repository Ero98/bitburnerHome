/** @param {NS} ns */
export async function main(ns) {
	const targetRam=ns.args[0];
	const host=ns.args[1] || ns.getPurchasedServers()[0];
	ns.tprint(ns.getPurchasedServerUpgradeCost(host,targetRam));
}