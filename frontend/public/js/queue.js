$(document).ready(function() {

  var _last = '',
    _chart;

  var SERIES_PROCESSED = 0,
      SERIES_FAILED    = 1,
      SERIES_BACKLOG   = 2;

  function _createChart(stats) {
    var ndata = stats.history.processed.concat([[ new Date().getTime(), null ]]);

    _chart = new Highcharts.StockChart({
      global: { useUTC: false },
      rangeSelector: {
        inputEnabled: false,
        buttons: [
            { type: 'hour', count: 1, text: '1h' },
            { type: 'hour', count: 6, text: '6h' },
            { type: 'hour', count: 12, text: '12h' },
            { type: 'day', count: 1, text: '1d' },
            { type: 'all', text: 'all' }
        ],
        selected: 2
      },
      chart: { renderTo: 'chartbox' },
      title: { text: null },
      plotOptions: {
        spline: {
          marker : { enabled : true, radius : 3 },
          shadow : true
        }
      },
      series: [{
          name: 'Processed',
          data: stats.history.processed,
          type: 'spline',
          color: '#393',
          dataGrouping: { enabled: false }
      }, {
          name: 'Failed',
          data: stats.history.failed,
          type: 'spline',
          color: '#903',
          dataGrouping: { enabled: false }
      }, {
          name: 'Backlog',
          data: stats.history.backlog,
          type: 'spline',
          color: '#f66',
          dataGrouping: { enabled: false }
      }],
      xAxis : {
        events : { afterSetExtremes: _afterSetExtremes },
        minRange: 3600 * 1000
      },
      navigator : {
        adaptToUpdatedData: false,
        series: { data: ndata }
      }
    });
  }

  function _afterSetExtremes(e) {
    var url,
      currentExtremes = this.getExtremes();

    _chart.showLoading('Loading data from server...');

    $.getJSON("/queues/" + qname + "/history", { last: _last, min: e.min, max: e.max }, function(stats) {
      if (stats.history) {
        _chart.series[SERIES_PROCESSED].setData(stats.history.processed);
        _chart.series[SERIES_FAILED].setData(stats.history.failed);
        _chart.series[SERIES_BACKLOG].setData(stats.history.backlog);
      }

      _chart.hideLoading();
      _last = stats.sig;
    });
  };

  function _getCounters() {
    $.getJSON("/queues/" + qname + "/counters", function(stats) {
      $("ul.thumbnails.queue-counters h3.queued").html(addCommas(stats.counters.queued));
      $("ul.thumbnails.queue-counters h3.processed").html(addCommas(stats.counters.processed));
      $("ul.thumbnails.queue-counters h3.failed span").html(addCommas(stats.counters.failed));
      $("ul.thumbnails.queue-counters h3.failed small").html(
        (stats.counters.failed*100/(stats.counters.processed + stats.counters.failed) || 0).toFixed(2) + '%'
      );
    });
  }
  setInterval(_getCounters, 10000);

  $.getJSON("/queues/" + qname + "/history", { last: _last }, function(stats) {
    _createChart(stats);
    _last = stats.sig;
  });


  $('#btnResetCounters').click(function() {
    $.post("/queues/" + qname + "/counters-reset", function() {
      $('ul.thumbnails.queue-counters h3').html('0');
    });
  });
});

function addCommas(num) {
  return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
};