var worker = require("./worker");

module.exports.app = worker.app;

module.exports.listen = function(port, cb, opts) {

    var redisq  = require('../');

    if (typeof opts == "object") redisq.options(opts);

    port = port || 3000;

    worker.configure();
    worker.app.listen(port, cb);

};