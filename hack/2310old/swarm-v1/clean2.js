/** @param {NS} ns */
export async function main(ns) {
	let cleanScript = "clean2.js";
	let conjugateCleanScript = "clean.js";

	let cleanUpScripts = ns.args;

	if( ! cleanUpScripts.find(e=>e===conjugateCleanScript)) {
		cleanUpScripts.push(conjugateCleanScript);
	}

	let neighbours = ns.scan();
	
	for(let i in neighbours) {
		let host = neighbours[i];
		if (! ns.hasRootAccess(host)) {
			ns.brutessh(host);
			ns.ftpcrack(host);
			ns.relaysmtp(host);
			ns.httpworm(host);
			
			try {
				ns.nuke(host);
			} catch (e) {
				continue;
			}
		}

		if (host !== "home") {
			for (let j in cleanUpScripts) {
				let cleanUpScript = cleanUpScripts[j];
				ns.rm(cleanUpScript, host);
			}
		}
		
		if (! ns.fileExists(cleanScript, host)) {
			ns.scp(cleanScript, host);
			ns.exec(cleanScript, host, undefined, ...cleanUpScripts);
		}
	}
}