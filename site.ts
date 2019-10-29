import { assertExpressionStatement, metaProperty } from "babel-types";

const fs 			= require( 'fs' );
const readline 		= require( 'readline' );
const { google } 	= require( 'googleapis' );

const express 		= require( 'express' );
const app			= express();

const bodyParser 	= require( 'body-parser' );
app.use( bodyParser.json() ); // support json encoded bodies
app.use( bodyParser.urlencoded( { extended: true } ) ); // support encoded bodies

const cookieParser	= require('cookie-parser')
app.use( cookieParser() );

app.disable( 'x-powered-by' );

app.use( '/assets', express.static( 'static/templates/site/assets' ) );

const HTTP_PORT = 8080;

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

function getRanges( res: any ): any {
	let ranges = {};
	res.data.valueRanges.forEach( ( range: any ) => {
		ranges[ range.range.toLowerCase().match( /([a-z]+)\!/ )[ 1 ] ] = ( () => {
			const cols = range.values.splice( 0, 1 )[ 0 ];
			const rows = range.values.map( (row: string[]) => {
				let row_ = {}
				row.forEach( ( col: any, i: string | number ) => {
					if ( 'post_id' === cols[ i ] || 
						'user_id' === cols[ i ] ||
						'country_id' === cols[ i ] ||
						'city_id' === cols[ i ] ) {
						row_[ cols[ i ] ] = parseInt( col )
					} else {
						row_[ cols[ i ] ] = col;
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
	const sheets 	= google.sheets( { version: 'v4', auth: auth } );
	let ranges: any	= {};
	function updateRanges() {
		sheets.spreadsheets.values.batchGet( {
			spreadsheetId: SPREADSHEETID,
			ranges: [
				'users!A1:D',
				'usersmeta!A1:C',
				'posts!A1:H',
				'postsmeta!A1:C',
				'countries!A1:C',
				'cities!A1:D',
			],
		}, ( err: string, res: any ) => {
			if ( err ) return console.error( 'The API returned an error: ' + err );
			ranges = getRanges( res );
			ranges.cities = ranges.cities.sort( ( a, b ) => {
				return a.city < b.city;
			} );
		} );
	}
	updateRanges();
	setInterval( updateRanges, 5 * 60 * 1000 );

	app.listen( HTTP_PORT, () => {
		console.info( 'HTTP Server running on port ' + HTTP_PORT );
	} );

	app.get( '/', ( request: any, response: any ) => {
		let template = fs.readFileSync( __dirname + '/static/templates/site/index.html', 'UTF-8' );
		try {
			const locations = ranges.countries.map( ( country: { country_id: any; alias: any; country: any; } ) => {
				const cities = ranges.cities.filter( (city: { country_id: any; }) => {
					return city.country_id === country.country_id;
				} ).map( ( city: { city_id: any; city: any; alias: any; } ) => {
					return `<option value="${city.city_id}" data-city="${city.city}">${city.alias}</option>`;
				} ).join( '' );
				return `
				<optgroup label="${country.alias}" data-country="${country.country}">
					${cities}
				</optgroup>
				`;
			} );
			template = template.replace( /{LOCATIONS}/, locations.join( "\n" ) );
			let travels = ranges.posts.filter( post => {
				const user = ranges.users.find( user => {
					return user.user_id == post.user_id;
				} );
				return 'travel' === post.post_type && 'admin' === user.role || 'user' === user.role;
			} ).map( ( post: any ) => {
				const meta: any = {};
				ranges.postsmeta.forEach( ( meta_: any ) => {
					if ( post.post_id == meta_.post_id ) meta[ meta_.meta_key ] = meta_.meta_value;
				} );
				const now = Date.now() / 1000;
				if ( parseInt( meta._end ) > now ) {
					return `
					<div class="image fit">
						<a href="https://www.instagram.com/p/${meta._shortcode}/" target="_blank" title="${post.post_content}">
							<img src="${meta._display_url}" alt="${post.post_content}" />
						</a>
					</div>
					`;
				} else {
					return '';
				}
			} );
			shuffle( travels );
			template = template.replace( /{TRAVELS}/, travels.join( "\n" ) );
		} catch ( error ) {
			console.error( 'Error in get /: ' + error );
		}
		response.send( template );
	} );

	app.get( '/f', ( request: any, response: any ) => {
		let location	= parseInt( request.query.l );
		let start 		= Date.parse( request.query.s ) / 1000;
		let end 		= Date.parse( request.query.e ) / 1000;
		try {
			const posts = ranges.posts.filter( post => {
				const user = ranges.users.find( user => {
					return user.user_id == post.user_id;
				} );
				return 'travel' === post.post_type && 'admin' === user.role || 'user' === user.role;
			} ).filter( post => {
				const meta_ = {
					_city_id: 0,
					_start	: 0,
					_end	: 0
				};
				ranges.postsmeta.filter( meta => {
					return post.post_id == meta.post_id && ( '_start' == meta.meta_key || '_end' == meta.meta_key || '_city_id' == meta.meta_key );
				} ).forEach( meta => {
					meta_[ meta.meta_key ] = parseInt( meta.meta_value );
				} );
				return location == meta_._city_id && start <= meta_._end && end >= meta_._start;
			} ).map( post => {
				const meta_ = {
					_shortcode	: null,
					_display_url: null
				};
				ranges.postsmeta.filter( meta => {
					return post.post_id == meta.post_id && ( '_shortcode' == meta.meta_key || '_display_url' == meta.meta_key );
				} ).forEach( meta => {
					meta_[ meta.meta_key ] = meta.meta_value;
				} );
				return {
					shortcode	: meta_._shortcode,
					display_url	: meta_._display_url,
					post_content: post.post_content
				};
			} );
			shuffle( posts );
			return response.json( posts );
		} catch ( error ) {
			console.error( 'Error in get /f: ' + error );
		}
		response.json( [] );
	} );

	app.get( '/r', ( request: any, response: any ) => {
		try {
			const posts = ranges.posts.filter( post => {
				const user = ranges.users.find( user => {
					return user.user_id == post.user_id;
				} );
				return 'travel' === post.post_type && 'admin' === user.role || 'user' === user.role;
			} ).map( post => {
				const meta_ = {
					_shortcode	: null,
					_display_url: null
				};
				ranges.postsmeta.filter( meta => {
					return post.post_id == meta.post_id && ( '_shortcode' == meta.meta_key || '_display_url' == meta.meta_key );
				} ).forEach( meta => {
					meta_[ meta.meta_key ] = meta.meta_value;
				} );
				return {
					shortcode: meta_._shortcode,
					display_url: meta_._display_url,
					post_content: post.post_content
				};
			} );
			shuffle( posts );
			return response.json( posts );
		} catch ( error ) {
			console.error( 'Error in get /f: ' + error );
		}
		response.json( [] );
	} );

	console.info( 'Init done' );
}

/**
 * Shuffles array in place.
 * @param {Array} a items An array containing the items.
 */
function shuffle( a: any[] ) {
	var j, x, i;
	for ( i = a.length - 1; i > 0; i-- ) {
		j = Math.floor( Math.random() * ( i + 1 ) );
		x = a[ i ];
		a[ i ] = a[ j ];
		a[ j ] = x;
	}
	return a;
}



