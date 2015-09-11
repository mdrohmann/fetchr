/**
 * Copyright 2014, Yahoo! Inc.
 * Copyrights licensed under the New BSD License. See the accompanying LICENSE file for terms.
 */

/*jslint plusplus:true,nomen:true */

/**
 * Fetcher is a CRUD interface for your data.
 * @module Fetcher
 */
var REST = require('./util/http.client');
var debug = require('debug')('FetchrClient');
var lodash = {
        isFunction: require('lodash/lang/isFunction'),
        forEach: require('lodash/collection/forEach'),
        merge: require('lodash/object/merge'),
        pick: require('lodash/object/pick')
    };
//var DEFAULT_GUID = 'g0';
var DEFAULT_XHR_PATH = '/api';
var DEFAULT_XHR_TIMEOUT = 3000;
var MAX_URI_LEN = 2048;
var OP_READ = 'read';
var OP_CREATE = 'create';
var defaultConstructUri = require('./util/defaultConstructUri');
var Promise = global.Promise || require('es6-promise').Promise;

function parseResponse(response) {
    if (response && response.responseText) {
        try {
            return JSON.parse(response.responseText);
        } catch (e) {
            debug('json parse failed:' + e, 'error');
            return null;
        }
    }
    return null;
}

/**
 * Pick keys from the context object
 * @method pickContext
 * @param {Object} context context object
 * @param {Function} picker picker function for lodash/object/pick
 * @param {String} method method name, get or post
 */
function pickContext (context, picker, method) {
    return picker && picker[method] ? lodash.pick(context, picker[method]) : context;
}

/**
 * A RequestClient instance represents a single fetcher request.
 * The constructor requires `operation` (CRUD) and `resource`.
 * @class RequestClient
 * @param {String} operation The CRUD operation name: 'create|read|update|delete'.
 * @param {String} resource name of fetcher/service
 * @param {Object} options configuration options for Request
 * @constructor
 */
function Request (operation, resource, options) {
    if (!resource) {
        throw new Error('Resource is required for a fetcher request');
    }

    this.operation = operation || OP_READ;
    this.resource = resource;
    this.options = {
        xhrPath: options.xhrPath || DEFAULT_XHR_PATH,
        xhrTimeout: options.xhrTimeout || DEFAULT_XHR_TIMEOUT,
        corsPath: options.corsPath,
        context: options.context || {},
        contextPicker: options.contextPicker || {}
    };
    this._params = {};
    this._body = null;
    this._clientConfig = {};
}

/**
 * Add params to this fetcher request
 * @method params
 * @memberof Request
 * @param {Object} params Information carried in query and matrix parameters in typical REST API
 * @chainable
 */
Request.prototype.params = function (params) {
    this._params = params || {};
    return this;
};

/**
 * Add body to this fetcher request
 * @method body
 * @memberof Request
 * @param {Object} body The JSON object that contains the resource data being updated for this request.
 *                      Not used for read and delete operations.
 * @chainable
 */
Request.prototype.body = function (body) {
    this._body = body || null;
    return this;
};

/**
 * Add clientConfig to this fetcher request
 * @method clientConfig
 * @memberof Request
 * @param {Object} config config for this fetcher request
 * @chainable
 */
Request.prototype.clientConfig = function (config) {
    this._clientConfig = config || {};
    return this;
};

/**
 * Execute this fetcher request and call callback.
 * @method end
 * @memberof Request
 * @param {Fetcher~fetcherCallback} callback callback invoked when fetcher/service is complete.
 * @async
 */
Request.prototype.end = function (callback) {
    var self = this;
    var promise = new Promise(function (resolve, reject) {
        debug('Executing request %s.%s with params %o and body %o', self.resource, self.operation, self._params, self._body);
        setImmediate(executeRequest, self, resolve, reject);
    });

    if (callback) {
        promise.then(function (data) {
            setImmediate(callback, null, data);
        }, function (err) {
            setImmediate(callback, err);
        });
    } else {
        return promise;
    }
};

