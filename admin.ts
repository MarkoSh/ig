import { assertExpressionStatement, metaProperty } from "babel-types";

const fs 			= require( 'fs' );
const md5			= require( 'md5' );
const readline 		= require( 'readline' );
const { google } 	= require( 'googleapis' );

const https 		= require('https');
const express 		= require( 'express' );
const app 			= express();

const bodyParser 	= require( 'body-parser' );

const cookieParser	= require('cookie-parser');

app.use( bodyParser.json() ); // support json encoded bodies
app.use( bodyParser.urlencoded( { extended: true } ) ); // support encoded bodies
app.use( cookieParser() );

app.use( '/static/login', express.static( 'static/templates/login' ) );
app.use( '/static/dashboard', express.static( 'static/templates/dashboard/dist' ) );
app.use( '/css', express.static( 'static/templates/dashboard/dist/css' ) );
app.use( '/js', express.static( 'static/templates/dashboard/dist/js' ) );
app.use( '/img', express.static( 'static/templates/dashboard/dist/img' ) );

app.disable( 'x-powered-by' );

const httpsServer	= https.createServer( ( () => {
	return {
		key: fs.readFileSync( 'server.key' ),
		cert: fs.readFileSync( 'server.crt' )
	}
} )(), app );

const HTTPS_PORT = 60453;

const SPREADSHEETID = '1rk1ZproKDkyEIP6PyKOHb-ybqoacdpI1pUOcqN8NW8I';
// The file token.json stores the user's access and refresh tokens, and is
// created automatically when the authorization flow completes for the first
// time.
const TOKEN_PATH = 'token.json';
// If modifying these scopes, delete token.json.
const SCOPES = [ 
	'https://www.googleapis.com/auth/spreadsheets'
];

/**
 * Create an OAuth2 client with the given credentials, and then execute the
 * given callback function.
 * @param {Object} credentials The authorization client credentials.
 * @param {function} callback The callback to call with the authorized client.
 */
function authorize( credentials: { installed: { client_secret: any; client_id: any; redirect_uris: any; }; }, callback: { ( auth: any ): void; ( arg0: any ): void; } ) {
	const {client_secret, client_id, redirect_uris} = credentials.installed;
	const oAuth2Client = new google.auth.OAuth2( 
		client_id, client_secret, redirect_uris[0] );

	// Check if we have previously stored a token.
	fs.readFile( TOKEN_PATH, ( err: any, token: string ) => {
		if ( err ) return getAccessToken( oAuth2Client, callback );
		oAuth2Client.setCredentials( JSON.parse( token ) );
		callback( oAuth2Client );
	} );
}

/**
 * Get and store new token after prompting for user authorization, and then
 * execute the given callback with the authorized OAuth2 client.
 * @param {google.auth.OAuth2} oAuth2Client The OAuth2 client to get token for.
 * @param {getEventsCallback} callback The callback for the authorized client.
 */
function getAccessToken( oAuth2Client: { generateAuthUrl: ( arg0: { access_type: string; scope: string[]; } ) => void; getToken: ( arg0: any, arg1: ( err: any, token: any ) => void ) => void; setCredentials: ( arg0: any ) => void; }, callback: { ( auth: any ): void; ( arg0: any ): void; ( arg0: any ): void; } ) {
	const authUrl = oAuth2Client.generateAuthUrl( {
		access_type: 'offline',
		scope: SCOPES,
	} );
	console.log( 'Authorize this app by visiting this url:', authUrl );
	const rl = readline.createInterface( {
		input: process.stdin,
		output: process.stdout,
	} );
	rl.question( 'Enter the code from that page here: ', ( code: any ) => {
		rl.close();
		oAuth2Client.getToken( code, ( err, token ) => {
		if ( err ) return console.error( 'Error retrieving access token', err );
		oAuth2Client.setCredentials( token );
		// Store the token to disk for later program executions
		fs.writeFile( TOKEN_PATH, JSON.stringify( token ), ( err: any ) => {
			if ( err ) return console.error( err );
			console.log( 'Token stored to', TOKEN_PATH );
		} );
		callback( oAuth2Client );
		} );
	} );
}

