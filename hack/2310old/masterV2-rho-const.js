/** @param {NS} ns */
export async function main(ns) {
	// let target = ns.args[0];
	const local = "home"
	// const hackScripts = ["/tmp/do-hack-1.js", "/tmp/do-hack-2.js", "/tmp/do-hack-3.js", "/tmp/do-hack-4.js", "/tmp/do-hack-5.js", "/tmp/do-hack-6.js"];
	// const growScripts = ["/tmp/do-grow-1.js", "/tmp/do-grow-2.js", "/tmp/do-grow-3.js", "/tmp/do-grow-4.js", "/tmp/do-grow-5.js", "/tmp/do-grow-6.js"];
	// const weakenScripts = ["/tmp/do-weaken-1.js", "/tmp/do-weaken-2.js", "/tmp/do-weaken-3.js", "/tmp/do-weaken-4.js", "/tmp/do-weaken-5.js", "/tmp/do-weaken-6.js", "/tmp/do-weaken-7.js", "/tmp/do-weaken-8.js", "/tmp/do-weaken-9.js"];
	const hackScript = "do-hack.js";
	const growScript = "do-grow.js";
	const weakenScript = "do-weaken.js";
	const stepTimeMillis = 150;
	const heatUpBatches = 50;
	const twoWeakenOpts = false;
	const fileHost = "h1";
	const preparationsLogFile = "masterV2RunInfo.txt";
	const fixedTarget = ns.args[0];
	const maxRamRatio = 0.2;

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
	ns.disableLog("exec");
	ns.disableLog("rm");
	ns.disableLog("getServerUsedRam");
	

	const scriptBaseCost = 1.75;
	// const scripts = [].concat(hackScripts).concat(growScripts).concat(weakenScripts);
	const scripts = [hackScript, growScript, weakenScript];
	const servers = [];
	const scanQueue = [local];
	while(scanQueue.length > 0) {
		let host = scanQueue.pop();
		if(servers.indexOf(host) === -1) {
			servers.push(host);
			scanQueue.push(...ns.scan(host));
		}
	}
	// ns.print(servers);

	const availableServers = servers.filter((dest)=>{
		let notFileHost = fileHost !== dest;
		let rooted = ns.hasRootAccess(dest);
		let enoughRam = ns.getServerMaxRam(dest) >= scriptBaseCost;
		return rooted && enoughRam && notFileHost;
	});
	const availableRams = availableServers.map((server)=>(ns.getServerMaxRam(server) - ns.getServerUsedRam(server))*maxRamRatio);
	const availableTotalThreads = availableRams.map((ram)=>Math.floor(ram/scriptBaseCost)).reduce((prev, cur)=>prev+cur);

	ns.write(preparationsLogFile, "\n["+ new Date().toISOString() +"] 运行开始","w");
	ns.print("\n["+ new Date().toISOString() +"] 运行开始","w");

	scripts.forEach(s=>{
		if(ns.fileExists(s, local)){
			ns.rm(s, fileHost)
		}
	});
	ns.scp(scripts, fileHost, local);

	//复制脚本到所有服务器（更新脚本）
	availableServers.forEach((dest)=>{
		if (dest !== local) {
			scripts.forEach(s=>ns.rm(s, dest));
			ns.scp(scripts, dest, fileHost);
		}
	});

	//决定要攻击的服务器
	const targetCandidates = availableServers.filter((dest)=>{
		let isPurchasedServer = ns.getPurchasedServers().indexOf(dest) !== -1;
		let isHomeServer = dest===local;
		return ! isPurchasedServer && ! isHomeServer;
	});

	//评价候选服务器
	const targetCandidatesDps = [];
	const targetCandidatesHpb = [];
	for(let i=0; i<targetCandidates.length; ++i) {
		const dest = targetCandidates[i];
		let dph = ns.getServerMaxMoney(dest) * ns.hackAnalyze(dest) * ns.hackAnalyzeChance(dest);
		let hpb = 0;
		let tpb = 0;
		let dpspb = 0;
		let dps = 0;
		let bps = 0;
		let curHpb = 1;
		
		if (dph > 0 && ns.getServerMaxMoney(dest) > dph) {
			while (ns.getServerMaxMoney(dest) > dph * curHpb) {
				let requiredGrowRate = 1 + dph * curHpb / (ns.getServerMaxMoney(dest) - dph * curHpb);

				if (requiredGrowRate <= 1) {
					ns.write(preparationsLogFile, "\n[ debug ] tg:"+dest+"\tmaxMoney:"+ns.getServerMaxMoney(dest)+"\tdph:"+dph+"\thpb:"+curHpb);
				}

				const hackThreadsRaw = curHpb;
				const growThreadsRaw = ns.growthAnalyze(dest, requiredGrowRate);
				const weaken1ThreadsRaw = twoWeakenOpts? hackThreadsRaw * 0.002 / 0.05 : hackThreadsRaw * 0.002 / 0.05 + growThreadsRaw * 0.004 / 0.05;
				const weaken2ThreadsRaw = twoWeakenOpts? growThreadsRaw * 0.004 / 0.05 : 0;

				let internalTpb = [hackThreadsRaw, growThreadsRaw, weaken1ThreadsRaw, weaken2ThreadsRaw]
					.map(Math.ceil).reduce((prev, cur)=>prev+cur);

				if (availableTotalThreads < internalTpb) {
					break;
				}
				
				let internalBps = 1 / ( ns.getWeakenTime(dest) + stepTimeMillis * (twoWeakenOpts? 2:1) );
				let internalDpspb = dph * curHpb * internalBps;
				let internalDps = Math.floor(availableTotalThreads / internalTpb) * internalDpspb;

				hpb = dps < internalDps? curHpb : hpb;
				tpb = dps < internalDps? internalTpb : tpb;
				bps = dps < internalDps? internalBps : bps;
				dpspb = dps < internalDps? internalDpspb : dpspb;
				dps = dps < internalDps? internalDps : dps;

				curHpb += 1;
			}
		}

		if (dps > 0) {
			ns.write(preparationsLogFile, "\ntg:"+dest+"\thackPerBatch:"+hpb+"\tdpsPerBatch:"+dpspb+"\t$/s:"+dps);
			ns.print("\ntg:"+dest+"\thackPerBatch:"+hpb+"\tdpsPerBatch:"+dpspb+"\t$/s:"+dps);
		}

		targetCandidatesDps.push(dps);
		targetCandidatesHpb.push(hpb);
	}

	
	//决定目标服务器
	const targetIndex = targetCandidates.indexOf(fixedTarget) || targetCandidatesDps.reduce((iMax, x, i, arr) => x > arr[iMax] ? i : iMax, 0);
	const target = targetCandidates[targetIndex];
	const hackPerBatch = targetCandidatesHpb[targetIndex];

	ns.write(preparationsLogFile, "\nfinalTarget:"+target+" $/s:"+targetCandidatesDps[targetIndex]);
	ns.print("\nfinalTarget:"+target+" $/s:"+targetCandidatesDps[targetIndex]);
	
	//auto-grow
	const autoGrowScript = "/prepare/grow.js";
	const autoGrowThreads = Math.floor((ns.getServerMaxRam(local)-ns.getServerUsedRam(local))/ns.getScriptRam(autoGrowScript));
	// ns.print(ns.getServerMaxRam(local), " ", ns.getServerUsedRam(local), " ", ns.getScriptRam(autoGrowScript));
	ns.run(autoGrowScript, autoGrowThreads, target, autoGrowThreads);
	while(ns.scriptRunning(autoGrowScript, local)) {
		await ns.sleep(stepTimeMillis);
	}

	//分析批次所需线程总数，如果采用HWGW方式，weaken由两个阶段分担，如果采用HWG方式，weaken由阶段1承担
	const hackThreadsRaw = hackPerBatch;
	const manageMoneyAmount = hackThreadsRaw * ns.getServerMaxMoney(target) * ns.hackAnalyze(target) * ns.hackAnalyzeChance(target);
	const growThreadsRaw = ns.growthAnalyze(target, 1 + manageMoneyAmount / (ns.getServerMaxMoney(target) - manageMoneyAmount));
	const weaken1ThreadsRaw = twoWeakenOpts? hackThreadsRaw * 0.002 / 0.05 : hackThreadsRaw * 0.002 / 0.05 + growThreadsRaw * 0.004 / 0.05;
	const weaken2ThreadsRaw = twoWeakenOpts? growThreadsRaw * 0.004 / 0.05 : 0;

	ns.write(preparationsLogFile, "\n需求线程基准(hack为1)：hack:"+hackThreadsRaw+",weaken1:"+weaken1ThreadsRaw+",grow:"+growThreadsRaw+",weaken2:"+weaken2ThreadsRaw);
	ns.print("\n需求线程基准(hack为1)：hack:"+hackThreadsRaw+",weaken1:"+weaken1ThreadsRaw+",grow:"+growThreadsRaw+",weaken2:"+weaken2ThreadsRaw);

	ns.write(preparationsLogFile, "\n可用资源："+availableRams);
	ns.print(preparationsLogFile, "\n可用资源："+availableRams);

	let finishMarkMillis = 0;
	let batchNum = 0;
	let finishedOptIndex = batchNum * twoWeakenOpts?4:3;
	while(true) {
		//计算所需线程
		const hackThreadsNeed = Math.ceil(hackThreadsRaw);
		const growThreadsNeed = Math.ceil(growThreadsRaw);
		const weaken1ThreadsNeed = Math.ceil(weaken1ThreadsRaw);
		const weaken2ThreadsNeed = Math.ceil(weaken2ThreadsRaw);
		const totalThreadsNeed = hackThreadsNeed + growThreadsNeed + weaken1ThreadsNeed + weaken2ThreadsNeed;

		//为所需线程分配RAM
		const allocatedRams = availableRams.map(()=>0);
		let allocationSuccess = true;
		for (let i=0; i<totalThreadsNeed; ++i) {
			let allocated = false;
			for(let j=0; j<availableRams.length; ++j) {
				if(availableRams[j] >= scriptBaseCost) {
					availableRams[j] = availableRams[j] - scriptBaseCost;
					allocatedRams[j] += scriptBaseCost;
					allocated = true;
					break;
				}
			}

			if(!allocated) {
				allocationSuccess = false;
				break;
			}
		}

		if (!allocationSuccess) {
			//如果分配失败，返还分配到的资源
			for (let i=0; i<allocatedRams.length; ++i) {
				availableRams[i] += allocatedRams[i];
			}
			await new Promise(r => setTimeout(r, stepTimeMillis));
			continue;
		}
		
		const curBatch = ++batchNum;

		function allocateThreads(rams, threads, threadBaseCost) {
			const allocatedThreads = rams.map(()=>0);
			for(let i=0; i<threads; ++i) {
				for(let j=0; j<rams.length; ++j) {
					if(rams[j]>=threadBaseCost) {
						rams[j] -= threadBaseCost;
						allocatedThreads[j] += 1;
						break;
					}
				}
			}
			return allocatedThreads;
		}

		let allocatedRamsCopy = allocatedRams.slice();

		const weaken1Servers = allocateThreads(allocatedRamsCopy, weaken1ThreadsNeed, scriptBaseCost);
		const weaken2Servers = allocateThreads(allocatedRamsCopy, weaken2ThreadsNeed, scriptBaseCost);
		const growServers = allocateThreads(allocatedRamsCopy, growThreadsNeed, scriptBaseCost);
		const hackServers = allocateThreads(allocatedRamsCopy, hackThreadsNeed, scriptBaseCost);

		//重置结束刻度
		const weaken1RunTime = ns.getWeakenTime(target);
		if (Date.now() + weaken1RunTime >= finishMarkMillis + stepTimeMillis) {
			finishMarkMillis = Date.now() + weaken1RunTime - 2 * stepTimeMillis;
			// ns.print("重置刻度为"+new Date(finishMarkMillis).toISOString());
		}

		const weaken1StartTime = finishMarkMillis + 2 * stepTimeMillis - ns.getWeakenTime(target);
		const weaken2StartTime = finishMarkMillis + 4 * stepTimeMillis - ns.getWeakenTime(target);
		const growStartTime = finishMarkMillis + 3 * stepTimeMillis - ns.getGrowTime(target);
		const hackStartTime = finishMarkMillis + stepTimeMillis - ns.getHackTime(target);

		finishMarkMillis += twoWeakenOpts? 4 * stepTimeMillis: 3 * stepTimeMillis;
		if(curBatch % 100 === 1) {
			ns.print(getLogPrefix(curBatch)+"预计结束时间"+new Date(finishMarkMillis).toISOString()+"，需求线程"+totalThreadsNeed+"，剩余线程"+availableRams.map(ram=>Math.floor(ram/2)).reduce((a,b)=>a+b)+"分配RAM"+allocatedRams.reduce((a,b)=>a+b)+" ，剩余RAM"+availableRams.reduce((a,b)=>a+b)+"");
		}

		// ns.print("设置weaken1定时器");
		(function arrangeWeaken1() {
			const executeTime = ns.getWeakenTime(target);
			const renamedScript = "/tmp/" + curBatch + "-1-" + weakenScript;

			weaken1Servers.forEach((threads, serverIndex)=>{
				if (threads > 0) {
					// ns.print("在"+availableServers[serverIndex]+"上执行"+weakenScript+"，线程数："+threads+"，目标最大RAM："+ns.getServerMaxRam(availableServers[serverIndex])+"，目标已用RAM："+ns.getServerUsedRam(availableServers[serverIndex]));
					let host = availableServers[serverIndex];

					ns.rm(renamedScript, host);
					ns.mv(host, weakenScript, renamedScript);
					ns.scp(weakenScript, host, fileHost);
				}
			});

			setTimeout(function weaken1Func() {
				const actualStartTime = Date.now();
				if(curBatch % 100 === 1) {
					ns.print(getLogPrefix(curBatch)+"weak1开始执行，与预计相差 "+(actualStartTime-weaken1StartTime)+" Millis");
				}
				
				weaken1Servers.forEach((threads, serverIndex)=>{
					if (threads > 0) {
						ns.exec(renamedScript, availableServers[serverIndex], threads, target, curBatch <= heatUpBatches);
					}
				});

				if(curBatch % 100 === 1) {
					ns.print(getLogPrefix(curBatch)+"weak1已执行，执行耗费 "+(Date.now()-actualStartTime)+" Millis");
				}

				setTimeout(()=>{
					for (let i=0; i<availableRams.length; ++i) {
						availableRams[i] += weaken1Servers[i] * scriptBaseCost;
					}
					setTimeout(()=>weaken1Servers.forEach((threads, serverIndex)=>{
						if (threads > 0) {
							ns.rm(renamedScript, availableServers[serverIndex]);
						}
					}), stepTimeMillis);
				}, executeTime);

				return weaken1Func;
			}, weaken1StartTime - Date.now());
		})();
		
		(function arrangeWeaken2() {
			// ns.print(getLogPrefix(curBatch)+"执行weaken2")
			const executeTime = ns.getWeakenTime(target);
			const renamedScript = "/tmp/" + curBatch + "-2-" + weakenScript;

			weaken2Servers.forEach((threads, serverIndex)=>{
				if (threads > 0) {
					// ns.print("在"+availableServers[serverIndex]+"上执行"+weakenScript+"，线程数："+threads+"，目标最大RAM："+ns.getServerMaxRam(availableServers[serverIndex])+"，目标已用RAM："+ns.getServerUsedRam(availableServers[serverIndex]));
					let host = availableServers[serverIndex];

					ns.rm(renamedScript, host);
					ns.mv(host, weakenScript, renamedScript);
					ns.scp(weakenScript, host, fileHost);
				}
			});

			setTimeout(function weaken2Func() {
				const actualStartTime = Date.now();
				if(curBatch % 100 === 1) {
					ns.print(getLogPrefix(curBatch)+"weak2开始，与预计相差 "+(actualStartTime-weaken2StartTime)+" Millis");
				}
				//执行weaken2
				weaken2Servers.forEach((threads, serverIndex)=>{
					if (threads > 0) {
						ns.exec(renamedScript, availableServers[serverIndex], threads, target, curBatch <= heatUpBatches);
					}
				});
				if(curBatch % 100 === 1) {
					ns.print(getLogPrefix(curBatch)+"weak2已执行，执行耗费 "+(Date.now()-actualStartTime)+" Millis");
				}

				setTimeout(()=>{
					for (let i=0; i<availableRams.length; ++i) {
						availableRams[i] += weaken2Servers[i] * scriptBaseCost;
					}
					setTimeout(()=>weaken2Servers.forEach((threads, serverIndex)=>{
						if (threads > 0) {
							ns.rm(renamedScript, availableServers[serverIndex]);
						}
					}), stepTimeMillis);
				}, executeTime);

				return weaken2Func;
			}, weaken2StartTime - Date.now());
		})();
		
		(function arrangeGrow() {
			// ns.print(getLogPrefix(curBatch)+"执行grow")
			const executeTime = ns.getGrowTime(target);
			const renamedScript = "/tmp/" + curBatch + "-" + growScript;

			//执行grow
			growServers.forEach((threads, serverIndex)=>{
				if (threads > 0) {
					// ns.print("在"+availableServers[serverIndex]+"上执行"+growScript+"，线程数："+threads+"，目标最大RAM："+ns.getServerMaxRam(availableServers[serverIndex])+"，目标已用RAM："+ns.getServerUsedRam(availableServers[serverIndex]));
					let host = availableServers[serverIndex];

					ns.rm(renamedScript, host);
					ns.mv(host, growScript, renamedScript);
					ns.scp(growScript, host, fileHost);
				}
			});		

			// ns.print("设置grow定时器");
			setTimeout(function growFunc() {
				const actualStartTime = Date.now();
				if(curBatch % 100 === 1) {
					ns.print(getLogPrefix(curBatch)+"grow开始，与预计相差 "+(actualStartTime-growStartTime)+" Millis")
				}
				//执行grow
				growServers.forEach((threads, serverIndex)=>{
					if (threads > 0) {
						ns.exec(renamedScript, availableServers[serverIndex], threads, target, curBatch <= heatUpBatches);
					}
				});			
				
				if(curBatch % 100 === 1) {
					ns.print(getLogPrefix(curBatch)+"grow已执行，执行耗费 "+(Date.now()-actualStartTime)+" Millis");
				}

				setTimeout(()=>{
					for (let i=0; i<availableRams.length; ++i) {
						availableRams[i] += growServers[i] * scriptBaseCost;
					}
					
					if(curBatch % 100 === 1) {	
						setTimeout(()=>
							ns.print(getLogPrefix(curBatch)+"grow完成，当前money:"+ns.getServerMoneyAvailable(target))
						, stepTimeMillis);
					}

					setTimeout(()=>growServers.forEach((threads, serverIndex)=>{
						if (threads > 0) {
							ns.rm(renamedScript, availableServers[serverIndex]);
						}
					}), stepTimeMillis);
				}, executeTime);

				return growFunc;
			}, growStartTime - Date.now());
		})();
		

		(function arrangeHack() {
			// ns.print(getLogPrefix(curBatch)+"执行hack")
			const executeTime = ns.getHackTime(target);
			const renamedScript = "/tmp/" + curBatch + "-" + hackScript;

			//执行hack
			hackServers.forEach((threads, serverIndex)=>{
				if (threads > 0) {
					// ns.print("在"+availableServers[serverIndex]+"上执行"+hackScript+"，线程数："+threads+"，目标最大RAM："+ns.getServerMaxRam(availableServers[serverIndex])+"，目标已用RAM："+ns.getServerUsedRam(availableServers[serverIndex]));
					let host = availableServers[serverIndex];
					
					ns.rm(renamedScript, host);
					ns.mv(host, hackScript, renamedScript);
					ns.scp(hackScript, host, fileHost);
				}
			});

			// ns.print("设置hack定时器");
			setTimeout(function hackFunc() {
				const actualStartTime = Date.now();
				//执行hack
				if(curBatch % 100 === 1) {
					ns.print(getLogPrefix(curBatch)+"hack开始，与预计相差 "+(actualStartTime-hackStartTime)+" Millis");
				}

				hackServers.forEach((threads, serverIndex)=>{
					if (threads > 0) {
						// ns.print("在"+availableServers[serverIndex]+"上执行"+hackScript+"，线程数："+threads+"，目标最大RAM："+ns.getServerMaxRam(availableServers[serverIndex])+"，目标已用RAM："+ns.getServerUsedRam(availableServers[serverIndex]));
						ns.exec(renamedScript, availableServers[serverIndex], threads, target, curBatch <= heatUpBatches);
					}
				});

				if(curBatch % 100 === 1) {
					ns.print(getLogPrefix(curBatch)+"hack已执行，执行耗费 "+(Date.now()-actualStartTime)+" Millis");
				}

				setTimeout(()=>{
					for (let i=0; i<availableRams.length; ++i) {
						availableRams[i] += hackServers[i] * scriptBaseCost;
					}
					
					if(curBatch % 100 === 1) {	
						setTimeout(()=>
							ns.print(getLogPrefix(curBatch)+"hack完成，当前money:"+ns.getServerMoneyAvailable(target))
						, stepTimeMillis);
					}

					setTimeout(()=>hackServers.forEach((threads, serverIndex)=>{
						if (threads > 0) {
							ns.rm(renamedScript, availableServers[serverIndex]);
						}
					}), stepTimeMillis);
				}, executeTime);

				return growFunc;
			}, hackStartTime - Date.now());
		})();
	}
}

function getLogPrefix(identifier) {
	return "["+ new Date().toISOString() +" 批次"+ identifier +"] ";
}