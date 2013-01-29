var redis = require(__dirname + '/redis')
    Task  = require(__dirname + '/task'),
    Stats = require(__dirname + '/stats');

module.exports = (function(name, opts) {
    var self = this;

    var _debugMode = false,
        _opts      = opts || {},
        _redis     = redis.client(),
        _stats     = new Stats(name);

    this.name           = name;
    this.worker         = null;
    this.workersActive  = 0;
    this.concurrency    = 1;
    this.retry          = false;

    function _constructor () {
        self.register();
    };

    this.push = function(task, fn) {

        if (!task)
            throw new Error("task argument should be provided");

        if (typeof fn != "function")
            throw new Error("Callback function should be passed as second argument");

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
        _redis.lpop("redisq:" + self.name + ":queue", function(err, tdata) {
            if (err) throw new Error(err);

            if (tdata) {
                var task = Task.parse(tdata);

                var started = new Date().getTime();
                _stats.cnt.timeStarted += (started - task.getCreatedAt());

                self.worker(task.getData(), function(err, res) {

                    var finished = new Date().getTime();
                    _stats.cnt.timeProcessed += (finished - started);
                    _stats.cnt.timeFinished  += (finished - task.getCreatedAt());

                    // refactor this mess?
                    if (err) _stats.cnt.failed++;
                    else     _stats.cnt.processed++;

                    // pushing a failed task to the head of the queue
                    if (err && self.retry)
                        _redis.lpush("redisq:" + self.name + ":queue", task.stringify(), function() {});

                    self.workersActive--;
                    process.nextTick(_spawn);
                });
            } else {
                setTimeout(_spawn, 250);
                self.workersActive--;
            }
        });
        self.workersActive++;
    };

    this.register = function(fn) {
        _redis.hset("redisq:queues", self.name, 1, fn);
    };

    this.unregister = function(fn) {
        _redis.hdel("redisq:queues", self.name, fn);
    };

    this.stats = function(fn) {
        _stats.normalize(fn);
    };

    function _debug() {
        if (_debugMode)
            console.log.apply(console, arguments);
    };

    _constructor();
});



