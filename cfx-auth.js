const axios = require('axios');

const CFX_AUTH_URL = 'https://login.cfx.re/oauth/authorize';
const CFX_TOKEN_URL = 'https://login.cfx.re/oauth/token';
const CFX_USER_URL = 'https://login.cfx.re/oauth/userinfo';

class CFXAuth {
    constructor(clientId, clientSecret, redirectUri) {
        this.clientId = clientId;
        this.clientSecret = clientSecret;
        this.redirectUri = redirectUri;
    }

    // Schritt 1: Generiere Authorization URL
    getAuthorizationUrl(state = null) {
        const params = new URLSearchParams({
            client_id: this.clientId,
            redirect_uri: this.redirectUri,
            response_type: 'code',
            scope: 'openid identify'
        });

        if (state) {
            params.append('state', state);
        }

        return `${CFX_AUTH_URL}?${params.toString()}`;
    }

    // Schritt 2: Tausche Authorization Code gegen Access Token
    async getAccessToken(code) {
        try {
            const response = await axios.post(CFX_TOKEN_URL, {
                grant_type: 'authorization_code',
                code: code,
                client_id: this.clientId,
                client_secret: this.clientSecret,
                redirect_uri: this.redirectUri
            }, {
                headers: {
                    'Content-Type': 'application/json'
                }
            });

            return {
                success: true,
                data: response.data
            };
        } catch (error) {
            console.error('CFX Token Error:', error.response?.data || error.message);
            return {
                success: false,
                error: error.response?.data || error.message
            };
        }
    }

    // Schritt 3: Hole Benutzerinformationen
    async getUserInfo(accessToken) {
        try {
            const response = await axios.get(CFX_USER_URL, {
                headers: {
                    'Authorization': `Bearer ${accessToken}`
                }
            });

            return {
                success: true,
                data: response.data
            };
        } catch (error) {
            console.error('CFX UserInfo Error:', error.response?.data || error.message);
            return {
                success: false,
                error: error.response?.data || error.message
            };
        }
    }

    // Kompletter OAuth Flow
    async authenticate(code) {
        // Hole Access Token
        const tokenResult = await this.getAccessToken(code);
        if (!tokenResult.success) {
            return tokenResult;
        }

        const accessToken = tokenResult.data.access_token;

        // Hole Benutzerinformationen
        const userResult = await this.getUserInfo(accessToken);
        if (!userResult.success) {
            return userResult;
        }

        return {
            success: true,
            user: userResult.data,
            token: accessToken
        };
    }
}

module.exports = CFXAuth;
