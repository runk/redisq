
module.exports.listen = function(port, host, opts) {

    var worker  = require('./worker'),
        redisq  = require('../');

    if (typeof opts == "object")
        redisq.options(opts);

    port = port || 3000;
    host = host || "localhost";

    console.log('Redisq frontend has been started on %s:%s, pid: %s',
            host, port, process.pid);

    worker.listen(port, host);
};