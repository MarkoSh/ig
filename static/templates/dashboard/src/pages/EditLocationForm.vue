<template>
	<form>
		<md-card>
			<md-card-header :data-background-color="dataBackgroundColor">
				<h4 class="title">Редактирование локации</h4>
				<p class="category">Заполните требуемые поля локации</p>
			</md-card-header>

			<md-card-content>
				<div class="md-layout">
					<div class="md-layout-item md-small-size-100 md-size-100">
						<md-field>
							<label>Город</label>
							<md-input v-model="city" type="text"></md-input>
						</md-field>
					</div>
					<div class="md-layout-item md-small-size-100 md-size-100">
						<md-field>
							<label>Страна</label>
							<md-input v-model="country" type="text"></md-input>
						</md-field>
					</div>
					<div class="md-layout-item md-size-100 text-right">
						<md-button class="md-raised md-success">Добавить/обновить локацию</md-button>
					</div>
				</div>
			</md-card-content>
		</md-card>
	</form>
</template>
<script>
export default {
	name: "edit-location-form",
	props: {
		dataBackgroundColor: {
			type: String,
			default: ""
		}
	},
	data() {
		return {
			city: null,
			country: null
		};
	}
};
</script>