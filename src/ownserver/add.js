/** @param {NS} ns */
export async function main(ns) {
	const owned = ns.getPurchasedServers();

	while (owned.length < ns.getPurchasedServerLimit()) {
		await ns.sleep(1);
		let name = 'h'+owned.length;
		owned.push(ns.purchaseServer(name, 8));
		ns.tprint(owned.length);
	}

	let budget = 500 * 1000 * 1000 * 1000;
	
}