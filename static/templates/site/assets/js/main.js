/*
	Radius by TEMPLATED
	templated.co @templatedco
	Released for free under the Creative Commons Attribution 3.0 license (templated.co/license)
*/

(function($) {

	skel.breakpoints({
		xlarge:	'(max-width: 1680px)',
		large:	'(max-width: 1280px)',
		medium:	'(max-width: 980px)',
		small:	'(max-width: 736px)',
		xsmall:	'(max-width: 480px)'
	});

	$(function() {

		var	$window = $(window),
			$body = $('body'),
			$header = $('#header'),
			$footer = $('#footer');

		// Disable animations/transitions until the page has loaded.
			$body.addClass('is-loading');

			$window.on('load', function() {
				window.setTimeout(function() {
					$body.removeClass('is-loading');
				}, 100);
			});

		// Fix: Placeholder polyfill.
			$('form').placeholder();

		// Prioritize "important" elements on medium.
			skel.on('+medium -medium', function() {
				$.prioritize(
					'.important\\28 medium\\29',
					skel.breakpoint('medium').active
				);
			});

		// Header.
			$header.each( function() {

				var t 		= jQuery(this),
					button 	= t.find('.button.hidden'),
					random	= t.find( 'a.random' );

				
				button.click( function( e ) {

					t.toggleClass( 'hide' );

					if ( t.hasClass( 'preview' ) ) {
						return true;
					} else {
						e.preventDefault();
					}

				} );

				random.click( function ( e ) {
					e.preventDefault();
					random.html( '<span>Loading...</span>' );
					$.getJSON( '/r', function ( response ) {
						if ( response.length > 0 ) {
							$header.toggleClass( 'hide' );
							$( '#main .columns' ).empty();
							response.forEach( function ( item ) {
								var tmpl = `
								<div class="image fit">
									<a href="https://www.instagram.com/p/${item.shortcode}/" target="_blank" title="${item.post_content}">
										<img src="${item.display_url}" alt="${item.post_content}" />
									</a>
								</div>
								`;
								$( '#main .columns' ).append( tmpl );
							} );
						}
						random.html( '<span>Let me see random</span>' );
					} ).fail( function () {
						t.toggleClass( 'hide' );
						random.html( '<span>Failed =(</span>' );
					} );
					return true;
				} );

			} );

			var date = new Date();
			$( "input[type=date]" ).attr( 'min', $.format.date( date, 'yyyy-MM-dd' ) );
			$( "input[type=date][name=s]" ).change( function () {
				var $this = $( this );
				$( "input[type=date][name=e]" ).val( $this.val() );
				$( "input[type=date][name=e]" ).attr( 'min', $this.val() );
			} );

			$( '#filter' ).submit( function ( e ) {
				e.preventDefault();
				$thisbutton = $( '#filter button[type="submit"]' );
				$thisbutton.html( '<span>Loading...</span>' );
				$.getJSON( '/f?' + $( '#filter' ).serialize(), function ( response ) {
					if ( response.length > 0 ) {
						$thisbutton.html( "<span>Let's Go</span>" );
						$header.toggleClass( 'hide' );
						$( '#main .columns' ).empty();
						response.forEach( function ( item ) {
							var tmpl = `
							<div class="image fit">
								<a href="https://www.instagram.com/p/${item.shortcode}/" target="_blank" title="${item.post_content}">
									<img src="${item.display_url}" alt="${item.post_content}" />
								</a>
							</div>
							`;
							$( '#main .columns' ).append( tmpl );
						} );
					} else {
						$thisbutton.html( "<span>Nobody has traveld =(</span>" );
					}

					if ( $header.hasClass( 'preview' ) ) {
						return true;
					} else {
						e.preventDefault();
					}
				} ).fail( function () {
					$thisbutton.html( "<span>Failed =(</span>" );
				} );
				return true;
			} );

		// Footer.
			$footer.each( function() {

				var t 		= jQuery(this),
					inner 	= t.find('.inner'),
					button 	= t.find('.info');

				button.click(function(e) {
					t.toggleClass('show');
					e.preventDefault();
				});

			});

	});

})(jQuery);