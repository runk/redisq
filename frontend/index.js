var worker = require("./worker");

module.exports.app = worker.app;

module.exports.listen = function(port, host, opts) {

    var redisq  = require('../');

    if (typeof opts == "object") redisq.options(opts);

    port = port || 3000;
    host = host || "localhost";

    worker.configure();
    worker.app.listen(port, host, function() {
        console.log('Redisq frontend has been started on %s:%s, pid: %s',
            host, port, process.pid);
    });
};
