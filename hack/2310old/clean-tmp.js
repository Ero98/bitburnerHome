/** @param {NS} ns */
export async function main(ns) {
	const servers = [];
	const scanQueue = ["home"];
	while(scanQueue.length > 0) {
		let host = scanQueue.pop();
		if(servers.indexOf(host) === -1) {
			servers.push(host);
			scanQueue.push(...ns.scan(host));
		}
	}

	servers.forEach((server)=>{
		const tmpFiles = ns.ls(server, '/tmp/');
		tmpFiles.forEach((file)=>ns.rm(file, server));
	});
}