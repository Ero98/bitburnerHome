import Allocator from "/hack/bat/allocator.js";

import * as formu from "/hack/bat/formulas.js";
import * as config from "/hack/bat/config.js";

const local = config.localGet();
const stepTimeMillis = config.stepTimeMillisGet();
const twoWeakenOpts = config.twoWeakenOptsGet();
const preparationsLogFile = config.preparationsLogFileGet();
const scriptBaseCost = config.scriptBaseCostGet();
const maxConcurrency = config.maxConcurrencyGet();
const maxHackPerBatch = config.maxHackPerBatchGet();

const arrAdd = (arrA, arrB) => arrA.map((aEle, aInd) => aEle + arrB[aInd]);
const arrMinus = (arrA, arrB) => arrA.map((aEle, aInd) => aEle - arrB[aInd]);

/** 
 * Incrementally find the best paramters.
 * 
 * d: dollar
 * h: hack
 * t: thread
 * s: second
 * g: grow
 * 
 * XpY: X per Y
 * 
 * @param {NS} ns
 * @param {function(string):void} log logging function
 * @param {string[]} dest dest hostnames
 * @param {number[]} availableAllocs
 * @param {number} stepMillis step time in millis, used for adding gap between effects to avoid failures.
 * @param {bool} hwgw hack weaken grow weaken mode, if false, will use one weaken operation to counter the effects().
 */ 
export async function chooseTargets(ns, log, dests, availableAllocs, stepMillis, hwgw=true) {
	if (!hwgw) {
		log("hgw mode not implemented.");
		ns.tprint("hgw mode not implemented.");
		ns.exit();
	}

	let remainAllocs = availableAllocs.slice();

	const totalAllocNumber = remainAllocs.reduce((a,b)=>a+b);
	let nextAllocPercent = 0;

	const targetParams = [];
	const targetHpb = [];
	const targetLastThread = [];
	const targetLastDps = [];

	//init
	for (let i in dests) {
		targetParams.push(null);
		targetHpb.push(0);
		targetLastThread.push(0);
		targetLastDps.push(0); 
	}
	
	log(`remainAllocs ${remainAllocs}`);
	while (true) {
		await ns.sleep(1);
		let maxIncDpsPT = 0;
		let maxIncDpsPTIndex = -1;
		let maxIncDpsPTServerParam;
		let maxIncDpsPTServerOriginalAllocMap;

		//find next best investment
		for (let i in dests) {
			await ns.sleep(1);
			const dest = dests[i];
			
			log(` begin to cal ${i}:${dest}, lastHpb ${targetHpb[i]}`);
			// first return allocated threads, then do the calculation again
			let returnedRemainAllocs;
			let totalAllocMap;
			if (targetParams[i] == null) {
				returnedRemainAllocs = remainAllocs;
				totalAllocMap = remainAllocs.map(()=>0);
			} else {
				const hackAllocMap = targetParams[i].hackServerAlloc.reduce(arrAdd);
				const growAllocMap = targetParams[i].growServerAlloc.reduce(arrAdd);
				const weaken1AllocMap = targetParams[i].weaken1ServerAlloc.reduce(arrAdd);
				const weaken2AllocMap = targetParams[i].weaken2ServerAlloc.reduce(arrAdd);
				totalAllocMap = [hackAllocMap, growAllocMap, weaken1AllocMap, weaken2AllocMap].reduce(arrAdd);
				returnedRemainAllocs = arrAdd(remainAllocs, totalAllocMap);
			  // log(`  last alloc: ${totalAllocMap}`);
			}
			// log(`  remain alloc: ${remainAllocs}`);
			// log(`  remain alloc(returned): ${returnedRemainAllocs}`);
			
			if (formu.getHackChance(ns, ns.getServer(dest), ns.getPlayer()) < 1) { 
				// log("h " +dest+ " hacking chance is not 100%, skipping.");
				continue;
			}
			if (maxHackPerBatch > 0 && targetHpb[i]+1 > maxHackPerBatch) {
				continue;
			}
			
			/** 
		 	 *	@type {{dps:number, tpb:number
			 *	hackServerAlloc:number[][], growServerAlloc:number[][], weaken1ServerAlloc:number[][], weaken2ServerAlloc:number[][], 
			 *	concurrency:number, secondPerBatch:number, batchGap:number, 
			 *	hackPerBatch:number, growPerBatch:number
			 *	weaken1Time:number, weaken2Time:number, hackTime:number, growTime:number}}
			 */
			const calRes = await calDps(ns, logStr=>log('   '+logStr), dest, targetHpb[i]+1, returnedRemainAllocs, stepMillis, hwgw);
			log(` dps:${calRes.dps} dpb:${calRes.hackPerBatch}`);
			// //Stop when required threads exceeds availables
			// if (calRes.concurrency === 0) {
			// 	log("server " +dest+ " cannot meet algorithm constraints.");
			// 	continue;
			// }
			// log("h: "+dest+"\t"
			// 	+"dph: "+dph+"\t"
			// 	+"hpb: "+hpb+"\t"
			// 	+"gpb: "+gpb+"\t"
			// 	+"tpb: "+tpb+"\t"
			// 	+"spb: "+spb+"\t"
			// 	+"con: "+concurrency+"\t"
			// 	+"$/s: "+dps+"\t"
			// );

			const totalThreads = calRes.tpb * calRes.concurrency;
			const totalDps = calRes.dps;
			if (totalDps === 0) {
				continue;
			}

			const incThreads = totalThreads - targetLastThread[i];
			const incDps = totalDps - targetLastDps[i];

			const incDpsPerThread = incDps / incThreads;
			if (incDpsPerThread > maxIncDpsPT) {
				// log(` found better investment i:${i}:${dests[i]}, incDps:${incDps}, incThds:${incThreads}`);
				maxIncDpsPT = incDpsPerThread;
				maxIncDpsPTIndex = i;
				maxIncDpsPTServerParam = calRes;
				maxIncDpsPTServerOriginalAllocMap = totalAllocMap;
			}
		}

		if (maxIncDpsPT === 0) {
			break;
		} 
		
		let i = maxIncDpsPTIndex;
		// log(`choose to invest i:${i}:${dests[i]}, maxIncDpsPT:${maxIncDpsPT}`);

		//reduce resources
		const nextHackAllocMap = maxIncDpsPTServerParam.hackServerAlloc.reduce(arrAdd);
		const nextGrowAllocMap = maxIncDpsPTServerParam.growServerAlloc.reduce(arrAdd);
		const nextWeaken1AllocMap = maxIncDpsPTServerParam.weaken1ServerAlloc.reduce(arrAdd);
		const nextWeaken2AllocMap = maxIncDpsPTServerParam.weaken2ServerAlloc.reduce(arrAdd);
		const nextTotalAllocMap = [nextHackAllocMap, nextGrowAllocMap, nextWeaken1AllocMap, nextWeaken2AllocMap].reduce(arrAdd);
		
		remainAllocs = arrAdd(remainAllocs, maxIncDpsPTServerOriginalAllocMap);
		remainAllocs = arrMinus(remainAllocs, nextTotalAllocMap);

		//write new params
		targetParams[maxIncDpsPTIndex] = maxIncDpsPTServerParam;
		targetHpb[maxIncDpsPTIndex] = maxIncDpsPTServerParam.hackPerBatch;
		targetLastThread[maxIncDpsPTIndex] = maxIncDpsPTServerParam.tpb * maxIncDpsPTServerParam.concurrency;
		targetLastDps[maxIncDpsPTIndex] = maxIncDpsPTServerParam.dps;
		log(`investing i:${i}:${dests[i]} hpb:${targetHpb[i]} thd:${targetLastThread[i]} dps:${targetLastDps[i]}`);
		
		const remainAllocNumber = remainAllocs.reduce((a,b)=>a+b);
		const allocPercent = (1 - remainAllocNumber / totalAllocNumber) * 100;
		if ((1 - remainAllocNumber / totalAllocNumber) * 100 > nextAllocPercent) {
			log('INFO', `${new Date().toString()} percent ${allocPercent}% total ${totalAllocNumber} left ${remainAllocNumber} `);
			nextAllocPercent += 10;
		}
	}

	return targetParams;
}

