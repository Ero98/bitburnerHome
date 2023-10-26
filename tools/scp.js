import {withFlag} from "/lib/arguments.js";
import {isFolder, lsPath, formatAbsolutePath} from "/lib/files.js";

/** @param {NS} ns */
export async function main(ns) {
	let argument=ns.args;
	const recursive=withFlag(argument[0], 'r');
	if (recursive) {
		argument=argument.slice(1);
	}

	const files=argument.slice(0,-1).map(arg=>formatAbsolutePath(arg, false));
	const dest=argument[argument.length-1];

	for (let ind in files) {
		const file=files[ind];
		if (isFolder(ns, file)) {
			if (!recursive) {
				ns.tprint("-r flag not specified, not copying folder: ", file);
				continue;
			}

			// ns.tprint(file, " ", lsPath(ns, file), " ", dest);
			ns.scp(lsPath(ns, file), dest);
		} else {
			// ns.tprint(file, " ", dest);
			ns.scp(file, dest);
		}
	}
}