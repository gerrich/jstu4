#!/usr/bin/env nodejs

var fs = require('fs');
var util = require('util');
var TM = require('./tu4.js').TM;

var NAME = "Turing4";
var VERSION = "0.0.1";

var argv = require('optimist')
  .options('version',{'alias':'V', 'boolean':true})
  .options('reformat',{'alias':'r', 'boolean':true})
  .options('persist',{'alias':'p', 'boolean':true})
  .options('compile', {'alias':'c','boolean':true})
  .options('file', {'alias':'f','default':null})
  .options('max_count',{
    default : 10000000, 
  })
  .options('max_len',{
    default : 20000000, 
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
text = text.replace(/^#!.*?\n/,'');
var tm = null;

try {
  tm = TM.compile(text, 0, null);
} catch (err) {
  console.log("Exception:");
  
  if (err instanceof TM.CouldntParseError) console.log("TM.CouldntParseError");
  if (err instanceof TM.EmptyProgramError) console.log("TM.EmptyProgramError");
  if (err instanceof TM.AmbiguosCommandError) console.log("TM.AmbiguosCommandError");
  if (err instanceof TM.NonexistentTargetState) console.log("TM.NonexistentTargetState");
  if (err instanceof TM.NonexistentInitialState) console.log("TM.NonexistentInitialState");
  
  console.log(err.data);
  process.exit(1);
}

if (argv.compile) {
  process.exit(0);  
}

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
  //line = line.replace('/s*$','');
  if (argv.reformat) {
    line = " "+line.trim('/s+').split(/\s+/).join(" ");
  }
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
      console.log("Error: ", err.data);
      process.exit(1);
    }
//    var cmd = tmrun.nextCommand();
//    console.log(tmrun.tape(), tmrun.pos(), cmd.q(), cmd.a(), cmd.v(), cmd.w());
    ++step_count;
  }
  var result = tmrun.tape();
  if (argv.persist) {
    if (result.substr(0, line.length) != line) {
      process.stdout.write(tmrun.tape());
      if (!eof) process.stdout.write("\n");
      console.log("ERROR: not persistent result");
      process.exit(1);
    } else {
      result = result.substr(line.length);
    }
  }
  if (argv.reformat) {
    result = result.trim('/s+').split(/\s+/).join(' ');
  }
  process.stdout.write(result);
  if (!eof) process.stdout.write("\n");
  process.exit(0);
});
//tm.run();

