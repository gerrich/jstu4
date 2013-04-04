var fs = require('fs');
var util = require('util');
var TM = require('./tu4.js').TM;

var NAME = "Turing4";
var VERSION = "0.0.1";

var argv = require('optimist')
  .options('version',{'alias':'V', 'boolean':true})
  .options('file', {'default':null})
  .options('max_count',{
    default : 10000, 
  })
  .options('max_len',{
    default : 10000, 
  })
  .argv;

if (!argv.version && argv.file == null) {
  util.print("either <--version|-V> or <--file> is required\n");
  process.exit(1);
}
if (argv.version) {
  util.print(NAME + " " + VERSION + "\n");
  process.exit(0);
}
//util.print("file: " + argv.file + "\n");
//util.print("max_count: " + argv.max_count + "\n");
//util.print("max_len: " + argv.max_len + "\n");

var text = fs.readFileSync(argv.file).toString('utf8').replace(/\r\n/g,'\n');

var tm = TM.compile(text, 0, null);


process.stdin.resume();
process.stdin.setEncoding('utf8');
 
function line_reader(stream, call_back) {
  var remainder = ''
  stream.on('data', function (chunk) {
      var lines = chunk.toString().split('\n');
      lines.unshift(remainder + lines.shift());
      remainder = lines.pop();
      lines.forEach(function(line) {
        call_back(line, false)
      });
    });
  stream.on('end', function() {call_back(remainder, true)});
};

line_reader(process.stdin, function(line, eof){
  var tmrun = tm.run(line);
  var step_count = 1;
  while(tmrun.isRunning()) {
    try {
      tmrun.step();
      if (tmrun.tape().length > argv.max_len) {
        process.exit(2);
      }
      if (step_count > argv.max_count) {
        process.exit(3);
      }
    }
    catch(err) {
      process.stdout.write(tmrun.tape());
      if (!eof) process.stdout.write("\n");
      process.exit(1);
    }
//    var cmd = tmrun.nextCommand();
//    console.log(tmrun.tape(), tmrun.pos(), cmd.q(), cmd.a(), cmd.v(), cmd.w());
    ++step_count;
  }
  process.stdout.write(tmrun.tape());
  if (!eof) process.stdout.write("\n");
  process.exit(0);
});
//tm.run();