function getRanges( res: { data: { valueRanges: { forEach: (arg0: (range: { range: string | number; values: { splice: (arg0: number, arg1: number) => any[]; map: (arg0: (row: any) => {}) => void; }; }) => void) => void; }; }; } ) {
	let ranges: any = {};
	res.data.valueRanges.forEach( ( range: any ) => {
		ranges[ range.range.toLowerCase().match( /([a-z]+)\!/ )[ 1 ] ] = ( () => {
			const cols = range.values.splice( 0, 1 )[ 0 ];
			const rows = range.values.map( (row: string[]) => {
				let row_: any = {}
				row.forEach( ( col: any, i: string | number ) => {
					if ( 'post_id' === cols[ i ] || 
						'user_id' === cols[ i ] ||
						'country_id' === cols[ i ] ||
						'city_id' === cols[ i ] ) {
						row_[ cols[ i ] ] = parseInt( col )
					} else {
						try {
							row_[ cols[ i ] ] = JSON.parse( col );
						} catch ( error ) {
							row_[ cols[ i ] ] = col;
						}
					}
				} );
				return row_;
			} );
			return rows;
		} )();
	} );
	return ranges;
}

// Load client secrets from a local file.
fs.readFile( 'credentials.json', ( err: any, content: string ) => {
	if ( err ) return console.log( 'Error loading client secret file:', err );
	// Authorize a client with credentials, then call the Google Calendar API.
	authorize( JSON.parse( content ), main );
} );

