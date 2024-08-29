/** @param {NS} ns */
export async function main(ns) {
	doHost(ns, "home");
}

/** @param {NS} ns */
function doHost(ns, host, parent=undefined) {
	const hosts=ns.scan(host);

	for (let i in hosts) {
		const tarHost = hosts[i];
		if (tarHost===parent) {
			continue;
		}

		ns.run("/tools/autonuke.js", 1, tarHost);
		if (ns.hasRootAccess(tarHost)) {
			ns.run("/tools/scp.js", 1, "-r", "/tools", "/lib", "/hack", tarHost);
			ns.run("/hack/sc/exec-multi.js", 1, tarHost, "max", "/hack/sc/hack-loop.js", "$threads");
			doHost(ns, tarHost, host);
		}
	}
}