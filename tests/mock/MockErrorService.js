/**
 * Copyright 2014, Yahoo! Inc.
 * Copyrights licensed under the New BSD License. See the accompanying LICENSE file for terms.
 */
var MockErrorService = {
    name: 'mock_error_service',

    // ------------------------------------------------------------------
    // CRUD Methods
    // ------------------------------------------------------------------

    /**
     * read operation (read as in CRUD).
     * @method read
     * @param {Object} req  The request object from connect/express
     * @param {String} resource  The resource name
     * @param {Object} params    The parameters identify the resource, and along with information
     *                           carried in query and matrix parameters in typical REST API
     * @param {Object} [config={}] The config object.  It can contain "config" for per-request config data.
     * @param {Fetcher~fetcherCallback} callback callback invoked when fetcher is complete.
     * @static
     */
    read: function (req, resource, params, config, callback) {
        callback({
            statusCode: parseInt(params.query.statusCode),
            output: params.query.output,
            message: params.query.message,
            read: 'error'
        }, null);
    },
    /**
     * create operation (create as in CRUD).
     * @method create
     * @param {Object} req  The request object from connect/express
     * @param {String} resource  The resource name
     * @param {Object} params    The parameters identify the resource, and along with information
     *                           carried in query and matrix parameters in typical REST API
     * @param {Object} body      The JSON object that contains the resource data that is being created
     * @param {Object} [config={}] The config object.  It can contain "config" for per-request config data.
     * @param {Fetcher~fetcherCallback} callback callback invoked when fetcher is complete.
     * @static
     */
    create: function (req, resource, params, body, config, callback) {
        callback({
            statusCode: parseInt(body.params.statusCode),
            message: body.params.message,
            output: body.params.output,
            create: 'error'
        }, null);
    },
    /**
     * update operation (update as in CRUD).
     * @method update
     * @param {Object} req  The request object from connect/express
     * @param {String} resource  The resource name
     * @param {Object} params    The parameters identify the resource, and along with information
     *                           carried in query and matrix parameters in typical REST API
     * @param {Object} body      The JSON object that contains the resource data that is being updated
     * @param {Object} [config={}] The config object.  It can contain "config" for per-request config data.
     * @param {Fetcher~fetcherCallback} callback callback invoked when fetcher is complete.
     * @static
     */
    update: function (req, resource, params, body, config, callback) {
        callback({
            statusCode: parseInt(body.params.statusCode),
            message: body.params.message,
            output: body.params.output,
            update: 'error'
        }, null);
    },
    /**
     * delete operation (delete as in CRUD).
     * @method delete
     * @param {Object} req  The request object from connect/express
     * @param {String} resource  The resource name
     * @param {Object} params    The parameters identify the resource, and along with information
     *                           carried in query and matrix parameters in typical REST API
     * @param {Object} [config={}] The config object.  It can contain "config" for per-request config data.
     * @param {Fetcher~fetcherCallback} callback callback invoked when fetcher is complete.
     * @static
     */
    delete: function (req, resource, params, body, config, callback) {
        callback({
            statusCode: parseInt(body.params.statusCode),
            message: body.params.message,
            output: body.params.output,
            delete: 'error'
        }, null);
    }

};

module.exports = MockErrorService;
