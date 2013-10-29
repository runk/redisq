var redis = require(__dirname + '/redis')
  Task  = require(__dirname + '/task'),
  Stats = require(__dirname + '/stats');

module.exports = (function(name, opts) {
  var self = this;

  var _debugMode = false,
    _opts      = opts || {},
    _redis     = redis.client(),
    _stats     = new Stats(name),
    _timer     = null;

  this.name           = name;
  this.worker         = null;
  this.workersActive  = 0;
  this.concurrency    = 1;
  this.retry          = true;
  this.active         = true;
  this.spawnTimeout   = 250;

  function _constructor () {
    self.register();
  };

  this.pause = function() {
    self.active = false;
  };

  this.resume = function() {
    self.active = true;
  };

  this.push = function(task, fn) {

    if (!task)
      throw new Error("task argument should be provided");

    if (fn && typeof fn != "function")
      throw new Error("Second arguments should be either undefined or function");

    _stats.cnt.created++;

    var task = new Task(task);
    _redis.rpush("redisq:" + self.name + ":queue", task.stringify(), function(err, res) {
      if (err) throw new Error(err);
      if (fn)  fn(null, true);
    });
  };

  this.len = function(fn) {

    if (typeof fn != "function")
      throw new Error("Callback function should be passed");

    _redis.llen("redisq:" + self.name + ":queue", function(err, length) {
      if (err) throw new Error(err);
      if (fn)  fn(null, length);
    });
  };

  this.purge = function(fn) {
    _redis.del("redisq:" + self.name + ":queue", function(err, res) {
      if (err) throw new Error(err);
      if (fn)  fn(null, true);
    });
  };

  this.process = function(worker, concurrency) {
    if (typeof worker != "function")
      throw new Error("worker function should be passed as an argument");

    if (typeof concurrency != "undefined") {
      if (typeof concurrency == "number")
        self.concurrency = concurrency;
      else
        throw new Error("concurrency argument should be integer");
    }

    self.worker = worker;
    while (self.workersActive < self.concurrency)
      _spawn();
  };

  function _spawn() {
    if (!self.active) {
      _timer = setTimeout(_spawn, self.spawnTimeout);
      return self.workersActive--;
    }

    function pushBack(task) {
      _redis.lpush("redisq:" + self.name + ":queue", task.stringify(), function() {});
    }

    _redis.lpop("redisq:" + self.name + ":queue", function(err, tdata) {
      if (err) throw new Error(err);

      if (!tdata) {
        _timer = setTimeout(_spawn, self.spawnTimeout);
        return self.workersActive--;
      }

      var task = Task.parse(tdata);

      // Ignore late responses from redis - push task back to the queue
      if (self.destroyed)
        return pushBack(task);

      var started = new Date().getTime();
      _stats.cnt.timeStarted += (started - task.getCreatedAt());

      self.worker(task.getData(), function(err, res) {

        var finished = new Date().getTime();
        _stats.cnt.timeProcessed += (finished - started);
        _stats.cnt.timeFinished  += (finished - task.getCreatedAt());

        if (err) {
          _stats.cnt.failed++;

          // it's a way to update task if it's failed
          if (res && typeof res == "object")
            task = new Task(res);
        }
        else
          _stats.cnt.processed++;

        // pushing a failed task to the head of the queue
        if (err && self.retry)
          pushBack(task);

        self.workersActive--;
        process.nextTick(_spawn);
      });
    });
    self.workersActive++;
  };

  this.register = function(fn) {
    _redis.hset("redisq:queues", self.name, 1, fn);
  };

  this.unregister = function(fn) {
    _redis.hdel("redisq:queues", self.name, fn);
  };

  this.stats = function(opts, fn) {
    _stats.normalize(opts, fn);
  };

  this.destroy = function() {
    this.destroyed = true;
    clearTimeout(_timer);
  };

  function _debug() {
    if (_debugMode)
      console.log.apply(console, arguments);
  };

  _constructor();
});
