import './App.css'
import { Routes, Route } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import { publicRouteConfig, protectedRouteConfig } from './routes/appRoutes'
import NotFoundPage from './pages/notFoundPage'
import PublicLayout from './layouts/PublicLayout'

import { ErrorBoundary } from './components/common/ErrorBoundary'

function App() {
  return (
    <ErrorBoundary>
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

          {/* Fallback 404 Route with noindex */}
          <Route element={<PublicLayout />}>
            <Route path="*" element={<NotFoundPage />} />
          </Route>
        </Routes>
      </AuthProvider>
    </ErrorBoundary>
  )
}

export default App
