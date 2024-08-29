/** @param {NS} ns */
export async function main(ns) {
	const owned = ns.getPurchasedServers();
	for (let i in owned) {
		const server = ns.getServer(owned[i]);
		ns.tprint(server.hostname, "\t", server.maxRam);
	}
}