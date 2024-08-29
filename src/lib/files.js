/** @param {NS} ns 
 *  @param {string} path
 */
export function isFolder(ns, path) {
	if (ns.fileExists(path)) {
		return false;
	} else {
		const lsList = ns.ls(ns.getHostname(), path);
		ns.print("checking is folder: ", path, " listing: ", lsList);
		for (let idx in lsList) {
			if (lsList[idx].startsWith(endWithSlash(path))) {
				return true;
			}
		}
		return false;
	}
}

/** @param {NS} ns */
export function fileOrFolderExist(ns, path) {
	return ns.fileExists(path) || isFolder(ns, path);
}

/** @param {string} path */
export function formatAbsolutePath(path, withLeadingSlash=true) {
	if (withLeadingSlash) {
		return path.startsWith("/")? path : "/" + path;
	} else {
		return path.startsWith("/")? path.substring(1) : path;
	}
}

/**  @param {string} path */
export function endWithSlash(path, endsWith=true) {
	if (endsWith) {
		return path.endsWith("/")? path : path + "/";
	} else {
		return path.endsWith("/")? path.substring(0, path.length-1) : path;
	}
}

export function expandPath(curScriptPath, path) {
	if (!path.startsWith(".")) {
		return path;
	}

	if (path.startsWith(".") && !path.startsWith("..")) {
		return curScriptPath.substring(0, curScriptPath.lastIndexOf("/")) + path.substring(1);
	}

	let tmpPath=path;
	let tmpCurPath=curScriptPath.substring(0, curScriptPath.lastIndexOf("/"));
	while (tmpPath.startsWith("../")) {
		tmpPath=tmpPath.substring(3);
		tmpCurPath=tmpCurPath.substring(0, tmpCurPath.lastIndexOf("/"));
	}
	return tmpCurPath + "/" + tmpPath;
}

/** @param {NS} ns */
export function lsPath(ns, path) {
	const prefix = formatAbsolutePath(endWithSlash(path), false);
	return ns.ls(ns.getHostname(), prefix)
		.filter((path)=>path.startsWith(prefix));
}