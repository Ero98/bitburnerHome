const local = "home"
const hackScript = "/hack/bat/action/do-hack.js";
const growScript = "/hack/bat/action/do-grow.js";
const weaken1Script = "/hack/bat/action/do-weaken1.js";
const weaken2Script = "/hack/bat/action/do-weaken2.js";
const autoGrowScript = "/hack/bat/prepare/grow.js";
const multiExecutorScript = "/hack/bat/exec-multi.js";
const stepTimeMillis = 500;
const maxConcurrency = -1;
const maxHackPerBatch = -1;
const twoWeakenOpts = true;
const preparationsLogFile = "masterV2RunInfo.txt";
const scriptBaseCost = 1.75;

export function localGet(){ return local; }
export function hackScriptGet(){ return hackScript; }
export function growScriptGet(){ return growScript; }
export function weaken1ScriptGet(){ return weaken1Script; }
export function weaken2ScriptGet(){ return weaken2Script; }
export function autoGrowScriptGet(){ return autoGrowScript; }
export function multiExecutorScriptGet(){ return multiExecutorScript; }
export function stepTimeMillisGet(){ return stepTimeMillis; }
export function maxConcurrencyGet(){ return maxConcurrency; }
export function maxHackPerBatchGet(){ return maxHackPerBatch; }
export function twoWeakenOptsGet(){ return twoWeakenOpts; }
export function preparationsLogFileGet(){ return preparationsLogFile; }
export function scriptBaseCostGet(){ return scriptBaseCost; }