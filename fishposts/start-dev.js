// Inject --webpack flag before loading next CLI
process.argv = [process.argv[0], process.argv[1], "dev", "--webpack"];
process.chdir(__dirname);
require("next/dist/bin/next");
