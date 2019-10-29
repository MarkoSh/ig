<template>
	<div class="content">
		<div class="md-layout">
			<div class="md-layout-item md-medium-size-70 md-xsmall-size-100 md-size-100">
				<md-card>
					<md-card-header data-background-color="green">
						<h4 class="title">Локации</h4>
						<p class="category">Список локаций</p>
					</md-card-header>
					<md-card-content>
						<locations-table table-header-color="green"></locations-table>
					</md-card-content>
				</md-card>
			</div>
		</div>
	</div>
</template>

<script>
import { LocationsTable } from "@/components";
import { EditLocationForm } from "@/pages";

export default {
	components: {
		LocationsTable,
		EditLocationForm
	},
	data() {
		return {};
	}
};
</script>
