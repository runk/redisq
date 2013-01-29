
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

    redisq.hasQueue(name, function(err, exists) {
        if (!exists || err)
            return res.send({ "status": "notfound" });

        redisq.queue(name).stats(function(err, stats) {
            var result = {
                "processed": [],
                "failed":    [],
                "backlog":   []
            };

            stats.history.map(function(row) {
                result.processed.push([row.createdAt, row.processed]);
                result.failed.push([row.createdAt, row.failed]);

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

module.exports.resetCounters = function(req, res) {
    var name = req.params.name;

    redisq.hasQueue(name, function(err, exists) {
        if (!exists || err)
            return res.send({ "status": "notfound" });

        var stats = new Stats(name);
        stats.resetCounters(function(err, status) {
            res.send({ "status": status });
        });
    });
};

