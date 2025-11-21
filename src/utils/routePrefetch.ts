// Route prefetching utility
// Preload lazy-loaded route components on hover

type RouteModule = () => Promise<{ default: React.ComponentType<any> }>;

const routeModules: Record<string, RouteModule> = {
  '/home': () => import('@/pages/Home'),
  '/search': () => import('@/pages/Search'),
  '/messages': () => import('@/pages/Messages'),
  '/notifications': () => import('@/pages/Notifications'),
  '/settings': () => import('@/pages/Settings'),
};

const prefetchedRoutes = new Set<string>();

export const prefetchRoute = (path: string) => {
  // Normalize path (remove trailing slash, extract base path)
  const normalizedPath = path.split('?')[0].replace(/\/$/, '');
  
  // Handle profile routes
  if (normalizedPath.startsWith('/profile/')) {
    if (!prefetchedRoutes.has('/profile')) {
      prefetchedRoutes.add('/profile');
      import('@/pages/Profile').catch(() => {
        prefetchedRoutes.delete('/profile');
      });
    }
    return;
  }

  // Handle other routes
  const moduleLoader = routeModules[normalizedPath];
  if (moduleLoader && !prefetchedRoutes.has(normalizedPath)) {
    prefetchedRoutes.add(normalizedPath);
    moduleLoader().catch(() => {
      // Remove from cache on error so it can be retried
      prefetchedRoutes.delete(normalizedPath);
    });
  }
};
