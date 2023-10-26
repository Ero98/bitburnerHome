/** @param {NS} ns */
export async function main(ns) {
	const myMoney = ()=>ns.getServerMoneyAvailable("home");

	const actionCost = [];
	const action = [];

	actionCost.push(ns.hacknet.getPurchaseNodeCost);
	action.push(ns.hacknet.purchaseNode);

	//init
	for (let i=0; i<ns.hacknet.numNodes(); ++i){
		actionCost.push(()=>ns.hacknet.getLevelUpgradeCost(i));
		action.push(()=>ns.hacknet.upgradeLevel(i));

		actionCost.push(()=>ns.hacknet.getRamUpgradeCost(i));
		action.push(()=>ns.hacknet.upgradeRam(i));

		actionCost.push(()=>ns.hacknet.getCoreUpgradeCost(i));
		action.push(()=>ns.hacknet.upgradeCore(i));
	}

	while(true) {
		await ns.sleep(1);

		let minCost=actionCost[0]();
		let minCostI=0;
		for(let i in action) {
			if (action[i]===ns.hacknet.purchaseNode) {
				if (ns.hacknet.numNodes() === ns.hacknet.maxNumNodes()) {
					continue;
				}
			}

			if (actionCost[i]() < minCost) {
				minCost = actionCost[i]();
				minCostI = i;
			}
		}

		const cost = minCost;
		const i = minCostI;
		if (cost < myMoney()) {
			//check production
			let totalProd = 0;
			for (let j=0; j<ns.hacknet.numNodes(); ++j) {
				totalProd += ns.hacknet.getNodeStats(j).production;
			}
			if (totalProd!=0 && cost / totalProd > 60) {
				ns.print("最便宜的升级需要超过1分钟赚取，脚本已停止");
				ns.exit();
			}

			action[i]();

			if (action[i]===ns.hacknet.purchaseNode) {
				let newInd = ns.hacknet.numNodes() - 1;
				actionCost.push(()=>ns.hacknet.getLevelUpgradeCost(newInd));
				action.push(()=>ns.hacknet.upgradeLevel(newInd));

				actionCost.push(()=>ns.hacknet.getRamUpgradeCost(newInd));
				action.push(()=>ns.hacknet.upgradeRam(newInd));

				actionCost.push(()=>ns.hacknet.getCoreUpgradeCost(newInd));
				action.push(()=>ns.hacknet.upgradeCore(newInd));
			}
		}
	}
}