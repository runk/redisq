var worker = require("./worker");

module.exports.app = worker.app;

module.exports.listen = function(port, done, opts) {

    var redisq  = require('../');

    if (typeof opts == "object") redisq.options(opts);

    port = port || 3000;
    done = done || function(){};

    worker.configure();
    worker.app.listen(port, done);

};