/** @param {NS} ns */
export async function main(ns) {
	let myservers = ns.getPurchasedServers();
	// let ram = 16384;
	let ram = 8;
	
	while (myservers.length < 25) {
		if (ns.getServerMoneyAvailable("home") > ns.getPurchasedServerCost(ram)) {
			ns.purchaseServer("h"+(myservers.length+1), ram);
			myservers = ns.getPurchasedServers();
		} else {
			break;
		}
	}

	myservers.forEach((server)=>{
		if (ns.getServerMaxRam(server) < ram){
			if (ns.getServerMoneyAvailable("home") > ns.getPurchasedServerCost(ram)) {
				ns.deleteServer(server);
				ns.purchaseServer(server, ram);
			}
		}
	})
}