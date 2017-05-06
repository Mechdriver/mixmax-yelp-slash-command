var key = require('../utils/key');
var sync = require('synchronize');
var request = require('request');
var createTemplate = require('../utils/template.js');

// The Type Ahead API.
module.exports = function(req, res) {
  // For Yelp we have to give a search term and a location.
  // Searching by city seems like the logical choice
  // Format: <search term> in <city>

  var searchTerm = req.query.text;
  var delimIndex = searchTerm.indexOf(' in ');

  if (delimIndex !== -1) {
    var foodTerm = searchTerm.slice(0, delimIndex).trim();
    var cityTerm = searchTerm.slice((foodTerm + ' in ').length).trim();
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
        limit: 20
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

  var results = response.body.businesses.map(function(business) {
        return {
          title: createTemplate.typeahead(business),
          text: 'https://www.yelp.com/biz/' + business.id
        };
      })

  if (results.length === 0) {
    res.json([{
      title: '<i>(no results)</i>',
      text: ''
    }]);
  } else {
    res.json(results);
  }
};
