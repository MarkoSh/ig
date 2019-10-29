import DashboardLayout from "@/pages/Layout/DashboardLayout.vue";

import Dashboard from "@/pages/Dashboard.vue";
import UserProfile from "@/pages/UserProfile.vue";
import AccountsTableList from "@/pages/AccountsTableList.vue";
import TravelsTableList from "@/pages/TravelsTableList.vue";
import LocationsTableList from "@/pages/LocationsTableList.vue";
import Typography from "@/pages/Typography.vue";
import Icons from "@/pages/Icons.vue";
import Maps from "@/pages/Maps.vue";
import Notifications from "@/pages/Notifications.vue";

const routes = [
	{
		path: "/",
		component: DashboardLayout,
		redirect: "/accounts",
		children: [
			{
				path: "accounts",
				name: "Аккаунты",
				component: AccountsTableList
			},
			{
				path: "travels",
				name: "Путешествия",
				component: TravelsTableList
			},
			{
				path: "locations",
				name: "Локации",
				component: LocationsTableList
			}
		]
	}
];

export default routes;
