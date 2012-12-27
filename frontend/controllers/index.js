
var redisq = require('../../');

module.exports.index = function(req, res) {
	redisq.getStats(function(err, stats) {
		res.render("index", { stats: stats });
	});
};