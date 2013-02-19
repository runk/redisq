var assert = require("assert"),
    Stats = require("../lib/stats");


describe("/lib/stats", function() {
    describe("#historyVacuum", function() {
        var qrecords = [
            '[1360684264000,100,10,1,200,500,1000]',
            '[1360684264000,200,20,2,250,550,2000]',
            '[1360684265000,300,30,3,300,600,3000]',
            '[1360684265000,400,40,4,350,650,4000]',
            '[1360684265000,500,50,5,400,700,5000]',
            '[1360684267000,600,60,6,450,750,6000]',
            '[1360684367000,100,10,1,450,750,6000]' ];

        var good = {
            1360684320000: '[1360684320000,100,10,1,450,750,6000]',
            1360684260000: '[1360684260000,2100,210,21,46,110,284]' };

        var qstats = new Stats("test"),
            res = qstats.historyVacuum(qrecords);

        it("should return equal length", function() {
            assert.equal(Object.keys(good).length, Object.keys(good).length);
        });

        it("should return equal values", function() {
            for (date in res)
                assert.equal(res[date], good[date]);
        });
    });
});