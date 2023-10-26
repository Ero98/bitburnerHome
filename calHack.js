/** @param {NS} ns */
export async function main(ns) {
	let server = ns.getServer("n00dles");

	for(let i=0; i<30; ++i) {
		const expectedPercent = ns.formulas.hacking.hackPercent(server, ns.getPlayer());
		const curMoney = ns.getServerMoneyAvailable(server.hostname);
		const hacked = await ns.hack(server.hostname, {thread:9999});
		
		ns.print(`exp: ${expectedPercent}, curMon: ${curMoney}, expHacked: ${expectedPercent * 9999 * curMoney} actHacked: ${hacked}`);
		await ns.weaken(server.hostname, {thread:9999});
	}
}