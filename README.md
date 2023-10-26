# bitburnerHome
A code base for a batch hacking implementation that achieved hundreds of billions per second.

## Usage
Find a way to import the files into your game, you may want to backup your save first.

Execute command in the terminal:
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
Default gap for execution effect to take place is 500 milliseconds, this allow my computer to do autosaving without breaking the flow.

If the script's log become silence after start, maybe the calculating process takes too long. This normally happens when you bought too many rams on your owned servers. You can visualize the calculating process by changing the code in `/hack/bat/masterV3.js` file, line 110 `logStr=>{},` to `log,` (becareful, by default the logs will also printed into the file `/masterV2RunInfo.txt`, it may take a while to grow into about 80 mega bytes, don't open it in-game, it will blackscreen your game). 

I have all 25 owned servers upgraded to maximun ram, and the whole process didn't last more than 10 mins.

## Structure
I use different scripts for different tasks, and tried to categorize them using folders (although they are lies):
```
/hack
  /bat           # The main path for my batch hacking method scripts
  hack-node.js   # The script that helps me earn engouh money for living in the early game
/lib             # Some scripts having less to do with hacking goes here
/ownedserver     # Scripts for managing owned servers
/tools           # Contains rewritten native commands. And a script for auto-nuking.
```




