/** 
 * Replace variables with calculated values.
 * @param {(string | number | boolean)[]} args  
 * @param {{[ holder : string] : (string | number | boolean);}} replacer
 * @return replaced args
 */
export function replaceArgs(args, replacer) {
	return args.map(val=> {
		if(typeof replacer[val] !== 'undefined') {
			return replacer[val];
		} else {
			return val;
		}
	});
}

export function withFlag(arg, flag) {
	return arg.startsWith('-') && arg.indexOf(flag) > -1;
}