import { useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import AshokaLoader from '@/components/ui/AshokaLoader';
import { useToast } from "@/components/ui/use-toast";

interface ProtectedRouteProps {
    children: React.ReactNode;
    role?: 'citizen' | 'official';
}

const ProtectedRoute = ({ children, role }: ProtectedRouteProps) => {
    const [loading, setLoading] = useState(true);
    const [userRole, setUserRole] = useState<string | null>(null);
    const [authenticated, setAuthenticated] = useState(false);
    const location = useLocation();
    const { toast } = useToast();

    useEffect(() => {
        const checkAuth = async () => {
            try {
                const { data: { session } } = await supabase.auth.getSession();

                if (!session) {
                    setAuthenticated(false);
                    setLoading(false);
                    return;
                }

                setAuthenticated(true);

                // Fetch user role from database with retry logic
                let attempts = 0;
                let roleFound = null;

                while (attempts < 3 && !roleFound) {
                    const { data: userData, error } = await supabase
                        .from('user_roles')
                        .select('role')
                        .eq('user_id', session.user.id)
                        .maybeSingle();

                    if (userData?.role) {
                        roleFound = userData.role;
                    } else {
                        // Wait 1s before retry
                        await new Promise(resolve => setTimeout(resolve, 1000));
                        attempts++;
                    }
                }

                if (!roleFound) {
                    console.error('User role not found after retries.');
                    // Don't toast error immediately, might be delay. But if truly missing, user is stuck.
                    // Let's assume citizen default? No, dangerous.
                    // Just set authenticated false to force login or show error.
                    toast({
                        variant: "destructive",
                        title: "Account Setup Pending",
                        description: "Your account is being set up. Please try logging in again in a moment."
                    });
                    setAuthenticated(false);
                } else {
                    setUserRole(roleFound);
                }
            } catch (error) {
                console.error('Auth check error:', error);
            } finally {
                setLoading(false);
            }
        };

        checkAuth();

        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
            if (!session) {
                setAuthenticated(false);
                setUserRole(null);
                setLoading(false);
            } else {
                // Re-check role on auth change if needed, effectively handled by initial check usually
                // but for robustness we could re-fetch. For now, rely on initial check.
            }
        });

        return () => subscription.unsubscribe();
    }, [toast]);

    if (loading) {
        return (
            <div className="flex items-center justify-center h-screen bg-background">
                <AshokaLoader size="xl" />
            </div>
        );
    }

    if (!authenticated) {
        // Redirect to login based on attempted role access or default
        if (location.pathname.startsWith('/official')) {
            return <Navigate to="/official/login" state={{ from: location }} replace />;
        }
        return <Navigate to="/login" state={{ from: location }} replace />;
    }

    if (role && userRole !== role) {
        // Role mismatch
        toast({
            variant: "destructive",
            title: "Unauthorized",
            description: `You do not have permission to access this area. Required: ${role}, Found: ${userRole}`
        });

        // Redirect to appropriate dashboard
        if (userRole === 'official') {
            return <Navigate to="/official/dashboard" replace />;
        } else {
            return <Navigate to="/citizen/dashboard" replace />;
        }
    }

    return <>{children}</>;
};

export default ProtectedRoute;
