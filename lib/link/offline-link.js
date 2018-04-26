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
var apollo_cache_inmemory_1 = require("apollo-cache-inmemory");
var apollo_link_1 = require("apollo-link");
var apollo_utilities_1 = require("apollo-utilities");
var cache_1 = require("../cache");
var OfflineLink = /** @class */ (function (_super) {
    __extends(OfflineLink, _super);
    /**
     *
     * @param {Store} store
     */
    function OfflineLink(store) {
        var _this = _super.call(this) || this;
        _this.store = store;
        return _this;
    }
    OfflineLink.prototype.request = function (operation, forward) {
        var _this = this;
        return new apollo_link_1.Observable(function (observer) {
            var online = _this.store.getState().offline.online;
            var operationType = apollo_utilities_1.getOperationDefinition(operation.query).operation;
            var isMutation = operationType === 'mutation';
            var isQuery = operationType === 'query';
            if (!online && isQuery) {
                var data = processOfflineQuery(operation, _this.store);
                observer.next({ data: data });
                observer.complete();
                return function () { return null; };
            }
            if (isMutation) {
                var _a = operation.getContext(), cache = _a.cache, optimisticResponse = _a.optimisticResponse, _b = _a.AASContext, _c = (_b === void 0 ? {} : _b).doIt, doIt = _c === void 0 ? false : _c;
                if (!doIt) {
                    if (!optimisticResponse) {
                        console.warn('An optimisticResponse was not provided, it is required when using offline capabilities.');
                        if (!online) {
                            throw new Error('Missing optimisticResponse while offline.');
                        }
                        // offline muation without optimistic response is processed immediately
                    }
                    else {
                        var data = enqueueMutation(operation, _this.store, observer);
                        observer.next({ data: data });
                        observer.complete();
                        return function () { return null; };
                    }
                }
            }
            var handle = forward(operation).subscribe({
                next: observer.next.bind(observer),
                error: observer.error.bind(observer),
                complete: observer.complete.bind(observer),
            });
            return function () {
                if (handle)
                    handle.unsubscribe();
            };
        });
    };
    return OfflineLink;
}(apollo_link_1.ApolloLink));
exports.OfflineLink = OfflineLink;
/**
 *
 * @param {Operation} operation
 * @param {Store} theStore
 */
var processOfflineQuery = function (operation, theStore) {
    var _a = cache_1.NORMALIZED_CACHE_KEY, _b = theStore.getState()[_a], normalizedCache = _b === void 0 ? {} : _b;
    var query = operation.query, variables = operation.variables;
    var store = apollo_cache_inmemory_1.defaultNormalizedCacheFactory(normalizedCache);
    var data = apollo_cache_inmemory_1.readQueryFromStore({
        store: store,
        query: query,
        variables: variables,
    });
    return data;
};
/**
 *
 * @param {Operation} operation
 * @param {Store} theStore
 */
var enqueueMutation = function (operation, theStore, observer) {
    var mutation = operation.query, variables = operation.variables;
    var _a = operation.getContext(), cache = _a.cache, optimisticResponse = _a.optimisticResponse, _b = _a.AASContext, _c = _b === void 0 ? {} : _b, _d = _c.doIt, doIt = _d === void 0 ? false : _d, refetchQueries = _c.refetchQueries, update = _c.update;
    setImmediate(function () {
        theStore.dispatch({
            type: 'SOME_ACTION',
            payload: {},
            meta: {
                offline: {
                    effect: {
                        mutation: mutation,
                        variables: variables,
                        refetchQueries: refetchQueries,
                        update: update,
                        optimisticResponse: optimisticResponse,
                    },
                    commit: { type: 'SOME_ACTION_COMMIT', meta: null },
                    rollback: { type: 'SOME_ACTION_ROLLBACK', meta: null },
                }
            }
        });
    });
    return optimisticResponse;
};
/**
 *
 * @param {*} client
 * @param {*} effect
 * @param {*} action
 */
exports.offlineEffect = function (client, effect, action) {
    var doIt = true;
    var otherOptions = __rest(effect, []);
    var context = { AASContext: { doIt: doIt } };
    var options = __assign({}, otherOptions, { context: context });
    return client.mutate(options);
};
exports.reducer = function () { return ({
    eclipse: function (state, action) {
        if (state === void 0) { state = {}; }
        var type = action.type, payload = action.payload;
        switch (type) {
            case 'SOME_ACTION':
                return __assign({}, state);
            case 'SOME_ACTION_COMMIT':
                return __assign({}, state);
            case 'SOME_ACTION_ROLLBACK':
                return __assign({}, state);
            default:
                return state;
        }
    }
}); };
exports.discard = function (fn) {
    if (fn === void 0) { fn = function () { return null; }; }
    return function (error, action, retries) {
        var _a = error.graphQLErrors, graphQLErrors = _a === void 0 ? [] : _a;
        var conditionalCheck = graphQLErrors.find(function (err) { return err.errorType === 'DynamoDB:ConditionalCheckFailedException'; });
        if (conditionalCheck) {
            if (typeof fn === 'function') {
                var data = conditionalCheck.data, path = conditionalCheck.path;
                var _b = action.meta.offline.effect, mutation = _b.mutation, variables = _b.variables;
                var mutationName = apollo_utilities_1.getOperationName(mutation);
                var operationDefinition = apollo_utilities_1.getOperationDefinition(mutation);
                var operationType = operationDefinition.operation;
                try {
                    var conflictResolutionResult = fn({
                        mutation: mutation,
                        mutationName: mutationName,
                        operationType: operationType,
                        variables: variables,
                        data: data,
                        retries: retries,
                    });
                    if (conflictResolutionResult === 'DISCARD') {
                        return true;
                    }
                    if (conflictResolutionResult) {
                        action.meta.offline.effect.variables = conflictResolutionResult;
                        return false;
                    }
                }
                catch (err) {
                    // console.error('Error running conflict resolution. Discarding mutation.', err);
                    return true;
                }
            }
        }
        else if (graphQLErrors.length) {
            // console.error('Discarding action.', action, graphQLErrors);
            return true;
        }
        else {
            var _c = error.networkError, graphQLErrors_1 = (_c === void 0 ? { graphQLErrors: [] } : _c).graphQLErrors;
            var appSyncClientError = graphQLErrors_1.find(function (err) { return err.errorType && err.errorType.startsWith('AWSAppSyncClient:'); });
            if (appSyncClientError) {
                // console.error('Discarding action.', action, appSyncClientError);
                return true;
            }
        }
        return error.permanent || retries > 10;
    };
};
