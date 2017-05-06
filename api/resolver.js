var key = require('../utils/key');
var sync = require('synchronize');
var request = require('request');
var createTemplate = require('../utils/template');

// The API that returns the in-email representation.
module.exports = function(req, res) {
  var term = req.query.text.trim();

  if (/^https:\/\/www\.yelp\.com\/biz\/\S+/.test(term)) {
      handleSearchId(term.replace(/^https:\/\/www\.yelp\.com\/biz\//, ''), req, res);
  } else {
    handleSearchString(term, req, res);
  }
};

function handleSearchId(id, req, res) {
  var response;
  try {
    response = sync.await(request({
      url: 'https://api.yelp.com/v3/businesses/' + encodeURIComponent(id),
      auth: {
        'bearer': key
      },
      gzip: true,
      json: true,
      timeout: 15 * 1000
    }, sync.defer()));
  } catch (e) {
    res.status(500).send('Error');
    return;
  }

  res.json({
    body: createTemplate.resolver(response.body)
  });
}

function handleSearchString(term, req, res) {
  var delimIndex = term.indexOf(' in ');

  if (delimIndex !== -1) {
    var foodTerm = term.slice(0, delimIndex).trim();
    var cityTerm = term.slice((foodTerm + ' in ').length).trim();
  }

  if (!foodTerm || !cityTerm) {
    return;
  }

  var response;
  try {
    response = sync.await(request({
      url: 'https://api.yelp.com/v3/businesses/search',
      qs: {
        term: foodTerm,
        location: cityTerm,
        radius: 25000, //Meters
        limit: 1
      },
      auth: {
        'bearer': key
      },
      gzip: true,
      json: true,
      timeout: 10 * 1000
    }, sync.defer()));
  } catch (e) {
    res.status(500).send('Error');
    return;
  }

  if (response.statusCode !== 200 || !response.body) {
    res.status(500).send('Error');
    return;
  }

  res.json({
    body: createTemplate.resolver(response.body.businesses[0])
  });
}
