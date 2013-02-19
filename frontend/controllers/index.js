
var redisq = require('../../');

module.exports.index = function(req, res) {

    var stats = [],
        cnt = 0;

    function _fetchCounters(qname) {
        cnt++;
        new Stats(qname).countersGet(function(err, counters) {
            stats.push({ "qname": qname, "counters": counters });
            if (--cnt == 0)
                res.render("index", { stats: stats });
        });
    };

    redisq.getQueues(function(err, queues) {
        for (var qname in queues)
            _fetchCounters(qname);
    });
};