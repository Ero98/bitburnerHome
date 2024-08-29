import {chooseTargets} from "/hack/bat/select-server.js";
import {getTargetHandler} from "/hack/bat/schedule.js";
import {autoGrow, autoGrowSimple} from "/hack/bat/auto-grow.js";

import * as config from "/hack/bat/config.js";

/** @type {string} */
const local = config.localGet();
const stepTimeMillis = config.stepTimeMillisGet();
const twoWeakenOpts = config.twoWeakenOptsGet();
const preparationsLogFile = config.preparationsLogFileGet();
const scriptBaseCost = config.scriptBaseCostGet();

/** @type {string[]} */
const servers = []; 
const scanQueue = [local];

const arrAdd = (arrA, arrB) => arrA.map((aEle, aInd) => aEle + arrB[aInd]);
const arrMinus = (arrA, arrB) => arrA.map((aEle, aInd) => aEle - arrB[aInd]);

/** @param {NS} ns */
export async function main(ns) {
	ns.disableLog("ALL");
	// ns.disableLog("scp");
	// ns.disableLog("getHackTime");
	// ns.disableLog("hackAnalyze");
	// ns.disableLog("hackAnalyzeChance");
	// ns.disableLog("hasRootAccess");
	// ns.disableLog("getServerMaxRam");
	// ns.disableLog("sleep");
	// ns.disableLog("getServerMoneyAvailable");
	// ns.disableLog("scan");
	// ns.disableLog("getPurchasedServers");
	// ns.disableLog("getServerMaxMoney");
	// ns.disableLog("exec");
	// ns.disableLog("rm");
	// ns.disableLog("getServerUsedRam");

	const log = 
		/**
		 * @param {string} logStr
		 */
		(logStr, ...args)=>{
			ns.write(preparationsLogFile, logStr+"\n");
			ns.print(logStr);
		};

	//扫描所有服务器
	while(scanQueue.length > 0) {
		let host = scanQueue.pop();
		if(servers.indexOf(host) === -1) {
			servers.push(host);
			scanQueue.push(...ns.scan(host));
			// log(`[log] scan ${host} result: ${ns.scan(host)}`);
		}
	}

	// log(`[log] Scaned Servers: ${servers}`);

	//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~ TODO ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
	//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~ 将执行脚本换成函数调用 ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
	//复制脚本到所有服务器（删除并更新脚本）
	for (let host of servers) {
		while (ns.run("/tools/autonuke.js", 1, host) == 0) {
			await ns.sleep(1);
		}
		if (ns.hasRootAccess(host)) {
			ns.run("/tools/scp.js", 1, "-r", "/tools", "/lib", "/hack", host);
		}
	}

	//整理可用资源
	const availableServers = servers.filter((dest)=>{
		let rooted = ns.hasRootAccess(dest);
		let enoughRam = ns.getServerMaxRam(dest) >= scriptBaseCost;
		return rooted && enoughRam;
	});
// log(`[log] Available Servers: ${availableServers}`);

	await ns.sleep(100)

	const availableRams = availableServers.map((server)=>(ns.getServerMaxRam(server) - ns.getServerUsedRam(server)));
	const availableAllocs = availableRams.map((ram)=>Math.floor(ram/scriptBaseCost));
	const availableTotalThreads = availableAllocs.reduce((prev, cur)=>prev+cur);
	
	log(`avai used:${availableServers.map(server=>server+":"+ns.getServerUsedRam(server))}`)
	log(`avai rams:${availableRams}`);
	log(`avai alloc:${availableAllocs}`);

	//筛选可攻击的服务器
	const targetCandidates = servers.filter((dest)=>{
		let isPurchasedServer = ns.getPurchasedServers().indexOf(dest) !== -1;
		let isHomeServer = dest===local;
		let isNoMoney = ns.getServerMaxMoney(dest)===0;
		let rooted = ns.hasRootAccess(dest);
		return ! isPurchasedServer && ! isHomeServer && ! isNoMoney && rooted;
	});
	log(`targets: ${targetCandidates}`);

	log("\n["+ new Date().toISOString() +"] 运行开始","w");

	//如果没有Formula程序，在计算前需要先grow to max
	if (!ns.fileExists("/Formulas.exe")) {
		const needGrowCandidates = targetCandidates.filter(target=>{
			const isMoneyMax = ns.getServerMoneyAvailable(target) === ns.getServerMaxMoney(target);
			const isSecMin = ns.getServerSecurityLevel(target) === ns.getServerMinSecurityLevel(target);
			return !isMoneyMax || !isSecMin;
		})
		await autoGrowSimple(ns, logStr=>{}, needGrowCandidates, availableServers);
	}

	/** 
	 * @type {{dps:number, tpb:number
	 *	hackServerAlloc:number[][], growServerAlloc:number[][], weaken1ServerAlloc:number[][], weaken2ServerAlloc:number[][], 
	 *	concurrency:number, secondPerBatch:number, batchGap:number, 
	 *	hackPerBatch:number, growPerBatch:number
	 *	weaken1Time:number, weaken2Time:number, hackTime:number, growTime:number}[]}
	 */
	const resArr = await chooseTargets(ns, 
			(logStr, ...args)=>{
				if (logStr === 'INFO') {
					log(args[0]);
				}

				// if (args.length > 0) {
				// 	log(logStr + " " + args);
				// } else {
				// 	log(logStr);
				// }
			}, 
			targetCandidates,
			availableAllocs,
			stepTimeMillis,
			twoWeakenOpts);

	for (let i in resArr) { 
		if (resArr[i]===null) {
			continue;
		}
		log(`h:${targetCandidates[i].padEnd(15)} hpb:${String(resArr[i].hackPerBatch).padEnd(4)} ` +
			`tpb:${String(resArr[i].tpb).padEnd(4)} batch:${String(resArr[i].concurrency).padEnd(2)} ` +
			`dps:${resArr[i].dps.toLocaleString()}"`);
	}
	log(`alloc total: ${availableAllocs.reduce((a,b)=>a+b)} left: ${
		resArr.filter((res)=>res!==null)
			.map(res=>
				[res.hackServerAlloc.reduce(arrAdd),
					res.growServerAlloc.reduce(arrAdd),
					res.weaken1ServerAlloc.reduce(arrAdd),
					res.weaken2ServerAlloc.reduce(arrAdd)]
					.reduce(arrAdd)
					.reduce((a,b)=>a+b)).reduce((a,b)=>a+b)
	} total dps: ${resArr.filter((res)=>res!==null).map(res=>res.dps).reduce((a,b)=>a+b).toLocaleString()}`);
	
	let autoGrowFinishCheckers = [];
	for (let i in resArr) {
		if (resArr[i]===null) {
			continue;
		}
		//auto-grow
		let finishedChecker = await autoGrow(ns, log, 
			targetCandidates[i],
			resArr[i],
			availableServers);
		autoGrowFinishCheckers.push(finishedChecker);
	}

	let handleTargetFuncArr = [];
	for (let i in resArr) {
		if (resArr[i]===null) {
			continue;
		}
		handleTargetFuncArr.push(await getTargetHandler(ns, logStr=>{}, 
			targetCandidates[i],
			resArr[i],
			availableServers));
	}

	let autoGrowFinishedStates = autoGrowFinishCheckers.map((x)=>false);
	//启动任务
	while (true) {
		await ns.sleep(1);
		handleTargetFuncArr.forEach((func, i)=> {
			if (!autoGrowFinishedStates[i]) {
				let autoGrowFinished = autoGrowFinishCheckers[i]();
				if (autoGrowFinished) {
					autoGrowFinishedStates[i] = true;
				}
			} else {
				func()
			}
		});
	}
}