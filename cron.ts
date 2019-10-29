const fs 			= require( 'fs' );
const readline 		= require( 'readline' );
const { google } 	= require( 'googleapis' );

const async			= require( 'async' );
const axios			= require( 'axios' );
const jsdom			= require( 'jsdom' );
const { JSDOM }		= jsdom;

const SPREADSHEETID = '1rk1ZproKDkyEIP6PyKOHb-ybqoacdpI1pUOcqN8NW8I';
// The file token.json stores the user's access and refresh tokens, and is
// created automatically when the authorization flow completes for the first
// time.
const TOKEN_PATH 	= 'token.json';
// If modifying these scopes, delete token.json.
const SCOPES 		= [ 
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
	res.data.valueRanges.forEach( ( range: any) => {
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

fs.readFile( 'credentials.json', ( err: any, content: string ) => {
	if ( err ) return console.log( 'Error loading client secret file:', err );
	// Authorize a client with credentials, then call the Google Calendar API.
	authorize( JSON.parse( content ), main );
} );

function main( auth: any ) {
	console.info( 'Init' );
	const sheets = google.sheets( { version: 'v4', auth: auth } );

	// Основной крон
	function cronenburg() {
		console.info( 'cronenburg' );
		sheets.spreadsheets.values.batchGet( {
			spreadsheetId: SPREADSHEETID,
			ranges: [
				'users!A1:D',
				'usersmeta!A1:C',
				'posts!A1:G',
				'postsmeta!A1:C',
				'countries!A1:B',
				'cities!A1:B',
			],
		}, ( err: string, res: any ) => {
			if ( err ) return console.error( 'The API returned an error: ' + err );

			let ranges: any = getRanges( res );
			ranges.posts = ranges.posts.sort( ( a, b ) => {
				return a.post_id > b.post_id;
			} );
			let post_id = ranges.posts.length > 0 ? ranges.posts[ ranges.posts.length - 1 ].post_id : 0;
			const edges_exist = ranges.postsmeta.filter( (meta: { meta_key: string; }) => {
				return '_edge_id' === meta.meta_key;
			} );

			const igs: any[] = ranges.users.filter( (user: { role: string; }) => {
				return 'admin' === user.role || 'user' === user.role;
			} ).map( (user: { user_id: any; }) => {
				return ranges.usersmeta.find( (meta: { user_id: any; meta_key: string; }) => {
					return meta.user_id == user.user_id && '_instagram' === meta.meta_key
				} );
			} ).map( (ig: { meta_value: string; }) => {
				ig.meta_value = JSON.parse( ig.meta_value );
				return ig;
			} );

			async.eachOfLimit( igs, 1, ( ig: any, i: any, cb: any ) => {
				const url = 'https://www.instagram.com/' + ig.meta_value.current + '/';
				console.info( 'Getting profile: ' + url );
				axios.get( url ).then( ( response: any ) => {
					const { window }	= new JSDOM( response.data, { runScripts: "dangerously" } );
					const { document }	= window;
					try {
						let { edges } 	= window._sharedData.entry_data.ProfilePage[ 0 ].graphql.user.edge_owner_to_timeline_media;
						edges = edges.map( ( edge: { node: any; } ) => {
							return edge.node;
						} );
						const travels = edges.filter( ( edge: any ) => {
							try {
								const found = edges_exist.find( (edge_: { meta_value: any; }) => {
									return edge.id == edge_.meta_value;
								} );
								const { text } = edge.edge_media_to_caption.edges[ 0 ].node;
								return ! found && text.match( /(pictraveld|pictravelp)/i );
							} catch ( err ) {}
						} ).map( ( edge: any ) => {
							const { text } = edge.edge_media_to_caption.edges[ 0 ].node;
							const tags = text.match( /\#([а-яА-Яa-zA-Z0-9\-\.]+)/g );
							let dates = text.match( /\#([0-9\-\.]+)/g );
							dates = dates.map( date => {
								return Date.parse( date.substring( 1 ).replace( /(\d{2})\.(\d{2})\.(\d{4})/, '$3-$2-$1' ) ) / 1000;
							} ).sort( ( a, b ) => {
								return a > b;
							} );
							const words = tags.filter( tag => {
								return tag.match( /\#([a-zA-Z]+)/ );
							} ).map( word => {
								return word.substring( 1 );
							} );

							const city = ranges.cities.find( city => {
								return words.find( word => {
									return word.toLowerCase() === city.city.toLowerCase();
								} );
							} );
							const country = ranges.countries.find( country => {
								return words.find( word => {
									return word.toLowerCase() === country.country.toLowerCase();
								} );
							} );
							return {
								post: {
									user_id		: ig.user_id,
									post_id		: ++post_id,
									post_date	: Date.now(),
									post_title	: edge.shortcode,
									post_excerpt: edge.shortcode,
									post_content: text,
									post_type	: 2 !== dates.length || ! country || ! city ? 'error' : 'travel',
								},
								meta: {
									_edge_id	: edge.id,
									_shortcode	: edge.shortcode,
									_city_id	: city ? city.city_id : false,
									_country_id	: country ? country.country_id : false,
									_start		: dates[ 0 ],
									_end		: dates[ 1 ],
									_tags		: tags,
									_display_url: edge.display_url,
									_taken_at_timestamp: edge.taken_at_timestamp
								}
							};
						} );
						
						if ( travels.length > 0 ) {
							console.info( 'Travels for append: ' + travels.length );
							const options = {
								spreadsheetId	: SPREADSHEETID,
								range			: 'Posts!A2:H',
								valueInputOption: 'USER_ENTERED',
								resource		: {
									range			: 'Posts!A2:H',
									majorDimension	: 'ROWS',
									values			: ( () => {
										return travels.map( travel => {
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
										} );
									} )()
								}
							};
							sheets.spreadsheets.values.append( options, ( err: string, res: any ) => {
								if ( err ) {
									cb( err );
									return console.log( 'The API returned an error: ' + err );
								}
								console.info( 'Posts added' );
								const options = {
									spreadsheetId	: SPREADSHEETID,
									range			: 'PostsMeta!A2:C',
									valueInputOption: 'USER_ENTERED',
									resource		: {
										range			: 'PostsMeta!A2:C',
										majorDimension	: 'ROWS',
										values			: ( () => {
											let meta: any[] = [];
											travels.forEach( ( travel: any ) => {
												Object.keys( travel.meta ).forEach( ( key: string ) => {
													meta.push( [
														travel.post.post_id,
														key,
														Array.isArray( travel.meta[ key ] ) ? JSON.stringify( travel.meta[ key ] ) : travel.meta[ key ]
													] );
												} );
											} );
											return meta;
										} )()
									}
								};
								sheets.spreadsheets.values.append( options, ( err: string, res: any ) => {
									if ( err ) {
										cb( err );
										return console.log( 'The API returned an error: ' + err );
									}
									console.info( 'Meta added' );
									setTimeout( cb, 5000 );
								} );
							} );
						} else setTimeout( cb, 5000 );
					} catch ( err ) {
						cb( err );
					}
				} ).catch( (err: string) => {
					cb( err );
					if ( err ) return console.error( 'The IG returned an error: ' + err );
				} );
			}, ( err: any ) => {
				if ( err ) return console.error( 'The API returned an error: ' + err );
				console.info( 'CRON ended' );
			} );
		} );
	}
	cronenburg();
	setInterval( cronenburg, 2 * 60 * 60000 );

	// Репиксер
	function mrpixer() {
		console.info( 'mrpixer' );
		sheets.spreadsheets.values.batchGet( {
			spreadsheetId: SPREADSHEETID,
			ranges: [
				'users!A1:D',
				'posts!A1:H',
				'postsmeta!A1:C',
			],
		}, ( err: string, res: any ) => {
			if ( err ) return console.error( 'The API returned an error: ' + err );

			let ranges = getRanges( res );

			let posts = ranges.posts.map( post => {
				post.post_date 		= parseInt( post.post_date );
				post.post_modified 	= parseInt( post.post_modified ) ? parseInt( post.post_modified ) : false;
				return post;
			} );

			let users = ranges.users.map( user => {
				let posts_ = posts.filter( post => {
					return post.user_id == user.user_id;
				} ).map( post => {
					let postmeta = ranges.postsmeta.filter( meta => {
						return meta.post_id == post.post_id;
					} );
					post[ 'meta' ] = {}
					postmeta.forEach( meta => {
						post[ 'meta' ][ meta.meta_key ] = meta.meta_value;
					} );
					return post;
				} );
				user[ 'posts' ] = posts_;
				return user;
			} );

			async.eachOfLimit( users, 1, ( user, i, cb ) => {
				async.eachOfLimit( user.posts, 1, ( post, j, cb_ ) => {
					const url = 'https://www.instagram.com/p/' + post.meta._shortcode + '/';
					console.info( 'Getting post: ' + url );
					axios.get( url ).then( ( response: any ) => {
						const { window }	= new JSDOM( response.data, { runScripts: "dangerously" } );
						const { document }	= window;
						try {
							let { display_url }		= window._sharedData.entry_data.PostPage[ 0 ].graphql.shortcode_media;
							post.meta._display_url 	= display_url;
							post.post_modified		= Date.now();
							setTimeout( cb_, 2000 );
						} catch ( error ) {
							cb_( error );
						}
					} ).catch( ( error: string ) => {
						cb_( error );
					} );
				}, error => {
					if ( error ) return console.error( 'The IG returned an error: ' + error );
					cb( error );
				} );
			}, error => {
				if ( error ) console.error( 'The IG returned an error: ' + error );
				const options = {
					spreadsheetId	: SPREADSHEETID,
					resource		: {
						valueInputOption: 'USER_ENTERED',
						data: [
							{
								range			: 'Posts!A2:H',
								majorDimension	: 'ROWS',
								values			: posts.map( post => {
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
								} )
							},
							{
								range			: 'PostsMeta!A2:C',
								majorDimension	: 'ROWS',
								values			: posts.map( post => {
									return Object.keys( post.meta ).map( key => {
										return [
											post.post_id,
											key,
											post.meta[ key ]
										];
									} );
								} ).reduce( ( acc, next ) => {
									acc = acc.concat( next );
									return acc;
								} )
							}
						]
					}
				};
				sheets.spreadsheets.values.batchUpdate(  options, ( err: string, res: any ) => {
					if ( err ) {
						return console.log( 'The API returned an error: ' + err );
					}
					console.info( 'mrpixer end' );
				} );
			} );
		} );
	}
	mrpixer()
	setInterval( mrpixer, 3 *  60 * 60000 );
	console.info( 'Init done' );
}