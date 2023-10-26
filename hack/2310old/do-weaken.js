/** @param {NS} ns */
export async function main(ns) {
	let target = ns.args[0];
	let heatUp = ns.args[1] || false;

	if (heatUp) {
		await ns.sleep(ns.getGrowTime(target));
	} else {
		await ns.weaken(target);
	}
}