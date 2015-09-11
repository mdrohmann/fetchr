/**
 * Copyright 2014, Yahoo! Inc.
 * Copyrights licensed under the New BSD License. See the accompanying LICENSE file for terms.
 */
/*jshint expr:true*/
/*globals before,describe,it */
"use strict";

var chai = require('chai');
chai.config.includeStack = true;
var expect = chai.expect,
    Fetcher = require('../../../libs/fetcher'),
    fetcher = new Fetcher({
        req: {}
    }),
    mockService = require('../../mock/MockService'),
    mockErrorService = require('../../mock/MockErrorService'),
    qs = require('querystring');

describe('Server Fetcher', function () {
    beforeEach(function () {
        Fetcher.registerService(mockService);
        Fetcher.registerService(mockErrorService);
    });
    afterEach(function () {
        Fetcher.services = {}; // reset services
    });
    it('should register valid fetchers', function () {
        Fetcher.services = {}; // reset services so we can test getService and registerService methods
        var getService = Fetcher.getService.bind(fetcher);
        expect(getService).to.throw(Error, 'Service "undefined" could not be found');
        getService = Fetcher.getService.bind(fetcher, mockService.name);
        expect(getService).to.throw(Error, 'Service "' + mockService.name + '" could not be found');
        expect(Object.keys(Fetcher.services)).to.have.length(0);
        Fetcher.registerService(mockService);
        expect(Object.keys(Fetcher.services)).to.have.length(1);
        expect(getService()).to.deep.equal(mockService);
        Fetcher.registerService(mockErrorService);
        expect(Object.keys(Fetcher.services)).to.have.length(2);

        // valid vs invalid
        var invalidService = {not_name: 'test_name'};
        var validService = {name: 'test_name'};
        var registerInvalidService = Fetcher.registerService.bind(fetcher, undefined);
        expect(registerInvalidService).to.throw(Error, 'Service is not defined correctly');
        registerInvalidService = Fetcher.registerService.bind(fetcher, invalidService);
        expect(registerInvalidService).to.throw(Error, 'Service is not defined correctly');
        var registerValidService = Fetcher.registerService.bind(fetcher, validService);
        expect(registerValidService).to.not.throw;
    });

    it('should get fetchers by resource and sub resource', function () {
        var getService = Fetcher.getService.bind(fetcher, mockService.name);
        expect(getService).to.not.throw;
        expect(getService()).to.deep.equal(mockService);
        getService = Fetcher.getService.bind(fetcher, mockService.name + '.subResource');
        expect(getService).to.not.throw;
        expect(getService()).to.deep.equal(mockService);
    });

    it('should be able to update options for the fetchr instance', function () {
        fetcher.updateOptions({req: {foo: 'bar'}});
        expect(fetcher.options.req.foo).to.equal('bar');
    });

    describe('should be backwards compatible', function () {
        it('#registerFetcher & #getFetcher', function () {
            Fetcher.services = {}; // reset services so we can test getFetcher and registerFetcher methods
            var getFetcher = Fetcher.getFetcher.bind(fetcher, mockService.name);
            expect(getFetcher).to.throw;
            Fetcher.registerFetcher(mockService);
            expect(getFetcher).to.not.throw;
            expect(getFetcher()).to.deep.equal(mockService);
            getFetcher = Fetcher.getFetcher.bind(fetcher, mockService.name + '.subResource');
            expect(getFetcher).to.not.throw;
            expect(getFetcher()).to.deep.equal(mockService);
        });
    });


    describe('#middleware', function () {
        describe('#POST', function() {
            it('should respond to POST api request', function (done) {
                var operation = 'create',
                    statusCodeSet = false,
                    req = {
                        method: 'POST',
                        path: '/' + mockService.name,
                        body: {
                                params: {
                                    uuids: ['cd7240d6-aeed-3fed-b63c-d7e99e21ca17', 'cd7240d6-aeed-3fed-b63c-d7e99e21ca17'],
                                    id: 'asdf'
                                },
                                context: {
                                    site: '',
                                    device: ''
                                }
                        }
                    },
                    res = {
                        json: function(response) {
                            expect(response).to.exist;
                            expect(response).to.not.be.empty;
                            var data = response;
                            expect(data).to.contain.keys('operation', 'args');
                            expect(data.operation.name).to.equal(operation);
                            expect(data.operation.success).to.be.true;
                            expect(data.args).to.contain.keys('params');
                            expect(data.args.body).to.equal(req.body);
                            expect(statusCodeSet).to.be.true;
                            done();
                        },
                        status: function(code) {
                            expect(code).to.equal(200);
                            statusCodeSet = true;
                            return this;
                        },
                        send: function (code) {
                            console.log('Not Expected: middleware responded with', code);
                        }
                    },
                    next = function (code) {
                        console.log('Not Expected: middleware skipped request' + code);
                    },
                    middleware = Fetcher.middleware();

                middleware(req, res, next);
            });

            it('should respond to POST api request with custom status code and custom headers', function (done) {
                var operation = 'create',
                    statusCode = 201,
                    statusCodeSet = false,
                    responseHeaders = {'x-foo': 'foo'},
                    headersSet,
                    req = {
                        method: 'POST',
                        path: '/' + mockService.name,
                        body: {
                            params: {
                                uuids: ['cd7240d6-aeed-3fed-b63c-d7e99e21ca17', 'cd7240d6-aeed-3fed-b63c-d7e99e21ca17'],
                                id: 'asdf'
                            },
                            context: {
                                site: '',
                                device: ''
                            }
                        }
                    },
                    res = {
                        json: function(response) {
                            expect(response).to.exist;
                            expect(response).to.not.be.empty;
                            var data = response;
                            expect(data).to.contain.keys('operation', 'args');
                            expect(data.operation.name).to.equal(operation);
                            expect(data.operation.success).to.be.true;
                            expect(data.args).to.contain.keys('params');
                            expect(data.args.body).to.equal(req.body);
                            expect(headersSet).to.eql(responseHeaders);
                            expect(statusCodeSet).to.be.true;
                            done();
                        },
                        status: function(code) {
                            expect(code).to.equal(statusCode);
                            statusCodeSet = true;
                            return this;
                        },
                        set: function(headers) {
                            headersSet = headers;
                            return this;
                        },
                        send: function (code) {
                            console.log('Not Expected: middleware responded with', code);
                        }
                    },
                    next = function () {
                        console.log('Not Expected: middleware skipped request');
                    },
                    middleware = Fetcher.middleware({pathPrefix: '/api'});

                mockService.meta = {
                    headers: responseHeaders,
                    statusCode: statusCode
                };

                middleware(req, res, next);
            });

            var makePostApiErrorTest = function(params, expStatusCode, expMessage) {
                return function(done) {
                    var operation = 'create',
                        statusCodeSet = false,
                        req = {
                            method: 'POST',
                            path: '/' + mockErrorService.name,
                            body: {
                                params: params,
                                context: {
                                    site: '',
                                    device: ''
                                }
                            }
                        },
                        res = {
                            json: function(data) {
                                expect(data).to.eql(expMessage);
                                expect(statusCodeSet).to.be.true;
                                done();
                            },
                            status: function(code) {
                                expect(code).to.equal(expStatusCode);
                                statusCodeSet = true;
                                return this;
                            },
                            send: function (data) {
                                console.log('send() not expected: middleware responded with', data);
                            }
                        },
                        next = function () {
                            console.log('next() not expected: middleware skipped request');
                        },
                        middleware = Fetcher.middleware({pathPrefix: '/api'});
                    middleware(req, res, next);
                };
            };

            it('should respond to POST api request with default error details',
               makePostApiErrorTest({}, 400, {message: 'request failed'}));

            it('should respond to POST api request with custom error status code',
               makePostApiErrorTest({statusCode: 500}, 500, {message: 'request failed'}));

            it('should respond to POST api request with custom error message',
               makePostApiErrorTest({message: 'Error message...'}, 400, {message: 'Error message...'}));

            it('should respond to POST api request with no leaked error information',
               makePostApiErrorTest({statusCode: 500, danger: 'zone'}, 500, {message: 'request failed'}));


            describe('should respond to POST api request with custom output', function() {
                it('using json object',
                   makePostApiErrorTest({statusCode: 500, output: {
                      message: 'custom message',
                      foo    : 'bar',
                   }}, 500, {message: 'custom message', 'foo': 'bar'}));

                it('using json array',
                   makePostApiErrorTest({statusCode: 500, output: [1, 2]}, 500, [1, 2]));
            });
        });


        describe('#GET', function() {
            it('should respond to GET api request', function (done) {
                var operation = 'read',
                    statusCodeSet = false,
                    params = {
                        uuids: ['cd7240d6-aeed-3fed-b63c-d7e99e21ca17', 'cd7240d6-aeed-3fed-b63c-d7e99e21ca17'],
                        id: 'asdf',
                    },
                    req = {
                        method: 'GET',
                        path: '/' + mockService.name,
                        query: params,
                    },
                    res = {
                        json: function(response) {
                            expect(response).to.exist;
                            expect(response).to.not.be.empty;
                            expect(response).to.contain.keys('operation', 'args');
                            expect(response.operation.name).to.equal(operation);
                            expect(response.operation.success).to.be.true;
                            expect(response.args).to.contain.keys('params');
                            expect(response.args.params.query).to.deep.equal(params);
                            expect(statusCodeSet).to.be.true;
                            done();
                        },
                        status: function(code) {
                            expect(code).to.equal(200);
                            statusCodeSet = true;
                            return this;
                        },
                        send: function (code) {
                            console.log('Not Expected: middleware responded with', code);
                        }
                    },
                    next = function (err) {
                        console.log('Not Expected: middleware skipped request', err);
                    },
                    middleware = Fetcher.middleware({pathPrefix: '/api'});

                middleware(req, res, next);
            });

            it('should respond to GET api request with custom status code and custom headers', function (done) {
                var operation = 'read',
                    statusCodeSet = false,
                    statusCode = 201,
                    responseHeaders = {'Cache-Control': 'max-age=300'},
                    headersSet,
                    params = {
                        uuids: ['cd7240d6-aeed-3fed-b63c-d7e99e21ca17', 'cd7240d6-aeed-3fed-b63c-d7e99e21ca17'],
                        id: 'asdf',
                    },
                    req = {
                        method: 'GET',
                        path: '/' + mockService.name,
                        query: params
                    },
                    res = {
                        json: function(response) {
                            expect(response).to.exist;
                            expect(response).to.not.be.empty;
                            expect(response).to.contain.keys('operation', 'args');
                            expect(response.operation.name).to.equal(operation);
                            expect(response.operation.success).to.be.true;
                            expect(response.args).to.contain.keys('params');
                            expect(response.args.params.query).to.deep.equal(params);
                            expect(statusCodeSet).to.be.true;
                            expect(headersSet).to.eql(responseHeaders);
                            done();
                        },
                        set: function(headers) {
                            headersSet = headers;
                            return this;
                        },
                        status: function(code) {
                            expect(code).to.equal(statusCode);
                            statusCodeSet = true;
                            return this;
                        },
                        send: function (code) {
                            console.log('Not Expected: middleware responded with', code);
                        }
                    },
                    next = function () {
                        console.log('Not Expected: middleware skipped request');
                    },
                    middleware = Fetcher.middleware({pathPrefix: '/api'});

                mockService.meta = {
                    headers: responseHeaders,
                    statusCode: statusCode
                };
                middleware(req, res, next);
            });

            it('should leave big integers in query params as strings', function (done) {
                var operation = 'read',
                    statusCodeSet = false,
                    params = {
                        id: '123456789012345', // will not cause rounding errors
                        bigId: '1234567890123456789' // will cause rounding erros
                    },
                    req = {
                        method: 'GET',
                        path: '/' + mockService.name,
                        query: params
                    },
                    res = {
                        json: function(response) {
                            expect(response).to.exist;
                            expect(response).to.not.be.empty;
                            expect(response).to.contain.keys('operation', 'args');
                            expect(response.operation.name).to.equal(operation);
                            expect(response.operation.success).to.be.true;
                            expect(response.args).to.contain.keys('params');
                            expect(response.args.params.query.id).to.be.a.number;
                            expect(response.args.params.query.id.toString()).to.equal(params.id);
                            expect(response.args.params.query.bigId).to.be.a.String;
                            expect(response.args.params.query.bigId.toString()).to.equal(params.bigId);
                            expect(statusCodeSet).to.be.true;
                            done();
                        },
                        status: function(code) {
                            expect(code).to.equal(200);
                            statusCodeSet = true;
                            return this;
                        },
                        send: function (code) {
                            console.log('Not Expected: middleware responded with', code);
                        }
                    },
                    next = function () {
                        console.log('Not Expected: middleware skipped request');
                    },
                    middleware = Fetcher.middleware({pathPrefix: '/api'});

                middleware(req, res, next);
            });

            var makeGetApiErrorTest = function(params, expStatusCode, expMessage) {
                return function(done) {
                    var operation = 'read',
                        statusCodeSet = false,

                        req = {
                            method: 'GET',
                            path: '/' + mockErrorService.name,
                            query: params,
                        },

                        res = {
                            json: function(data) {
                                expect(data).to.eql(expMessage);
                                expect(statusCodeSet).to.be.true;
                                done();
                            },
                            status: function(code) {
                                expect(code).to.equal(expStatusCode);
                                statusCodeSet = true;
                                return this;
                            },
                            send: function (data) {
                                console.log('send() not expected: middleware responded with', data);
                            }
                        },
                        next = function () {
                            console.log('Not Expected: middleware skipped request');
                        },
                        middleware = Fetcher.middleware({pathPrefix: '/api'});
                    middleware(req, res, next);
                };
            };

            it('should respond to GET api request with default error details',
               makeGetApiErrorTest({}, 400, {message: 'request failed'}));

            it('should respond to GET api request with custom error status code',
               makeGetApiErrorTest({statusCode: 500}, 500, {message: 'request failed'}));

            it('should respond to GET api request with no leaked error information',
               makeGetApiErrorTest({statusCode: 500, danger: 'zone'}, 500, {message: 'request failed'}));

            it('should respond to GET api request with custom error message',
               makeGetApiErrorTest({message: 'Error message...'}, 400, {message: 'Error message...'}));

            describe('should respond to GET api request with custom output', function() {
                it('using json object',
                   makeGetApiErrorTest({statusCode: 500, output: {
                      message: 'custom message',
                      foo    : 'bar',
                   }}, 500, {message: 'custom message', 'foo': 'bar'}));

                it('using json array',
                   makeGetApiErrorTest({statusCode: 500, output: [1, 2]}, 500, [1, 2]));
            });
        });

        describe('Invalid Access', function () {
            function makeInvalidReqTest(req, debugMsg, done) {
                var res = {};
                var next = function (err) {
                    expect(err).to.exist;
                    expect(err).to.be.an.object;
                    expect(err.debug).to.contain(debugMsg);
                    expect(err.message).to.equal('Invalid Fetchr Access');
                    expect(err.statusCode).to.equal(400);
                    expect(err.source).to.equal('fetchr');
                    done();
                };
                var middleware = Fetcher.middleware();
                middleware(req, res, next);
            }
            it('should skip empty url', function (done) {
                makeInvalidReqTest({method: 'GET', path: '/'}, 'Bad resource', done);
            });
            it('should skip invalid GET resource', function (done) {
                makeInvalidReqTest({method: 'GET', path: '/invalidService'}, 'Bad resource invalidService', done);
            });
            it('should skip invalid POST request', function (done) {
                makeInvalidReqTest({method: 'POST', body: {
                    requests: {
                        resource: 'invalidService'
                    }
                }}, 'Bad resource ', done);
            });
        });
    });

    describe('CRUD Interface', function () {
        var resource = mockService.name;
        var params = {};
        var body = {};
        var config = {};
        var callback = function(operation, done) {
            return function(err, data) {
                if (err){
                    done(err);
                }
                expect(data.operation).to.exist;
                expect(data.operation.name).to.equal(operation);
                expect(data.operation.success).to.be.true;
                done();
            };
        };
        var resolve = function (operation, done) {
            return function (result) {
                try {
                    expect(result.data).to.exist;
                    expect(result.data.operation).to.exist;
                    expect(result.data.operation.name).to.equal(operation);
                    expect(result.data.operation.success).to.be.true;
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
        describe('should work superagent style', function () {
            describe('with callbacks', function () {
                it('should throw if no resource is given', function () {
                    expect(fetcher.read).to.throw('Resource is required for a fetcher request');
                });
                it('should handle CREATE', function (done) {
                    var operation = 'create';
                    fetcher
                        [operation](resource)
                        .params(params)
                        .body(body)
                        .clientConfig(config)
                        .end(callback(operation, done));
                });
                it('should handle READ', function (done) {
                    var operation = 'read';
                    fetcher
                        [operation](resource)
                        .params(params)
                        .clientConfig(config)
                        .end(callback(operation, done));
                });
                it('should handle UPDATE', function (done) {
                    var operation = 'update';
                    fetcher
                        [operation](resource)
                        .params(params)
                        .body(body)
                        .clientConfig(config)
                        .end(callback(operation, done));
                });
                it('should handle DELETE', function (done) {
                    var operation = 'delete';
                    fetcher
                        [operation](resource)
                        .params(params)
                        .clientConfig(config)
                        .end(callback(operation, done));
                });
            });
            describe('with Promises', function () {
                it('should throw if no resource is given', function () {
                    expect(fetcher.read).to.throw('Resource is required for a fetcher request');
                });
                it('should handle CREATE', function (done) {
                    var operation = 'create';
                    fetcher
                        [operation](resource)
                        .params(params)
                        .body(body)
                        .clientConfig(config)
                        .end()
                        .then(resolve(operation, done), reject(operation, done));
                });
                it('should handle READ', function (done) {
                    var operation = 'read';
                    fetcher
                        [operation](resource)
                        .params(params)
                        .clientConfig(config)
                        .end()
                        .then(resolve(operation, done), reject(operation, done));
                });
                it('should handle UPDATE', function (done) {
                    var operation = 'update';
                    fetcher
                        [operation](resource)
                        .params(params)
                        .body(body)
                        .clientConfig(config)
                        .end()
                        .then(resolve(operation, done), reject(operation, done));
                });
                it('should handle DELETE', function (done) {
                    var operation = 'delete';
                    fetcher
                        [operation](resource)
                        .params(params)
                        .clientConfig(config)
                        .end()
                        .then(resolve(operation, done), reject(operation, done));
                });
            });
        });
        describe('should be backwards compatible', function () {
            it('should handle CREATE', function (done) {
                var operation = 'create';
                fetcher[operation](resource, params, body, config, callback(operation, done));
            });
            it('should handle CREATE w/ no config', function (done) {
                var operation = 'create';
                fetcher[operation](resource, params, body, callback(operation, done));
            });
            it('should handle READ', function (done) {
                var operation = 'read';
                fetcher[operation](resource, params, config, callback(operation, done));
            });
            it('should handle READ w/ no config', function (done) {
                var operation = 'read';
                fetcher[operation](resource, params, callback(operation, done));
            });
            it('should handle UPDATE', function (done) {
                var operation = 'update';
                fetcher[operation](resource, params, body, config, callback(operation, done));
            });
            it('should handle UPDATE w/ no config', function (done) {
                var operation = 'update';
                fetcher[operation](resource, params, body, callback(operation, done));
            });
            it('should handle DELETE', function (done) {
                var operation = 'delete';
                fetcher[operation](resource, params, body, config, callback(operation, done));
            });
            it('should handle DELETE w/ no config', function (done) {
                var operation = 'delete';
                fetcher[operation](resource, params, body, callback(operation, done));
            });
        })
    });

});
