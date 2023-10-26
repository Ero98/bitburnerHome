import {isFolder, fileOrFolderExist, formatAbsolutePath, endWithSlash} from "/lib/files.js";

/** @param {NS} ns */
export async function main(ns) {
	// All paths have to be converted to absolute paths;
	const src = formatAbsolutePath(ns.args[0], false);
	const dest = formatAbsolutePath(ns.args[1], false);

	if (!fileOrFolderExist(ns, src)) {
		ns.tprint("src not exist: ", src);
		ns.exit();
	}
	
	let mvFunc;
	//If src is folder, need to list all src files, and then move each one to new location
	if (isFolder(ns, src)) {
		mvFunc = mvInside=> {
			ns.ls(ns.getHostname(), endWithSlash(src))
				.filter((path)=>path.startsWith(endWithSlash(src)))
				.map((srcFile)=>{
					let destFile;
					if (mvInside) {
						destFile = endWithSlash(dest) + srcFile.substring(endWithSlash(src, false).lastIndexOf("/")+1);
					} else {
					 	destFile = endWithSlash(dest) + srcFile.substring(endWithSlash(src).length);
					}
					// ns.print(destFile, " ", srcFile, " ", endWithSlash(src, false).lastIndexOf("/")+1, " ", src);
					return {srcFile, destFile};})
				.forEach((param)=>
					ns.mv(ns.getHostname(), param.srcFile, param.destFile));
		};
	//If src is file, just move to new location
	} else {
		mvFunc = mvInside=> {
			if (mvInside) {
				const destFile = endWithSlash(dest) + src.substring(src.lastIndexOf("/")+1);
				ns.mv(ns.getHostname(), src, destFile);
			} else {
				ns.mv(ns.getHostname(), src, dest);
			}
		};
	}

	//put src inside dest
	if (isFolder(ns, dest)) {
		mvFunc(true);

	//ovewrite dest
	} else if (ns.fileExists(dest)) {
		if (isFolder(ns, src)) {
			ns.tprint("src: ", src, " is folder, cannot overwrite file: ", dest);
			ns.exit();
		}
		mvFunc(false);

	//dest not exist, pure rename
	} else {
		mvFunc(false);
	}
}