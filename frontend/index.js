
var cluster = require('cluster'),
	worker = require('./worker');

var listeners = {
	exit: function(worker, code, signal) {
		console.log('Worker has died, restarting. ID: %d, CODE %d', worker.id, worker.process.exitCode);
		cluster.fork();
	}
};

module.exports.start = function(opts) {

	opts = opts || {};
	opts.workers = opts.workers || require('os').cpus().length;
	opts.port    = opts.port || 3000;
	opts.host    = opts.host || "localhost";

	if (cluster.isMaster) {
		process.on('uncaughtException', function (err) {
			console.log('Fatal error', err, err.stack);
		});

		cluster.on('exit', 	listeners.exit);

		console.log('Cluster has been started on %s:%s, pid: %s', opts.host, opts.port, process.pid);

		for (var i = opts.workers - 1; i >= 0; i--) {
			cluster.fork();
		}
	} else {
		worker.listen(opts.port, opts.host);
	}
};

