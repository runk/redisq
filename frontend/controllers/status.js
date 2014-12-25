
var redisq = require('../../');

module.exports = function(req, res) {
	redisq.getStats(function(err, stats) {

        var measureLastRecords = 15,
            rateThreshold = 1.0, // overhead 2x times
            problems = {},
            queued = 0,
            now = (new Date()).getTime(),
            halfAnHour = 1000 * 60 * 30;

		for (var name in stats) {
            queued += stats[name].counters.queued;
            var history = stats[name].history;

            // skip recently started queues
            if (history.length < measureLastRecords)
                continue;

            // get last 15 records
            var last15 = history.splice(history.length - measureLastRecords);

            var created = 0,
                processed = 0;

            for (var i = last15.length - 1; i >= 0; i--) {
                // skip records older than 30 minutes
                if (now - last15[i].createdAt > halfAnHour)
                    continue;
                created   += last15[i].created;
                processed += last15[i].processed;
            }

            var rate = Math.round(Math.abs(1 - created / processed) * 1000) / 1000;

            if (rate >= rateThreshold)
                problems[name] = {
                    "measured":  60 * measureLastRecords,
                    "created":   created,
                    "processed": processed,
                    "diffrate":  rate
                };
        }

		res.send({
			"status":   (Object.keys(problems).length == 0) ? 200 : 500,
            "queued":   queued,
			"problems": problems
		});
	});
};