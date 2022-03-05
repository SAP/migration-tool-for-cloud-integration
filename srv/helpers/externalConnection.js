const axios = require("axios").default;
const assert = require('assert');

class ExternalConnection {
    constructor(tenantData) {
        this.Tenant = tenantData;
        this.Token = '';

        this.Connection = {
            HostTx: null,
            TokenTx: null
        };
    };

    refreshToken = async () => this.Token = await this.getOAuthToken();
    pingTenant = () => this.externalCall('/api/v1?$format=json');
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
        const tokenPath = (this.Tenant.Environment == 'Neo') ? '/oauth2/api/v1/token?grant_type=client_credentials' : '/oauth/token?grant_type=client_credentials';
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
                throw new Error('External call failed.\r\n\r\n' + error);
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
    doAxiosCall = async (request) => {
        try {
            const response = await axios(request);
            return {
                code: response.status,
                value: response
            };
        } catch (error) {
            console.log('External call error ignored: ' + error);
            return {
                code: error.response.status,
                value: error.response.data
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