/**
 * Execute and resolve/reject this fetcher request
 * @method executeRequest
 * @param {Object} request Request instance object
 * @param {Function} resolve function to call when request fulfilled
 * @param {Function} reject function to call when request rejected
 */
function executeRequest (request, resolve, reject) {
    var clientConfig = request._clientConfig;
    var use_post_for_read;
    var override_methods;
    var allow_retry_post;
    var uri = clientConfig.uri;
    var headers;
    var requests;
    var params;
    var opmaps = {
        'create': 'post',
        'update': 'put',
        'delete': 'delete'
    };
    var opname;

    if (!uri) {
        uri = clientConfig.cors ? request.options.corsPath : request.options.xhrPath;
    }

    override_methods = clientConfig.override_methods || false;

    use_post_for_read = request.operation !== OP_READ || clientConfig.post_for_read;
    var uriFn = lodash.isFunction(clientConfig.constructUri) ? clientConfig.constructUri : defaultConstructUri;
    debug(request.operation);
    debug(pickContext(request.options.context, request.options.contextPicker, request.operation));
    var temp_uri = uriFn.call(request, uri, request.resource, request._params, clientConfig, pickContext(request.options.context, request.options.contextPicker, request.operation));

    if (request.operation === OP_READ) {
       if (temp_uri.length <= MAX_URI_LEN) {
           uri = temp_uri;
       } else {
           uri = uriFn.call(request, uri, request.resource, request._params, clientConfig, pickContext(request.options.context, request.options.contextPicker, OP_READ));
           use_post_for_read = true;
       }
    } else {
        uri = temp_uri;
    }

    if (request.operation === OP_READ && !use_post_for_read) {
        return REST.get(uri, {}, lodash.merge({xhrTimeout: request.options.xhrTimeout}, clientConfig), function getDone(err, response) {
            if (err) {
                debug('Syncing ' + request.resource + ' failed: statusCode=' + err.statusCode, 'info');
                return reject(err);
            }
            resolve(parseResponse(response));
        });
    }

    // Here we are handling POST, PUT and DELETE requests

    // individual request is also normalized into a request hash to pass to api
    requests = {};
    if (request._body) {
        requests.body = request._body;
    }

    if (use_post_for_read && request.operation === OP_READ) {
        requests.operation = OP_READ;
    }

    allow_retry_post = (request.operation === OP_READ);

    opname = opmaps[request.operation];

    headers = {};
    if (override_methods) {
        headers['X-Http-Method-Override'] = opname.toUpperCase();
        request.operation = request.operation;
        opname = 'POST';
    }

    debug('REST operation', uri);
    REST[opname](uri, headers, requests, lodash.merge({unsafeAllowRetry: allow_retry_post, xhrTimeout: request.options.xhrTimeout}, clientConfig), function postDone(err, response) {
        if (err) {
            debug('Syncing ' + request.resource + ' failed: statusCode=' + err.statusCode, 'info');
            return reject(err);
        }
        var result = parseResponse(response);
        if (!result) {
            result = {};
        }
        resolve(result);
    });
};


/**
 * Fetcher class for the client. Provides CRUD methods.
 * @class FetcherClient
 * @param {Object} options configuration options for Fetcher
 * @param {String} [options.xhrPath="/api"] The path for XHR requests
 * @param {Number} [options.xhrTimout=3000] Timeout in milliseconds for all XHR requests
 * @param {Boolean} [options.corsPath] Base CORS path in case CORS is enabled
 * @param {Object} [options.context] The context object that is propagated to all outgoing
 *      requests as query params.  It can contain current-session/context data that should
 *      persist to all requests.
 * @param {Object} [options.contextPicker] The context picker for GET and POST, they must be
 *      lodash pick predicate function with three arguments (value, key, object)
 * @param {Function|String|String[]} [options.contextPicker.GET] GET context picker
 * @param {Function|String|String[]} [options.contextPicker.POST] POST context picker
 */

