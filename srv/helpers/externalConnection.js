const axios = require("axios").default;
const assert = require('assert');
const Settings = require('../config/settings');
const qs = require('qs');

class ExternalConnection {
    constructor(tenantData) {
        this.Tenant = tenantData;
        this.Token = '';
        this.PlatformToken = '';

        this.Connection = {
            HostTx: null,
            TokenTx: null
        };
        this.PlatformConnection = {
            HostTx: null,
            TokenTx: null
        };
    };

    refreshIntegrationToken = async () => this.Token = await this.getOAuthToken();
    refreshPlatformToken = async () => {
        if (this.Tenant.Environment == 'Neo') {
            this.PlatformToken = await this.getNeoPlatformToken();
        } else {
            this.PlatformToken = await this.getCFPlatformToken();
        }
    };

    pingIntegrationTenant = () => this.externalCall(Settings.Paths.IntegrationPackages.path);
    pingPlatformTenant = () => this.doPlatformCall('GET', this.Tenant.Environment == 'Neo' ? Settings.Paths.NeoPlatform.Ping : Settings.Paths.CFPlatform.Ping);
    testPlatformSettings = () => this.doPlatformCall('GET', this.Tenant.Environment == 'Neo' ? Settings.Paths.NeoPlatform.TestSettings.replace('{ACCOUNT_ID}', this.Tenant.Neo_accountid) : Settings.Paths.CFPlatform.TestSettings.replace('{INSTANCE_ID}', this.Tenant.Oauth_servicekeyid));

