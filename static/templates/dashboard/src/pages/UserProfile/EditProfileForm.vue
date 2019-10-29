<template>
	<form>
		<md-card>
			<md-card-header :data-background-color="dataBackgroundColor">
				<h4 class="title">Редактирование профиля</h4>
				<p class="category">Заполните требуемые поля профиля</p>
			</md-card-header>

			<md-card-content>
				<div class="md-layout">
					<div class="md-layout-item md-small-size-100 md-size-100">
						<md-field>
							<label>Имя(не может быть отредактировано после)</label>
							<md-input v-model="user.username" type="text" required></md-input>
						</md-field>
					</div>
					<div class="md-layout-item md-small-size-100 md-size-100">
						<md-field>
							<label>Instagram</label>
							<md-input v-model="user.meta._instagram.current" type="text"></md-input>
						</md-field>
					</div>
					<div class="md-layout-item md-small-size-100 md-size-100">
						<md-field>
							<label>Телеграм</label>
							<md-input v-model="user.meta._telegram.current" type="text"></md-input>
						</md-field>
					</div>
					<div class="md-layout-item md-small-size-100 md-size-100">
						<md-field>
							<label>VK</label>
							<md-input v-model="user.meta._vk.current" type="text"></md-input>
						</md-field>
					</div>
					<div class="md-layout-item md-small-size-100 md-size-100">
						<md-field>
							<label>Email</label>
							<md-input v-model="user.meta._email.current" type="email"></md-input>
						</md-field>
					</div>
					<div class="md-layout-item md-small-size-100 md-size-100">
						<md-field>
							<label>Телефон</label>
							<md-input v-model="user.meta._phone.current" type="text"></md-input>
						</md-field>
					</div>
					<div class="md-layout-item md-size-100">
						<md-field maxlength="5">
							<label>Информация о пользователе</label>
							<md-textarea v-model="user.meta._about.current"></md-textarea>
						</md-field>
					</div>
					<div class="md-layout-item md-size-100 text-right">
						<md-button class="md-raised md-success" v-on:click="update">Обновить</md-button>
						<md-button class="md-raised md-success" v-on:click="add">Добавить</md-button>
						<md-button class="md-raised md-danger" v-on:click="del">Удалить</md-button>
					</div>
				</div>
			</md-card-content>
		</md-card>
	</form>
</template>
<script>
import axios from 'axios';
export default {
	name: "edit-profile-form",
	props: {
		dataBackgroundColor: {
			type: String,
			default: ""
		}
	},
	data() {
		return {
			type: [ "", "info", "success", "warning", "danger" ],
			notifications: {
				topCenter: true
			},
			user: {
				username: '',
				user_id	: 0,
				role	: '',
				meta	: {
					_instagram	: { current: '' },
					_telegram	: { current: '' },
					_vk			: { current: '' },
					_email		: { current: '' },
					_phone		: { current: '' },
					_about		: { current: '' }
				}
			}
		};
	},
	methods: {
		update: function () {
			const $app = this;
			let accountsTableList 	= $app.$parent.$parent;
			let usersTable			= accountsTableList.$children[ 0 ].$children[ 0 ].$children[ 1 ].$children[ 0 ];
			$app.$notify( {
				message			: "Проверка пользователя...",
				icon			: "add_alert",
				horizontalAlign	: 'center',
				verticalAlign	: 'top',
				type			: $app.type[ 3 ]
			} );
			let user = encodeURIComponent( JSON.stringify( $app.user ) );
			axios.post( '/dashboard/users', 'mode=update&user=' + user ).then( res => {
				if ( res.data.success ) {
					usersTable.users = res.data.data;
					$app.$notify( {
						message			: "Пользователь обновлен",
						icon			: "add_alert",
						horizontalAlign	: 'center',
						verticalAlign	: 'top',
						type			: $app.type[ 2 ]
					} );
				} else {
					usersTable.$notify( {
						message			: "Ошибка при обновлении пользователя<br />" + res.data.data,
						icon			: "add_alert",
						horizontalAlign	: 'center',
						verticalAlign	: 'top',
						type			: $app.type[ 4 ]
					} );
				}
			} ).catch( error => {
				$app.$notify( {
					message			: "Ошибка при ответе сервера<br />" + error,
					icon			: "add_alert",
					horizontalAlign	: 'center',
					verticalAlign	: 'top',
					type			: $app.type[ 4 ]
				} );
			} );
		},
		add: function () {
			const $app = this;
			let accountsTableList 	= $app.$parent.$parent;
			let usersTable			= accountsTableList.$children[ 0 ].$children[ 0 ].$children[ 1 ].$children[ 0 ];
			$app.$notify( {
				message			: "Проверка пользователя...",
				icon			: "add_alert",
				horizontalAlign	: 'center',
				verticalAlign	: 'top',
				type			: $app.type[ 3 ]
			} );
			axios.post( '/dashboard/users', 'mode=add&user=' + encodeURIComponent( JSON.stringify( $app.user ) ) ).then( res => {
				if ( res.data.success ) {
					usersTable.users = res.data.data;
					$app.$notify( {
						message			: "Пользователь добавлен",
						icon			: "add_alert",
						horizontalAlign	: 'center',
						verticalAlign	: 'top',
						type			: $app.type[ 2 ]
					} );
				} else {
					usersTable.$notify( {
						message			: "Ошибка при добавления пользователя<br />" + res.data.data,
						icon			: "add_alert",
						horizontalAlign	: 'center',
						verticalAlign	: 'top',
						type			: $app.type[ 4 ]
					} );
				}
			} ).catch( error => {
				$app.$notify( {
					message			: "Ошибка при ответе сервера<br />" + error,
					icon			: "add_alert",
					horizontalAlign	: 'center',
					verticalAlign	: 'top',
					type			: $app.type[ 4 ]
				} );
			} );
		},
		del: function () {
			const $app = this;
			let accountsTableList 	= $app.$parent.$parent;
			let usersTable			= accountsTableList.$children[ 0 ].$children[ 0 ].$children[ 1 ].$children[ 0 ];
			$app.$notify( {
				message			: "Проверка пользователя...",
				icon			: "add_alert",
				horizontalAlign	: 'center',
				verticalAlign	: 'top',
				type			: $app.type[ 3 ]
			} );
			axios.post( '/dashboard/users', 'mode=delete&user=' + encodeURIComponent( JSON.stringify( $app.user ) ) ).then( res => {
				if ( res.data.success ) {
					usersTable.users = res.data.data;
					$app.$notify( {
						message			: "Пользователь удален",
						icon			: "add_alert",
						horizontalAlign	: 'center',
						verticalAlign	: 'top',
						type			: $app.type[ 2 ]
					} );
				} else {
					usersTable.$notify( {
						message			: "Ошибка при удалении пользователя<br />" + res.data.data,
						icon			: "add_alert",
						horizontalAlign	: 'center',
						verticalAlign	: 'top',
						type			: $app.type[ 4 ]
					} );
				}
			} ).catch( error => {
				$app.$notify( {
					message			: "Ошибка при ответе сервера<br />" + error,
					icon			: "add_alert",
					horizontalAlign	: 'center',
					verticalAlign	: 'top',
					type			: $app.type[ 4 ]
				} );
			} );
		}
	}
};
</script>
