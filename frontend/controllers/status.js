
var redisq = require('../../');

module.exports = function(req, res) {
	redisq.getStats(function(err, stats) {
		var queued = 0;
		for (var name in stats)
			queued += stats[name].counters.queued;

		res.send({
			"status": (queued < 100) ? 200 : 500,
			"queued": queued
		});
	});
};