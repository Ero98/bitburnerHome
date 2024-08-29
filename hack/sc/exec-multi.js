import {getMaxThreads} from "/lib/calculations.js";
import {replaceArgs} from "/lib/arguments.js";
import {expandPath} from "/lib/files.js";

/** @param {NS} ns */
export async function main(ns) {
	ns.tprint("\n");
	if (ns.args.length < 3) {
		ns.tprint("usage: run exec-muti.js <host> <threads> <script> [ <args>... ]\n", 
			"Where threads is an int or the string 'max', default to 'max'.\n",
			"This script is designed to run on home machine.\n");
		ns.exit();
	}

	const host = ns.args[0]
	const script = expandPath(ns.getScriptName(), ns.args[2]);

	if (ns.scriptRunning(script, host)) {
		ns.scriptKill(script, host);
		ns.tprint("killed running scripts for host.");
	}

	const threads = (()=>{
		const threadsArg = ns.args[1];
		
		if (threadsArg !== 'max') {
			if (typeof threadsArg !== 'number' || ! Number.isInteger(threadsArg)) {
				ns.tprint("arg <threads> accepts a integer, got ", threadsArg);
				ns.exit();
			}

			return threadsArg;
		} else {
			return getMaxThreads(ns, host, script);
		}
	})();

	if (!ns.serverExists(host)) {
		ns.tprint("host not exists: ", host);
		ns.exit();
	}

	if (!ns.fileExists(script)) {
		ns.tprint("file not exists: ", script);
		ns.exit();
	}

	if (threads < 1) {
		ns.tprint("threads not valid: ", threads);
		ns.exit();
	}

	const scriptArgs = replaceArgs(ns.args.slice(3), {"$threads":threads});

	ns.scp(script, host);
	ns.exec(script, host, threads, scriptArgs|undefined);

	ns.tprint("Execution started.");
}