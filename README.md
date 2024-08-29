# bitburnerHome
A code base for a batch hacking implementation that achieved hundreds of billions per second.

## Update Note(24/08/30)
### Structural changes
This project has introduced:
- Bitburner's official file-sync method to support external editing.
- Typescript support.
Referenced: https://github.com/bitburner-official/typescript-template

Original files has moved to `/src` folder, source files are now either `.js` or `.ts`.

To utilize file-syncing and `.ts` file compiling, [Node.js](https://nodejs.org/en/download/package-manager) is needed. Check out `bitburner-official/typescript-template`'s [step-by-step guide](https://github.com/bitburner-official/typescript-template/blob/main/BeginnersGuide.md) for installation details.

### Algorithm changes
The original hwgw algorithm in `/hack/bat` has a way-too-simple grow-to-max algorithm, optimizations has made:
1. Grow-to-max process before calculations now allocate compute power according to grow difficaulty and grow progress(still more work can be done here).
2. Each target will now be hacked right after it reached maximun money and minumun security(you will need to comment out the grow-to-max process mentioned in the previous point to see the difference), rather than waiting for all targets growing to max.

## Quick Start
0. Install the latest version of `Node.js`.
1. Backup your save game(just in case).
2. Clone the repo.
```shell
git clone https://github.com/Ero98/bitburnerHome.git
cd bitburnerHome
```
3. Starup the server
```shell
npm run watch
```
4. Go to in-game options -> Remote API, change port to `12525`, and click `Connect`. Note this will copy all js files (and compiled ts files as js files) to your in-game home location.
5. Execute command in the in-game terminal:
```shell
run /hack/bat/masterV3.js
```

The script will do the following:
1. First try to hack all hosts and copy the whole code base to the successfully hacked machines.
2. Calculate the best hacking plan.
3. Use a relatively simple algorithm to grow all the target machines.
4. Execute the plan utlizing every hacked machines' available RAM.

You can change the configurations in:
```shell
nano /hack/bat/config.js
```
Default gap for execution effect to take place may be 20 milliseconds, you need to check for yourself(because I may accidentally committed my changes).

## Structure
I use different scripts for different tasks, and tried to categorize them using folders (although they are lies):
```
/hack
  /bat           # The main path for my batch hacking method scripts
  /hwgw2         # My plan to redo the algorithm in typescript and a more readable code design.
  hack-node.js   # The script that helps me earn engouh money for living in the early game
/lib             # Some scripts having less to do with hacking goes here
/ownedserver     # Scripts for managing owned servers
/tools           # Contains rewritten native commands. And a script for auto-nuking.
```



