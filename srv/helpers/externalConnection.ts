import cds from '@sap/cds'
import assert from 'assert'
import qs from 'qs'
import axios, { AxiosRequestConfig } from 'axios'

import { Settings } from '../config/settings'
import { Tenant } from '#cds-models/migrationtool'

const { info, warn } = cds.log('ExternalConnection')

export type TResponse = {
    code: number
    value: any
}

export default class ExternalConnection {
    Tenant: Tenant
    Token: string
    PlatformToken: string
    Connection: { HostTx: cds.Transaction | null; TokenTx: cds.Transaction | null }
    PlatformConnection: { HostTx: cds.Transaction | null; TokenTx: cds.Transaction | null }

    constructor(tenant: Tenant) {
        this.Tenant = tenant
        this.Token = ''
        this.PlatformToken = ''

        this.Connection = {
            HostTx: null,
            TokenTx: null
        }
        this.PlatformConnection = {
            HostTx: null,
            TokenTx: null
        }
    }

    // Connectivity and Tokens

    public refreshIntegrationToken = async (): Promise<void> => {
        this.Token = await this.getOAuthToken()
    }
    public refreshPlatformToken = async (): Promise<void> => {
        if (this.Tenant.Environment == 'Neo') {
            this.PlatformToken = await this.getNeoPlatformToken()
        } else {
            this.PlatformToken = await this.getCFPlatformToken()
        }
    }

    public pingIntegrationTenant = async (): Promise<boolean> => {
        return !!(await this.externalCall(Settings.Paths.IntegrationPackages.path))
    }
    public pingPlatformTenant = async (): Promise<boolean> => {
        return !!(await this.doPlatformCall('GET', this.Tenant.Environment == 'Neo'
            ? Settings.Paths.NeoPlatform.Ping
            : Settings.Paths.CFPlatform.Ping
        ))
    }
    public testPlatformSettings = async (): Promise<boolean> => {
        return !!(await this.doPlatformCall('GET', this.Tenant.Environment == 'Neo'
            ? Settings.Paths.NeoPlatform.TestSettings.replace('{ACCOUNT_ID}', this.Tenant.Neo_accountid ?? '')
            : Settings.Paths.CFPlatform.TestSettings.replace('{INSTANCE_ID}', this.Tenant.Oauth_servicekeyid ?? '')
        ))
    }

