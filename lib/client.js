"use strict";
var __extends = (this && this.__extends) || (function () {
    var extendStatics = Object.setPrototypeOf ||
        ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
        function (d, b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };
    return function (d, b) {
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
var __assign = (this && this.__assign) || Object.assign || function(t) {
    for (var s, i = 1, n = arguments.length; i < n; i++) {
        s = arguments[i];
        for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
            t[p] = s[p];
    }
    return t;
};
var __rest = (this && this.__rest) || function (s, e) {
    var t = {};
    for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p) && e.indexOf(p) < 0)
        t[p] = s[p];
    if (s != null && typeof Object.getOwnPropertySymbols === "function")
        for (var i = 0, p = Object.getOwnPropertySymbols(s); i < p.length; i++) if (e.indexOf(p[i]) < 0)
            t[p[i]] = s[p[i]];
    return t;
};
Object.defineProperty(exports, "__esModule", { value: true });
/*!
 * Copyright 2017-2017 Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * Licensed under the Amazon Software License (the "License"). You may not use this file except in compliance with the License. A copy of
 * the License is located at
 *     http://aws.amazon.com/asl/
 * or in the "license" file accompanying this file. This file is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
require("node-window-polyfill/register");
require("setimmediate");
var apollo_client_1 = require("apollo-client");
var apollo_cache_inmemory_1 = require("apollo-cache-inmemory");
var apollo_link_1 = require("apollo-link");
var apollo_link_http_1 = require("apollo-link-http");
var apollo_utilities_1 = require("apollo-utilities");
var index_1 = require("./cache/index");
var link_1 = require("./link");
var store_1 = require("./store");
exports.createSubscriptionHandshakeLink = function (url, resultsFetcherLink) {
    if (resultsFetcherLink === void 0) { resultsFetcherLink = new apollo_link_http_1.HttpLink({ uri: url }); }
    return apollo_link_1.ApolloLink.split(function (operation) {
        var query = operation.query;
        var _a = apollo_utilities_1.getMainDefinition(query), kind = _a.kind, graphqlOperation = _a.operation;
        var isSubscription = kind === 'OperationDefinition' && graphqlOperation === 'subscription';
        return isSubscription;
    }, apollo_link_1.ApolloLink.from([
        new link_1.NonTerminatingHttpLink('subsInfo', { uri: url }, true),
        new link_1.SubscriptionHandshakeLink('subsInfo'),
    ]), resultsFetcherLink);
};
exports.createAuthLink = function (_a) {
    var url = _a.url, region = _a.region, auth = _a.auth;
    return new link_1.AuthLink({ url: url, region: region, auth: auth });
};
var passthrough = function (op, forward) { return (forward ? forward(op) : apollo_link_1.Observable.of()); };
exports.createAppSyncLink = function (_a) {
    var url = _a.url, region = _a.region, auth = _a.auth, complexObjectsCredentials = _a.complexObjectsCredentials, _b = _a.resultsFetcherLink, resultsFetcherLink = _b === void 0 ? new apollo_link_http_1.HttpLink({ uri: url }) : _b;
    var link = apollo_link_1.ApolloLink.from([
        createLinkWithStore(function (store) { return new link_1.OfflineLink(store); }),
        new link_1.ComplexObjectLink(complexObjectsCredentials),
        exports.createAuthLink({ url: url, region: region, auth: auth }),
        exports.createSubscriptionHandshakeLink(url, resultsFetcherLink)
    ].filter(Boolean));
    return link;
};
exports.createLinkWithCache = function (createLinkFunc) {
    if (createLinkFunc === void 0) { createLinkFunc = function () { return new apollo_link_1.ApolloLink(passthrough); }; }
    var theLink;
    return new apollo_link_1.ApolloLink(function (op, forward) {
        if (!theLink) {
            var cache = op.getContext().cache;
            theLink = createLinkFunc(cache);
        }
        return theLink.request(op, forward);
    });
};
var createLinkWithStore = function (createLinkFunc) {
    if (createLinkFunc === void 0) { createLinkFunc = function () { return new apollo_link_1.ApolloLink(passthrough); }; }
    return exports.createLinkWithCache(function (_a) {
        var store = _a.store;
        return store ? createLinkFunc(store) : new apollo_link_1.ApolloLink(passthrough);
    });
};
var AWSAppSyncClient = /** @class */ (function (_super) {
    __extends(AWSAppSyncClient, _super);
    /**
     *
     * @param {object} appSyncOptions
     * @param {ApolloClientOptions<InMemoryCache>} options
     */
    function AWSAppSyncClient(_a, options) {
        var _b = _a === void 0 ? {} : _a, url = _b.url, region = _b.region, auth = _b.auth, conflictResolver = _b.conflictResolver, complexObjectsCredentials = _b.complexObjectsCredentials, cacheOptions = _b.cacheOptions, _c = _b.disableOffline, disableOffline = _c === void 0 ? false : _c;
        if (options === void 0) { options = {}; }
        var _this = this;
        _this.hydrated = function () { return _this.hydratedPromise; };
        var customCache = options.cache, customLink = options.link;
        if (!customLink && (!url || !region || !auth)) {
            throw new Error('In order to initialize AWSAppSyncClient, you must specify url, region and auth properties on the config object or a custom link.');
        }
        var resolveClient;
        var store = disableOffline ? null : store_1.createStore(function () { return _this; }, function () { return resolveClient(_this); }, conflictResolver);
        var cache = disableOffline ? (customCache || new apollo_cache_inmemory_1.InMemoryCache(cacheOptions)) : new index_1.default(store, cacheOptions);
        var waitForRehydrationLink = new apollo_link_1.ApolloLink(function (op, forward) {
            var handle = null;
            return new apollo_link_1.Observable(function (observer) {
                _this.hydratedPromise.then(function () {
                    handle = passthrough(op, forward).subscribe(observer);
                }).catch(observer.error);
                return function () {
                    if (handle) {
                        handle.unsubscribe();
                    }
                };
            });
        });
        var link = waitForRehydrationLink.concat(customLink || exports.createAppSyncLink({ url: url, region: region, auth: auth, complexObjectsCredentials: complexObjectsCredentials }));
        var newOptions = __assign({}, options, { link: link,
            cache: cache });
        _this = _super.call(this, newOptions) || this;
        _this.hydratedPromise = disableOffline ? Promise.resolve(_this) : new Promise(function (resolve) { return resolveClient = resolve; });
        return _this;
    }
    /**
     *
     * @param {MutationOptions} options
     * @returns {Promise<FetchResult>}
     */
    AWSAppSyncClient.prototype.mutate = function (options) {
        var update = options.update, refetchQueries = options.refetchQueries, _a = options.context, origContext = _a === void 0 ? {} : _a, otherOptions = __rest(options, ["update", "refetchQueries", "context"]);
        var _b = origContext.AASContext, _c = _b === void 0 ? {} : _b, _d = _c.doIt, doIt = _d === void 0 ? false : _d, restAASContext = __rest(_c, ["doIt"]);
        var context = __assign({}, origContext, { AASContext: __assign({ doIt: doIt }, restAASContext, (!doIt ? { refetchQueries: refetchQueries, update: update } : {})) });
        var optimisticResponse = otherOptions.optimisticResponse, variables = otherOptions.variables;
        var data = optimisticResponse &&
            (typeof optimisticResponse === 'function' ? __assign({}, optimisticResponse(variables)) : optimisticResponse);
        var newOptions = __assign({}, otherOptions, { optimisticResponse: data, update: update }, (doIt ? { refetchQueries: refetchQueries } : {}), { context: context });
        return _super.prototype.mutate.call(this, newOptions);
    };
    return AWSAppSyncClient;
}(apollo_client_1.default));
exports.AWSAppSyncClient = AWSAppSyncClient;
exports.default = AWSAppSyncClient;
