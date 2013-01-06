var redis = require(__dirname + '/redis');

const
    STATS_HISTORY_PROCESSED       = 'stats:h:p',
    STATS_HISTORY_FAILED          = 'stats:h:f',
    STATS_HISTORY_CREATED         = 'stats:h:c',
    STATS_HISTORY_TIME_STARTED    = 'stats:h:ts',
    STATS_HISTORY_TIME_PROCESSED  = 'stats:h:tp',
    STATS_HISTORY_TIME_FINISHED   = 'stats:h:tf',
    STATS_TOTAL_PROCESSED         = 'stats:p',
    STATS_TOTAL_FAILED            = 'stats:f'
    STATS_TOTAL_CREATED           = 'stats:c';


module.exports = (function(name, opts) {

    opts = opts || {};

    var self = this;
    var _redis = redis.client();

    this.name  = name;
    this.cnt   = {};
    this.timer = setInterval(_flush, 6000);

    this.erase = function() {
        self.cnt = {
            failed:         0,
            processed:      0,
            created:        0,
            timeStarted:    0,
            timeProcessed:  0,
            timeFinished:   0
        };
    };

    this.normalize = function(fn) {

        _redis.multi()
            .llen(_key("queue"))

            .get(_key(STATS_HISTORY_PROCESSED))
            .get(_key(STATS_HISTORY_FAILED))
            .get(_key(STATS_HISTORY_CREATED))

            .hgetall

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

            //
            // converts following structure
            // [ [1356594540000,0,1,0,null,null,null],
            //   [1356594540000,1,0,0,null,null,null] ]
            // to
            // [ [1356594540000, 1, 1, 0, 0, 0] ]
            //
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

    function _flush(fn) {

        // nothing to save
        if (self.cnt.processed + self.cnt.created == 0)
            return fn ? fn() : null;

        var now = Math.floor(new Date().getTime() / 60000) * 60

        _redis.multi()
            .hincrby(_skey(STATS_HISTORY_PROCESSED),      now, self.cnt.processed)
            .hincrby(_skey(STATS_HISTORY_FAILED),         now, self.cnt.failed)
            .hincrby(_skey(STATS_HISTORY_CREATED),        now, self.cnt.created)

            .hincrby(_skey(STATS_HISTORY_TIME_STARTED),   now, self.cnt.timeStarted)
            .hincrby(_skey(STATS_HISTORY_TIME_PROCESSED), now, self.cnt.timeProcessed)
            .hincrby(_skey(STATS_HISTORY_TIME_FINISHED),  now, self.cnt.timeFinished)

            .incrby(_skey(STATS_TOTAL_PROCESSED), self.cnt.processed)
            .incrby(_skey(STATS_TOTAL_FAILED),    self.cnt.failed)
            .incrby(_skey(STATS_TOTAL_CREATED,    self.cnt.created)

            .exec(fn);

        self.erase();
    };

    function _skey() {
        var path = [ self.name ];
        for (var index in arguments)
            path[index] = arguments[index];

        return 'redisq:' + path.join(':');
    };

    // function _avg(arr) {
    //     if (!arr || arr.length == 0)
    //         return 0;

    //     var res = 0;
    //     for (var i = arr.length - 1; i >= 0; i--)
    //         res += arr[i];

    //     return Math.round(res / arr.length);
    // };

    self.erase();
});
