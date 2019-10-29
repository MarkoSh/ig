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
declare function getRanges(res: {
    data: {
        valueRanges: {
            forEach: (arg0: (range: {
                range: string | number;
                values: {
                    splice: (arg0: number, arg1: number) => any[];
                    map: (arg0: (row: any) => {}) => void;
                };
            }) => void) => void;
        };
    };
}): {};
declare function main(auth: any): void;
//# sourceMappingURL=cron.d.ts.map