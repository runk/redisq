
var redisq = require('../../'),
    crypto = require('crypto');

module.exports.list = function(req, res) {
    redisq.getStats(function(err, stats) {
        res.send(stats);
    });
};

module.exports.show = function(req, res) {
    var name = req.params.name;

    redisq.hasQueue(name, function(err, exists) {
        if (!exists | err)
            return res.send({ "status": "notfound" });

        redisq.queue(name).stats(function(err, stats) {
            res.render("queue", {
                found: true,
                name:  name,
                stats: stats
            });
        });
    });
};

module.exports.purge = function(req, res) {
    var name = req.params.name;

    redisq.hasQueue(name, function(err, exists) {
        if (!exists || err)
            return res.send({ "status": "notfound" });

        redisq.queue(name).purge(function(err, status) {
            res.send({ "status": "ok" });
        });
    });
};

module.exports.history = function(req, res) {
    var name = req.params.name,
        last = req.query.last || '';

    var min = req.query.min || -1,
        max = req.query.max || -1;

    var grouping = 'auto';
    if (Math.ceil(max - min) > 60000)
        grouping = 'mm';
    if (Math.ceil(max - min) > 3600000 * 6)
        grouping = 'hh';
    if (Math.ceil(max - min) > 3600000 * 24 * 7)
        grouping = 'dd';

    redisq.hasQueue(name, function(err, exists) {
        if (!exists || err)
            return res.send({ "status": "notfound" });

        var stats = new Stats(name);
        stats.normalize({ grouping: grouping }, function(err, stats) {
            var result = {
                "processed": [],
                "failed":    [],
                "backlog":   []
            };

            stats.history.map(function(row) {
                if (min > 0 && min > row.createdAt) return;
                if (max > 0 && max < row.createdAt) return;

                result.processed.push([row.createdAt, row.processed || null]);
                result.failed.push([row.createdAt, row.failed || null]);

                var backlog = row.created - row.processed;
                result.backlog.push([row.createdAt, backlog > 0 ? backlog : null]);
            });

            var sig = crypto.createHash('sha256').update(
                JSON.stringify(result)
            ).digest('hex').substring(0, 16);

            res.send({
                "counters": stats.counters,
                "history":  last == sig ? null : result,
                "sig":      sig
            });
        });
    });
};

module.exports.historyReset = function(req, res) {
    var name = req.params.name;

    redisq.hasQueue(name, function(err, exists) {
        if (!exists || err)
            return res.send({ "status": "notfound" });

        var stats = new Stats(name);
        stats.historyReset(function(err, status) {
            res.send({ "status": status, "err": err });
        });
    });
};

module.exports.countersReset = function(req, res) {
    var name = req.params.name;

    redisq.hasQueue(name, function(err, exists) {
        if (!exists || err)
            return res.send({ "status": "notfound" });

        var stats = new Stats(name);
        stats.countersReset(function(err, status) {
            res.send({ "status": status, "err": err });
        });
    });
};

module.exports.countersGet = function(req, res) {
    var name = req.params.name;

    redisq.hasQueue(name, function(err, exists) {
        if (!exists || err)
            return res.send({ "status": "notfound" });

        var stats = new Stats(name);
        stats.countersGet(function(err, counters) {
            res.send({ "counters": counters, "err": err });
        });
    });
};


