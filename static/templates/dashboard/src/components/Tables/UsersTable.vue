<template>
	<div v-if="loaded">
		<md-table v-model="users" md-sort="username" md-sort-order="desc" :table-header-color="tableHeaderColor">
			<md-table-row slot="md-table-row" slot-scope="{ item }" v-on:click="sel( item )">
				<md-table-cell md-label="Имя" md-sort-by="username">{{ item.username }}</md-table-cell>
				<md-table-cell md-label="Instagram"><a v-if="item.meta._instagram" :href="'https://instagram.com/' + item.meta._instagram.current + '/'" target="_blank">{{ item.meta._instagram.current }}</a></md-table-cell>
				<md-table-cell md-label="Telegram"><a v-if="item.meta._telegram" :href="'https://teleg.run/' + item.meta._telegram.current + '/'" target="_blank">{{ item.meta._telegram.current }}</a></md-table-cell>
				<md-table-cell md-label="VK"><a v-if="item.meta._vk" :href="'https://vk.com/' + item.meta._vk.current + '/'" target="_blank">{{ item.meta._vk.current }}</a></md-table-cell>
				<md-table-cell md-label="Email"><a v-if="item.meta._email" :href="'mailto:' + item.meta._email.current + '/'" target="_blank">{{ item.meta._email.current }}</a></md-table-cell>
				<md-table-cell md-label="Телефон"><a v-if="item.meta._phone" :href="'tel:' + item.meta._phone.current">{{ item.meta._phone.current }}</a></md-table-cell>
				<md-table-cell md-label="Статус" md-sort-by="role">{{ item.role }}</md-table-cell>
			</md-table-row>
		</md-table>
	</div>
	<div v-else-if="error">
		<md-empty-state
			md-icon="devices_other"
			md-label="Ошибка загрузки аккаунтов"
			:md-description="error">
		</md-empty-state>
	</div>
	<div v-else>
		<md-empty-state
			md-icon="devices_other"
			md-label="Идет загрузка аккаунтов"
			md-description="Не перезагружайте страницу">
		</md-empty-state>
	</div>
</template>

<script>
import axios from 'axios';
export default {
	name: "users-table",
	props: {
		tableHeaderColor: {
			type	: String,
			default	: "green",
			value	: null
		}
	},
	data() {
		const $app = this;

		axios.get( '/dashboard/users' ).then( res => {
			$app.loaded = true;
			if ( res.data.success ) {
				setTimeout( () => {
					$app.users = res.data.data;
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
				message			: "Ошибка при загрузки пользователей<br />" + res.data.data,
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
			users			: [], 
			loaded			: false, 
			error			: false
		};
	},
	created() {},
	methods: {
		sel: function ( item ) {
			let accountsTableList = this.$parent.$parent.$parent;
			let editProfileForm = accountsTableList.$children[ 1 ];
			editProfileForm.user = item;
		}
	}
};
</script>
