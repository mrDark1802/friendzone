import PublicLayout from "../layouts/PublicLayout"
import DashboardLayout from "../layouts/DashboardLayout"
import ProtectedRoute from "../components/ProtectedRoute"

import Homepage from "../pages/homePage"
import SignIn from "../pages/signIn"
import SignUp from "../pages/signUp"

import DashboardOverview from "../pages/dashboard/dashboardOverview"
import OnboardingPage from "../pages/dashboard/onboardingPage"
import ChatPage from "../pages/dashboard/chatPage"
import ContactsPage from "../pages/dashboard/contactsPage"
import RequestsPage from "../pages/dashboard/requestsPage"
import GroupChatPage from "../pages/dashboard/groupChatPage"
import ProfilePage from "../pages/dashboard/profilePage"
import NotificationsPage from "../pages/dashboard/notificationsPage"
import SettingsPage from "../pages/dashboard/settingsPage"

export const publicRouteConfig = {
    element: <PublicLayout />,
    children: [
        { path: "/", element: <Homepage /> },
        { path: "/signin", element: <SignIn /> },
        { path: "/signup", element: <SignUp /> },
    ],
}

export const protectedRouteConfig = {
    element: <ProtectedRoute />,
    children: [
        {
            element: <DashboardLayout />,
            children: [
                { path: "/dashboard", element: <DashboardOverview /> },
                { path: "/dashboard/onboarding", element: <OnboardingPage /> },
                { path: "/chats", element: <ChatPage /> },
                { path: "/contacts", element: <ContactsPage /> },
                { path: "/requests", element: <RequestsPage /> },
                { path: "/groups", element: <GroupChatPage /> },
                { path: "/profile", element: <ProfilePage /> },
                { path: "/notifications", element: <NotificationsPage /> },
                { path: "/settings", element: <SettingsPage /> },
            ],
        },
    ],
}
