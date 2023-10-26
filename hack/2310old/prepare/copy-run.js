/** @param {NS} ns */
export async function main(ns) {
	const carryScript = ns.args[0];
	const carryArgs = ns.args.slice(1);
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
	ns.print("可用线程:" + availableServers.length);

	//复制脚本到所有服务器（更新脚本）
	availableServers.forEach((dest)=>{
		let destRam = ns.getServerMaxRam(dest);
		let threads = destRam / ns.getScriptRam(carryScript); 
		
		ns.rm(carryScript, dest);
		ns.scp(carryScript, dest);
		ns.exec(carryScript, dest, threads, ...carryArgs, threads);
	});
}