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
Object.defineProperty(exports, "__esModule", { value: true });
/*!
 * Copyright 2017-2017 Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * Licensed under the Amazon Software License (the "License"). You may not use this file except in compliance with the License. A copy of
 * the License is located at
 *     http://aws.amazon.com/asl/
 * or in the "license" file accompanying this file. This file is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
var apollo_client_1 = require("apollo-client");
var apollo_link_1 = require("apollo-link");
var apollo_link_2 = require("apollo-link");
var apollo_utilities_1 = require("apollo-utilities");
var graphql_1 = require("graphql");
var complex_object_link_uploader_1 = require("./complex-object-link-uploader");
var ComplexObjectLink = /** @class */ (function (_super) {
    __extends(ComplexObjectLink, _super);
    function ComplexObjectLink(credentials) {
        var _this = _super.call(this) || this;
        _this.link = exports.complexObjectLink(credentials);
        return _this;
    }
    ComplexObjectLink.prototype.request = function (operation, forward) {
        return this.link.request(operation, forward);
    };
    return ComplexObjectLink;
}(apollo_link_2.ApolloLink));
exports.ComplexObjectLink = ComplexObjectLink;
exports.complexObjectLink = function (credentials) {
    return new apollo_link_2.ApolloLink(function (operation, forward) {
        return new apollo_link_1.Observable(function (observer) {
            var handle;
            var operationType = apollo_utilities_1.getOperationDefinition(operation.query).operation;
            var isMutation = operationType === 'mutation';
            var _a = isMutation ? findInObject(operation.variables) : [], fileFieldKey = _a[0], fileField = _a[1];
            var uploadPromise = Promise.resolve(operation);
            if (fileField) {
                var uploadCredentials = typeof credentials === 'function' ? credentials.call() : credentials;
                uploadPromise = Promise.resolve(uploadCredentials).then(function (credentials) { return complex_object_link_uploader_1.default(fileField, { credentials: credentials }).then(function () {
                    var bucket = fileField.bucket, key = fileField.key, region = fileField.region;
                    operation.variables[fileFieldKey] = { bucket: bucket, key: key, region: region };
                    return operation;
                }).catch(function (err) {
                    var error = new graphql_1.GraphQLError(err.message);
                    error.errorType = 'AWSAppSyncClient:S3UploadException';
                    throw new apollo_client_1.ApolloError({
                        graphQLErrors: [error],
                    });
                }); });
            }
            uploadPromise
                .then(forward)
                .then(function (observable) {
                handle = observable.subscribe({
                    next: observer.next.bind(observer),
                    error: observer.error.bind(observer),
                    complete: observer.complete.bind(observer),
                });
            }).catch(function (err) {
                observer.error(err);
            });
            return function () {
                if (handle)
                    handle.unsubscribe();
            };
        });
    });
};
var complexObjectFields = [
    { name: 'bucket', type: 'string' },
    { name: 'key', type: 'string' },
    { name: 'region', type: 'string' },
    { name: 'mimeType', type: 'string' },
    { name: 'localUri', type: 'object' },
];
var findInObject = function (obj) {
    var which;
    var _findInObject = function (obj) {
        return Object.keys(obj).find(function (key) {
            var val = obj[key];
            if (val && typeof val === 'object') {
                var hasFields = complexObjectFields.every(function (field) {
                    var hasValue = val[field.name];
                    var types = Array.isArray(field.type) ? field.type : [field.type];
                    var isOfType = hasValue && types.reduce(function (prev, curr) {
                        return prev || typeof val[field.name] === curr;
                    }, false);
                    return isOfType;
                });
                if (hasFields) {
                    which = val;
                    return true;
                }
                return _findInObject(val);
            }
            return false;
        });
    };
    var key = _findInObject(obj);
    return [key, which];
};
