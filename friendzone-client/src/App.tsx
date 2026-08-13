import './App.css'
import { Routes, Route } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import { publicRouteConfig, protectedRouteConfig } from './routes/appRoutes'

function App() {
  return (
    <AuthProvider>
      <Routes>
        {/* Public Marketing & Auth Routes */}
        <Route element={publicRouteConfig.element}>
          {publicRouteConfig.children.map((route) => (
            <Route key={route.path} path={route.path} element={route.element} />
          ))}
        </Route>

        {/* Protected Dashboard Suite Routes */}
        <Route element={protectedRouteConfig.element}>
          {protectedRouteConfig.children.map((layoutGroup, idx) => (
            <Route key={idx} element={layoutGroup.element}>
              {layoutGroup.children?.map((route) => (
                <Route key={route.path} path={route.path} element={route.element} />
              ))}
            </Route>
          ))}
        </Route>

        {/* Fallback to Home */}
        <Route path="*" element={<Route element={publicRouteConfig.element}><Route path="*" element={<HomepageFallback />}/></Route>} />
      </Routes>
    </AuthProvider>
  )
}

function HomepageFallback() {
  return publicRouteConfig.children[0].element
}

export default App
