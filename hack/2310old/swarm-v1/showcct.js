/** @param {NS} ns */
export async function main(ns) {
	let destHost = "home:/";
	let local = ns.getHostname();

	let grep = ".cct";
	let files = ns.ls(local, grep);

	for (let i in files) {
		ns.mv(local, files[i], destHost)
	}
}