function main( auth: any ) {
	console.info( 'Init' );

	const sheets = google.sheets( { version: 'v4', auth: auth } );

	function addUser( user, response ) {
		const options = {
			spreadsheetId	: SPREADSHEETID,
			ranges			: [ 'Users!A1:D', 'UsersMeta!A1:C' ]
		};
		sheets.spreadsheets.values.batchGet( options, ( err: string, res: any ) => {
			if ( err ) return console.log( 'The API returned an error: ' + err );
			let ranges = getRanges( res );
			ranges.users.sort( ( a, b ) => {
				return a.user_id < b.user_id ? 1 : -1;
			} ).forEach( user => {
				user[ 'meta' ] = {};
				ranges.usersmeta.filter( meta => {
					return meta.user_id == user.user_id;
				} ).forEach( meta => {
					user[ 'meta' ][ meta.meta_key ] = meta.meta_value;
				} );
				delete user.password;
				delete user.meta.token;
			} );
			const index = ranges.users[ 0 ].user_id + 1;
			user.user_id = index;
			user.role = 'user';
			const options = {
				spreadsheetId	: SPREADSHEETID,
				range			: 'Users!A2:D',
				valueInputOption: 'USER_ENTERED',
				resource		: {
					range			: 'Users!A2:D',
					majorDimension	: 'ROWS',
					values			: [
						[
							user.user_id,
							user.username,
							null,
							user.role
						]
					]
				}
			};
			sheets.spreadsheets.values.append( options, ( err: string, res: any ) => {
				if ( err ) {
					response.json( {
						success	: false,
						data	: err
					} );
					return console.error( 'The API returned an error: ' + err );
				}
				console.log( 'User added' );
				ranges.users.push( user );
				ranges.usersmeta = ranges.usersmeta.filter( meta => {
					return meta.user_id != user.user_id;
				} );
				Object.keys( user.meta ).forEach( key => {
					ranges.usersmeta.push( {
						user_id: user.user_id,
						meta_key: key,
						meta_value: user.meta[ key ]
					} );
				} );
				const options = {
					spreadsheetId	: SPREADSHEETID,
					range			: 'UsersMeta!A2:C',
					valueInputOption: 'USER_ENTERED',
					resource		: {
						range			: 'UsersMeta!A2:C',
						majorDimension	: 'ROWS',
						values			: ranges.usersmeta.map( meta => {
							return [
								meta.user_id,
								meta.meta_key,
								JSON.stringify( meta.meta_value )
							];
						} )
					}
				};
				sheets.spreadsheets.values.update( options, ( err: string, res: any ) => {
					if ( err ) {
						response.json( {
							success	: false,
							data	: err
						} );
						return console.error( 'The API returned an error: ' + err );
					}
					console.log( 'UsersMeta updated' );
					response.json( {
						success	: true,
						data	: ranges.users.sort( ( a, b ) => {
							return a.username < b.username ? 1 : -1;
						} )
					} );
				} );
			} );
		} );
	}
	function updateUser( user, response ) {
		const options = {
			spreadsheetId	: SPREADSHEETID,
			ranges			: [ 'Users!A1:D', 'UsersMeta!A1:C' ]
		};
		sheets.spreadsheets.values.batchGet( options, ( err: string, res: any ) => {
			if ( err ) {
				response.json( {
					success	: false,
					data	: err
				} );
				return console.error( 'The API returned an error: ' + err );
			}
			let ranges = getRanges( res );
			ranges.users.forEach( user => {
				user[ 'meta' ] = {};
				ranges.usersmeta.filter( meta => {
					return meta.user_id == user.user_id;
				} ).forEach( meta => {
					user[ 'meta' ][ meta.meta_key ] = meta.meta_value;
				} );
				delete user.password;
				delete user.meta.token;
			} );
			let found = ranges.users.find( user_ => {
				return user_.username == user.username;
			} );
			if ( found && 'admin' !== found.role ) {
				Object.keys( user.meta ).forEach( key => {
					if ( found.meta[ key ] ) {
						found.meta[ key ].previous = found.meta[ key ].current;
						found.meta[ key ].current = user.meta[ key ].current;
					} else {
						found.meta[ key ].current = user.meta[ key ].current;
					}
				} );
				ranges.usersmeta = ranges.usersmeta.filter( meta => {
					return meta.user_id != found.user_id;
				} );
				Object.keys( user.meta ).forEach( key => {
					ranges.usersmeta.push( {
						user_id: found.user_id,
						meta_key: key,
						meta_value: found.meta[ key ]
					} );
				} );
				const options = {
					spreadsheetId	: SPREADSHEETID,
					range			: 'UsersMeta!A2:C',
					valueInputOption: 'USER_ENTERED',
					resource		: {
						range			: 'UsersMeta!A2:C',
						majorDimension	: 'ROWS',
						values			: ranges.usersmeta.map( meta => {
							return [
								meta.user_id,
								meta.meta_key,
								JSON.stringify( meta.meta_value )
							];
						} )
					}
				};
				sheets.spreadsheets.values.update( options, ( err: string, res: any ) => {
					if ( err ) {
						response.json( {
							success	: false,
							data	: err
						} );
						return console.error( 'The API returned an error: ' + err );
					}
					console.log( 'UsersMeta updated' );
					response.json( {
						success	: true,
						data	: ranges.users.sort( ( a, b ) => {
							return a.username < b.username ? 1 : -1;
						} )
					} );
				} );
			} else if ( 'admin' === found.role ) {
				response.json( {
					success	: false,
					data	: 'Такой пользователь не может быть отредактирован'
				} );
			} else addUser( user, response );
		} );
	}
	function deleteUser( user, response ) {
		const options = {
			spreadsheetId	: SPREADSHEETID,
			ranges			: [ 'Users!A1:D', 'UsersMeta!A1:C' ]
		};
		sheets.spreadsheets.values.batchGet( options, ( err: string, res: any ) => {
			if ( err ) {
				response.json( {
					success	: false,
					data	: err
				} );
				return console.error( 'The API returned an error: ' + err );
			}
			let ranges = getRanges( res );
			ranges.users.forEach( user => {
				user[ 'meta' ] = {};
				ranges.usersmeta.filter( meta => {
					return meta.user_id == user.user_id;
				} ).forEach( meta => {
					user[ 'meta' ][ meta.meta_key ] = meta.meta_value;
				} );
			} );
			let found = ranges.users.find( user_ => {
				return user_.username == user.username;
			} );
			if ( found && 'admin' !== found.role ) {
				found.role = 'deleted';
				const options = {
					spreadsheetId	: SPREADSHEETID,
					range			: 'Users!A2:D',
					valueInputOption: 'USER_ENTERED',
					resource		: {
						range			: 'Users!A2:D',
						majorDimension	: 'ROWS',
						values			: ranges.users.map( user => {
							return [
								user.user_id,
								user.username,
								user.password,
								user.role
							];
						} )
					}
				};
				sheets.spreadsheets.values.update( options, ( err: string, res: any ) => {
					if ( err ) {
						response.json( {
							success	: false,
							data	: err
						} );
						return console.error( 'The API returned an error: ' + err );
					}
					console.log( 'Users updated' );
					response.json( {
						success	: true,
						data	: ranges.users.sort( ( a, b ) => {
							return a.username < b.username ? 1 : -1;
						} )
					} );
				} );
			} else if ( 'admin' === found.role ) {
				response.json( {
					success	: false,
					data	: 'Такой пользователь не может быть отредактирован'
				} );
			} else response.json( {
				success: false,
				data: 'Пользователь не найден'
			} );
		} );
	}

	httpsServer.listen( HTTPS_PORT, () => {
		console.log( 'HTTPS Server running on port ' + HTTPS_PORT );
	} );

	app.get( '/login/', ( request: any, response: any ) => {
		response.sendFile( __dirname + '/static/templates/login/index.html' );
	} );
	app.post( '/login/', ( request: any, response: any ) => {
		const username 	= request.body.username;
		const password 	= md5( request.body.password );
		const token 	= md5( username + password + request.ip + 'saltsalt' );
	
		sheets.spreadsheets.values.batchGet( {
			spreadsheetId: SPREADSHEETID,
			ranges: [
				'Users!A1:D',
				'UsersMeta!A1:C'
			],
		}, ( err: string, res: any ) => {
			if ( err ) return console.log( 'The API returned an error: ' + err );
			let ranges = getRanges( res );
			ranges.users.forEach( user => {
				user[ 'meta' ] = {};
				ranges.usersmeta.filter( meta => {
					return meta.user_id == user.user_id;
				} ).forEach( meta => {
					user[ 'meta' ][ meta.meta_key ] = meta.meta_value;
				} );
			} );
			let user = ranges.users.find( user => {
				return 'admin' === user.role && user.username == username && user.password == password;
			} );
			if ( user ) {
				user.meta[ 'token' ] = token;
				user.meta[ 'last_login' ] = {
					ip: request.ip,
					date: Date.now()
				};
				const options = {
					spreadsheetId	: SPREADSHEETID,
					range			: 'UsersMeta!A2:C',
					valueInputOption: 'USER_ENTERED',
					resource		: {
						range			: 'UsersMeta!A2:C',
						majorDimension	: 'ROWS',
						values			: ranges.usersmeta.map( meta => {
							let user = ranges.users.find( user => {
								return user.user_id == meta.user_id;
							} );
							try {
								meta.meta_value = user.meta[ meta.meta_key ];
							} catch ( error ) {}
							return meta;
						} ).map( meta => {
							return [
								meta.user_id,
								meta.meta_key,
								JSON.stringify( meta.meta_value )
							];
						} )
					}
				};
				sheets.spreadsheets.values.update( options, ( err: string, res: any ) => {
					if ( err ) {
						response.json( {
							success	: false,
							data	: 'The API returned an error: ' + err
						} );
						return console.log( 'The API returned an error: ' + err );
					}
					response.cookie( 'reset', token );
					response.cookie( 'reset_v2', token );
					response.json( {
						status	: true,
						data	: 'Пользователь с таким логином существует'
					} );
				} );
			} else {
				response.json( {
					status	: false,
					data	: 'Пользователь с таким логином не существует'
				} );
			}
		} );
	} );

	app.get( '/dashboard/', ( request: any, response: any ) => {
		response.sendFile( __dirname + '/static/templates/dashboard/dist/index.html' );
	} );

	app.get( '/dashboard/users', ( request: any, response: any ) => {
		sheets.spreadsheets.values.batchGet( {
			spreadsheetId: SPREADSHEETID,
			ranges: [
				'Users!A1:D',
				'UsersMeta!A1:C'
			],
		}, ( err: string, res: any ) => {
			if ( err ) return console.log( 'The API returned an error: ' + err );
			const ranges = getRanges( res );
			ranges.users.forEach( user => {
				user[ 'meta' ] = {};
				ranges.usersmeta.filter( meta => {
					return meta.user_id == user.user_id;
				} ).forEach( meta => {
					user[ 'meta' ][ meta.meta_key ] = meta.meta_value;
				} );
			} );
			response.json( {
				success	: true,
				data	: ranges.users.sort( ( a, b ) => {
					return a.username < b.username ? 1 : -1;
				} )
			} );
		} );
	} );
	app.get( '/dashboard/travels', ( request: any, response: any ) => {
		sheets.spreadsheets.values.batchGet( {
			spreadsheetId: SPREADSHEETID,
			ranges: [
				'Users!A1:D',
				'UsersMeta!A1:C',
				'Posts!A1:H',
				'PostsMeta!A1:C',
				'Cities!A1:D',
				'Countries!A1:C'
			],
		}, ( err: string, res: any ) => {
			if ( err ) return console.log( 'The API returned an error: ' + err );
			const ranges = getRanges( res );
			const cities = ranges.cities.map( city => {
				const country = ranges.countries.find( country => {
					return country.country_id == city.country_id;
				} );
				city[ 'country' ] = country;
				return city;
			} );
			const posts = ranges.posts.map( post => {
				let meta = {};
				ranges.postsmeta.filter( meta => {
					return meta.post_id == post.post_id;
				} ).forEach( meta_ => {
					meta[ meta_.meta_key ] = meta_.meta_value;
				} );
				post[ 'meta' ] = meta;
				let location = cities.find( city => {
					return city.city_id == post.meta._city_id;
				} );
				post[ 'location' ] = location;
				let user = ranges.users.map( user => {
					delete user.password;
					let meta: any = {};
					ranges.usersmeta.filter( meta => {
						return meta.user_id == user.user_id;
					} ).forEach( meta_ => {
						meta[ meta_.meta_key ] = meta_.meta_value;
					} );
					delete meta.token;
					user[ 'meta' ] = meta;
					return user;
				} ).find( user => {
					return post.user_id == user.user_id;
				} );
				post[ 'user' ] = user;
				return post;
			} );
			response.json( {
				success	: true,
				data	: posts.filter( post => {
					return post.post_type !== 'deleted';
				} )
			} );
		} );
	} );
	app.get( '/dashboard/locations', ( request: any, response: any ) => {
		sheets.spreadsheets.values.batchGet( {
			spreadsheetId: SPREADSHEETID,
			ranges: [
				'Cities!A1:D',
				'Countries!A1:C',
			],
		}, ( err: string, res: any ) => {
			if ( err ) return console.log( 'The API returned an error: ' + err );
			const ranges = getRanges( res );
			const cities = ranges.cities.map( city => {
				const country = ranges.countries.find( country => {
					return country.country_id == city.country_id;
				} );
				city[ 'country' ] = country;
				return city;
			} );
			response.json( {
				success	: true,
				data	: cities
			} );
		} );
	} );

	app.post( '/dashboard/users', ( request: any, response: any ) => {
		try {
			const mode = request.body.mode;
			const user = JSON.parse( request.body.user );
			if ( user.username.length > 0 ) {
				sheets.spreadsheets.values.batchGet( {
					spreadsheetId: SPREADSHEETID,
					ranges: [
						'Users!A1:D',
						'UsersMeta!A1:C'
					],
				}, ( err: string, res: any ) => {
					if ( err ) return console.log( 'The API returned an error: ' + err );
					const ranges = getRanges( res );
					let found = ranges.users.find( user_ => {
						return user.username == user_.username;
					} );
					switch ( mode ) {
						case 'add':
							if ( found ) return response.json( {
								success	: false,
								data	: 'Такой пользователь уже существует'
							} );
							addUser( user, response );
							break;
						case 'update':
							if ( found && 'admin' === found.role ) return response.json( {
								success	: false,
								data	: 'Такой пользователь не может быть отредактирован'
							} );
							updateUser( user, response );
							break;
						case 'delete':
							if ( found && 'admin' === found.role ) return response.json( {
								success	: false,
								data	: 'Такой пользователь не может быть удален'
							} );
							deleteUser( user, response );
							break;
					}
				} );
			} else response.json( {
				success	: false,
				data	: 'Недопустимое имя пользователя'
			} );
		} catch ( error ) {
			response.json( {
				success	: false,
				data	: error
			} );
		}
	} );
	app.post( '/dashboard/travels', ( request: any, response: any ) => {
		try {
			const mode 		= request.body.mode;
			const post_id 	= parseInt( request.body.item );
			sheets.spreadsheets.values.batchGet( {
				spreadsheetId: SPREADSHEETID,
				ranges: [
					'Users!A1:D',
					'UsersMeta!A1:C',
					'Posts!A1:H',
					'PostsMeta!A1:C',
					'Cities!A1:D',
					'Countries!A1:C'
				],
			}, ( err: string, res: any ) => {
				if ( err ) return console.log( 'The API returned an error: ' + err );
				const ranges 	= getRanges( res );
				const cities 	= ranges.cities.map( city => {
					const country = ranges.countries.find( country => {
						return country.country_id == city.country_id;
					} );
					city[ 'country' ] = country;
					return city;
				} );
				let posts 		= ranges.posts.map( post => {
					let meta = {};
					ranges.postsmeta.filter( meta => {
						return meta.post_id == post.post_id;
					} ).forEach( meta_ => {
						meta[ meta_.meta_key ] = meta_.meta_value;
					} );
					post[ 'meta' ] = meta;
					let location = cities.find( city => {
						return city.city_id == post.meta._city_id;
					} );
					post[ 'location' ] = location;
					let user = ranges.users.map( user => {
						delete user.password;
						let meta: any = {};
						ranges.usersmeta.filter( meta => {
							return meta.user_id == user.user_id;
						} ).forEach( meta_ => {
							meta[ meta_.meta_key ] = meta_.meta_value;
						} );
						delete meta.token;
						user[ 'meta' ] = meta;
						return user;
					} ).find( user => {
						return post.user_id == user.user_id;
					} );
					post[ 'user' ] = user;
					return post;
				} );
				let found 		= posts.find( post => {
					return post_id == post.post_id;
				} );
				if ( found ) {
					found.post_modified = Date.now();
					found.post_type 	= 'deleted';
				}
				const options = {
					spreadsheetId	: SPREADSHEETID,
					range			: 'Posts!A2:H',
					valueInputOption: 'USER_ENTERED',
					resource		: {
						range			: 'Posts!A2:H',
						majorDimension	: 'ROWS',
						values			: ranges.posts.map( post => {
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
						} )
					}
				};
				sheets.spreadsheets.values.update( options, ( err: string, res: any ) => {
					if ( err ) {
						response.json( {
							success	: false,
							data	: err
						} );
						return console.error( 'The API returned an error: ' + err );
					}
					console.log( 'Posts updated' );
					response.json( {
						success	: true,
						data	: posts.filter( post => {
							return post.post_type !== 'deleted';
						} )
					} );
				} );
			} );
		} catch ( error ) {
			response.json( {
				success	: false,
				data	: error
			} );
		}
	} );

	console.info( 'Init done' );
}