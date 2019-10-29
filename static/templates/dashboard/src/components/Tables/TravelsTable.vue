<template>
	<div v-if="loaded">
		<md-table v-model="travels" md-sort="meta._start" md-sort-order="asc" :table-header-color="tableHeaderColor">
			<md-table-row slot="md-table-row" slot-scope="{ item }">
				<md-table-cell md-label="Локация" md-sort-by="location.city_id">
					<a :href="'https://www.google.com/maps/place/' + encodeURIComponent( item.location.alias + ', ' + item.location.country.alias ) + '/'" target="_blank">{{ item.location.alias + ', ' + item.location.country.alias }}</a>
				</md-table-cell>
				<md-table-cell md-label="Фото" md-sort-by="post_title">
					<a :href="'https://www.instagram.com/p/' + item.meta._shortcode + '/'" target="_blank" rel="noopener noreferrer">
						<img :src="item.meta._display_url" :alt="item.post_title" style="display: block; height: 30px; width: auto;">
					</a>
				</md-table-cell>
				<md-table-cell md-label="Аккаунт" md-sort-by="user.meta._instagram.current">
					<a :href="'https://www.instagram.com/' + item.user.meta._instagram.current + '/'" target="_blank" rel="noopener noreferrer">{{ item.user.meta._instagram.current }}</a>
				</md-table-cell>
				<md-table-cell md-label="Начало" md-sort-by="meta._start">
					{{ ( new Date( item.meta._start * 1000 ) ).toDateString() }}
				</md-table-cell>
				<md-table-cell md-label="Конец" md-sort-by="meta._end">
					{{ ( new Date( item.meta._end * 1000 ) ).toDateString() }}
				</md-table-cell>
				<md-table-cell md-label="Статус" md-sort-by="post_type">
					{{ item.post_type }}
				</md-table-cell>
				<md-table-cell md-label="">
					<md-button class="md-danger md-just-icon" v-on:click="del( item )"><i class="material-icons">delete</i></md-button>
				</md-table-cell>
			</md-table-row>
		</md-table>
	</div>
	<div v-else-if="error">
		<md-empty-state
			md-icon="devices_other"
			md-label="Ошибка загрузки путешествий"
			:md-description="error">
		</md-empty-state>
	</div>
	<div v-else>
		<md-empty-state
			md-icon="devices_other"
			md-label="Идет загрузка путешествий"
			md-description="Не перезагружайте страницу">
		</md-empty-state>
	</div>
</template>

<script>
import axios from 'axios';
export default {
	name: "travels-table",
	props: {
		tableHeaderColor: {
			type: String,
			default: "green",
			value: null
		}
	},
	created: function () {
		const $app = this;
		
	},
	data() {
		const $app = this;

		axios.get( '/dashboard/travels' ).then( res => {
			$app.loaded = true;
			if ( res.data.success ) {
				setTimeout( () => {
					$app.travels = res.data.data;
				}, 300 );
			} else {
				$app.$notify( {
					message			: "Ошибка при загрузки пользователей<br />" + res.data.data,
					icon			: "add_alert",
					horizontalAlign	: 'center',
					verticalAlign	: 'top',
					type			: $app.type[ 4 ]
				} );
			}
		} ).catch( err => {
			$app.loaded = false;
			$app.error = err;
			$app.$notify( {
				message			: "Ошибка при загрузки путешествий<br />" + res.data.data,
				icon			: "add_alert",
				horizontalAlign	: 'center',
				verticalAlign	: 'top',
				type			: $app.type[ 4 ]
			} );
		} );
		return {
			type			: [ "", "info", "success", "warning", "danger" ],
			notifications	: {
				topCenter: true
			},
			// selected: [],
			travels: [ { location: 'loading...' } ],
			loaded			: false, 
			error			: false
		};
	},
	methods: {
		del: function ( item ) {
			const $app = this;
			if ( confirm( 'Удалить путешествие ' + item.post_id ) ) {
				$app.$notify( {
					message			: "Проверка путешествия...",
					icon			: "add_alert",
					horizontalAlign	: 'center',
					verticalAlign	: 'top',
					type			: $app.type[ 3 ]
				} );
				axios.post( '/dashboard/travels', 'mode=delete&item=' + item.post_id ).then( res => {
					if ( res.data.success ) {
						$app.travels = res.data.data;
						$app.$notify( {
							message			: "Путешествие удалено",
							icon			: "add_alert",
							horizontalAlign	: 'center',
							verticalAlign	: 'top',
							type			: $app.type[ 2 ]
						} );
					} else {
						$app.$notify( {
							message			: "Ошибка при удалении<br />" + res.data.data,
							icon			: "add_alert",
							horizontalAlign	: 'center',
							verticalAlign	: 'top',
							type			: $app.type[ 4 ]
						} );
					}
				} ).catch( err => {
					$app.$notify( {
						message			: "Ошибка при ответе сервера<br />" + err,
						icon			: "add_alert",
						horizontalAlign	: 'center',
						verticalAlign	: 'top',
						type			: $app.type[ 4 ]
					} );
				} );
			}
		}
	}
};
</script>
