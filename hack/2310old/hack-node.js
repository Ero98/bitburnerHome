/** @param {NS} ns */
export async function main(ns) {
	let res;

	function myMoney() {
		return ns.getServerMoneyAvailable("home");
	}

	ns.disableLog("getServerMoneyAvailable");
	ns.disableLog("sleep");

	var cnt = 20;
	while(ns.hacknet.numNodes() < cnt) {
		await ns.sleep(1);
		res = ns.hacknet.purchaseNode();
		ns.print("Purchased hacknet Node with index " + res);
	};

	for (var i = 0; i < cnt; i++) {
		await ns.sleep(1);
		while (ns.hacknet.getNodeStats(i).level <= 100) {
			var cost = ns.hacknet.getLevelUpgradeCost(i, 10);
			while (myMoney() < cost) {
				ns.print("Need $" + cost + " . Have $" + myMoney());
				await ns.sleep(3000);
			}
			res = ns.hacknet.upgradeLevel(i, 10);
		};
	};

	ns.print("All nodes upgraded to level 80");

	for (var i = 0; i < cnt; i++) {
		await ns.sleep(1);
		while (ns.hacknet.getNodeStats(i).ram < 64) {
			var cost = ns.hacknet.getRamUpgradeCost(i, 2);
			while (myMoney() < cost) {
				ns.print("Need $" + cost + " . Have $" + myMoney());
				await ns.sleep(3000);
			}
			res = ns.hacknet.upgradeRam(i, 2);
		};
	};

	for (var i = 0; i < cnt; i++) {
		await ns.sleep(1);
		while (ns.hacknet.getNodeStats(i).level < 200) {
			var cost = ns.hacknet.getLevelUpgradeCost(i, 10);
			while (myMoney() < cost) {
				ns.print("Need $" + cost + " . Have $" + myMoney());
				await ns.sleep(3000);
			}
			res = ns.hacknet.upgradeLevel(i, 10);
		};
	};

	ns.print("All nodes upgraded to 16GB RAM");

	for (var i = 0; i < cnt; i++) {
		await ns.sleep(1);
		while (ns.hacknet.getNodeStats(i).cores < 16) {
			var cost = ns.hacknet.getCoreUpgradeCost(i, 1);
			while (myMoney() < cost) {
				ns.print("Need $" + cost + " . Have $" + myMoney());
				await ns.sleep(3000);
			}
			res = ns.hacknet.upgradeCore(i, 1);
		};
	};

	ns.print("All nodes upgraded to 8 cores");
}