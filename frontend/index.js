var worker = require("./worker"),
    redisq  = require('../');

module.exports.app = worker.app;

module.exports.listen = function(port, host, opts, callback) {

    var params = {
        'port': 3000,
        'host': 'localhost',
        'opts': null,
        'callback': function() {
            console.log('Redisq frontend has been started on %s:%s, pid: %s',
                params.host, params.port, process.pid);
        }
    };

    if (port != undefined)
        params.port = port;

    if (typeof host == 'string')
        params.host = host;
    else if (typeof host == 'object')
        params.opts = host;
    else if (typeof host == 'function')
        params.callback = host;

    if (typeof opts == 'object')
        params.opts = opts;
    else if (typeof opts == 'function')
        params.callback = opts;

    if (typeof callback == 'function')
        params.callback = callback;

    if (params.opts)
        redisq.options(opts);

    worker.configure();
    worker.app.listen(params.port, params.host, params.callback);
};
