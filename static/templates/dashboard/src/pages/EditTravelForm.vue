<template>
	<form>
		<md-card>
			<md-card-header :data-background-color="dataBackgroundColor">
				<h4 class="title">Редактирование путешествия</h4>
				<p class="category">Заполните требуемые поля профиля</p>
			</md-card-header>

			<md-card-content>
				<div class="md-layout">
					<div class="md-layout-item md-small-size-100 md-size-100">
						<md-field>
							<label>Имя</label>
							<md-input v-model="username" type="text"></md-input>
						</md-field>
					</div>
					<div class="md-layout-item md-small-size-100 md-size-100">
						<md-field>
							<label>Instagram</label>
							<md-input v-model="emailadress" type="email"></md-input>
						</md-field>
					</div>
					<div class="md-layout-item md-small-size-100 md-size-100">
						<md-field>
							<label>Телеграм</label>
							<md-input v-model="emailadress" type="email"></md-input>
						</md-field>
					</div>
					<div class="md-layout-item md-small-size-100 md-size-100">
						<md-field>
							<label>Email</label>
							<md-input v-model="emailadress" type="email"></md-input>
						</md-field>
					</div>
					<div class="md-layout-item md-small-size-100 md-size-100">
						<md-field>
							<label>Телефон</label>
							<md-input v-model="emailadress" type="email"></md-input>
						</md-field>
					</div>
					<div class="md-layout-item md-size-100">
						<md-field maxlength="5">
							<label>Информация о путешествии</label>
							<md-textarea v-model="aboutme"></md-textarea>
						</md-field>
					</div>
					<div class="md-layout-item md-size-100 text-right">
						<md-button class="md-raised md-success">Добавить/обновить путешествие</md-button>
					</div>
				</div>
			</md-card-content>
		</md-card>
	</form>
</template>
<script>
export default {
	name: "edit-travel-form",
	props: {
		dataBackgroundColor: {
			type: String,
			default: ""
		}
	},
	data() {
		return {
			username: null,
			disabled: null,
			emailadress: null,
			lastname: null,
			firstname: null,
			address: null,
			city: null,
			country: null,
			code: null,
			aboutme:
				"Lamborghini Mercy, Your chick she so thirsty, I'm in that two seat Lambo."
		};
	}
};
</script>