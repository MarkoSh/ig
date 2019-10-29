<template>
	<div v-if="loaded">
		<md-table v-model="locations" md-sort="city" md-sort-order="asc" :table-header-color="tableHeaderColor">
			<md-table-row slot="md-table-row" slot-scope="{ item }" v-on:click="sel( item )">
				<md-table-cell md-label="Город" md-sort-by="city">{{ item.city }}</md-table-cell>
				<md-table-cell md-label="Город(алиас)" md-sort-by="alias">{{ item.alias }}</md-table-cell>
				<md-table-cell md-label="Страна" md-sort-by="country.country">{{ item.country.country }}</md-table-cell>
				<md-table-cell md-label="Страна(алиас)" md-sort-by="country.alias">{{ item.country.alias }}</md-table-cell>
			</md-table-row>
		</md-table>
	</div>
	<div v-else-if="error">
		<md-empty-state
			md-icon="devices_other"
			md-label="Ошибка загрузки локаций"
			:md-description="error">
		</md-empty-state>
	</div>
	<div v-else>
		<md-empty-state
			md-icon="devices_other"
			md-label="Идет загрузка локаций"
			md-description="Не перезагружайте страницу">
		</md-empty-state>
	</div>
</template>

<script>
import axios from 'axios';
export default {
	name: "locations-table",
	props: {
		tableHeaderColor: {
			type	: String,
			default	: "green",
			value	: null
		}
	},
	data() {
		const $app = this;

		axios.get( '/dashboard/locations' ).then( res => {
			$app.loaded = true;
			if ( res.data.success ) {
				setTimeout( () => {
					$app.locations = res.data.data;
				}, 300 );
			} else {
				$app.$notify( {
					message			: "Ошибка при загрузки локаций<br />" + res.data.data,
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
				message			: "Ошибка при загрузки локаций<br />" + res.data.data,
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
			// selected		: [],
			locations		: [], 
			loaded			: false, 
			error			: false
		};
	},
	created() {},
	methods: {
		sel: function ( item ) {
			let locationsTableList = this.$parent.$parent.$parent;
			let editLocationForm = locationsTableList.$children[ 1 ];
			editLocationForm.lcoation = item;
		}
	}
};
</script>
