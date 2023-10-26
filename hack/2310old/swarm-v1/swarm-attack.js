/** @param {NS} ns */
export async function main(ns) {
	let payloadScript = ns.args[0] || "/swarm-v1/hack.js";
	let carrierScript = "/swarm-v1/swarm-attack.js";
	let payloadArg = ns.args.slice(1);

	let scripts = [payloadScript, carrierScript];

	let neighbours = ns.scan();

	for(let i in neighbours) {
		let host = neighbours[i];

		if (! ns.hasRootAccess(host) || host==="home") {
			continue;
		}

		if (! ns.fileExists(carrierScript, host)) {
			ns.scp(scripts, host);
			ns.exec(carrierScript, host, undefined, ...ns.args);
		}
	}

	if (ns.getHostname() !== "home") {
		ns.spawn(payloadScript, undefined, ...payloadArg);
	}	
}