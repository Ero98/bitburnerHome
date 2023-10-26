import {execMulti} from "/hack/bat/exec-multi.js";
import * as config from "/hack/bat/config.js";

const autoGrowScript = config.autoGrowScriptGet();

/** 
 * @param {NS} ns 
 * @param {function(string):void} log logging function
 * @param {string[]} targets target server hostnames
 * @param {string[]} availableServers
 */
export async function autoGrow(ns, log, targets, availableServers) {
	log(`execute targets:${targets}`);
	const scriptCostGB = ns.getScriptRam(autoGrowScript);
	for (let i in availableServers) {
		log(`exec on server ${availableServers[i]}`);
		const totalAvaiGB = ns.getServerMaxRam(availableServers[i]) - ns.getServerUsedRam(availableServers[i]);
		const avgThd = Math.floor(totalAvaiGB / targets.length / scriptCostGB);
		if (avgThd < 1) {
			continue;
		}
		for (let j in targets) {
			log(` exec thds ${avgThd} on target ${targets[j]}`);
			execMulti(ns, availableServers[i], avgThd, autoGrowScript, targets[j], "$threads");
		}
	}

	while (true) {
		await ns.sleep(1);

		let isAllStopped = true;
		for (let i in availableServers) {
			if (ns.scriptRunning(autoGrowScript, availableServers[i])) {
				isAllStopped = false;
				break;
			}
		}

		if (isAllStopped) {
			log("all grow finished");
			break; 
		}
	}
}