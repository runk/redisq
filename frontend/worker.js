
var express = require('express'),
    app = express();

module.exports.app = app;

module.exports.configure = function() {
    app.configure(function() {
        app.set('views', __dirname + '/views');
        app.set('view engine', 'jade');
        app.disable('view cache');
        app.use(express.static(__dirname + '/public'));
    });

    // helpers
    app.locals.addCommas = require(__dirname + '/views/helpers/add_commas');
    app.locals.pretty = true;

    app.get("/favicon.ico", function(req, res) {
        res.end("");
    });
    app.get("/", require(__dirname + '/controllers/index').index);
    app.get("/queues/:name", require(__dirname + '/controllers/queues').show);
    app.get("/queues/:name/history", require(__dirname + '/controllers/queues').history);
    app.post("/queues/:name/purge", require(__dirname + '/controllers/queues').purge);
    app.post("/queues/:name/counters-reset", require(__dirname + '/controllers/queues').countersReset);
    app.get("/queues/:name/counters", require(__dirname + '/controllers/queues').countersGet);
    app.post("/queues/:name/history-reset", require(__dirname + '/controllers/queues').historyReset);
    app.get("/status", require(__dirname + '/controllers/status'));
};
