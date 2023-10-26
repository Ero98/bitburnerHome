/** @param {NS} ns */
export async function main(ns) {
	// let target = ns.args[0];
	const local = "home"
	const stepTimeMillis = 150;
	const twoWeakenOpts = false;
	const fileHost = "h1";
	const maxRamRatio = 1;

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
					ns.print("[ debug ] tg:"+dest+"\tmaxMoney:"+ns.getServerMaxMoney(dest)+"\tdph:"+dph+"\thpb:"+curHpb);
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
			ns.print("tg:"+dest+"\thackPerBatch:"+hpb+"\tdpsPerBatch:"+dpspb+"\t$/s:"+dps);
		}

		targetCandidatesDps.push(dps);
		targetCandidatesHpb.push(hpb);
	}
}