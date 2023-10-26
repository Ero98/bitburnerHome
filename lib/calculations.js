/** @param {NS} ns */
export function getMaxThreads(ns, host, script) {
	const scriptRam = ns.getScriptRam(script);
	const maxRam = ns.getServerMaxRam(host);
	const usedRam = ns.getServerUsedRam(host);

	return Math.floor((maxRam - usedRam)/scriptRam);
}