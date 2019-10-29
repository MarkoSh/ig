<template>
	<div class="content">
		<div class="md-layout">
			<div class="md-layout-item md-medium-size-70 md-xsmall-size-100 md-size-70">
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
			<div class="fixed-bottom md-layout-item md-medium-size-30 md-xsmall-size-100 md-size-30">
				<edit-profile-form data-background-color="green"> </edit-profile-form>
			</div>
		</div>
	</div>
</template>

<script>
import { UsersTable } from "@/components";
import { EditProfileForm } from "@/pages";

import axios from 'axios';

export default {
	components: {
		UsersTable,
		EditProfileForm
	},
	data() {
		return {};
	}
};
</script>
