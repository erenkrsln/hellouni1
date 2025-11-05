import { ClerkProvider as BaseClerkProvider } from '@clerk/clerk-react';
import { ReactNode } from 'react';

const PUBLISHABLE_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;

if (!PUBLISHABLE_KEY) {
  throw new Error("Missing Clerk Publishable Key");
}

export function ClerkProvider({ children }: { children: ReactNode }) {
  return (
    <BaseClerkProvider 
      publishableKey={PUBLISHABLE_KEY}
      appearance={{
        variables: {
          colorPrimary: 'hsl(25 85% 65%)',
          colorBackground: 'hsl(30 40% 98%)',
          colorText: 'hsl(20 15% 15%)',
          colorTextSecondary: 'hsl(20 10% 45%)',
          colorInputBackground: 'hsl(28 50% 97%)',
          colorInputText: 'hsl(20 15% 15%)',
          borderRadius: '0.75rem',
          fontFamily: 'Poppins, sans-serif',
        },
        elements: {
          card: 'shadow-card',
          formButtonPrimary: 'shadow-warm',
        }
      }}
    >
      {children}
    </BaseClerkProvider>
  );
}
