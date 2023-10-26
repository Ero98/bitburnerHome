/** @param {NS} ns */
export async function main(ns) {
	// let target = ns.args[0];
	const hackScript = "do-hack.js";
	const growScript = "do-grow.js";
	const weakenScript = "do-weaken.js";
	const stepTimeMillis = 200;
	const twoWeakenOpts = false;

	ns.disableLog("disableLog");
	ns.disableLog("scp");
	ns.disableLog("getHackTime");
	ns.disableLog("hackAnalyze");
	ns.disableLog("hackAnalyzeChance");
	ns.disableLog("hasRootAccess");
	ns.disableLog("getServerMaxRam");
	ns.disableLog("sleep");
	ns.disableLog("getServerMoneyAvailable");
	ns.disableLog("scan");
	ns.disableLog("getPurchasedServers");
	ns.disableLog("getServerMaxMoney");
	// ns.disableLog("exec");

	const scripts = [hackScript, growScript, weakenScript];
	const servers = [];
	const scanQueue = ["home"];
	while(scanQueue.length > 0) {
		let host = scanQueue.pop();
		if(servers.indexOf(host) === -1) {
			servers.push(host);
			scanQueue.push(...ns.scan(host));
		}
	}
	// ns.print(servers);

	const availableServers = servers.filter((dest)=>{
		let notHome = dest !== "home";
		let rooted = ns.hasRootAccess(dest);
		let enoughRam = ns.getServerMaxRam(dest) >= 2;
		return rooted && enoughRam && notHome;
	});
	const availableRams = availableServers.map((server)=>ns.getServerMaxRam(server));

	//复制脚本到所有服务器（更新脚本）
	availableServers.forEach((dest)=>{
		scripts.forEach(s=>ns.rm(s, dest));
		ns.scp(scripts, dest);
	});

	//决定要攻击的服务器
	const targetCandidates = availableServers.filter((dest)=>{
		let isPurchasedServer = ns.getPurchasedServers().indexOf(dest) !== -1;
		let isHomeServer = dest==="home";
		return ! isPurchasedServer && ! isHomeServer;
	});

	//评价候选服务器
	const targetCandidatesHackThreads = [];
	const targetCandidatesDps = [];
	for(let i=0; i<targetCandidates.length; ++i) {
		const dest = targetCandidates[i];
		let finalHackThreads = 0;
		let tryHackThreads = 0;
		let amount = -1;
		let batchRunTime = -1;
		let batchThreads = 0;
		let dps = 0;
		while(true) {
			++tryHackThreads;
			
			let manageMoneyAmount = ns.hackAnalyze(dest) * ns.getServerMaxMoney(dest) * tryHackThreads;
			if (manageMoneyAmount <= 0) {
				break;
			}
			
			let hackThreadsRaw = tryHackThreads;
			let growThreadsRaw = ns.growthAnalyze(dest, 1 + manageMoneyAmount / (ns.getServerMaxMoney(dest) - manageMoneyAmount));
			let weaken1ThreadsRaw = twoWeakenOpts? hackThreadsRaw * 0.002 / 0.05 : hackThreadsRaw * 0.002 / 0.05 + growThreadsRaw * 0.004 / 0.05;
			let weaken2ThreadsRaw = twoWeakenOpts? growThreadsRaw * 0.004 / 0.05 : 0;

			let hackThreads = Math.ceil(hackThreadsRaw);
			let weaken1Threads = Math.ceil(weaken1ThreadsRaw);
			let growThreads = Math.ceil(growThreadsRaw);
			let weaken2Threads = Math.ceil(weaken2ThreadsRaw);

			if (hackThreads + weaken1Threads + growThreads + weaken2Threads > availableServers.length) {
				break;
			}


			let concurrentBatches = Math.floor(availableServers.length / ( hackThreads + weaken1Threads + growThreads + weaken2Threads));
			if (concurrentBatches < 1) {
				break;
			}			
			
			let _batchThreads = hackThreads + weaken1Threads + growThreads + weaken2Threads;
			let _finalHackThreads = hackThreads;
			let _amount = concurrentBatches * manageMoneyAmount;
			let _batchRunTime = ns.getWeakenTime(dest) + stepTimeMillis * (twoWeakenOpts?2:1);
			//dollar每秒 = 并发批数 * 单批收入 / 批次运行时间（秒）
			let _dps = amount / batchRunTime * 1000;

			if (_dps > dps) {
				batchThreads = _batchThreads;
				finalHackThreads = _finalHackThreads;
				amount = _amount;
				batchRunTime = _batchRunTime;
				dps = _dps;
			}
		}

		ns.print("tg:"+dest+" hackThreads:"+finalHackThreads+" batchThreads"+batchThreads+" batchRunTime:"+batchRunTime+" batchHackAmount:"+amount+" $/s:"+dps);
		targetCandidatesHackThreads.push(finalHackThreads);
		targetCandidatesDps.push(dps);
	}

	//决定目标服务器
	const targetIndex = targetCandidatesDps.reduce((iMax, x, i, arr) => x > arr[iMax] ? i : iMax, 0);
	const target = targetCandidates[targetIndex];

	ns.print("finalTarget:"+target+" $/s:"+targetCandidatesDps[targetIndex]);

	ns.print("preparing target, weaken and grow...");
	ns.run("/prepare/copy-run.js", undefined, "/prepare/grow.js", target);
	ns.run("/prepare/grow.js", undefined, target);
	
	//分析批次所需线程总数，如果采用HWGW方式，weaken由两个阶段分担，如果采用HWG方式，weaken由阶段1承担
	const manageMoneyAmount = ns.hackAnalyze(target) * ns.getServerMaxMoney(target) * targetCandidatesHackThreads[targetIndex];
	const hackThreadsRaw = targetCandidatesHackThreads[targetIndex];
	const growThreadsRaw = ns.growthAnalyze(target, 1 + manageMoneyAmount / (ns.getServerMaxMoney(target) - manageMoneyAmount));
	const weaken1ThreadsRaw = twoWeakenOpts? hackThreadsRaw * 0.002 / 0.05 : hackThreadsRaw * 0.002 / 0.05 + growThreadsRaw * 0.004 / 0.05;
	const weaken2ThreadsRaw = twoWeakenOpts? growThreadsRaw * 0.004 / 0.05 : 0;

	const hackThreads = Math.ceil(hackThreadsRaw);
	const weaken1Threads = Math.ceil(weaken1ThreadsRaw);
	const growThreads = Math.ceil(growThreadsRaw);
	const weaken2Threads = Math.ceil(weaken2ThreadsRaw);
	const batchThreads = hackThreads + weaken1Threads + growThreads + weaken2Threads;

	if(availableServers.length < batchThreads) {
		ns.print("可用线程数量不够。需要线程数：hack:"+hackThreads+",weaken1:"+weaken1Threads+",grow:"+growThreads+",weaken2:"+weaken2Threads+"。可用线程数："+availableServers.length+"");
		return;
	}
	ns.print("需求线程数：hack:"+hackThreadsRaw+",weaken1:"+weaken1ThreadsRaw+",grow:"+growThreadsRaw+",weaken2:"+weaken2ThreadsRaw);
	ns.print("分配线程数：hack:"+hackThreads+",weaken1:"+weaken1Threads+",grow:"+growThreads+",weaken2:"+weaken2Threads+"。可用线程数："+availableServers.length+"");

	let finishMarkMillis = 0;
	let batchNum = 0;
	while(true) {
		const batchServers = availableServers.splice(0, batchThreads);
		if (batchThreads > batchServers.length) {
			// ns.print("可用线程数量不够。需要线程数：hack:"+hackThreads+",weaken1:"+weaken1Threads+",grow:"+growThreads+",weaken2:"+weaken2Threads+"。可用线程数："+batchServers.length+"");
			//返还分配到的资源
			availableServers.push(...batchServers);
			await new Promise(r => setTimeout(r, stepTimeMillis));
			continue;
		}
		
		const curBatch = ++batchNum;

		const weaken1Servers = batchServers.splice(0, weaken1Threads);
		const weaken2Servers = batchServers.splice(0, weaken2Threads);
		const growServers = batchServers.splice(0, growThreads);
		const hackServers = batchServers.splice(0, hackThreads);

		//重置结束刻度
		const weaken1RunTime = ns.getWeakenTime(target);
		if (Date.now() + weaken1RunTime >= finishMarkMillis + stepTimeMillis) {
			finishMarkMillis = Date.now() + weaken1RunTime - 2 * stepTimeMillis;
			ns.print("重置刻度为"+new Date(finishMarkMillis).toISOString());
		}

		const weaken1StartTime = finishMarkMillis + 2 * stepTimeMillis - ns.getWeakenTime(target);
		const weaken2StartTime = finishMarkMillis + 4 * stepTimeMillis - ns.getWeakenTime(target);
		const growStartTime = finishMarkMillis + 3 * stepTimeMillis - ns.getGrowTime(target);
		const hackStartTime = finishMarkMillis + stepTimeMillis - ns.getHackTime(target);

		finishMarkMillis += twoWeakenOpts? 4 * stepTimeMillis: 3 * stepTimeMillis;
		ns.print(getLogPrefix(curBatch)+"分配到资源，预计结束时间"+ new Date(finishMarkMillis).toISOString() +"剩余线程数："+availableServers.length+"");

		// ns.print("设置weaken1定时器");
		setTimeout(()=>{
			// ns.print(getLogPrefix(curBatch)+"执行weaken1")
			const executeTime = ns.getWeakenTime(target);

			//执行weaken1
			weaken1Servers.forEach((host)=>{
				ns.exec(weakenScript, host, undefined, target);
			});

			setTimeout(()=>{
				//返还分配到的资源
				availableServers.push(...weaken1Servers);
				// ns.print(getLogPrefix(curBatch)+"weaken1结束")
			}, executeTime);
		}, weaken1StartTime - Date.now());
		
		// ns.print("设置weaken2定时器");
		setTimeout(()=>{
			// ns.print(getLogPrefix(curBatch)+"执行weaken2")
			const executeTime = ns.getWeakenTime(target);

			//执行weaken2
			weaken2Servers.forEach((host)=>{
				ns.exec(weakenScript, host, undefined, target);
			});

			setTimeout(()=>{
				//返还分配到的资源
				availableServers.push(...weaken2Servers);
				// ns.print(getLogPrefix(curBatch)+"weaken2结束")
			}, executeTime);
		}, weaken2StartTime - Date.now());
		
		// ns.print("设置grow定时器");
		setTimeout(()=>{
			// ns.print(getLogPrefix(curBatch)+"执行grow")
			const executeTime = ns.getGrowTime(target);
			
			//执行grow
			growServers.forEach((host)=>{
				ns.exec(growScript, host, undefined, target);
			});

			setTimeout(()=>{
				//返还分配到的资源
				availableServers.push(...growServers);
				// ns.print(getLogPrefix(curBatch)+"grow结束")
			}, executeTime);
		}, growStartTime - Date.now());
		
		// ns.print("设置hack定时器");
		setTimeout(()=>{
			// ns.print(getLogPrefix(curBatch)+"执行hack")
			const executeTime = ns.getHackTime(target);
			
			//执行hack
			hackServers.forEach((host)=>{
				ns.exec(hackScript, host, undefined, target);
			});

			setTimeout(()=>{
				//返还分配到的资源
				availableServers.push(...hackServers);
				// ns.print(getLogPrefix(curBatch)+"hack结束")
			}, executeTime);
		}, hackStartTime - Date.now());
	}
}

function getLogPrefix(identifier) {
	return "["+ new Date().toISOString() +" 批次"+ identifier +"] ";
}