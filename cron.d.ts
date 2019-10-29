declare const fs: any;
declare const readline: any;
declare const google: any;
declare const async: any;
declare const axios: any;
declare const jsdom: any;
declare const JSDOM: any;
declare const SPREADSHEETID = "1rk1ZproKDkyEIP6PyKOHb-ybqoacdpI1pUOcqN8NW8I";
declare const TOKEN_PATH = "token.json";
declare const SCOPES: string[];
/**
 * Create an OAuth2 client with the given credentials, and then execute the
 * given callback function.
 * @param {Object} credentials The authorization client credentials.
 * @param {function} callback The callback to call with the authorized client.
 */
declare function authorize(credentials: {
    installed: {
        client_secret: any;
        client_id: any;
        redirect_uris: any;
    };
}, callback: {
    (auth: any): void;
    (arg0: any): void;
}): void;
/**
 * Get and store new token after prompting for user authorization, and then
 * execute the given callback with the authorized OAuth2 client.
 * @param {google.auth.OAuth2} oAuth2Client The OAuth2 client to get token for.
 * @param {getEventsCallback} callback The callback for the authorized client.
 */
declare function getAccessToken(oAuth2Client: {
    generateAuthUrl: (arg0: {
        access_type: string;
        scope: string[];
    }) => void;
    getToken: (arg0: any, arg1: (err: any, token: any) => void) => void;
    setCredentials: (arg0: any) => void;
}, callback: {
    (auth: any): void;
    (arg0: any): void;
    (arg0: any): void;
}): void;
declare function getRanges(res: any): any;
declare function main(auth: any): void;
//# sourceMappingURL=cron.d.ts.map