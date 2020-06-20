var Node = {
  fs: require('fs'),
  path: require('path'),
  process: process
};
var random = Math.random.bind(Math);
var Queue = require('@ronomon/queue');

var namespace = 'Utimes';

var Test = {};

Test.equal = function(value, expected, namespace, description) {
  value = JSON.stringify(value) + '';
  expected = JSON.stringify(expected) + '';
  if (value === expected) {
    Test.pass(namespace, description, expected);
  } else {
    Test.fail(namespace, description, value + ' !== ' + expected);
  }
};

Test.fail = function(namespace, description, message) {
  console.log('');
  throw 'FAIL: ' + Test.message(namespace, description, message);
};

Test.message = function(namespace, description, message) {
  if ((namespace = namespace || '')) namespace += ': ';
  if ((description = description || '')) description += ': ';
  return namespace + description + (message || '');
};

Test.pass = function(namespace, description, message) {
  console.log('PASS: ' + Test.message(namespace, description, message));
};

var root = Node.path.resolve(__dirname, '..');
if (!root) throw new Error('root must not be empty');

var fixtures = Node.path.join(root, 'utimes_fixtures');
var binding = require(__dirname + '/index.js');

var ALPHABET = '';
ALPHABET += 'abcdefghijklmnopqrstuvwxyz';
ALPHABET += 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
ALPHABET += '0123456789';
ALPHABET += 'àáâäæãåāèéêëēėę';
// Do not use extensions.
// Some extensions (such as .eml) cause timestamp updates on Windows.

// (MAX_TIME + 1) overflows NTFS and returns a negative timestamp:
var MAX_TIME = 2147483647999;

function generatePath() {
  var chars = 1 + Math.floor(random() * 16);
  var string = '';
  while (chars--) {
    string += ALPHABET[Math.floor(random() * ALPHABET.length)];
  }
  if (random() < 0.5) {
    if (random() < 0.5) {
      string = string.normalize('NFC');
    } else {
      string = string.normalize('NFD');
    }
  }
  return string;
}

function generateTime() {
  if (random() < 0.1) return undefined;
  var time = Math.floor(random() * MAX_TIME);
  if (Node.process.platform !== 'win32') {
    time = Math.floor(time / 1000) * 1000;
  }
  return time;
}

function removeFixtures(callback) {
  function remove() {
    try {
      var names = Node.fs.readdirSync(fixtures);
    } catch (error) {
      if (error.code !== 'ENOENT') throw error;
      var names = [];
    }
    names.forEach(
      function(name) {
        Node.fs.unlinkSync(Node.path.join(fixtures, name));
      }
    );
    try {
      Node.fs.rmdirSync(fixtures);
    } catch (error) {
      if (error.code !== 'ENOENT') throw error;
    }
  }
  if (callback) {
    setTimeout(
      function() {
        remove();
        callback();
      },
      // Wait for handles to be released by antivirus:
      Node.process.platform === 'win32' ? 2000 : 0
    );
  } else {
    remove();
  }
}

function times(stats) {
  return {
    btime: stats.birthtime.getTime(),
    mtime: stats.mtime.getTime(),
    atime: stats.atime.getTime()
  };
}

removeFixtures();

try {
  Node.fs.mkdirSync(fixtures);
} catch (error) {
  if (error.code !== 'EEXIST') throw error;
}

var queue = new Queue(1);
queue.onData = function(test, end) {
  var path = generatePath();
  var target = Node.path.join(fixtures, path);
  var btime = generateTime();
  var mtime = generateTime();
  var atime = generateTime();
  Node.fs.writeFileSync(target, '');
  var expect = times(Node.fs.statSync(target));
  binding.utimes(target, { btime, mtime, atime }).then(function() {
    try {
      if (btime !== undefined) expect.btime = btime;
      if (mtime !== undefined) expect.mtime = mtime;
      if (atime !== undefined) expect.atime = atime;
      var actual = times(Node.fs.statSync(target));
      if (Node.process.platform !== 'win32') {
        if (btime === undefined && actual.btime < expect.btime) {
          if (
            actual.btime === expect.mtime ||
            actual.btime === expect.atime
          ) {
            expect.btime = actual.btime;
          }
        }
        if (actual.atime !== expect.atime) {
          if (
            actual.atime === expect.btime ||
            actual.atime === expect.mtime
          ) {
            expect.atime = actual.atime;
          }
        }
      }
      if (
        Node.process.platform !== 'win32' &&
        Node.process.platform !== 'darwin'
      ) {
        expect.btime = actual.btime;
      }
      Test.equal(path, path, namespace, 'path');
      Test.equal(actual.btime, expect.btime, namespace, 'btime=' + btime);
      Test.equal(actual.mtime, expect.mtime, namespace, 'mtime=' + mtime);
      Test.equal(actual.atime, expect.atime, namespace, 'atime=' + atime);
    } catch (error) {
      console.log('Actual: ' + JSON.stringify(actual));
      console.log('Expect: ' + JSON.stringify(expect));
      return end(error);
    }
    end();
  }, function(error) {
    throw error;
  });
};
queue.onEnd = function(error) {
  removeFixtures(
    function() {
      if (error) throw error;
      console.log('================');
      console.log('PASSED ALL TESTS');
      console.log('================');
    }
  );
};
for (var test = 0; test < 1000; test++) {
  queue.push(test);
}
queue.end();
