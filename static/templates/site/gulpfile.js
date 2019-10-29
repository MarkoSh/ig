let fs			  = require( "fs" ),
	gulp          = require( "gulp" ),
	scss          = require( "gulp-sass" ),
	concat        = require( "gulp-concat" ),
	uglify        = require( "gulp-uglify-es" ).default,
	cleancss      = require( "gulp-clean-css" ),
	rename        = require( "gulp-rename" ),
	autoprefixer  = require( "gulp-autoprefixer" ),
	notify        = require( "gulp-notify" );

let styles = () => {
	return gulp.src( "assets/css/main.scss" )
		.pipe( scss( { outputStyle: "expand" } ).on( "error", notify.onError() ) )
		.pipe( rename( { suffix: ".min", prefix : "" }))
		.pipe( autoprefixer( [ "last 15 versions" ] ).on( "error", notify.onError() ) )
		.pipe( cleancss( { level: { 1: { specialComments: 0 } } } ).on( "error", notify.onError() ) ) // Opt., comment out when debugging
		.pipe( gulp.dest( "assets/css" ) );
}


let js = () => {
	return gulp.src( [
			"assets/js/main.js", // Always at the end
		] )
		.pipe( concat( "main.min.js" ) )
		.pipe( uglify().on( "error", err => {
			console.log( err );
			notify.onError();
		} ) ) // Mifify js (opt.) - mifify hahaha
		.pipe( gulp.dest( "assets/js" ) );
}

let watchFiles = () => {
	gulp.watch( "**/*.scss", styles );
	gulp.watch( "assets/js/main.js", js );

	fs.watchFile( "style.min.css", {
		interval: 100
	}, ( current, previous ) => {
		if ( current.size == 0 ) {
			gulp.parallel( styles );
		}
	} );

	fs.watchFile( "scripts.min.js", {
		interval: 100
	}, ( current, previous ) => {
		if ( current.size == 0 ) {
			gulp.parallel( js );
		}
	} );
}

gulp.task( "default", gulp.parallel( watchFiles ) );