function Fetcher (options) {
    this.options = options || {};
}

Fetcher.prototype = {
    // ------------------------------------------------------------------
    // Data Access Wrapper Methods
    // ------------------------------------------------------------------

    /**
     * create operation (create as in CRUD).
     * @method create
     * @param {String} resource     The resource name
     * @param {Object} params       The parameters identify the resource, and along with information
     *                              carried in query and matrix parameters in typical REST API
     * @param {Object} body         The JSON object that contains the resource data that is being created
     * @param {Object} clientConfig The "config" object for per-request config data.
     * @param {Function} callback   callback convention is the same as Node.js
     * @static
     */
    create: function (resource, params, body, clientConfig, callback) {
        var request = new Request('create', resource, this.options);
        if (1 === arguments.length) {
            return request;
        }
        // TODO: Remove below this line in release after next
        if (typeof clientConfig === 'function') {
            callback = clientConfig;
            clientConfig = {};
        }
        request
            .params(params)
            .body(body)
            .clientConfig(clientConfig)
            .end(callback)
    },

    /**
     * read operation (read as in CRUD).
     * @method read
     * @param {String} resource     The resource name
     * @param {Object} params       The parameters identify the resource, and along with information
     *                              carried in query and matrix parameters in typical REST API
     * @param {Object} clientConfig The "config" object for per-request config data.
     * @param {Function} callback   callback convention is the same as Node.js
     * @static
     */
    read: function (resource, params, clientConfig, callback) {
        var request = new Request('read', resource, this.options);
        if (1 === arguments.length) {
            return request;
        }
        // TODO: Remove below this line in release after next
        if (typeof clientConfig === 'function') {
            callback = clientConfig;
            clientConfig = {};
        }
        request
            .params(params)
            .clientConfig(clientConfig)
            .end(callback)
    },

    /**
     * update operation (update as in CRUD).
     * @method update
     * @param {String} resource     The resource name
     * @param {Object} params       The parameters identify the resource, and along with information
     *                              carried in query and matrix parameters in typical REST API
     * @param {Object} body         The JSON object that contains the resource data that is being updated
     * @param {Object} clientConfig The "config" object for per-request config data.
     * @param {Function} callback   callback convention is the same as Node.js
     * @static
     */
    update: function (resource, params, body, clientConfig, callback) {
        var request = new Request('update', resource, this.options);
        if (1 === arguments.length) {
            return request;
        }
        // TODO: Remove below this line in release after next
        if (typeof clientConfig === 'function') {
            callback = clientConfig;
            clientConfig = {};
        }
        request
            .params(params)
            .body(body)
            .clientConfig(clientConfig)
            .end(callback)
    },

    /**
     * delete operation (delete as in CRUD).
     * @method delete
     * @param {String} resource     The resource name
     * @param {Object} params       The parameters identify the resource, and along with information
     *                              carried in query and matrix parameters in typical REST API
     * @param {Object} body         The JSON object that contains the resource data that is being updated.
     *                              I added this, because I think that DELETE
     *                              should allow a message body in certain cases.
     * @param {Object} clientConfig The "config" object for per-request config data.
     * @param {Function} callback   callback convention is the same as Node.js
     * @static
     */
    'delete': function (resource, params, body, clientConfig, callback) {
        var request = new Request('delete', resource, this.options);
        if (1 === arguments.length) {
            return request;
        }
        // TODO: Remove below this line in release after next
        if (typeof clientConfig === 'function') {
            callback = clientConfig;
            clientConfig = {};
        }
        request
            .params(params)
            .body(body)
            .clientConfig(clientConfig)
            .end(callback)
    },

    /**
     * Update options
     * @method updateOptions
     */
    updateOptions: function (options) {
        this.options = lodash.merge(this.options, options);
    }
};

module.exports = Fetcher;
