const { argv } = require('process');
const fs = require('fs');

//Include
eval(fs.readFileSync('core.js') + '');

/**
  ____    _             _     _               _      ____    ___      ____                
 / ___|  | |_    __ _  | |_  (_)   ___       / \    |  _ \  |_ _|    / ___|   ___   _ __  
 \___ \  | __|  / _` | | __| | |  / __|     / _ \   | |_) |  | |    | |  _   / _ \ | '_ \ 
  ___) | | |_  | (_| | | |_  | | | (__     / ___ \  |  __/   | |    | |_| | |  __/ | | | |
 |____/   \__|  \__,_|  \__| |_|  \___|   /_/   \_\ |_|     |___|    \____|  \___| |_| |_|
                                                                                          
 */
console.log("\n---------------------------------------");
console.log("Static Api Pages Generator v1.0\n");
exportFiles();
console.log("---------------------------------------\n");