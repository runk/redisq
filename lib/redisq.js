
var Queue = require(__dirname + '/queue'),
  Stats = require(__dirname + '/stats'),
  redis = require('./redis'),
  async = require('async');

var _queues = {},
  _opts = {};

var self = this;

module.exports.options = function(opts) {
  if (typeof opts == 'undefined')
    return _opts;

  _opts = opts || _opts;
  if (_opts.redis)
    redis.options(_opts.redis);
};


module.exports.queue = function(name, opts) {
  if (!_queues.hasOwnProperty(name)) {
    _queues[name] = new Queue(name, opts);
  }
  return _queues[name];
};


module.exports.getQueues = function(fn) {
  if (!fn)
    throw new Error('Callback function should be specified');

  redis.client().hkeys('redisq:queues', function(err, names) {
    if (err) throw new Error(err);

    var queues = {};
    names.map(function(name) {
      queues[name] = self.queue(name);
    });
    fn(null, queues);
  });
};


module.exports.hasQueue = function(name, fn) {
  if (!fn)
    throw new Error('Callback function should be specified');

  redis.client().hget('redisq:queues', name, function(err, res) {
    if (err) throw new Error(err);
    fn(null, Boolean(res));
  });
};


module.exports.getStats = function(fn) {
  if (!fn)
    throw new Error('Callback function should be specified');

  self.getQueues(function(err, queues) {
    var stats = {};
    var q = async.queue(function(queue, callback) {
      queue.stats(function(err, res) {
        stats[queue.name] = res;
        callback();
      });
    }, 8);

    q.drain = function() {
      fn(null, stats);
    };

    for (var qname in queues)
      q.push(queues[qname]);
  });
};


module.exports.getCounters = function(fn) {
  if (!fn)
    throw new Error('Callback function should be specified');

  self.getQueues(function(err, queues) {
    var stats = {};
    var q = async.queue(function(qname, callback) {
      new Stats(qname).countersGet(function(err, counters) {
        stats[qname] = counters;
        callback();
      });
    }, 8);

    q.drain = function() {
      fn(null, stats);
    };

    for (var qname in queues)
      q.push(qname);
  });
};

