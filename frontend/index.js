
var cluster = require('cluster'),
    worker  = require('./worker'),
    redisq  = require('../');

module.exports.listen = function(port, host, opts) {

    if (typeof opts == "object") {
        redisq.options(opts);
    }

    port = port || 3000;
    host = host || "localhost";

    if (cluster.isMaster) {
        process.on('uncaughtException', function (err) {
            console.log('Fatal error', err, err.stack);
        });

        cluster.on('exit', function(worker, code, signal) {
            console.log('Worker has died, restarting. ID: %d, CODE %d',
                worker.id, worker.process.exitCode);
            cluster.fork();
        });

        console.log('Cluster has been started on %s:%s, pid: %s',
            host, port, process.pid);

        for (var i = require('os').cpus().length - 1; i >= 0; i--)
            cluster.fork();

    } else {
        worker.listen(port, host);
    }
};