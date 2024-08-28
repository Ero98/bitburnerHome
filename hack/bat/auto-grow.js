import {execMulti} from "/hack/bat/exec-multi.js";
import * as config from "/hack/bat/config.js";
import {scriptBaseCostGet} from "/hack/bat/config.js";

const autoGrowScript = config.autoGrowScriptGet();

const arrAdd = (arrA, arrB) => arrA.map((aEle, aInd) => aEle + arrB[aInd]);
const arrMinus = (arrA, arrB) => arrA.map((aEle, aInd) => aEle - arrB[aInd]);

/** 
 * @param {NS} ns 
 * @param {function(string):void} log logging function
 * @param {string} target target server hostname
 * @param {{dps:number, tpb:number
	hackServerAlloc:number[][], growServerAlloc:number[][], weaken1ServerAlloc:number[][], weaken2ServerAlloc:number[][],
	concurrency:number, secondPerBatch:number, batchGap:number, 
	hackPerBatch:number, growPerBatch:number
	weaken1Time:number, weaken2Time:number, hackTime:number, growTime:number}} calcResult for single target
 * @param {string[]} availableServers
 */
export async function autoGrow(ns, log, target, calcResult, availableServers) {
	log(`execute auto-grow for target:${target}...`);

	//{number[][]} for batch allocations
	const hackServers = calcResult.hackServerAlloc;
	const growServers = calcResult.growServerAlloc;
	const weaken1Servers = calcResult.weaken1ServerAlloc;
	const weaken2Servers = calcResult.weaken2ServerAlloc;

	//total allocations
	const totalOnServers = [hackServers, growServers, weaken1Servers, weaken2Servers]
		.filter(batches => batches && batches.length > 0)
		.map(batches => batches.reduce(arrAdd))
		.reduce(arrAdd, availableServers.map(x=>0));

	const scriptCostGB = ns.getScriptRam(autoGrowScript);

	for (let i in availableServers) {
		const totalAllocOnServerGB = scriptBaseCostGet() * totalOnServers[i];
		const autoGrowThd = Math.floor(totalAllocOnServerGB / scriptCostGB);

		if (autoGrowThd < 1) {
			continue;
		}
		
		log(` exec ${autoGrowThd} threads on ${availableServers[i]} for target:${target}`);
		execMulti(ns, availableServers[i], autoGrowThd, autoGrowScript, target, "$threads");
	}

	//return a checker for wheter auto-grow finished
	return () => {
		let isAllStopped = true;
		for (let i in availableServers) {
			if (ns.scriptRunning(autoGrowScript, availableServers[i])) {
				isAllStopped = false;
				break;
			}
		}

		if (isAllStopped) {
			log("all grow finished");
		}

		return isAllStopped;
	}
}