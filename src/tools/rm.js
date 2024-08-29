import {isFolder, fileOrFolderExist, formatAbsolutePath, endWithSlash} from "/lib/files.js";
import {withFlag} from "/lib/arguments.js";

/** @param {NS} ns */
export async function main(ns) {
	let argument = ns.args;
	const recursive = withFlag(argument[0], 'r');
	if (recursive) {
		argument = argument.slice(1);
	}

	const target = formatAbsolutePath(argument[0], false);

	if (!fileOrFolderExist(ns, target)) {
		ns.tprint("target not exist: ", target);
		ns.exit();
	}

	if (recursive && isFolder(ns, target)) {
		ns.ls(ns.getHostname(), target)
			.filter(path=>path.startsWith(endWithSlash(target)))
			.forEach(file=>ns.rm(formatAbsolutePath(file)));
	} else {
		if (isFolder(ns, target)) {
			ns.tprint("target is folder: ", target);
			ns.exit();
		}

		ns.rm(formatAbsolutePath(target));
	}
}