<template>
  <div class="wrapper" :class="{ 'nav-open': $sidebar.showSidebar }">
	<notifications></notifications>

	<side-bar>
		<mobile-menu slot="content"></mobile-menu>
		<sidebar-link to="/accounts">
			<md-icon>content_paste</md-icon>
			<p>Аккаунты</p>
		</sidebar-link>
		<sidebar-link to="/travels">
			<md-icon>content_paste</md-icon>
			<p>Путешествия</p>
		</sidebar-link>
		<sidebar-link to="/locations">
			<md-icon>content_paste</md-icon>
			<p>Локации</p>
		</sidebar-link>
	</side-bar>

	<div class="main-panel">
	  <top-navbar></top-navbar>

	  <dashboard-content> </dashboard-content>

	  <content-footer v-if="!$route.meta.hideFooter"></content-footer>
	</div>
  </div>
</template>
<style lang="scss"></style>
<script>
import TopNavbar from "./TopNavbar.vue";
import ContentFooter from "./ContentFooter.vue";
import DashboardContent from "./Content.vue";
import MobileMenu from "@/pages/Layout/MobileMenu.vue";

export default {
  components: {
	TopNavbar,
	DashboardContent,
	ContentFooter,
	MobileMenu
  }
};
</script>
