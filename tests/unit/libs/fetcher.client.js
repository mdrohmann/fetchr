/**
 * Copyright 2014, Yahoo! Inc.
 * Copyrights licensed under the New BSD License. See the accompanying LICENSE file for terms.
 */
/*jshint expr:true*/
/*globals before,beforeEach,after,afterEach,describe,it */
"use strict";

var _ = require('lodash');
var libUrl = require('url');
var expect = require('chai').expect;
var mockery = require('mockery');
var Fetcher;
var fetcher;
var app = require('../../mock/app');
var supertest = require('supertest');
var request = require('request');
var qs = require('qs');
var resource = 'mock_service';
var DEFAULT_XHR_PATH = '/api';

var validateGET;
var validatePOST;
var validateHTTP = function (options) {
    options = options || {};
    validateGET = options.validateGET;
    validatePOST = options.validatePOST;
};
describe('Client Fetcher', function () {
    beforeEach(function () {
        mockery.registerMock('./util/http.client', {
            get: function (url, headers, config, callback) {
                validateGET && validateGET(url, headers, config);
                supertest(app)
                    .get(url)
                    .expect(200)
                    .end(function (err, res) {
                        callback(err, {
                            responseText: res.text
                        });
                    });
            },
            'delete' : function (url, headers, body, config, callback) {
                expect(url).to.not.be.empty;
                expect(callback).to.exist;
                expect(body).to.exist;
                validatePOST && validatePOST(url, headers, body, config);
                supertest(app)
                    .del(url)
                    .send(body)
                    .expect(200)
                    .end(function (err, res) {
                        callback(err, {
                            responseText: res.text
                        });
                    });
            },
            put : function (url, headers, body, config, callback) {
                expect(url).to.not.be.empty;
                expect(callback).to.exist;
                expect(body).to.exist;
                validatePOST && validatePOST(url, headers, body, config);
                supertest(app)
                    .put(url)
                    .send(body)
                    .expect(200)
                    .end(function (err, res) {
                        callback(err, {
                            responseText: res.text
                        });
                    });
            },
            post : function (url, headers, body, config, callback) {
                expect(url).to.not.be.empty;
                expect(callback).to.exist;
                expect(body).to.exist;
                validatePOST && validatePOST(url, headers, body, config);
                supertest(app)
                    .post(url)
                    .send(body)
                    .expect(200)
                    .end(function (err, res) {
                        callback(err, {
                            responseText: res.text
                        });
                    });
            }
        });
        mockery.enable({
            useCleanCache: true,
            warnOnUnregistered: false
        });
        Fetcher = require('../../../libs/fetcher.client');
        validateHTTP(); // Important, reset validate functions
    });
    afterEach(function () {
        mockery.deregisterAll();
        mockery.disable();
    });
    var testCrud = function (it, resource, params, paths, body, config, callback) {
            it('should handle CREATE', function (done) {
                var operation = 'create';
                fetcher
                    [operation](resource)
                    .params({query: params, paths: paths})
                    .body(body)
                    .clientConfig(config)
                    .end(callback(operation, done));
            });
            it('should handle READ', function (done) {
                var operation = 'read';
                fetcher
                    [operation](resource)
                    .params({query: params, paths: paths})
                    .clientConfig(config)
                    .end(callback(operation, done));
            });
            it('should handle UPDATE', function (done) {
                var operation = 'update';
                fetcher
                    [operation](resource)
                    .params({query: params, paths: paths})
                    .body(body)
                    .clientConfig(config)
                    .end(callback(operation, done));
            });
            it('should handle DELETE', function (done) {
                var operation = 'delete';
                fetcher
                    [operation](resource)
                    .params({query: params, paths: paths})
                    .clientConfig(config)
                    .end(callback(operation, done));
            });
        };

    describe('CRUD Interface', function () {
        var context = {_csrf: 'stuff'};
        beforeEach(function () {
            fetcher = new Fetcher({
                context: context
            });
            validateHTTP({
                validateGET: function (url, headers, config) {
                    expect(url).to.contain(DEFAULT_XHR_PATH + '/' + resource);
                    expect(url).to.contain('_csrf=' + context._csrf);
                },
                validatePOST: function (url, headers, body, config) {
                    expect(url).to.contain(DEFAULT_XHR_PATH + '/' + resource);
                    expect(url).to.contain('_csrf=' + context._csrf);
                }
            });
        });
        var params = {
                uuids: ['1','2','3','4','5']
            };
        var body = { stuff: 'is'};
        var paths = ['a', 'b'];
        var config = {};
        var callback = function (operation, done) {
                return function (err, data) {
                    if (err){
                        done(err);
                    }
                    expect(data.operation).to.exist;
                    expect(data.operation.name).to.equal(operation);
                    expect(data.operation.success).to.be.true;
                    expect(data.args).to.exist;
                    expect(data.args.resource).to.equal(resource);
                    expect(data.args.params.query).to.eql(_.assign({}, params, context));
                    expect(data.args.params.paths).to.eql(paths);
                    done();
                };
            };
        var resolve = function (operation, done) {
            return function (data) {
                try {
                    expect(data).to.exist;
                    expect(data.operation).to.exist;
                    expect(data.operation.name).to.equal(operation);
                    expect(data.operation.success).to.be.true;
                    expect(data.args).to.exist;
                    expect(data.args.resource).to.equal(resource);
                    expect(data.args.params.query).to.eql(_.assign(params, context));
                } catch (e) {
                    done(e);
                    return;
                }
                done();
            };
        };
        var reject = function (operation, done) {
            return function (err) {
                done(err);
            };
        };
        describe('should work superagent style', function (done) {
            describe('with callbacks', function () {
                testCrud(it, resource, params, paths, body, config, callback);
                it('should throw if no resource is given', function () {
                    expect(fetcher.read).to.throw('Resource is required for a fetcher request');
                });
            });
            describe('with Promises', function () {
                it('should handle CREATE', function (done) {
                    var operation = 'create';
                    fetcher
                        [operation](resource)
                        .params({query: params, paths: paths})
                        .body(body)
                        .clientConfig(config)
                        .end()
                        .then(resolve(operation, done), reject(operation, done));
                });
                it('should handle READ', function (done) {
                    var operation = 'read';
                    fetcher
                        [operation](resource)
                        .params({query: params, paths: paths})
                        .clientConfig(config)
                        .end()
                        .then(resolve(operation, done), reject(operation, done));
                });
                it('should handle UPDATE', function (done) {
                    var operation = 'update';
                    fetcher
                        [operation](resource)
                        .params({query: params, paths: paths})
                        .body(body)
                        .clientConfig(config)
                        .end()
                        .then(resolve(operation, done), reject(operation, done));
                });
                it('should handle DELETE', function (done) {
                    var operation = 'delete';
                    fetcher
                        [operation](resource)
                        .params({query: params, paths: paths})
                        .clientConfig(config)
                        .end()
                        .then(resolve(operation, done), reject(operation, done));
                });
                it('should throw if no resource is given', function () {
                    expect(fetcher.read).to.throw('Resource is required for a fetcher request');
                });
            })
        });
    });
    describe('CORS', function () {
        // start CORS app at localhost:3001
        var corsApp = require('../../mock/corsApp');
        var corsPath = 'http://localhost:3001';
        var params = {
                uuids: ['1','2','3','4','5'],
                corsDomain: 'test1'
            },
            body = { stuff: 'is'},
            context = {
                _csrf: 'stuff'
            },
            callback = function(operation, done) {
                return function(err, data) {
                    if (err){
                        return done(err);
                    }
                    if (data) {
                        expect(data).to.deep.equal(_.assign({}, params, context));
                    }
                    done();
                };
            };
        beforeEach(function() {
            mockery.deregisterAll(); // deregister default http.client mock
            mockery.registerMock('./util/http.client', { // register CORS http.client mock
                get: function (url, headers, config, callback) {
                    expect(url).to.contain(corsPath);
                    var path = url.substr(corsPath.length);
                    // constructGetUri above doesn't implement csrf so we don't check csrf here
                    supertest(corsPath)
                        .get(path)
                        .expect(200)
                        .end(function (err, res) {
                            callback(err, {
                                responseText: res.text
                            });
                        });
                },
                'delete' : function (url, headers, body, config, callback) {
                    expect(url).to.not.be.empty;
                    expect(callback).to.exist;
                    expect(body).to.exist;
                    expect(url).to.contain(corsPath)
                    expect(url).to.contain('_csrf=' + context._csrf);
                    var path = url.substring(corsPath.length);
                    console.log(body);
                    supertest(corsPath)
                        .post(path)
                        .send(body)
                        .expect(200)
                        .end(function (err, res) {
                            callback(err, {
                                responseText: res.text
                            });
                        });
                },
                put : function (url, headers, body, config, callback) {
                    expect(url).to.not.be.empty;
                    expect(callback).to.exist;
                    expect(body).to.exist;
                    expect(url).to.contain(corsPath)
                    expect(url).to.contain('_csrf=' + context._csrf);
                    var path = url.substring(corsPath.length);
                    console.log(body);
                    supertest(corsPath)
                        .post(path)
                        .send(body)
                        .expect(200)
                        .end(function (err, res) {
                            callback(err, {
                                responseText: res.text
                            });
                        });
                },
                post : function (url, headers, body, config, callback) {
                    expect(url).to.not.be.empty;
                    expect(callback).to.exist;
                    expect(body).to.exist;
                    expect(url).to.contain(corsPath)
                    expect(url).to.contain('_csrf=' + context._csrf);
                    var path = url.substring(corsPath.length);
                    console.log(body);
                    supertest(corsPath)
                        .post(path)
                        .send(body)
                        .expect(200)
                        .end(function (err, res) {
                            callback(err, {
                                responseText: res.text
                            });
                        });
                }
            });
            mockery.resetCache();
            Fetcher = require('../../../libs/fetcher.client');
            fetcher = new Fetcher({
                context: context,
                corsPath: corsPath
            });
        });
        afterEach(function () {
            mockery.deregisterAll(); // deregister CORS http.client mock
        });


        function constructGetUri (uri, resource, params, config) {
            if (config.cors) {
                return uri + '/' + resource + '?' + qs.stringify(params);
            }
        }

        testCrud(it, resource, params, [], body, {
            cors: true,
            constructGetUri: constructGetUri
        }, callback);
    });

    describe('xhrTimeout', function () {
        var DEFAULT_XHR_TIMEOUT = 3000;
        var params = {
                uuids: [1,2,3,4,5],
                category: ''
            },
            body = { stuff: 'is'},
            context = {
                _csrf: 'stuff'
            },
            config = {},
            callback = function(operation, done) {
                return function(err, data) {
                    if (err){
                        done(err);
                    }
                    done();
                };
            };

        describe('should be configurable globally', function () {
            beforeEach(function(){
                validateHTTP({
                    validateGET: function (url, headers, config) {
                        expect(config.xhrTimeout).to.equal(4000);
                    },
                    validatePOST: function (url, headers, body, config) {
                        expect(config.xhrTimeout).to.equal(4000);
                    }
                });

                fetcher = new Fetcher({
                    context: context,
                    xhrTimeout: 4000
                });
            });

            testCrud(it, resource, params, [], body, config, callback);
        });

        describe('should be configurable per each fetchr call', function () {
            config = {timeout: 5000};
            beforeEach(function(){
                validateHTTP({
                    validateGET: function (url, headers, config) {
                        expect(config.xhrTimeout).to.equal(4000);
                        expect(config.timeout).to.equal(5000);
                    },
                    validatePOST: function (url, headers, body, config) {
                        expect(config.xhrTimeout).to.equal(4000);
                        expect(config.timeout).to.equal(5000);
                    }
                });
                fetcher = new Fetcher({
                    context: context,
                    xhrTimeout: 4000
                });
            });

            testCrud(it, resource, params, [], body, config, callback);
        });

        describe('should default to DEFAULT_XHR_TIMEOUT of 3000', function () {
            beforeEach(function(){
                validateHTTP({
                    validateGET: function (url, headers, config) {
                        expect(config.xhrTimeout).to.equal(DEFAULT_XHR_TIMEOUT);
                    },
                    validatePOST: function (url, headers, body, config) {
                        expect(config.xhrTimeout).to.equal(DEFAULT_XHR_TIMEOUT);
                    }
                });

                fetcher = new Fetcher({
                    context: context
                });
            });

            testCrud(it, resource, params, [], body, config, callback);
        });
    });

    describe('Context Picker', function () {
        var context = {_csrf: 'stuff', random: 'randomnumber'};
        var params = {};
        var body = {};
        var config = {};
        var callback = function(operation, done) {
                return function(err, data) {
                    if (err){
                        done(err);
                    }
                    done();
                };
            };

        beforeEach(function(){
            fetcher = new Fetcher({
                context: context,
                contextPicker: {
                    read: function getContextPicker(value, key, object) {
                        if (key === 'random') {
                            return false
                        }
                        return true;
                    }
                }
            });
            validateHTTP({
                validateGET: function (url, headers, config) {
                    expect(url).to.contain(DEFAULT_XHR_PATH + '/' + resource);
                    expect(url).to.contain('?_csrf=' + context._csrf);
                    // for GET, ignore 'random'
                    expect(url).to.not.contain('random=' + context.random);
                },
                validatePOST: function (url, headers, body, config) {
                    expect(url).to.contain(DEFAULT_XHR_PATH);
                    expect(url).to.contain('_csrf=' + context._csrf);
                    expect(url).to.contain('random=' + context.random);
                }
            });
        });

        testCrud(it, resource, params, [], body, config, callback);
    });


    describe('Utils', function () {
        it('should able to update options', function () {
            fetcher = new Fetcher({
                context: {
                    _csrf: 'stuff'
                },
                xhrTimeout: 1000
            });
            fetcher.updateOptions({
                context: {
                    lang : 'en-US',
                },
                xhrTimeout: 1500
            })
            expect(fetcher.options.xhrTimeout).to.equal(1500);
            // new context should be merged
            expect(fetcher.options.context._csrf).to.equal('stuff');
            expect(fetcher.options.context.lang).to.equal('en-US');
        });
    });
});
