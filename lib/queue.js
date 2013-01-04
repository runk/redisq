var redis = require(__dirname + '/redis')
    Task = require(__dirname + '/task');

module.exports = (function(name, opts) {
    var self = this;

    var _debugMode = false,
        _opts      = opts || {},
        _counters  = null,
        _sInterval = null,
        _redis     = redis.client();

    this.name           = name;
    this.worker         = null;
    this.workersActive  = 0;
    this.concurrency    = 1;

    var STATS_FIELD_CREATED_AT      = 0,
        STATS_FIELD_PROCESSED       = 1,
        STATS_FIELD_FAILED          = 2,
        STATS_FIELD_CREATED         = 3,
        STATS_FIELD_TIME_STARTED    = 4,
        STATS_FIELD_TIME_PROCESSED  = 5,
        STATS_FIELD_TIME_FINISHED   = 6;

    function _constructor () {
        self.register();
        self.emptyCounters();

        _sInterval = setInterval(_flushStats, 60000);
    };

    this.push = function(task, fn) {

        if (!task)
            throw new Error("task argument should be provided");

        if (typeof fn != "function")
            throw new Error("Callback function should be passed as second argument");

        _counters.created++;

        var task = new Task(task);
        _redis.rpush("redisq:queue:" + self.name, task.stringify(), function(err, res) {
            if (err) throw new Error(err);
            if (fn)  fn(null, true);
        });
    };

    this.len = function(fn) {

        if (typeof fn != "function")
            throw new Error("Callback function should be passed");

        _redis.llen("redisq:queue:" + self.name, function(err, length) {
            if (err) throw new Error(err);
            if (fn)  fn(null, length);
        });
    };

    this.purge = function(fn) {
        _redis.del("redisq:queue:" + self.name, function(err, res) {
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
        _redis.lpop("redisq:queue:" + self.name, function(err, tdata) {
            if (err) throw new Error(err);

            if (tdata) {
                var task = Task.parse(tdata);

                var started = new Date().getTime();
                _counters.timeStarted.push(started - task.getCreatedAt());

                self.worker(task.getData(), function(err, res) {

                    var finished = new Date().getTime();
                    _counters.timeProcessed.push(finished - started);
                    _counters.timeFinished.push(finished - task.getCreatedAt());

                    // on error: push task back to the queue?
                    if (err) _counters.failed++;
                    else     _counters.processed++;
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

    this.emptyCounters = function () {
        _counters = {
            failed:         0,
            processed:      0,
            created:        0,
            timeStarted:    [],
            timeProcessed:  [],
            timeFinished:   []
        };
    };

    this.stats = function(fn) {
        _redis.multi()
            .llen("redisq:queue:" + self.name)
            .lrange("redisq:stats:" + self.name + ":history", 0, -1)
            .get("redisq:stats:" + self.name + ":processed")
            .get("redisq:stats:" + self.name + ":failed")
            .get("redisq:stats:" + self.name + ":created")
            .exec(function(err, replies) {

            if (err)
                throw new Error(err);

            var queued      = replies.shift(),
                records     = replies.shift(),
                processed   = parseInt(replies.shift()),
                failed      = parseInt(replies.shift()),
                created     = parseInt(replies.shift());

            if (replies.length > 0)
                throw new Error("Crazy shit has happened here");

            /*
             * converts following structure
             * [ [1356594540000,0,1,0,null,null,null],
             *   [1356594540000,1,0,0,null,null,null] ]
             * to
             * [ [1356594540000, 1, 1, 0, 0, 0] ]
             */
            var bydate = {};
            for (var i = records.length - 1; i >= 0; i--) {
                var row  = JSON.parse(records[i]),
                    date = row[0];

                if (date in bydate)
                    for (var j = row.length - 1; j >= 1; j--)
                        bydate[date][j] += row[j];
                else
                    bydate[date] = row;
            };

            var history = [];
            for (date in bydate)
                history.push({
                    "createdAt":        parseInt(date),
                    "processed":        bydate[date][STATS_FIELD_PROCESSED],
                    "failed":           bydate[date][STATS_FIELD_FAILED],
                    "created":          bydate[date][STATS_FIELD_CREATED],
                    "timeStarted":      bydate[date][STATS_FIELD_TIME_STARTED],
                    "timeProcessed":    bydate[date][STATS_FIELD_TIME_PROCESSED],
                    "timeFinished":     bydate[date][STATS_FIELD_TIME_FINISHED]
                });

            history.sort(function(a, b) {
                return a.createdAt - b.createdAt;
            });

            // calculating avg speed
            // (measured by last 10 minutes)
            var lastn = Math.min(10, history.length),
                handled = 0;

            for (var i = history.length - lastn; i < history.length; i++)
                handled += history[i].processed + history[i].failed;

            // handled tasks per minute
            var speed = (lastn > 0) ? handled / lastn : 0;
            speed = parseFloat(speed.toFixed(2));

            fn(null, {
                "speed": speed,
                "counters": {
                    "processed": processed || 0,
                    "failed":    failed || 0,
                    "created":   created || 0,
                    "queued":    queued
                },
                "history": history
            });
        });
    };

    function _flushStats(fn) {

        // nothing to save
        if (_counters.processed + _counters.created == 0)
            return fn ? fn() : null;

        var row = [];
        row[STATS_FIELD_CREATED_AT]      = Math.floor(new Date().getTime() / 60000) * 60;
        row[STATS_FIELD_PROCESSED]       = _counters.processed;
        row[STATS_FIELD_FAILED]          = _counters.failed;
        row[STATS_FIELD_CREATED]         = _counters.created;
        row[STATS_FIELD_TIME_STARTED]    = _avg(_counters.timeStarted);
        row[STATS_FIELD_TIME_PROCESSED]  = _avg(_counters.timeProcessed);
        row[STATS_FIELD_TIME_FINISHED]   = _avg(_counters.timeFinished);

        _redis.multi()
            // pushing row to history
            .lpush("redisq:stats:" + self.name + ":history", JSON.stringify(row))
            // preventing the stats' history from growing too extensive
            .ltrim("redisq:stats:" + self.name + ":history", 0, 1024)

            .incrby("redisq:stats:" + self.name + ":processed", _counters.processed)
            .incrby("redisq:stats:" + self.name + ":failed", _counters.failed)
            .incrby("redisq:stats:" + self.name + ":created", _counters.created)
            .exec(fn);

        self.emptyCounters();
    };

    function _avg(arr) {

        if (!arr || arr.length == 0)
            return 0;

        var res = 0;
        for (var i = arr.length - 1; i >= 0; i--)
            res += arr[i];

        return Math.round(res / arr.length);
    };

    function _debug() {
        if (_debugMode)
            console.log.apply(console, arguments);
    };

    _constructor();
});