/** 
 * Incrementally find the best paramters.
 * 
 * d: dollar
 * h: hack
 * t: thread
 * s: second
 * g: grow
 * 
 * XpY: X per Y
 * 
 * @param {NS} ns
 * @param {function(string):void} log logging function
 * @param {string} dest dest hostname
 * @param {number} hpb hack per batch
 * @param {number[]} availableAllocs
 * @param {number} stepMillis step time in millis, used for adding gap between effects to avoid failures.
 * @param {bool} hwgw hack weaken grow weaken mode, if false, will use one weaken operation to counter the effects().
 */
async function calDps(ns, log, dest, hpb, availableAllocs, stepMillis, hwgw=true) {
	const serverOptimal = getServerOptimal(ns, dest);

	const weaken2Time = formu.getWeakenTime(ns, serverOptimal, ns.getPlayer());
	const weaken1Time = formu.getWeakenTime(ns, serverOptimal, ns.getPlayer());
	const hackTime = formu.getHackTime(ns, serverOptimal, ns.getPlayer());
	const growTime = formu.getGrowTime(ns, serverOptimal, ns.getPlayer());

	const batchGap = stepMillis * 4;
	const dph = serverOptimal.moneyAvailable * formu.getHackPercent(ns, serverOptimal, ns.getPlayer());
	//如果开始执行时间和其他批次的执行结束时间重叠，会导致结果无法预测
	//在有更优解决办法之前，先将最大批次限制为hackTime（HWGW中时间最短的那个）可以容纳的作用时间段数
	const maxBatch = maxConcurrency >0? 
		Math.min(maxConcurrency, Math.floor(hackTime / batchGap + 1)) 
		: Math.floor(hackTime / batchGap + 1);

	let tpb = 0;
	let dps = 0;
	let spb = 0;
	let gpb = 0;
	let concurrency = 0;

	//{number[][]} for batch allocations
	let hackServerAlloc = [];
	let growServerAlloc = [];
	let weaken1ServerAlloc = [];
	let weaken2ServerAlloc = [];
	
	const curDpb = Math.min(serverOptimal.moneyMax, dph * hpb);
	const serverBeforeGrow = getServerOptimal(ns, dest);
	serverBeforeGrow.moneyAvailable = serverBeforeGrow.moneyMax - curDpb;

	const hackThreadsRaw = hpb;
	const growThreadsRaw = formu.getGrowThreads(ns, serverBeforeGrow, ns.getPlayer(), hpb);
	const weaken1ThreadsRaw = hackThreadsRaw * 0.002 / 0.05;
	const weaken2ThreadsRaw = growThreadsRaw * 0.004 / 0.05;

	//{number[][]} for batch allocations
	const curHackServerAlloc = [];
	const curGrowServerAlloc = [];
	const curWeaken1ServerAlloc = [];
	const curWeaken2ServerAlloc = [];

	const allocator = new Allocator(availableAllocs);

	let batch = 0;

	//先分配hack、再分配grow，每次要求完整分配
	//weaken可以碎片分配
	while (batch < maxBatch) {
		await ns.sleep(1);
		const hackAllocRes = allocator.alloc(Math.ceil(hackThreadsRaw), false);
		if (!hackAllocRes.success) {
			break;
		}
		curHackServerAlloc.push(hackAllocRes.allocation);

		const growAllocRes = allocator.alloc(Math.ceil(growThreadsRaw), false);
		if (!growAllocRes.success) {
			allocator.free(curHackServerAlloc.pop());
			break;
		}
		curGrowServerAlloc.push(growAllocRes.allocation);

		const weaken1AllocRes = allocator.alloc(Math.ceil(weaken1ThreadsRaw), true);
		if (!weaken1AllocRes.success) {
			allocator.free(curHackServerAlloc.pop());
			allocator.free(curGrowServerAlloc.pop());
			break;
		}
		curWeaken1ServerAlloc.push(weaken1AllocRes.allocation);

		const weaken2AllocRes = allocator.alloc(Math.ceil(weaken2ThreadsRaw), true);
		if (!weaken2AllocRes.success) {
			allocator.free(curHackServerAlloc.pop());
			allocator.free(curGrowServerAlloc.pop());
			allocator.free(curWeaken1ServerAlloc.pop());
			break;
		}
		curWeaken2ServerAlloc.push(weaken2AllocRes.allocation);

		batch++;
		log(`batch ${batch} alloced, cur total thd ${
			[curHackServerAlloc.reduce(arrAdd),
				curGrowServerAlloc.reduce(arrAdd),
				curWeaken1ServerAlloc.reduce(arrAdd),
				curWeaken2ServerAlloc.reduce(arrAdd)].reduce(arrAdd).reduce((a,b)=>a+b)
		} cur thd left ${allocator.availableAllocs.reduce((a,b)=>a+b)}`);
	}

	let curSpb = (weaken1Time + batch * batchGap) / 1000;
	const curDps = curDpb * (1 / curSpb) * batch;

	if (dps < curDps) {
		tpb = Math.ceil(hackThreadsRaw) 
			+ Math.ceil(growThreadsRaw) 
			+ Math.ceil(weaken1ThreadsRaw) 
			+ Math.ceil(weaken2ThreadsRaw);
		spb = curSpb;
		dps = curDps;
		gpb = Math.ceil(growThreadsRaw);

		concurrency = batch;

		hackServerAlloc = curHackServerAlloc;
		growServerAlloc = curGrowServerAlloc;
		weaken1ServerAlloc = curWeaken1ServerAlloc;
		weaken2ServerAlloc = curWeaken2ServerAlloc;
	}

	return {dps, tpb,
		hackServerAlloc, growServerAlloc, weaken1ServerAlloc, weaken2ServerAlloc, 
		concurrency, secondPerBatch: spb, batchGap, 
		hackPerBatch: hpb, growPerBatch: gpb,
		weaken1Time, weaken2Time, hackTime, growTime};
}

/** 
 * @param {NS} ns
 * @param {string} dest
 */
function getServerOptimal(ns, dest) {
	const server = ns.getServer(dest);
	server.moneyAvailable = server.moneyMax;
	server.hackDifficulty = server.minDifficulty;
	return server;
}