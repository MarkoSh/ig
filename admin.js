"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var fs = require('fs');
var md5 = require('md5');
var readline = require('readline');
var google = require('googleapis').google;
var https = require('https');
var express = require('express');
var app = express();
var bodyParser = require('body-parser');
var cookieParser = require('cookie-parser');
app.use(bodyParser.json()); // support json encoded bodies
app.use(bodyParser.urlencoded({ extended: true })); // support encoded bodies
app.use(cookieParser());
app.use('/static/login', express.static('static/templates/login'));
app.use('/static/dashboard', express.static('static/templates/dashboard/dist'));
app.use('/css', express.static('static/templates/dashboard/dist/css'));
app.use('/js', express.static('static/templates/dashboard/dist/js'));
app.use('/img', express.static('static/templates/dashboard/dist/img'));
app.disable('x-powered-by');
var httpsServer = https.createServer((function () {
    return {
        key: fs.readFileSync('server.key'),
        cert: fs.readFileSync('server.crt')
    };
})(), app);
var HTTPS_PORT = 60453;
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
                        try {
                            row_[cols[i]] = JSON.parse(col);
                        }
                        catch (error) {
                            row_[cols[i]] = col;
                        }
                    }
                });
                return row_;
            });
            return rows;
        })();
    });
    return ranges;
}
// Load client secrets from a local file.
fs.readFile('credentials.json', function (err, content) {
    if (err)
        return console.log('Error loading client secret file:', err);
    // Authorize a client with credentials, then call the Google Calendar API.
    authorize(JSON.parse(content), main);
});
function main(auth) {
    console.info('Init');
    var sheets = google.sheets({ version: 'v4', auth: auth });
    function addUser(user, response) {
        var options = {
            spreadsheetId: SPREADSHEETID,
            ranges: ['Users!A1:D', 'UsersMeta!A1:C']
        };
        sheets.spreadsheets.values.batchGet(options, function (err, res) {
            if (err)
                return console.log('The API returned an error: ' + err);
            var ranges = getRanges(res);
            ranges.users.sort(function (a, b) {
                return a.user_id < b.user_id ? 1 : -1;
            }).forEach(function (user) {
                user['meta'] = {};
                ranges.usersmeta.filter(function (meta) {
                    return meta.user_id == user.user_id;
                }).forEach(function (meta) {
                    user['meta'][meta.meta_key] = meta.meta_value;
                });
                delete user.password;
                delete user.meta.token;
            });
            var index = ranges.users[0].user_id + 1;
            user.user_id = index;
            user.role = 'user';
            var options = {
                spreadsheetId: SPREADSHEETID,
                range: 'Users!A2:D',
                valueInputOption: 'USER_ENTERED',
                resource: {
                    range: 'Users!A2:D',
                    majorDimension: 'ROWS',
                    values: [
                        [
                            user.user_id,
                            user.username,
                            null,
                            user.role
                        ]
                    ]
                }
            };
            sheets.spreadsheets.values.append(options, function (err, res) {
                if (err) {
                    response.json({
                        success: false,
                        data: err
                    });
                    return console.error('The API returned an error: ' + err);
                }
                console.log('User added');
                ranges.users.push(user);
                ranges.usersmeta = ranges.usersmeta.filter(function (meta) {
                    return meta.user_id != user.user_id;
                });
                Object.keys(user.meta).forEach(function (key) {
                    ranges.usersmeta.push({
                        user_id: user.user_id,
                        meta_key: key,
                        meta_value: user.meta[key]
                    });
                });
                var options = {
                    spreadsheetId: SPREADSHEETID,
                    range: 'UsersMeta!A2:C',
                    valueInputOption: 'USER_ENTERED',
                    resource: {
                        range: 'UsersMeta!A2:C',
                        majorDimension: 'ROWS',
                        values: ranges.usersmeta.map(function (meta) {
                            return [
                                meta.user_id,
                                meta.meta_key,
                                JSON.stringify(meta.meta_value)
                            ];
                        })
                    }
                };
                sheets.spreadsheets.values.update(options, function (err, res) {
                    if (err) {
                        response.json({
                            success: false,
                            data: err
                        });
                        return console.error('The API returned an error: ' + err);
                    }
                    console.log('UsersMeta updated');
                    response.json({
                        success: true,
                        data: ranges.users.sort(function (a, b) {
                            return a.username < b.username ? 1 : -1;
                        })
                    });
                });
            });
        });
    }
    function updateUser(user, response) {
        var options = {
            spreadsheetId: SPREADSHEETID,
            ranges: ['Users!A1:D', 'UsersMeta!A1:C']
        };
        sheets.spreadsheets.values.batchGet(options, function (err, res) {
            if (err) {
                response.json({
                    success: false,
                    data: err
                });
                return console.error('The API returned an error: ' + err);
            }
            var ranges = getRanges(res);
            ranges.users.forEach(function (user) {
                user['meta'] = {};
                ranges.usersmeta.filter(function (meta) {
                    return meta.user_id == user.user_id;
                }).forEach(function (meta) {
                    user['meta'][meta.meta_key] = meta.meta_value;
                });
                delete user.password;
                delete user.meta.token;
            });
            var found = ranges.users.find(function (user_) {
                return user_.username == user.username;
            });
            if (found && 'admin' !== found.role) {
                Object.keys(user.meta).forEach(function (key) {
                    if (found.meta[key]) {
                        found.meta[key].previous = found.meta[key].current;
                        found.meta[key].current = user.meta[key].current;
                    }
                    else {
                        found.meta[key].current = user.meta[key].current;
                    }
                });
                ranges.usersmeta = ranges.usersmeta.filter(function (meta) {
                    return meta.user_id != found.user_id;
                });
                Object.keys(user.meta).forEach(function (key) {
                    ranges.usersmeta.push({
                        user_id: found.user_id,
                        meta_key: key,
                        meta_value: found.meta[key]
                    });
                });
                var options_1 = {
                    spreadsheetId: SPREADSHEETID,
                    range: 'UsersMeta!A2:C',
                    valueInputOption: 'USER_ENTERED',
                    resource: {
                        range: 'UsersMeta!A2:C',
                        majorDimension: 'ROWS',
                        values: ranges.usersmeta.map(function (meta) {
                            return [
                                meta.user_id,
                                meta.meta_key,
                                JSON.stringify(meta.meta_value)
                            ];
                        })
                    }
                };
                sheets.spreadsheets.values.update(options_1, function (err, res) {
                    if (err) {
                        response.json({
                            success: false,
                            data: err
                        });
                        return console.error('The API returned an error: ' + err);
                    }
                    console.log('UsersMeta updated');
                    response.json({
                        success: true,
                        data: ranges.users.sort(function (a, b) {
                            return a.username < b.username ? 1 : -1;
                        })
                    });
                });
            }
            else if ('admin' === found.role) {
                response.json({
                    success: false,
                    data: 'Такой пользователь не может быть отредактирован'
                });
            }
            else
                addUser(user, response);
        });
    }
    function deleteUser(user, response) {
        var options = {
            spreadsheetId: SPREADSHEETID,
            ranges: ['Users!A1:D', 'UsersMeta!A1:C']
        };
        sheets.spreadsheets.values.batchGet(options, function (err, res) {
            if (err) {
                response.json({
                    success: false,
                    data: err
                });
                return console.error('The API returned an error: ' + err);
            }
            var ranges = getRanges(res);
            ranges.users.forEach(function (user) {
                user['meta'] = {};
                ranges.usersmeta.filter(function (meta) {
                    return meta.user_id == user.user_id;
                }).forEach(function (meta) {
                    user['meta'][meta.meta_key] = meta.meta_value;
                });
            });
            var found = ranges.users.find(function (user_) {
                return user_.username == user.username;
            });
            if (found && 'admin' !== found.role) {
                found.role = 'deleted';
                var options_2 = {
                    spreadsheetId: SPREADSHEETID,
                    range: 'Users!A2:D',
                    valueInputOption: 'USER_ENTERED',
                    resource: {
                        range: 'Users!A2:D',
                        majorDimension: 'ROWS',
                        values: ranges.users.map(function (user) {
                            return [
                                user.user_id,
                                user.username,
                                user.password,
                                user.role
                            ];
                        })
                    }
                };
                sheets.spreadsheets.values.update(options_2, function (err, res) {
                    if (err) {
                        response.json({
                            success: false,
                            data: err
                        });
                        return console.error('The API returned an error: ' + err);
                    }
                    console.log('Users updated');
                    response.json({
                        success: true,
                        data: ranges.users.sort(function (a, b) {
                            return a.username < b.username ? 1 : -1;
                        })
                    });
                });
            }
            else if ('admin' === found.role) {
                response.json({
                    success: false,
                    data: 'Такой пользователь не может быть отредактирован'
                });
            }
            else
                response.json({
                    success: false,
                    data: 'Пользователь не найден'
                });
        });
    }
    httpsServer.listen(HTTPS_PORT, function () {
        console.log('HTTPS Server running on port ' + HTTPS_PORT);
    });
    app.get('/login/', function (request, response) {
        response.sendFile(__dirname + '/static/templates/login/index.html');
    });
    app.post('/login/', function (request, response) {
        var username = request.body.username;
        var password = md5(request.body.password);
        var token = md5(username + password + request.ip + 'saltsalt');
        sheets.spreadsheets.values.batchGet({
            spreadsheetId: SPREADSHEETID,
            ranges: [
                'Users!A1:D',
                'UsersMeta!A1:C'
            ],
        }, function (err, res) {
            if (err)
                return console.log('The API returned an error: ' + err);
            var ranges = getRanges(res);
            ranges.users.forEach(function (user) {
                user['meta'] = {};
                ranges.usersmeta.filter(function (meta) {
                    return meta.user_id == user.user_id;
                }).forEach(function (meta) {
                    user['meta'][meta.meta_key] = meta.meta_value;
                });
            });
            var user = ranges.users.find(function (user) {
                return 'admin' === user.role && user.username == username && user.password == password;
            });
            if (user) {
                user.meta['token'] = token;
                user.meta['last_login'] = {
                    ip: request.ip,
                    date: Date.now()
                };
                var options = {
                    spreadsheetId: SPREADSHEETID,
                    range: 'UsersMeta!A2:C',
                    valueInputOption: 'USER_ENTERED',
                    resource: {
                        range: 'UsersMeta!A2:C',
                        majorDimension: 'ROWS',
                        values: ranges.usersmeta.map(function (meta) {
                            var user = ranges.users.find(function (user) {
                                return user.user_id == meta.user_id;
                            });
                            try {
                                meta.meta_value = user.meta[meta.meta_key];
                            }
                            catch (error) { }
                            return meta;
                        }).map(function (meta) {
                            return [
                                meta.user_id,
                                meta.meta_key,
                                JSON.stringify(meta.meta_value)
                            ];
                        })
                    }
                };
                sheets.spreadsheets.values.update(options, function (err, res) {
                    if (err) {
                        response.json({
                            success: false,
                            data: 'The API returned an error: ' + err
                        });
                        return console.log('The API returned an error: ' + err);
                    }
                    response.cookie('reset', token);
                    response.cookie('reset_v2', token);
                    response.json({
                        status: true,
                        data: 'Пользователь с таким логином существует'
                    });
                });
            }
            else {
                response.json({
                    status: false,
                    data: 'Пользователь с таким логином не существует'
                });
            }
        });
    });
    app.get('/dashboard/', function (request, response) {
        response.sendFile(__dirname + '/static/templates/dashboard/dist/index.html');
    });
    app.get('/dashboard/users', function (request, response) {
        sheets.spreadsheets.values.batchGet({
            spreadsheetId: SPREADSHEETID,
            ranges: [
                'Users!A1:D',
                'UsersMeta!A1:C'
            ],
        }, function (err, res) {
            if (err)
                return console.log('The API returned an error: ' + err);
            var ranges = getRanges(res);
            ranges.users.forEach(function (user) {
                user['meta'] = {};
                ranges.usersmeta.filter(function (meta) {
                    return meta.user_id == user.user_id;
                }).forEach(function (meta) {
                    user['meta'][meta.meta_key] = meta.meta_value;
                });
            });
            response.json({
                success: true,
                data: ranges.users.sort(function (a, b) {
                    return a.username < b.username ? 1 : -1;
                })
            });
        });
    });
    app.get('/dashboard/travels', function (request, response) {
        sheets.spreadsheets.values.batchGet({
            spreadsheetId: SPREADSHEETID,
            ranges: [
                'Users!A1:D',
                'UsersMeta!A1:C',
                'Posts!A1:H',
                'PostsMeta!A1:C',
                'Cities!A1:D',
                'Countries!A1:C'
            ],
        }, function (err, res) {
            if (err)
                return console.log('The API returned an error: ' + err);
            var ranges = getRanges(res);
            var cities = ranges.cities.map(function (city) {
                var country = ranges.countries.find(function (country) {
                    return country.country_id == city.country_id;
                });
                city['country'] = country;
                return city;
            });
            var posts = ranges.posts.map(function (post) {
                var meta = {};
                ranges.postsmeta.filter(function (meta) {
                    return meta.post_id == post.post_id;
                }).forEach(function (meta_) {
                    meta[meta_.meta_key] = meta_.meta_value;
                });
                post['meta'] = meta;
                var location = cities.find(function (city) {
                    return city.city_id == post.meta._city_id;
                });
                post['location'] = location;
                var user = ranges.users.map(function (user) {
                    delete user.password;
                    var meta = {};
                    ranges.usersmeta.filter(function (meta) {
                        return meta.user_id == user.user_id;
                    }).forEach(function (meta_) {
                        meta[meta_.meta_key] = meta_.meta_value;
                    });
                    delete meta.token;
                    user['meta'] = meta;
                    return user;
                }).find(function (user) {
                    return post.user_id == user.user_id;
                });
                post['user'] = user;
                return post;
            });
            response.json({
                success: true,
                data: posts.filter(function (post) {
                    return post.post_type !== 'deleted';
                })
            });
        });
    });
    app.get('/dashboard/locations', function (request, response) {
        sheets.spreadsheets.values.batchGet({
            spreadsheetId: SPREADSHEETID,
            ranges: [
                'Cities!A1:D',
                'Countries!A1:C',
            ],
        }, function (err, res) {
            if (err)
                return console.log('The API returned an error: ' + err);
            var ranges = getRanges(res);
            var cities = ranges.cities.map(function (city) {
                var country = ranges.countries.find(function (country) {
                    return country.country_id == city.country_id;
                });
                city['country'] = country;
                return city;
            });
            response.json({
                success: true,
                data: cities
            });
        });
    });
    app.post('/dashboard/users', function (request, response) {
        try {
            var mode_1 = request.body.mode;
            var user_1 = JSON.parse(request.body.user);
            if (user_1.username.length > 0) {
                sheets.spreadsheets.values.batchGet({
                    spreadsheetId: SPREADSHEETID,
                    ranges: [
                        'Users!A1:D',
                        'UsersMeta!A1:C'
                    ],
                }, function (err, res) {
                    if (err)
                        return console.log('The API returned an error: ' + err);
                    var ranges = getRanges(res);
                    var found = ranges.users.find(function (user_) {
                        return user_1.username == user_.username;
                    });
                    switch (mode_1) {
                        case 'add':
                            if (found)
                                return response.json({
                                    success: false,
                                    data: 'Такой пользователь уже существует'
                                });
                            addUser(user_1, response);
                            break;
                        case 'update':
                            if (found && 'admin' === found.role)
                                return response.json({
                                    success: false,
                                    data: 'Такой пользователь не может быть отредактирован'
                                });
                            updateUser(user_1, response);
                            break;
                        case 'delete':
                            if (found && 'admin' === found.role)
                                return response.json({
                                    success: false,
                                    data: 'Такой пользователь не может быть удален'
                                });
                            deleteUser(user_1, response);
                            break;
                    }
                });
            }
            else
                response.json({
                    success: false,
                    data: 'Недопустимое имя пользователя'
                });
        }
        catch (error) {
            response.json({
                success: false,
                data: error
            });
        }
    });
    app.post('/dashboard/travels', function (request, response) {
        try {
            var mode = request.body.mode;
            var post_id_1 = parseInt(request.body.item);
            sheets.spreadsheets.values.batchGet({
                spreadsheetId: SPREADSHEETID,
                ranges: [
                    'Users!A1:D',
                    'UsersMeta!A1:C',
                    'Posts!A1:H',
                    'PostsMeta!A1:C',
                    'Cities!A1:D',
                    'Countries!A1:C'
                ],
            }, function (err, res) {
                if (err)
                    return console.log('The API returned an error: ' + err);
                var ranges = getRanges(res);
                var cities = ranges.cities.map(function (city) {
                    var country = ranges.countries.find(function (country) {
                        return country.country_id == city.country_id;
                    });
                    city['country'] = country;
                    return city;
                });
                var posts = ranges.posts.map(function (post) {
                    var meta = {};
                    ranges.postsmeta.filter(function (meta) {
                        return meta.post_id == post.post_id;
                    }).forEach(function (meta_) {
                        meta[meta_.meta_key] = meta_.meta_value;
                    });
                    post['meta'] = meta;
                    var location = cities.find(function (city) {
                        return city.city_id == post.meta._city_id;
                    });
                    post['location'] = location;
                    var user = ranges.users.map(function (user) {
                        delete user.password;
                        var meta = {};
                        ranges.usersmeta.filter(function (meta) {
                            return meta.user_id == user.user_id;
                        }).forEach(function (meta_) {
                            meta[meta_.meta_key] = meta_.meta_value;
                        });
                        delete meta.token;
                        user['meta'] = meta;
                        return user;
                    }).find(function (user) {
                        return post.user_id == user.user_id;
                    });
                    post['user'] = user;
                    return post;
                });
                var found = posts.find(function (post) {
                    return post_id_1 == post.post_id;
                });
                if (found) {
                    found.post_modified = Date.now();
                    found.post_type = 'deleted';
                }
                var options = {
                    spreadsheetId: SPREADSHEETID,
                    range: 'Posts!A2:H',
                    valueInputOption: 'USER_ENTERED',
                    resource: {
                        range: 'Posts!A2:H',
                        majorDimension: 'ROWS',
                        values: ranges.posts.map(function (post) {
                            return [
                                post.user_id,
                                post.post_id,
                                post.post_date,
                                post.post_modified,
                                post.post_title,
                                post.post_excerpt,
                                post.post_content,
                                post.post_type
                            ];
                        })
                    }
                };
                sheets.spreadsheets.values.update(options, function (err, res) {
                    if (err) {
                        response.json({
                            success: false,
                            data: err
                        });
                        return console.error('The API returned an error: ' + err);
                    }
                    console.log('Posts updated');
                    response.json({
                        success: true,
                        data: posts.filter(function (post) {
                            return post.post_type !== 'deleted';
                        })
                    });
                });
            });
        }
        catch (error) {
            response.json({
                success: false,
                data: error
            });
        }
    });
    console.info('Init done');
}
//# sourceMappingURL=admin.js.map