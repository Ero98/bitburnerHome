/** @param {NS} ns */
export async function main(ns) {
	const host = ns.args[0];
	if(!ns.serverExists(host)) {
		ns.tprint("server not exist: ", host);
		ns.exit();
	}

	const ports = ns.getServerNumPortsRequired(host);
	const means = [ns.brutessh, ns.ftpcrack, ns.relaysmtp, ns.httpworm, ns.sqlinject];
	const files = ["/BruteSSH.exe", "/FTPCrack.exe", "/relaySMTP.exe", "/HTTPWorm.exe", "/SQLInject.exe"];

	for (let i=0; i<ports; ++i) {
		if (!ns.fileExists(files[i])) {
			ns.tprint("Required file not exist: ", files[i]);
			ns.exit();
		}

		means[i](host);
	}

	ns.nuke(host);
	// ns.tprint("Nuke succeeded on ", host);
}