import * as config from "/hack/bat/config.js";
import {execMulti} from "/hack/bat/exec-multi.js";
import * as formu from "/hack/bat/formulas.js";

const hackScript = config.hackScriptGet();
const growScript = config.growScriptGet();
const weaken1Script = config.weaken1ScriptGet();
const weaken2Script = config.weaken2ScriptGet();
const stepTimeMillis = config.stepTimeMillisGet();
const scriptBaseCost = config.scriptBaseCostGet();

/** 
 * @param {NS} ns 
 * @param {function(string):void} log logging function
 * @param {string} target target server hostname
 * @param {{dps:number, 
		hackServerAlloc:number[][], growServerAlloc:number[][], weaken1ServerAlloc:number[][], weaken2ServerAlloc:number[][], 
		concurrency:number, secondPerBatch:number, batchGap:number, 
		hackPerBatch:number, growPerBatch:number
		weaken1Time:number, weaken2Time:number, hackTime:number, growTime:number}} calcResult
 * @param {string[]} availableServers
 * @param {bool} twoWeakenOpts hack weaken grow weaken mode, if false, will use one weaken operation to counter the effects().
 */
export async function getTargetHandler(ns, log, target, calcResult, availableServers, twoWeakenOpts=true) {
	const startTime = Date.now();
	
	//{number[][]} for batch allocations
	let hackServers = calcResult.hackServerAlloc;
	const growServers = calcResult.growServerAlloc;
	const weaken1Servers = calcResult.weaken1ServerAlloc;
	const weaken2Servers = calcResult.weaken2ServerAlloc;

	let concurrency = calcResult.concurrency;
	let hackPerBatch = calcResult.hackPerBatch;
	const batchDuration = calcResult.secondPerBatch * 1000;
	const batchGap = calcResult.batchGap;
	
	const finishMarkMillis = startTime + calcResult.weaken1Time - stepTimeMillis;

	const serverOptimal = getServerOptimal(ns, target);

	//打印执行信息
	const hackStartTime = finishMarkMillis - calcResult.hackTime;
	const weaken1StartTime = finishMarkMillis + stepTimeMillis - calcResult.weaken1Time;
	const growStartTime = finishMarkMillis + 2 * stepTimeMillis - calcResult.growTime;
	const weaken2StartTime = finishMarkMillis + 3 * stepTimeMillis - calcResult.weaken2Time;
	log("weaken2: " + calcResult.weaken2Time);
	log("weaken1: " + calcResult.weaken1Time);
	log("grow: " + calcResult.growTime);
	log("hack: " + calcResult.hackTime);
	log("batchDuration: " + batchDuration);
	const inSecond = milli=>Math.floor(milli)/1000;
	log("batch0"
		+"\tw1:"+weaken1Servers[0].reduce((a,b)=>a+b)+"\tw1ST:"+inSecond(weaken1StartTime - startTime)+"\tw1EA:"+inSecond(finishMarkMillis - startTime + stepTimeMillis)
		+"\tw2:"+weaken2Servers[0].reduce((a,b)=>a+b)+"\tw2ST:"+inSecond(weaken2StartTime - startTime)+"\tw2EA:"+inSecond(finishMarkMillis - startTime + 3 * stepTimeMillis)
		+"\t g:"+growServers[0].reduce((a,b)=>a+b)+"\t gST:"+inSecond(growStartTime - startTime)+"\t gEA:"+inSecond(finishMarkMillis - startTime + 2 * stepTimeMillis)
		+"\t h:"+hackServers[0].reduce((a,b)=>a+b)+"\t hST:"+inSecond(hackStartTime - startTime)+"\t hEA:"+inSecond(finishMarkMillis - startTime)
	);

	/**
	 * @param {number[]} alloc
	 * @param {number} i
	 * @param {string} script
	 */
	function execute(alloc, batch, script, execTimeGetter) {
		const execTime = execTimeGetter();
		let logContent = script.substring(script.lastIndexOf("/")+1, script.lastIndexOf(".js"));
		logContent = logContent + "\tST: " + inSecond(Date.now()-startTime);
		alloc[batch].forEach((threads, serverIndex)=>{
			if (threads > 0) {
				const worker = availableServers[serverIndex];
				execMulti(ns, worker, threads, script, target, "$threads");
			}
		});
		logContent = logContent + "\tRF : " + inSecond(execTime);
		log(logContent);
	}

	const weaken1Func = i=>execute(weaken1Servers, i, weaken1Script, ()=>formu.getWeakenTime(ns, serverOptimal, ns.getPlayer()));
	const weaken2Func = i=>execute(weaken2Servers, i, weaken2Script, ()=>formu.getWeakenTime(ns, serverOptimal, ns.getPlayer()));
	const growFunc = i=>execute(growServers, i, growScript, ()=>formu.getGrowTime(ns, serverOptimal, ns.getPlayer()));
	const hackFunc = i=>execute(hackServers, i, hackScript, ()=>formu.getHackTime(ns, serverOptimal, ns.getPlayer()));

	//{ExecutionManager[]} same action of all batch 
	const weaken1Managers = [];
	const weaken2Managers = [];
	const growManagers = [];
	const hackManagers = [];

	for (let i=0; i<concurrency; ++i) {
		hackManagers.push(new ExecutionManager(
			finishMarkMillis + stepTimeMillis * 0 + batchGap * i, 
			batchDuration, 
			calcResult.hackTime, 
			()=>hackFunc(i)));

		weaken1Managers.push(new ExecutionManager(
			finishMarkMillis + stepTimeMillis * 1 + batchGap * i, 
			batchDuration, 
			calcResult.weaken1Time, 
			()=>weaken1Func(i)));

		growManagers.push(new ExecutionManager(
			finishMarkMillis + stepTimeMillis * 2 + batchGap * i, 
			batchDuration, 
			calcResult.growTime, 
			()=>growFunc(i)));

		weaken2Managers.push(new ExecutionManager(
			finishMarkMillis + stepTimeMillis * 3 + batchGap * i, 
			batchDuration, 
			calcResult.weaken2Time, 
			()=>weaken2Func(i)));
	}

	let lastHackLevel = ns.getHackingLevel();
	let lastLog="";
	let m=ns.getServerMoneyAvailable(target);
	let s=ns.getServerSecurityLevel(target);

	const correctExecTime = ()=>{
		if (ns.getHackingLevel() != lastHackLevel) {
			const newWeakenTime = formu.getWeakenTime(ns, serverOptimal, ns.getPlayer());
			const newGrowTime = formu.getGrowTime(ns, serverOptimal, ns.getPlayer());
			const newHackTime = formu.getHackTime(ns, serverOptimal, ns.getPlayer());

			log("level up happened, new time: ");
			log("weaken: " + newWeakenTime);
			log("grow: " + newGrowTime);
			log("hack: " + newHackTime);

			let oldConcurrency = concurrency;

			//If no enough hackTime, fire some managers
			while (Math.floor(newHackTime/batchGap + 1) < concurrency) {
				weaken1Managers[concurrency-1].fire();
				weaken2Managers[concurrency-1].fire();
				growManagers[concurrency-1].fire();
				hackManagers[concurrency-1].fire();
				concurrency--;
			}

			log("new concurrency: " + concurrency + " (old: "+oldConcurrency+" )");

			//If new growth cannot cover new hack money, decrease hack
			const newGrowPerBatchNeeded = hpb=>{
				const newDph = serverOptimal.moneyAvailable * formu.getHackPercent(ns, serverOptimal, ns.getPlayer());
				const serverBeforeGrow = getServerOptimal(ns, target);
				serverBeforeGrow.moneyAvailable = serverBeforeGrow.moneyMax - newDph * hpb;
				return Math.ceil(formu.getGrowThreads(ns, serverBeforeGrow, ns.getPlayer(), hpb));
			};
			let newHpb = hackPerBatch;
			while(newGrowPerBatchNeeded(newHpb) > calcResult.growPerBatch) {
				newHpb--;
			}
			const oldHpb = hackPerBatch;
			if (newHpb !== hackPerBatch) {
				hackServers = hackServers.map(allocMap=>{
					return allocMap.map(serverAlloc=>{
						if (serverAlloc === 0) {
							return 0;
						} else {
							return newHpb;
						}
					});
				});
				hackPerBatch = newHpb;
			}

			log("new hackPerBatch: " + hackPerBatch + " (old: "+oldHpb+" )");

			//Tell the rest managers the new execute plan
			for (let i=0; i<concurrency; ++i) {
				weaken1Managers[i].changeExecuteTime(newWeakenTime);
				weaken2Managers[i].changeExecuteTime(newWeakenTime);
				growManagers[i].changeExecuteTime(newGrowTime);
				hackManagers[i].changeExecuteTime(newHackTime);
			}
			lastHackLevel = ns.getHackingLevel();
		}
	};

	return ()=>{
		//print stats changes
		m=ns.getServerMoneyAvailable(target);
		s=ns.getServerSecurityLevel(target);
		let curLog = "m: "+Math.floor(m) + " s: "+s.toFixed(4);
		if (curLog !== lastLog) {
		  let delT=Math.floor(Date.now()-startTime)/1000;
			log(delT+"\t"+curLog);
			lastLog = curLog;
		}

		//managers react 
		for (let i=0; i<concurrency; ++i) {
			weaken1Managers[i].react();
			correctExecTime();
			weaken2Managers[i].react();
			correctExecTime();
			growManagers[i].react();
			correctExecTime();
			hackManagers[i].react();
			correctExecTime();
		}
	}
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

class ExecutionManager {
	/**
	 * @param {number} targetTimeFirst Timestamp where first execution finish. In millis.
	 * @param {number} targetTimeEvery Time between every execution finish. In millis.
	 * @param {number} executeTime Time of every execution needed. In millis.
	 * @param {function} doExecute Execution function.
	 */
	constructor(targetTimeFirst, targetTimeEvery, executeTime, doExecute) {
		this.targetTimeFirst = targetTimeFirst;
		this.targetTimeEvery = targetTimeEvery;
		this.executeTime = executeTime;
		this.doExecute = doExecute;
		this.employed = true;

		this.executed = 0;
	}

	react() {
		if (!this.employed) {
			return;
		}

		const now = Date.now();
		const nextExecute = this.targetTimeFirst + this.targetTimeEvery * this.executed - this.executeTime;
		if (now >= nextExecute) {
			this.doExecute();
			this.executed++;
		}
	}

	/** 
	 * @param {number} executeTime Time of every execution needed. In millis.
	 */
	changeExecuteTime(executeTime) {
		this.executeTime = executeTime;
	}

	fire() {
		this.employed = false;
	}
}