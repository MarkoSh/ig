"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var fs = require('fs');
var readline = require('readline');
var google = require('googleapis').google;
var express = require('express');
var app = express();
var bodyParser = require('body-parser');
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
var cookieParser = require('cookie-parser');
app.use(cookieParser());
app.disable('x-powered-by');
app.use('/assets', express.static('static/templates/site/assets'));
var HTTP_PORT = 8080;
var SPREADSHEETID = '1rk1ZproKDkyEIP6PyKOHb-ybqoacdpI1pUOcqN8NW8I';
var TOKEN_PATH = 'token.json';
var SCOPES = [
    'https://www.googleapis.com/auth/spreadsheets'
];
function authorize(credentials, callback) {
    var _a = credentials.installed, client_secret = _a.client_secret, client_id = _a.client_id, redirect_uris = _a.redirect_uris;
    var oAuth2Client = new google.auth.OAuth2(client_id, client_secret, redirect_uris[0]);
    fs.readFile(TOKEN_PATH, function (err, token) {
        if (err)
            return getAccessToken(oAuth2Client, callback);
        oAuth2Client.setCredentials(JSON.parse(token));
        callback(oAuth2Client);
    });
}
function getAccessToken(oAuth2Client, callback) {
    var authUrl = oAuth2Client.generateAuthUrl({
        access_type: 'offline',
        scope: SCOPES,
    });
    console.log('Authorize this app by visiting this url:', authUrl);
    var rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
    });
    rl.question('Enter the code from that page here: ', function (code) {
        rl.close();
        oAuth2Client.getToken(code, function (err, token) {
            if (err)
                return console.error('Error retrieving access token', err);
            oAuth2Client.setCredentials(token);
            fs.writeFile(TOKEN_PATH, JSON.stringify(token), function (err) {
                if (err)
                    return console.error(err);
                console.log('Token stored to', TOKEN_PATH);
            });
            callback(oAuth2Client);
        });
    });
}
function getRanges(res) {
    var ranges = {};
    res.data.valueRanges.forEach(function (range) {
        ranges[range.range.toLowerCase().match(/([a-z]+)\!/)[1]] = (function () {
            var cols = range.values.splice(0, 1)[0];
            var rows = range.values.map(function (row) {
                var row_ = {};
                row.forEach(function (col, i) {
                    if ('post_id' === cols[i] ||
                        'user_id' === cols[i] ||
                        'country_id' === cols[i] ||
                        'city_id' === cols[i]) {
                        row_[cols[i]] = parseInt(col);
                    }
                    else {
                        row_[cols[i]] = col;
                    }
                });
                return row_;
            });
            return rows;
        })();
    });
    return ranges;
}
fs.readFile('credentials.json', function (err, content) {
    if (err)
        return console.log('Error loading client secret file:', err);
    authorize(JSON.parse(content), main);
});
function main(auth) {
    console.info('Init');
    var sheets = google.sheets({ version: 'v4', auth: auth });
    var ranges = {};
    function updateRanges() {
        sheets.spreadsheets.values.batchGet({
            spreadsheetId: SPREADSHEETID,
            ranges: [
                'users!A1:D',
                'usersmeta!A1:C',
                'posts!A1:H',
                'postsmeta!A1:C',
                'countries!A1:C',
                'cities!A1:D',
            ],
        }, function (err, res) {
            if (err)
                return console.error('The API returned an error: ' + err);
            ranges = getRanges(res);
            ranges.cities = ranges.cities.sort(function (a, b) {
                return a.city < b.city;
            });
        });
    }
    updateRanges();
    setInterval(updateRanges, 5 * 60 * 1000);
    app.listen(HTTP_PORT, function () {
        console.info('HTTP Server running on port ' + HTTP_PORT);
    });
    app.get('/', function (request, response) {
        var template = fs.readFileSync(__dirname + '/static/templates/site/index.html', 'UTF-8');
        try {
            var locations = ranges.countries.map(function (country) {
                var cities = ranges.cities.filter(function (city) {
                    return city.country_id === country.country_id;
                }).map(function (city) {
                    return "<option value=\"" + city.city_id + "\" data-city=\"" + city.city + "\">" + city.alias + "</option>";
                }).join('');
                return "\n\t\t\t\t<optgroup label=\"" + country.alias + "\" data-country=\"" + country.country + "\">\n\t\t\t\t\t" + cities + "\n\t\t\t\t</optgroup>\n\t\t\t\t";
            });
            template = template.replace(/{LOCATIONS}/, locations.join("\n"));
            var travels = ranges.posts.filter(function (post) {
                var user = ranges.users.find(function (user) {
                    return user.user_id == post.user_id;
                });
                return 'travel' === post.post_type && 'admin' === user.role || 'user' === user.role;
            }).map(function (post) {
                var meta = {};
                ranges.postsmeta.forEach(function (meta_) {
                    if (post.post_id == meta_.post_id)
                        meta[meta_.meta_key] = meta_.meta_value;
                });
                var now = Date.now() / 1000;
                if (parseInt(meta._end) > now) {
                    return "\n\t\t\t\t\t<div class=\"image fit\">\n\t\t\t\t\t\t<a href=\"https://www.instagram.com/p/" + meta._shortcode + "/\" target=\"_blank\" title=\"" + post.post_content + "\">\n\t\t\t\t\t\t\t<img src=\"" + meta._display_url + "\" alt=\"" + post.post_content + "\" />\n\t\t\t\t\t\t</a>\n\t\t\t\t\t</div>\n\t\t\t\t\t";
                }
                else {
                    return '';
                }
            });
            shuffle(travels);
            template = template.replace(/{TRAVELS}/, travels.join("\n"));
        }
        catch (error) {
            console.error('Error in get /: ' + error);
        }
        response.send(template);
    });
    app.get('/f', function (request, response) {
        var location = parseInt(request.query.l);
        var start = Date.parse(request.query.s) / 1000;
        var end = Date.parse(request.query.e) / 1000;
        try {
            var posts = ranges.posts.filter(function (post) {
                var user = ranges.users.find(function (user) {
                    return user.user_id == post.user_id;
                });
                return 'travel' === post.post_type && 'admin' === user.role || 'user' === user.role;
            }).filter(function (post) {
                var meta_ = {
                    _city_id: 0,
                    _start: 0,
                    _end: 0
                };
                ranges.postsmeta.filter(function (meta) {
                    return post.post_id == meta.post_id && ('_start' == meta.meta_key || '_end' == meta.meta_key || '_city_id' == meta.meta_key);
                }).forEach(function (meta) {
                    meta_[meta.meta_key] = parseInt(meta.meta_value);
                });
                return location == meta_._city_id && start <= meta_._end && end >= meta_._start;
            }).map(function (post) {
                var meta_ = {};
                ranges.postsmeta.filter(function (meta) {
                    return post.post_id == meta.post_id && ('_shortcode' == meta.meta_key || '_display_url' == meta.meta_key);
                }).forEach(function (meta) {
                    meta_[meta.meta_key] = meta.meta_value;
                });
                return {
                    shortcode: meta_._shortcode,
                    display_url: meta_._display_url,
                    post_content: post.post_content
                };
            });
            shuffle(posts);
            return response.json(posts);
        }
        catch (error) {
            console.error('Error in get /f: ' + error);
        }
        response.json([]);
    });
    app.get('/r', function (request, response) {
        try {
            var posts = ranges.posts.filter(function (post) {
                var user = ranges.users.find(function (user) {
                    return user.user_id == post.user_id;
                });
                return 'travel' === post.post_type && 'admin' === user.role || 'user' === user.role;
            }).map(function (post) {
                var meta_ = {
                    _shortcode: null,
                    _display_url: null
                };
                ranges.postsmeta.filter(function (meta) {
                    return post.post_id == meta.post_id && ('_shortcode' == meta.meta_key || '_display_url' == meta.meta_key);
                }).forEach(function (meta) {
                    meta_[meta.meta_key] = meta.meta_value;
                });
                return {
                    shortcode: meta_._shortcode,
                    display_url: meta_._display_url,
                    post_content: post.post_content
                };
            });
            shuffle(posts);
            return response.json(posts);
        }
        catch (error) {
            console.error('Error in get /f: ' + error);
        }
        response.json([]);
    });
    console.info('Init done');
}
function shuffle(a) {
    var j, x, i;
    for (i = a.length - 1; i > 0; i--) {
        j = Math.floor(Math.random() * (i + 1));
        x = a[i];
        a[i] = a[j];
        a[j] = x;
    }
    return a;
}
//# sourceMappingURL=site.js.map