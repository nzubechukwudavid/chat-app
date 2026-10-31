import React, { lazy, Suspense, useCallback, useEffect } from 'react';
import { Analytics } from '@vercel/analytics/react';

// Stream's base stylesheet must load *before* our layers so that every override
// in `styles/stream.css` wins the cascade without piling on `!important`.
import 'stream-chat-react/dist/css/v2/index.css';
import './styles/index.css';

import Auth from './components/Auth';
import SplashScreen from './components/ui/SplashScreen';
import ThemeToggle from './components/ui/ThemeToggle';
import { useToast } from './components/ui/Toast';
import { useSession } from './hooks/useSession';
import { useTheme } from './hooks/useTheme';

// The chat workspace drags in the whole Stream SDK, so it is split out of the
// initial bundle. Unauthenticated visitors load only the sign-in screen.
const Workspace = lazy(() => import('./components/Workspace'));

const App = () => {
  const { user, token, isAuthenticated, isLoading, restore, signIn, signUp, signOut, updateProfile, changePassword, uploadAvatar } = useSession();
  const { notify } = useToast();
  const { theme } = useTheme();

  // Validate the httpOnly session cookie exactly once on boot.
  useEffect(() => {
    restore();
  }, [restore]);

  const handleSignOut = useCallback(
    async (options = {}) => {
      await signOut();
      if (options.expired) {
        notify({
          variant: 'warning',
          title: 'Session expired',
          description: 'Please sign in again to continue.',
          duration: 6000,
        });
      } else {
        notify({ variant: 'success', title: 'Signed out', description: 'Stay safe out there.' });
      }
    },
    [signOut, notify],
  );

  const handleSessionExpired = useCallback(() => {
    handleSignOut({ expired: true });
  }, [handleSignOut]);

  if (isLoading) {
    return (
      <>
        <ThemeToggle className="theme-toggle--floating" />
        <SplashScreen />
      </>
    );
  }

  if (!isAuthenticated) {
    return (
      <>
        <ThemeToggle className="theme-toggle--floating" />
        <Auth signIn={signIn} signUp={signUp} />
        <Analytics />
      </>
    );
  }

  return (
    <>
      <Suspense fallback={<SplashScreen message="Loading your workspace" />}>
        <Workspace
          user={user}
          token={token}
          onSignOut={handleSignOut}
          onSessionExpired={handleSessionExpired}
          theme={theme}
          updateProfile={updateProfile}
          changePassword={changePassword}
          uploadAvatar={uploadAvatar}
        />
      </Suspense>
      <Analytics />
    </>
  );
};

export default App;
