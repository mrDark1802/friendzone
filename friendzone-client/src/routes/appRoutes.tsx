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
import ProfilePage from "../pages/dashboard/profilePage"
import NotificationsPage from "../pages/dashboard/notificationsPage"
import SettingsPage from "../pages/dashboard/settingsPage"
import JoinGroupInvitePage from "../pages/dashboard/JoinGroupInvitePage"

import FeaturesPage from "../pages/public/featuresPage"
import SolutionsPage from "../pages/public/solutionsPage"
import CommunityPage from "../pages/public/communityPage"
import PricingPage from "../pages/public/pricingPage"
import SecurityPage from "../pages/public/securityPage"
import AboutPage from "../pages/public/aboutPage"
import PrivacyPage from "../pages/public/privacyPage"
import TermsPage from "../pages/public/termsPage"
import CookiesPage from "../pages/public/cookiesPage"

import VerifyEmailPage from "../pages/verifyEmail"
import ForgotPasswordPage from "../pages/forgotPassword"
import ResetPasswordPage from "../pages/resetPassword"

import SubscriptionSuccessPage from "../pages/subscription/SubscriptionSuccessPage"
import SubscriptionCancelPage from "../pages/subscription/SubscriptionCancelPage"

export const publicRouteConfig = {
    element: <PublicLayout />,
    children: [
        { path: "/", element: <Homepage /> },
        { path: "/signin", element: <SignIn /> },
        { path: "/signup", element: <SignUp /> },
        { path: "/verify-email", element: <VerifyEmailPage /> },
        { path: "/forgot-password", element: <ForgotPasswordPage /> },
        { path: "/reset-password", element: <ResetPasswordPage /> },
        { path: "/features", element: <FeaturesPage /> },
        { path: "/solutions", element: <SolutionsPage /> },
        { path: "/community", element: <CommunityPage /> },
        { path: "/pricing", element: <PricingPage /> },
        { path: "/subscription/success", element: <SubscriptionSuccessPage /> },
        { path: "/subscription/cancel", element: <SubscriptionCancelPage /> },
        { path: "/security", element: <SecurityPage /> },
        { path: "/about", element: <AboutPage /> },
        { path: "/privacy", element: <PrivacyPage /> },
        { path: "/terms", element: <TermsPage /> },
        { path: "/cookies", element: <CookiesPage /> },
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
                { path: "/group/invite/:token", element: <JoinGroupInvitePage /> },
                { path: "/contacts", element: <ContactsPage /> },
                { path: "/requests", element: <RequestsPage /> },
                { path: "/profile", element: <ProfilePage /> },
                { path: "/notifications", element: <NotificationsPage /> },
                { path: "/settings", element: <SettingsPage /> },
            ],
        },
    ],
}
