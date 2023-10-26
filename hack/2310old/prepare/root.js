/** @param {NS} ns */
export async function main(ns) {
	ns.disableLog("scan")
	ns.disableLog("hasRootAccess")
	ns.disableLog("nuke")

	const servers = [];
	const scanQueue = ["home"];
	while(scanQueue.length > 0) {
		let host = scanQueue.pop();
		if(servers.indexOf(host) === -1) {
			servers.push(host);
			scanQueue.push(...ns.scan(host));
		}
	}

	ns.print(servers);

	servers.forEach((host)=>{
		if(!ns.hasRootAccess(host)) {
			try {
				if(ns.fileExists("BruteSSH.exe")){
					ns.brutessh(host);
				}
				if(ns.fileExists("FTPCrack.exe")){
					ns.ftpcrack(host);
				}
				if(ns.fileExists("relaySMTP.exe")){
					ns.relaysmtp(host);
				}
				if(ns.fileExists("HTTPWorm.exe")){
					ns.httpworm(host);
				}
				if(ns.fileExists("SQLInject.exe")){
					ns.sqlinject(host);
				}

				ns.nuke(host);
			} catch (e) {
				ns.print("cannot nuke host:"+host)
			}
		}
	});
}