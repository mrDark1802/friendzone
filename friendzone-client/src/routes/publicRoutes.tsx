import PublicLayout from "../layouts/PublicLayout"
import Homepage from "../pages/homePage"
import SignIn from "../pages/signIn"
import SignUp from "../pages/signUp"

const publicRoutes = [
    {
        element: <PublicLayout />,
        children: [
            {
                path: '/',
                element: <Homepage />
            },
            {
                path: '/signup',
                element: <SignUp />
            },
            {
                path: '/signin',
                element: <SignIn />
            }
        ]
    }
]

export default publicRoutes