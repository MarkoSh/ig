"use strict";
var fs = require('fs');
var readline = require('readline');
var google = require('googleapis').google;
var async = require('async');
var axios = require('axios');
var jsdom = require('jsdom');
var JSDOM = jsdom.JSDOM;
var SPREADSHEETID = '1rk1ZproKDkyEIP6PyKOHb-ybqoacdpI1pUOcqN8NW8I';
// The file token.json stores the user's access and refresh tokens, and is
// created automatically when the authorization flow completes for the first
// time.
var TOKEN_PATH = 'token.json';
// If modifying these scopes, delete token.json.
var SCOPES = [
    'https://www.googleapis.com/auth/spreadsheets'
];
/**
 * Create an OAuth2 client with the given credentials, and then execute the
 * given callback function.
 * @param {Object} credentials The authorization client credentials.
 * @param {function} callback The callback to call with the authorized client.
 */
function authorize(credentials, callback) {
    var _a = credentials.installed, client_secret = _a.client_secret, client_id = _a.client_id, redirect_uris = _a.redirect_uris;
    var oAuth2Client = new google.auth.OAuth2(client_id, client_secret, redirect_uris[0]);
    // Check if we have previously stored a token.
    fs.readFile(TOKEN_PATH, function (err, token) {
        if (err)
            return getAccessToken(oAuth2Client, callback);
        oAuth2Client.setCredentials(JSON.parse(token));
        callback(oAuth2Client);
    });
}
/**
 * Get and store new token after prompting for user authorization, and then
 * execute the given callback with the authorized OAuth2 client.
 * @param {google.auth.OAuth2} oAuth2Client The OAuth2 client to get token for.
 * @param {getEventsCallback} callback The callback for the authorized client.
 */
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
            // Store the token to disk for later program executions
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
    // Authorize a client with credentials, then call the Google Calendar API.
    authorize(JSON.parse(content), main);
});
function main(auth) {
    console.info('Init');
    var sheets = google.sheets({ version: 'v4', auth: auth });
    // Основной крон
    function cronenburg() {
        console.info('cronenburg');
        sheets.spreadsheets.values.batchGet({
            spreadsheetId: SPREADSHEETID,
            ranges: [
                'users!A1:D',
                'usersmeta!A1:C',
                'posts!A1:G',
                'postsmeta!A1:C',
                'countries!A1:B',
                'cities!A1:B',
            ],
        }, function (err, res) {
            if (err)
                return console.error('The API returned an error: ' + err);
            var ranges = getRanges(res);
            ranges.posts = ranges.posts.sort(function (a, b) {
                return a.post_id > b.post_id;
            });
            var post_id = ranges.posts.length > 0 ? ranges.posts[ranges.posts.length - 1].post_id : 0;
            var edges_exist = ranges.postsmeta.filter(function (meta) {
                return '_edge_id' === meta.meta_key;
            });
            var igs = ranges.users.filter(function (user) {
                return 'admin' === user.role || 'user' === user.role;
            }).map(function (user) {
                return ranges.usersmeta.find(function (meta) {
                    return meta.user_id == user.user_id && '_instagram' === meta.meta_key;
                });
            }).map(function (ig) {
                ig.meta_value = JSON.parse(ig.meta_value);
                return ig;
            });
            async.eachOfLimit(igs, 1, function (ig, i, cb) {
                var url = 'https://www.instagram.com/' + ig.meta_value.current + '/';
                console.info('Getting profile: ' + url);
                axios.get(url).then(function (response) {
                    var window = new JSDOM(response.data, { runScripts: "dangerously" }).window;
                    var document = window.document;
                    try {
                        var edges = window._sharedData.entry_data.ProfilePage[0].graphql.user.edge_owner_to_timeline_media.edges;
                        edges = edges.map(function (edge) {
                            return edge.node;
                        });
                        var travels_1 = edges.filter(function (edge) {
                            try {
                                var found = edges_exist.find(function (edge_) {
                                    return edge.id == edge_.meta_value;
                                });
                                var text = edge.edge_media_to_caption.edges[0].node.text;
                                return !found && text.match(/(pictraveld|pictravelp)/i);
                            }
                            catch (err) { }
                        }).map(function (edge) {
                            var text = edge.edge_media_to_caption.edges[0].node.text;
                            var tags = text.match(/\#([а-яА-Яa-zA-Z0-9\-\.]+)/g);
                            var dates = text.match(/\#([0-9\-\.]+)/g);
                            dates = dates.map(function (date) {
                                return Date.parse(date.substring(1).replace(/(\d{2})\.(\d{2})\.(\d{4})/, '$3-$2-$1')) / 1000;
                            }).sort(function (a, b) {
                                return a > b;
                            });
                            var words = tags.filter(function (tag) {
                                return tag.match(/\#([a-zA-Z]+)/);
                            }).map(function (word) {
                                return word.substring(1);
                            });
                            var city = ranges.cities.find(function (city) {
                                return words.find(function (word) {
                                    return word.toLowerCase() === city.city.toLowerCase();
                                });
                            });
                            var country = ranges.countries.find(function (country) {
                                return words.find(function (word) {
                                    return word.toLowerCase() === country.country.toLowerCase();
                                });
                            });
                            return {
                                post: {
                                    user_id: ig.user_id,
                                    post_id: ++post_id,
                                    post_date: Date.now(),
                                    post_title: edge.shortcode,
                                    post_excerpt: edge.shortcode,
                                    post_content: text,
                                    post_type: 2 !== dates.length || !country || !city ? 'error' : 'travel',
                                },
                                meta: {
                                    _edge_id: edge.id,
                                    _shortcode: edge.shortcode,
                                    _city_id: city ? city.city_id : false,
                                    _country_id: country ? country.country_id : false,
                                    _start: dates[0],
                                    _end: dates[1],
                                    _tags: tags,
                                    _display_url: edge.display_url,
                                    _taken_at_timestamp: edge.taken_at_timestamp
                                }
                            };
                        });
                        if (travels_1.length > 0) {
                            console.info('Travels for append: ' + travels_1.length);
                            var options = {
                                spreadsheetId: SPREADSHEETID,
                                range: 'Posts!A2:H',
                                valueInputOption: 'USER_ENTERED',
                                resource: {
                                    range: 'Posts!A2:H',
                                    majorDimension: 'ROWS',
                                    values: (function () {
                                        return travels_1.map(function (travel) {
                                            return [
                                                travel.post.user_id,
                                                travel.post.post_id,
                                                travel.post.post_date,
                                                false,
                                                travel.post.post_title,
                                                travel.post.post_excerpt,
                                                travel.post.post_content,
                                                travel.post.post_type,
                                            ];
                                        });
                                    })()
                                }
                            };
                            sheets.spreadsheets.values.append(options, function (err, res) {
                                if (err) {
                                    cb(err);
                                    return console.log('The API returned an error: ' + err);
                                }
                                console.info('Posts added');
                                var options = {
                                    spreadsheetId: SPREADSHEETID,
                                    range: 'PostsMeta!A2:C',
                                    valueInputOption: 'USER_ENTERED',
                                    resource: {
                                        range: 'PostsMeta!A2:C',
                                        majorDimension: 'ROWS',
                                        values: (function () {
                                            var meta = [];
                                            travels_1.forEach(function (travel) {
                                                Object.keys(travel.meta).forEach(function (key) {
                                                    meta.push([
                                                        travel.post.post_id,
                                                        key,
                                                        Array.isArray(travel.meta[key]) ? JSON.stringify(travel.meta[key]) : travel.meta[key]
                                                    ]);
                                                });
                                            });
                                            return meta;
                                        })()
                                    }
                                };
                                sheets.spreadsheets.values.append(options, function (err, res) {
                                    if (err) {
                                        cb(err);
                                        return console.log('The API returned an error: ' + err);
                                    }
                                    console.info('Meta added');
                                    setTimeout(cb, 5000);
                                });
                            });
                        }
                        else
                            setTimeout(cb, 5000);
                    }
                    catch (err) {
                        cb(err);
                    }
                }).catch(function (err) {
                    cb(err);
                    if (err)
                        return console.error('The IG returned an error: ' + err);
                });
            }, function (err) {
                if (err)
                    return console.error('The API returned an error: ' + err);
                console.info('CRON ended');
            });
        });
    }
    cronenburg();
    setInterval(cronenburg, 2 * 60 * 60000);
    // Репиксер
    function mrpixer() {
        console.info('mrpixer');
        sheets.spreadsheets.values.batchGet({
            spreadsheetId: SPREADSHEETID,
            ranges: [
                'users!A1:D',
                'posts!A1:H',
                'postsmeta!A1:C',
            ],
        }, function (err, res) {
            if (err)
                return console.error('The API returned an error: ' + err);
            var ranges = getRanges(res);
            var posts = ranges.posts.map(function (post) {
                post.post_date = parseInt(post.post_date);
                post.post_modified = parseInt(post.post_modified) ? parseInt(post.post_modified) : false;
                return post;
            });
            var users = ranges.users.map(function (user) {
                var posts_ = posts.filter(function (post) {
                    return post.user_id == user.user_id;
                }).map(function (post) {
                    var postmeta = ranges.postsmeta.filter(function (meta) {
                        return meta.post_id == post.post_id;
                    });
                    post['meta'] = {};
                    postmeta.forEach(function (meta) {
                        post['meta'][meta.meta_key] = meta.meta_value;
                    });
                    return post;
                });
                user['posts'] = posts_;
                return user;
            });
            async.eachOfLimit(users, 1, function (user, i, cb) {
                async.eachOfLimit(user.posts, 1, function (post, j, cb_) {
                    var url = 'https://www.instagram.com/p/' + post.meta._shortcode + '/';
                    console.info('Getting post: ' + url);
                    axios.get(url).then(function (response) {
                        var window = new JSDOM(response.data, { runScripts: "dangerously" }).window;
                        var document = window.document;
                        try {
                            var display_url = window._sharedData.entry_data.PostPage[0].graphql.shortcode_media.display_url;
                            post.meta._display_url = display_url;
                            post.post_modified = Date.now();
                            setTimeout(cb_, 2000);
                        }
                        catch (error) {
                            cb_(error);
                        }
                    }).catch(function (error) {
                        cb_(error);
                    });
                }, function (error) {
                    if (error)
                        return console.error('The IG returned an error: ' + error);
                    cb(error);
                });
            }, function (error) {
                if (error)
                    console.error('The IG returned an error: ' + error);
                var options = {
                    spreadsheetId: SPREADSHEETID,
                    resource: {
                        valueInputOption: 'USER_ENTERED',
                        data: [
                            {
                                range: 'Posts!A2:H',
                                majorDimension: 'ROWS',
                                values: posts.map(function (post) {
                                    return [
                                        post.user_id,
                                        post.post_id,
                                        post.post_date,
                                        post.post_modified,
                                        post.post_title,
                                        post.post_excerpt,
                                        post.post_content,
                                        post.post_type,
                                    ];
                                })
                            },
                            {
                                range: 'PostsMeta!A2:C',
                                majorDimension: 'ROWS',
                                values: posts.map(function (post) {
                                    return Object.keys(post.meta).map(function (key) {
                                        return [
                                            post.post_id,
                                            key,
                                            post.meta[key]
                                        ];
                                    });
                                }).reduce(function (acc, next) {
                                    acc = acc.concat(next);
                                    return acc;
                                })
                            }
                        ]
                    }
                };
                sheets.spreadsheets.values.batchUpdate(options, function (err, res) {
                    if (err) {
                        return console.log('The API returned an error: ' + err);
                    }
                    console.info('mrpixer end');
                });
            });
        });
    }
    mrpixer();
    setInterval(mrpixer, 3 * 60 * 60000);
    console.info('Init done');
}
//# sourceMappingURL=cron.js.map