    private openConnection = async (url: string): Promise<cds.Transaction> => {
        const external = await cds.connect.to({
            kind: 'odata',
            credentials: {
                url: 'https://' + url
            }
        })
        return external.tx()
    }
    private getOAuthToken = async (): Promise<string> => {
        const tokenPath = this.Tenant.Environment == 'Neo' ? Settings.Paths.oAuthToken.NeoPath : Settings.Paths.oAuthToken.CFPath
        const auth = Buffer.from(this.Tenant.Oauth_clientid + ':' + this.Tenant.Oauth_secret).toString('base64')
        try {
            this.Connection.TokenTx = this.Connection.TokenTx || await this.openConnection(this.Tenant.Token_host ?? '')
            const response = await this.Connection.TokenTx.send({
                method: 'POST',
                path: tokenPath,
                headers: {
                    "Authorization": "Basic " + auth
                }
            })
            assert(response.access_token, 'Authentication server response did not include an access_token')
            return response.access_token
        } catch (error: any) {
            throw new Error('Integration Tenant token authentication:<br/><br/>' + error.message.replace(/\{/g, '[').replace(/\}/g, ']'))
        }
    }
    private getCFPlatformToken = async (): Promise<string> => {
        const tokenHost = Settings.Paths.CFPlatform.TokenHost.replace('{HOST}', this.Tenant.CF_Platform_domain ?? '')
        const body = {
            'grant_type': 'password',
            'client_id': 'cf',
            'client_secret': '',
            'username': this.Tenant.CF_Platform_user,
            'password': this.Tenant.CF_Platform_password
        }
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
            }
            const response = await this.doAxiosCall(request, true)
            if (response.code >= 400) throw new Error(JSON.stringify(response.value))
            return response.value.data.access_token
        } catch (error: any) {
            throw new Error('CF Platform token authentication:<br/><br/>' + error.message.replace(/\{/g, '[').replace(/\}/g, ']'))
        }
    }
    private getNeoPlatformToken = async (): Promise<string> => {
        const tokenHost = Settings.Paths.NeoPlatform.TokenHost.replace('{HOST}', this.Tenant.Neo_Platform_domain ?? '')
        const auth = Buffer.from(this.Tenant.Neo_Platform_user + ':' + this.Tenant.Neo_Platform_password).toString("base64")
        try {
            const request = {
                baseURL: 'https://' + tokenHost,
                method: 'POST',
                url: Settings.Paths.NeoPlatform.GetToken,
                headers: {
                    "Authorization": "Basic " + auth,
                    'Accept': 'application/json'
                }
            }
            const response = await this.doAxiosCall(request, true)
            if (response.code >= 400) throw new Error(JSON.stringify(response.value))
            return response.value.data.access_token
        } catch (error: any) {
            throw new Error('Neo Platform token authentication:<br/><br/>' + error.message.replace(/\{/g, '[').replace(/\}/g, ']'))
        }
    }
    public getCFOrgDataFromServiceInstanceID = async (): Promise<{ orgData: { guid: string; name: string }; spaceData: { guid: string; name: string }; servicePlanData: { guid: string } }> => {
        const serviceData = await this.doPlatformCall('GET', Settings.Paths.CFPlatform.ServiceInstance.replace('{INSTANCE_ID}', this.Tenant.Oauth_servicekeyid ?? ''))
        assert(serviceData.relationships.space.data.guid, 'Failed to get Space ID from Service Instance')

        const spaceData = await this.doPlatformCall('GET', Settings.Paths.CFPlatform.Space.replace('{SPACE_ID}', serviceData.relationships.space.data.guid))
        assert(spaceData.relationships.organization.data.guid, 'Failed to get Organization ID from Service Instance')

        const orgData = await this.doPlatformCall('GET', Settings.Paths.CFPlatform.Organization.replace('{ORGANIZATION_ID}', spaceData.relationships.organization.data.guid))
        assert(orgData.name, 'Failed to get Organization Name from Service Instance')

        const servicePlanData = await this.doPlatformCall('GET', Settings.Paths.CFPlatform.ServicePlan.replace('{SPACE_ID}', serviceData.relationships.space.data.guid))
        assert(servicePlanData.pagination.total_results == 1, 'Failed to get Service Plan ID from Space')

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
        }
        info(result)
        return result
    }


    // Platform Calls

    public externalPlatformGetCall = async (query: string): Promise<any> => {
        return await this.doPlatformCall('GET', query)
    }
    public externalPlatformPostCall = async (query: string, body?: any): Promise<any> => {
        return await this.doPlatformCall('POST', query, body)
    }
    private doPlatformCall = async (method: 'GET' | 'POST', query: string, body?: any): Promise<any> => {
        info('Calling platform ' + method, query)
        const host = this.Tenant.Environment == 'Neo' ?
            Settings.Paths.NeoPlatform.Host.replace('{HOST}', this.Tenant.Neo_Platform_domain ?? '') :
            Settings.Paths.CFPlatform.Host.replace('{HOST}', this.Tenant.CF_Platform_domain ?? '')

        this.PlatformToken.length == 0 && await this.refreshPlatformToken()

        try {
            const request = {
                baseURL: 'https://' + host,
                method: method,
                url: query,
                data: !!body ? JSON.stringify(body) : '',
                headers: {
                    'Authorization': 'Bearer ' + this.PlatformToken,
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                }
            }
            const response = await this.doAxiosCall(request)
            return (response.code < 400) ? response.value.data : null
        } catch (error: any) {
            throw new Error(error)
        }
    }


    // Integration Tenant Calls

    public externalCall = async (query: string, ignoreError = false): Promise<any> => {
        return await this.doExternalCall(query, ignoreError, 'application/json')
    }
    public externalCallCertificate = async (query: string, ignoreError = false): Promise<any> => {
        return await this.doExternalCall(query, ignoreError, 'application/pkix-cert')
    }
    private doExternalCall = async (query: string, ignoreError: boolean, accept: string): Promise<any> => {
        try {
            this.Connection.HostTx = this.Connection.HostTx || await this.openConnection(this.Tenant.Host ?? '')
            const response = await this.Connection.HostTx.send({
                method: 'GET',
                path: query,
                headers: {
                    'Authorization': 'Bearer ' + this.Token,
                    'Content-Type': 'application/json',
                    'Accept': accept
                }
            })
            return response
        } catch (error) {
            if (ignoreError) {
                info('External call error ignored: ' + error)
                return null
            } else {
                throw new Error('External call failed.<br/><br/>' + error)
            }
        }
    }


    // Generic Axios Calls

    public externalDelete = async (query: string): Promise<TResponse> => {
        const request = {
            baseURL: 'https://' + this.Tenant.Host,
            method: 'DELETE',
            url: query,
            headers: {
                'Authorization': 'Bearer ' + this.Token,
                'Content-Type': 'application/json',
                'Accept': 'application/json',
            }
        }
        return await this.doAxiosCall(request)
    }
    public externalPost = async (query: string, body?: any): Promise<TResponse> => {
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
        }
        return await this.doAxiosCall(request)
    }
    public externalPutCertificate = async (query: string, body: string): Promise<TResponse> => {
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
        }
        return await this.doAxiosCall(request)
    }
    public externalBatch = async (query: string, body: string): Promise<TResponse> => {
        const payload = '--batch_migrationtool\r\n'
            + 'Content-Type: multipart/mixed; boundary=changeset_externalconnection_batch\r\n'
            + body
            + '--changeset_externalconnection_batch--\r\n\r\n'
            + '--batch_migrationtool--'
        const request = {
            baseURL: 'https://' + this.Tenant.Host,
            method: 'POST',
            url: query,
            data: payload,
            headers: {
                'Authorization': 'Bearer ' + this.Token,
                'Content-Type': 'multipart/mixed; boundary=batch_migrationtool',
                'Accept': 'application/json',
            }
        }
        return await this.doAxiosCall(request)
    }
    public externalAxiosBinary = async (query: string): Promise<TResponse & { base64?: string }> => {
        const request: AxiosRequestConfig = {
            baseURL: 'https://' + this.Tenant.Host,
            method: 'GET',
            url: query,
            headers: {
                'Authorization': 'Bearer ' + this.Token,
                'Content-Type': 'application/json',
                'Accept': 'application/json',
            },
            responseType: 'arraybuffer'
        }
        try {
            const response = await axios(request)
            const base64Data = Buffer.from(response.data, 'binary').toString('base64')
            return {
                code: response.status,
                value: response,
                base64: base64Data
            }
        } catch (error: any) {
            info('External call error ignored: ' + error)
            const buffer = Buffer.from(error.response.data, 'binary').toString('utf8')
            return {
                code: error.response.status,
                value: ExternalConnection.tryJSONparse(buffer)
            }
        }
    }
    private doAxiosCall = async (request: axios.AxiosRequestConfig<any>, overrideReadonlyLock = false): Promise<TResponse> => {
        if (overrideReadonlyLock == false && this.Tenant.ReadOnly && request.method != 'GET') {
            const error = request.method + ' call blocked for security reasons: writing to read-only tenant is not allowed'
            warn(error)
            return {
                code: 400,
                value: error
            }
        }
        try {
            const response = await axios(request)
            return {
                code: response.status,
                value: response
            }
        } catch (error: any) {
            info('External call error ignored: ' + error)
            return {
                code: error?.response?.status || 400,
                value: error?.response?.data || error.toString()
            }
        }
    }
    private static tryJSONparse(data: string): any {
        try {
            return JSON.parse(data)
        } catch (e) {
            return data
        }
    }

}
