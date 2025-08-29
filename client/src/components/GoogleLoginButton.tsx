import React, { useEffect, useState } from 'react';
import { googleAuth } from '../utils/api';

interface GoogleCredentialResponse {
    credential: string;
}

interface GoogleUserData {
    googleId: string;
    email: string;
    name: string;
    avatar?: string;
}

interface GoogleLoginResponse {
    success: boolean;
    message: string;
    user?: {
        id: string;
        name: string;
        email: string;
        avatar?: string;
        role: string;
        isVerified: boolean;
        authProvider: string;
        createdAt: string;
        lastLogin: string;
    };
    token?: string;
}

interface GoogleLoginButtonProps {
    onSuccess: (response: GoogleLoginResponse) => void;
    onError: (error: Error) => void;
    text?: string;
    disabled?: boolean;
}

interface GoogleInitConfig {
    client_id: string;
    callback: (response: GoogleCredentialResponse) => void;
    auto_select: boolean;
    cancel_on_tap_outside: boolean;
    context: string;
    itp_support: boolean;
}

interface GoogleButtonConfig {
    theme: string;
    size: string;
    type: string;
    text: string;
    width: number;
}

const GoogleLoginButton: React.FC<GoogleLoginButtonProps> = ({
    onSuccess,
    onError,
    text = "Continue with Google",
    disabled = false
}) => {
    // Use environment variable for Google Client ID
    const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;

    // Track Google script loading status
    const [isGoogleLoaded, setIsGoogleLoaded] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [loadError, setLoadError] = useState<string | null>(null);

    useEffect(() => {
        // Check if Google Client ID is configured
        if (!GOOGLE_CLIENT_ID) {
            setIsLoading(false);
            setLoadError('Google Client ID not configured');
            return;
        }

        // Log configuration for debugging
        console.log('🔧 Google Login Configuration:');
        console.log('🔧 Client ID:', GOOGLE_CLIENT_ID);
        console.log('🔧 Origin:', window.location.origin);
        console.log('🔧 Is Development:', import.meta.env.DEV);

        // Check if Google services are available (loaded from HTML)
        const checkGoogleServices = () => {
            if (window.google && window.google.accounts && window.google.accounts.id) {
                console.log('✅ Google services loaded successfully');
                setIsLoading(false);
                setIsGoogleLoaded(true);
                initializeGoogleAuth();
            } else {
                console.log('⏳ Waiting for Google services to load...');
                // Retry checking every 500ms for up to 10 seconds
                setTimeout(checkGoogleServices, 500);
            }
        };

        // Start checking for Google services
        checkGoogleServices();

        // Fallback timeout - if Google services don't load in 15 seconds, show error
        const timeout = setTimeout(() => {
            if (!window.google || !window.google.accounts) {
                console.error('⏰ Google services failed to load within timeout');
                setIsLoading(false);
                setLoadError('Google authentication failed to load. Please refresh the page and try again.');
            }
        }, 15000);

        // Cleanup function
        return () => {
            clearTimeout(timeout);
            // Clean up the hidden Google button
            const hiddenButton = document.getElementById('hidden-google-button');
            if (hiddenButton) {
                hiddenButton.remove();
            }
        };
    }, [GOOGLE_CLIENT_ID]);

    const initializeGoogleAuth = () => {
        try {
            if (!window.google || !window.google.accounts || !window.google.accounts.id) {
                console.warn('Google Identity Services not fully loaded, retrying...');
                // Retry after a short delay
                setTimeout(() => {
                    console.log('Retrying Google Auth initialization...');
                    initializeGoogleAuth();
                }, 1000);
                return;
            }

            console.log('Initializing Google Auth with Client ID:', GOOGLE_CLIENT_ID);
            console.log('🔧 Current domain:', window.location.hostname);
            console.log('🔧 Current protocol:', window.location.protocol);

            // Initialize Google OAuth
            const initConfig = {
                client_id: GOOGLE_CLIENT_ID,
                callback: handleCredentialResponse,
                auto_select: false,
                cancel_on_tap_outside: true,
                context: 'signin',
                itp_support: true,
            };

            console.log('🔧 Google Auth Config:', initConfig);
            window.google.accounts.id.initialize(initConfig);

            // Create invisible Google button for programmatic triggering
            const hiddenButtonContainer = document.createElement('div');
            hiddenButtonContainer.id = 'hidden-google-button';
            hiddenButtonContainer.style.position = 'absolute';
            hiddenButtonContainer.style.top = '-9999px';
            hiddenButtonContainer.style.left = '-9999px';
            hiddenButtonContainer.style.visibility = 'hidden';
            document.body.appendChild(hiddenButtonContainer);

            // Render invisible Google button
            window.google.accounts.id.renderButton(hiddenButtonContainer, {
                theme: 'outline',
                size: 'large',
                type: 'standard',
                text: 'signin_with',
                width: 250
            });

            console.log('✅ Google Auth initialized successfully');
            setIsGoogleLoaded(true);
            setIsLoading(false);
            setLoadError(null);
        } catch (error) {
            console.error('❌ Error initializing Google Auth:', error);
            console.error('🔧 Error details:', {
                message: error instanceof Error ? error.message : 'Unknown error',
                client_id: GOOGLE_CLIENT_ID,
                origin: window.location.origin,
                hostname: window.location.hostname
            });

            setIsLoading(false);
            setLoadError(`Failed to initialize Google authentication. Please check your configuration.`);
        }
    };

    const handleCredentialResponse = async (response: GoogleCredentialResponse) => {
        try {
            console.log('Google credential response received');

            if (!response.credential) {
                throw new Error('No credential received from Google');
            }

            // Decode the JWT token to get user info
            const credential = response.credential;
            const parts = credential.split('.');

            if (parts.length !== 3) {
                throw new Error('Invalid JWT token format');
            }

            const payload = JSON.parse(atob(parts[1]));

            console.log('Decoded Google user data:', payload);

            const googleData: GoogleUserData = {
                googleId: payload.sub,
                email: payload.email,
                name: payload.name,
                avatar: payload.picture,
            };

            if (!googleData.googleId || !googleData.email || !googleData.name) {
                throw new Error('Incomplete user data from Google');
            }

            console.log('Sending Google data to backend for authentication...');

            // Call backend API to authenticate and save user
            const authResponse = await googleAuth(googleData);

            if (authResponse.success) {
                console.log('✅ Google authentication successful');

                // Store token in localStorage
                if (authResponse.token) {
                    localStorage.setItem('authToken', authResponse.token);
                    localStorage.setItem('user', JSON.stringify(authResponse.user));
                }

                onSuccess(authResponse);
            } else {
                throw new Error(authResponse.message || 'Google authentication failed');
            }
        } catch (error) {
            console.error('❌ Error processing Google login:', error);
            onError(error instanceof Error ? error : new Error('Failed to process Google login'));
        }
    };

    const handleGoogleLogin = () => {
        if (disabled || isLoading) {
            console.log('Google login button is disabled or still loading');
            return;
        }

        if (loadError) {
            // Retry loading Google services
            console.log('Retrying Google services load...');
            window.location.reload();
            return;
        }

        if (!isGoogleLoaded) {
            setLoadError('Google authentication is not ready. Please wait or refresh the page.');
            return;
        }

        try {
            console.log('🔧 Attempting Google login...');
            console.log('🔧 Current origin:', window.location.origin);
            console.log('🔧 Client ID:', GOOGLE_CLIENT_ID);

            // Find and click the invisible Google button
            const hiddenButton = document.querySelector('#hidden-google-button button') as HTMLButtonElement;
            if (hiddenButton) {
                console.log('✅ Triggering Google authentication via hidden button...');
                hiddenButton.click();
            } else {
                console.warn('⚠️ Hidden Google button not found, falling back to prompt...');
                // Fallback to prompt method
                if (window.google && window.google.accounts && window.google.accounts.id) {
                    window.google.accounts.id.prompt();
                } else {
                    setLoadError('Google authentication is not available. Please try again.');
                }
            }
        } catch (error) {
            console.error('❌ Error during Google login:', error);
            onError(error instanceof Error ? error : new Error('Google login failed'));
        }
    };



    // Show loading state
    if (isLoading) {
        return (
            <button
                type="button"
                disabled={true}
                className="w-full flex items-center justify-center px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 opacity-50 cursor-not-allowed"
            >
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-500 mr-3"></div>
                <span className="text-sm font-medium">Loading Google...</span>
            </button>
        );
    }

    // Show error state with retry option
    if (loadError) {
        return (
            <div className="w-full space-y-4">
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                    <div className="flex items-start space-x-3">
                        <div className="text-red-600 mt-1">⚠️</div>
                        <div>
                            <h3 className="text-red-800 font-semibold text-sm">
                                {loadError === 'Google Client ID not configured'
                                    ? 'Google Client ID Missing'
                                    : 'Google Authentication Error'}
                            </h3>
                            {loadError === 'Google Client ID not configured' ? (
                                <div className="text-red-700 text-sm mt-1">
                                    <p>Please create a <code className="bg-red-100 px-1 rounded">.env</code> file in your project root with:</p>
                                    <code className="bg-red-100 px-2 py-1 rounded text-xs block mt-2">
                                        VITE_GOOGLE_CLIENT_ID=300864766309-rs0l6g3vgshqkjgmkosrc1rstsfqlg80.apps.googleusercontent.com
                                    </code>
                                    <p className="mt-2">Then restart your development server.</p>
                                </div>
                            ) : (
                                <p className="text-red-700 text-sm mt-1">{loadError}</p>
                            )}
                        </div>
                    </div>
                </div>

                {loadError !== 'Google Client ID not configured' && (
                    <>
                        {/* Google OAuth Setup Instructions */}
                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                            <div className="flex items-start space-x-3">
                                <div className="text-blue-600 mt-1">🔧</div>
                                <div>
                                    <h3 className="text-blue-800 font-semibold text-sm">Google OAuth Setup Required:</h3>
                                    <div className="text-blue-700 text-sm mt-2 space-y-1">
                                        <p><strong>1.</strong> Go to <a href="https://console.cloud.google.com/" target="_blank" rel="noopener noreferrer" className="underline text-blue-600">Google Cloud Console</a></p>
                                        <p><strong>2.</strong> Navigate to: APIs & Services → Credentials</p>
                                        <p><strong>3.</strong> Create OAuth 2.0 Client ID (Web Application)</p>
                                        <p><strong>4.</strong> Add this origin to "Authorized JavaScript origins":</p>
                                        <code className="bg-blue-100 px-2 py-1 rounded text-xs block mt-1">
                                            {window.location.origin}
                                        </code>
                                        <p><strong>5.</strong> Copy Client ID and add to your .env file</p>
                                        <p><strong>6.</strong> Save and wait 5-10 minutes for changes to take effect</p>
                                    </div>
                                </div>
                            </div>
                        </div>

                    

                        
                    </>
                )}
            </div>
        );
    }

    return (
        <button
            type="button"
            onClick={handleGoogleLogin}
            disabled={disabled}
            className={`
        w-full flex items-center justify-center px-4 py-3 border border-gray-300 dark:border-gray-600 
        rounded-lg shadow-sm bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 
        hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 
        focus:ring-offset-2 focus:ring-gray-500 transition-colors duration-200
        ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
      `}
        >
            <svg
                className="w-5 h-5 mr-3"
                viewBox="0 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
            >
                <path
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    fill="#4285F4"
                />
                <path
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    fill="#34A853"
                />
                <path
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                    fill="#FBBC05"
                />
                <path
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                    fill="#EA4335"
                />
            </svg>
            <span className="text-sm font-medium">{text}</span>
        </button>
    );
};

// Extend window object to include google
declare global {
    interface Window {
        google: {
            accounts: {
                id: {
                    initialize: (config: GoogleInitConfig) => void;
                    prompt: () => void;
                    renderButton: (element: HTMLElement, config: GoogleButtonConfig) => void;
                };
            };
        };
    }
}

export default GoogleLoginButton; 