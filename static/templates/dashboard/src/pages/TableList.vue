<template>
  <div class="content">
	<div class="md-layout">
	  <div
		class="md-layout-item md-medium-size-100 md-xsmall-size-100 md-size-100"
	  >
		<md-card>
		  <md-card-header data-background-color="green">
			<h4 class="title">Аккаунты</h4>
			<p class="category">Список аккаунтов</p>
		  </md-card-header>
		  <md-card-content>
			<users-table table-header-color="green"></users-table>
		  </md-card-content>
		</md-card>
	  </div>
	  <div
		class="md-layout-item md-medium-size-100 md-xsmall-size-100 md-size-100"
	  >
		<md-card class="md-card-plain">
		  <md-card-header data-background-color="green">
			<h4 class="title">Путешествия</h4>
			<p class="category">Список активных путешествий</p>
		  </md-card-header>
		  <md-card-content>
			<travels-table table-header-color="green"></travels-table>
		  </md-card-content>
		</md-card>
	  </div>
	  
	</div>
  </div>
</template>

<script>
import { SimpleTable, OrderedTable, UsersTable, TravelsTable } from "@/components";

export default {
	components: {
		OrderedTable,
		SimpleTable,
		UsersTable,
		TravelsTable
	},
	data() {
		return {
			test: 123123
		};
	}
};
</script>
