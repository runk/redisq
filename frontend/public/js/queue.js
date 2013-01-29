$(document).ready(function() {

  var _last = '';

  var SERIES_PROCESSED = 0,
      SERIES_FAILED    = 1,
      SERIES_BACKLOG   = 2;

  var dummy = [
    [ Date.UTC(2011, 1, 1, 0, 0), 0 ]
  ];
  var _chart = new Highcharts.StockChart({
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
      selected: 1
    },
    chart: { renderTo: 'chartbox' },
    title: { text: null },
    plotOptions: {
      spline: {
        // marker : { enabled : true, radius : 3 },
        shadow : true
      }
    },
    series: [{
        name: 'Processed',
        data: [].concat(dummy),
        type: 'spline',
        color: '#393'
    }, {
        name: 'Failed',
        data: [].concat(dummy),
        type: 'spline',
        color: '#903'
    }, {
        name: 'Backlog',
        data: [].concat(dummy),
        type: 'spline',
        color: '#f66'
    }],
    xAxis : {
      events : {
        afterSetExtremes: afterSetExtremes
      },
      minRange: 3600 * 1000
    },
  });

  function afterSetExtremes(e) {
    var url,
      currentExtremes = this.getExtremes();

    _chart.showLoading('Loading data from server...');

    $.getJSON("/queues/" + qname + "/history", { last: _last, min: e.min, max: e.max }, function(stats) {

      // chart.series[0].setData(data);
      if (stats.history) {
        _chart.series[SERIES_PROCESSED].setData(stats.history.processed);
        _chart.series[SERIES_FAILED].setData(stats.history.failed);
        _chart.series[SERIES_BACKLOG].setData(stats.history.backlog);
      }

      _chart.hideLoading();
    });
  };


  function _loadData() {
    $.getJSON("/queues/" + qname + "/history", { last: _last }, function(stats) {

      $("ul.thumbnails.queue-counters h3.queued").html(addCommas(stats.counters.queued));
      $("ul.thumbnails.queue-counters h3.processed").html(addCommas(stats.counters.processed));
      $("ul.thumbnails.queue-counters h3.failed span").html(addCommas(stats.counters.failed));
      $("ul.thumbnails.queue-counters h3.failed small").html(
        (stats.counters.failed*100/(stats.counters.processed + stats.counters.failed) || 0).toFixed(2) + '%'
      );

      if (stats.history) {
        _chart.series[SERIES_PROCESSED].setData(stats.history.processed);
        _chart.series[SERIES_FAILED].setData(stats.history.failed);
        _chart.series[SERIES_BACKLOG].setData(stats.history.backlog);
      }

      _last = stats.sig;
    });
  }

  setInterval(_loadData, 3000);
  _loadData();


  $('#btnResetCounters').click(function() {
    $.post("/queues/" + qname + "/reset-counters", function() {
      $('ul.thumbnails.queue-counters h3').html('0');
    });
  });
});

function addCommas(num) {
  return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
};