/**
 * Copyright 2015, Yahoo! Inc.
 * Copyrights licensed under the New BSD License. See the accompanying LICENSE file for terms.
 */
'use strict';

var debug = require('debug')('Fetcher:defaultConstructUri');
var qs = require('querystring');
var lodash = {
    forEach: require('lodash/collection/forEach'),
    assign: require('lodash/object/assign'),
};
var OP_READ = 'read';


/**
 * Construct xhr GET URI.
 * @method defaultConstructGetUri
 * @param {String} uri base URI
 * @param {String} resource Resource name
 * @param {Object} params.query Query parameters to be serialized
 * @param {Array} params.path Path elements to be added to the final_uri
 * @param {Object} config Configuration object
 * @param {String} config.id_param  Name of the id parameter
 * @param {Object} context Context object, which will become query params
 */
module.exports = function defaultConstructUri(baseUri, resource, params, config, context) {
    var query = lodash.assign({}, params.query, context);
    var id_param = config.id_param;
    var id_val;
    var final_uri = baseUri + '/' + resource;

    if (params.paths && params.paths.length > 0) {
        final_uri += '/' + params.paths.join('/');
    }
    if (Object.keys(query).length > 0) {
        final_uri += '?' + qs.stringify(query);
    }
    debug('constructed get uri:', final_uri);
    return final_uri;
};