    openConnection = async (url) => {
        const external = await cds.connect.to({
            kind: 'odata',
            credentials: {
                url: 'https://' + url
            }
        });
        return external.tx();
    };
    getOAuthToken = async () => {
        const tokenPath = this.Tenant.Environment == 'Neo' ? Settings.Paths.oAuthToken.NeoPath : Settings.Paths.oAuthToken.CFPath;
        const auth = Buffer.from(this.Tenant.Oauth_clientid + ':' + this.Tenant.Oauth_secret).toString("base64");
        try {
            this.Connection.TokenTx = this.Connection.TokenTx || await this.openConnection(this.Tenant.Token_host);
            const response = await this.Connection.TokenTx.send({
                method: 'POST',
                path: tokenPath,
                headers: {
                    "Authorization": "Basic " + auth
                }
            });
            assert(response.access_token, 'Authentication server response did not include an access_token');
            return response.access_token;
        } catch (error) {
            throw new Error('Integration Tenant token authentication:<br/><br/>' +error.message.replace(/\{/g, '[').replace(/\}/g, ']'));
        }
    };
    getCFPlatformToken = async () => {
        const tokenHost = Settings.Paths.CFPlatform.TokenHost.replace('{HOST}', this.Tenant.CF_Platform_domain);
        const body = {
            'grant_type': 'password',
            'client_id': 'cf',
            'client_secret': '',
            'username': this.Tenant.CF_Platform_user,
            'password': this.Tenant.CF_Platform_password
        };
        try {
            const request = {
                baseURL: 'https://' + tokenHost,
                method: 'POST',
                url: Settings.Paths.CFPlatform.GetToken,
                data: qs.stringify(body),
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                    'Accept': 'application/json'
                }
            };
            const response = await this.doAxiosCall(request, true);
            if (response.code >= 400) throw new Error(JSON.stringify(response.value));
            return response.value.data.access_token;
        } catch (error) {
            throw new Error('CF Platform token authentication:<br/><br/>' + error.message.replace(/\{/g, '[').replace(/\}/g, ']'));
        }
    };
    getNeoPlatformToken = async () => {
        const tokenHost = Settings.Paths.NeoPlatform.TokenHost.replace('{HOST}', this.Tenant.Neo_Platform_domain);
        const auth = Buffer.from(this.Tenant.Neo_Platform_user + ':' + this.Tenant.Neo_Platform_password).toString("base64");
        try {
            const request = {
                baseURL: 'https://' + tokenHost,
                method: 'POST',
                url: Settings.Paths.NeoPlatform.GetToken,
                headers: {
                    "Authorization": "Basic " + auth,
                    'Accept': 'application/json'
                }
            };
            const response = await this.doAxiosCall(request, true);
            if (response.code >= 400) throw new Error(JSON.stringify(response.value));
            return response.value.data.access_token;
        } catch (error) {
            throw new Error('Neo Platform token authentication:<br/><br/>' + error.message.replace(/\{/g, '[').replace(/\}/g, ']'));
        }
    };
    getCFOrgDataFromServiceInstanceID = async () => {
        const serviceData = await this.doPlatformCall('GET', Settings.Paths.CFPlatform.ServiceInstance.replace('{INSTANCE_ID}', this.Tenant.Oauth_servicekeyid));
        assert(serviceData.relationships.space.data.guid, 'Failed to get Space ID from Service Instance');

        const spaceData = await this.doPlatformCall('GET', Settings.Paths.CFPlatform.Space.replace('{SPACE_ID}', serviceData.relationships.space.data.guid));
        assert(spaceData.relationships.organization.data.guid, 'Failed to get Organization ID from Service Instance');

        const orgData = await this.doPlatformCall('GET', Settings.Paths.CFPlatform.Organization.replace('{ORGANIZATION_ID}', spaceData.relationships.organization.data.guid));
        assert(orgData.name, 'Failed to get Organization Name from Service Instance');

        const servicePlanData = await this.doPlatformCall('GET', Settings.Paths.CFPlatform.ServicePlan.replace('{SPACE_ID}', serviceData.relationships.space.data.guid));
        assert(servicePlanData.pagination.total_results == 1, 'Failed to get Service Plan ID from Space');

        const result = {
            orgData: {
                guid: orgData.guid,
                name: orgData.name
            },
            spaceData: {
                guid: spaceData.guid,
                name: spaceData.name
            },
            servicePlanData: {
                guid: servicePlanData.resources[0].guid
            }
        };
        console.log(result);
        return result;
    };

    externalPlatformCall = async (query) => await this.doPlatformCall('GET', query);
    externalPlatformPostCall = async (query, body) => await this.doPlatformCall('POST', query, body);
    doPlatformCall = async (method, query, body = null) => {
        console.log('Calling platform ' + method, query);
        const host = this.Tenant.Environment == 'Neo' ?
            Settings.Paths.NeoPlatform.Host.replace('{HOST}', this.Tenant.Neo_Platform_domain) :
            Settings.Paths.CFPlatform.Host.replace('{HOST}', this.Tenant.CF_Platform_domain);

        this.PlatformToken.length == 0 && await this.refreshPlatformToken();

        try {
            const request = {
                baseURL: 'https://' + host,
                method: method,
                url: query,
                data: JSON.stringify(body),
                headers: {
                    'Authorization': 'Bearer ' + this.PlatformToken,
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                }
            };
            const response = await this.doAxiosCall(request);
            return (response.code < 400) ? response.value.data : null;
        } catch (error) {
            throw new Error(error);
        }
    };

    externalCall = async (query, ignoreError = false) => await this.doExternalCall(query, ignoreError, 'application/json');
    externalCallCertificate = async (query, ignoreError = false) => await this.doExternalCall(query, ignoreError, 'application/pkix-cert');
    doExternalCall = async (query, ignoreError, accept) => {
        try {
            this.Connection.HostTx = this.Connection.HostTx || await this.openConnection(this.Tenant.Host);
            const response = await this.Connection.HostTx.send({
                query: query,
                headers: {
                    'Authorization': 'Bearer ' + this.Token,
                    'Content-Type': 'application/json',
                    'Accept': accept
                }
            });
            return response;
        } catch (error) {
            if (ignoreError) {
                console.log('External call error ignored: ' + error);
                return null;
            } else {
                throw new Error('External call failed.<br/><br/>' + error);
            }
        }
    };

    externalDelete = async (query) => {
        const request = {
            baseURL: 'https://' + this.Tenant.Host,
            method: 'DELETE',
            url: query,
            headers: {
                'Authorization': 'Bearer ' + this.Token,
                'Content-Type': 'application/json',
                'Accept': 'application/json',
            }
        };
        return await this.doAxiosCall(request);
    };
    externalPost = async (query, body) => {
        const request = {
            baseURL: 'https://' + this.Tenant.Host,
            method: 'POST',
            url: query,
            data: body,
            headers: {
                'Authorization': 'Bearer ' + this.Token,
                'Content-Type': 'application/json',
                'Accept': 'application/json',
            }
        };
        return await this.doAxiosCall(request);
    };
    externalPutCertificate = async (query, body) => {
        const request = {
            baseURL: 'https://' + this.Tenant.Host,
            method: 'PUT',
            url: query,
            data: body,
            headers: {
                'Authorization': 'Bearer ' + this.Token,
                'Content-Type': 'application/pkix-cert',
                'Accept': 'application/json',
            }
        };
        return await this.doAxiosCall(request);
    };
    externalBatch = async (query, body) => {
        const payload = '--batch_36522ad7-fc75-4b56-8c71-56071383e77b\r\n'
            + 'Content-Type: multipart/mixed; boundary=changeset_77162fcd-b8da-41ac-a9f8-9357efbbd621\r\n'
            + body
            + '--changeset_77162fcd-b8da-41ac-a9f8-9357efbbd621--\r\n\r\n'
            + '--batch_36522ad7-fc75-4b56-8c71-56071383e77b--';
        const request = {
            baseURL: 'https://' + this.Tenant.Host,
            method: 'POST',
            url: query,
            data: payload,
            headers: {
                'Authorization': 'Bearer ' + this.Token,
                'Content-Type': 'multipart/mixed; boundary=batch_36522ad7-fc75-4b56-8c71-56071383e77b',
                'Accept': 'application/json',
            }
        };
        return await this.doAxiosCall(request);
    };
    doAxiosCall = async (request, overrideReadonlyLock = false) => {
        if (overrideReadonlyLock == false && this.Tenant.ReadOnly && request.method != 'GET') {
            const error = request.method + ' call blocked for security reasons: writing to read-only tenant is not allowed';
            console.log(error);
            return {
                code: 400,
                value: error
            };
        }
        try {
            const response = await axios(request);
            return {
                code: response.status,
                value: response
            };
        } catch (error) {
            console.log('External call error ignored: ' + error);
            return {
                code: error?.response?.status || 400,
                value: error?.response?.data || error.toString()
            };
        }
    };

    externalAxiosBinary = async (query) => {
        const request = {
            baseURL: 'https://' + this.Tenant.Host,
            method: 'GET',
            url: query,
            headers: {
                'Authorization': 'Bearer ' + this.Token,
                'Content-Type': 'application/json',
                'Accept': 'application/json',
            },
            responseType: 'arraybuffer'
        };
        try {
            const response = await axios(request);
            const base64Data = Buffer.from(response.data, 'binary').toString('base64');
            return {
                code: response.status,
                value: response,
                base64: base64Data
            };
        } catch (error) {
            console.log('External call error ignored: ' + error);
            const buffer = Buffer.from(error.response.data, 'binary').toString('utf8');
            return {
                code: error.response.status,
                value: this._tryJSONparse(buffer)
            };
        }
    };
    _tryJSONparse(data) {
        try {
            return JSON.parse(data);
        } catch (e) {
            return data;
        }
    }
};
module.exports = {
    ExternalConnection: ExternalConnection
};