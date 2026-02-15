import React, { useState, useEffect } from 'react';
import OfficialLayout from '@/components/layout/OfficialLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import { Search, CheckCircle, XCircle, Loader2, FileText, ExternalLink, ShieldCheck, Camera } from 'lucide-react';
import { toast } from 'sonner';
import { Html5Qrcode } from 'html5-qrcode';
import { useCheckInToken } from '@/hooks/useTokens';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { getLocalDateString } from '@/lib/utils';

const ScanPage: React.FC = () => {
    const { language } = useLanguage();
    const navigate = useNavigate();
    const { profile } = useAuth(); // Get official profile
    const [tokenInput, setTokenInput] = useState('');
    const [isSearching, setIsSearching] = useState(false);
    const [scannedToken, setScannedToken] = useState<any>(null);
    const [showScanner, setShowScanner] = useState(false);

    const checkInMutation = useCheckInToken();

    const scannerRef = React.useRef<any>(null); // Use ref to persist instance

    // Initialize QR Scanner
    useEffect(() => {
        // DEBUG: Check what tokens exist in DB to verify RLS
        const checkTokens = async () => {
            const { data, error } = await supabase
                .from('tokens')
                .select('token_number, id, created_at')
                .order('created_at', { ascending: false })
                .limit(5);
            console.log("DEBUG: Recent tokens in DB:", { data, error });
        };
        checkTokens();

        if (showScanner) {
            const startScanner = async () => {
                // Ensure DOM element is present
                if (!document.getElementById("reader")) return;

                try {
                    // Dynamic import
                    const { Html5Qrcode } = await import('html5-qrcode');

                    // Create instance if not exists
                    if (!scannerRef.current) {
                        scannerRef.current = new Html5Qrcode("reader");
                    }

                    await scannerRef.current.start(
                        { facingMode: "environment" },
                        {
                            fps: 10,
                            qrbox: { width: 250, height: 250 },
                            aspectRatio: 1.0
                        },
                        (decodedText: string) => {
                            // Success callback
                            console.log("QR Decoded:", decodedText);

                            // Stop scanning immediately on success
                            if (scannerRef.current) {
                                scannerRef.current.stop().then(() => {
                                    scannerRef.current.clear();
                                    setShowScanner(false); // This triggers cleanup
                                    setTokenInput(decodedText);
                                    handleSearch(decodedText);
                                }).catch((err: any) => {
                                    console.warn("Stop failed during success", err);
                                    setShowScanner(false);
                                    setTokenInput(decodedText);
                                    handleSearch(decodedText);
                                });
                            }
                        },
                        (errorMessage: any) => {
                            // parse error, ignore
                        }
                    );
                } catch (err) {
                    console.error("Error starting scanner:", err);
                    toast.error("Could not access camera.");
                    setShowScanner(false);
                }
            };

            // Small delay to ensure render
            const timer = setTimeout(startScanner, 100);
            return () => clearTimeout(timer);
        } else {
            // Cleanup when showScanner becomes false
            if (scannerRef.current) {
                // We attempt to clear, but stop might be async and running.
                // Usually library handles isScanning check.
                try {
                    // Check if scanning? The library throws if we stop non-running.
                    // We just clear the ref mostly.
                    scannerRef.current.clear().catch(() => { });
                } catch (e) { /* ignore */ }
                scannerRef.current = null;
            }
        }
    }, [showScanner]);

    // Step 1: Fetch Token Details (Read-Only)
    const handleSearch = async (inputOverride?: string) => {
        let query = inputOverride || tokenInput;
        if (!query.trim()) return;

        setIsSearching(true);
        setScannedToken(null);

        // Handle JSON input if passed directly (from QR)
        let searchId = '';
        let searchTokenNo = query.trim();

        try {
            const parsed = JSON.parse(query);
            if (parsed.id) searchId = parsed.id;
            if (parsed.token_number) searchTokenNo = parsed.token_number;

            // Update input to show readable number if it was JSON
            if (parsed.token_number && inputOverride) {
                setTokenInput(parsed.token_number);
            }
        } catch (e) {
            // Not JSON, continue with raw string
        }

        try {
            let dbQuery = supabase
                .from('tokens')
                .select('*'); // Removed invalid join: profiles:user_id(...) because FK is to auth.users not profiles

            if (searchId) {
                dbQuery = dbQuery.eq('id', searchId);
            } else {
                dbQuery = dbQuery.eq('token_number', searchTokenNo);
            }

            const today = getLocalDateString();
            console.log('Scanning for token:', { tokenInput, today });

            // 1. Fetch Token
            const { data: tokenData, error: tokenError } = await dbQuery.maybeSingle();

            console.log('Scan result:', { tokenData, tokenError });

            if (tokenError || !tokenData) {
                console.error("Scan missing data/error:", { tokenError, tokenData, searchTokenNo });
                toast.error(
                    language === 'mr'
                        ? `टोकन सापडले नाही: ${searchTokenNo}`
                        : `Token not found: ${searchTokenNo}`
                );
                return;
            }

            // 2. Fetch Profile manually (since we can't join easily on auth.users FK)
            let profileData = null;
            if (tokenData.user_id) {
                const { data: pData } = await supabase
                    .from('profiles')
                    .select('full_name, phone') // Correct column is 'phone'
                    .eq('id', tokenData.user_id)
                    .single();
                profileData = pData;
            }

            const data = {
                ...tokenData,
                profiles: profileData
            };

            // ERROR HANDLING & VALIDATION FOLLOWS...
            // Check date manually for better error message
            if (data.appointment_date !== today) {
                console.warn('Date mismatch:', { tokenDate: data.appointment_date, today });
                toast.error(`Token is for ${data.appointment_date}, not today!`);
                return;
            }

            // DEPARTMENT CHECK
            if (profile?.assigned_department_id && data.department_id !== profile.assigned_department_id) {
                toast.error(
                    language === 'mr'
                        ? 'हे टोकन तुमच्या विभागाचे नाही'
                        : `Wrong Department. Token is for: ${data.department || 'Unknown'}`
                );
                setIsSearching(false);
                return;
            }

            // OFFICE CHECK - Vital for Queue Visibility
            if (profile?.assigned_office_id && data.office_id !== profile.assigned_office_id) {
                toast.error(
                    language === 'mr'
                        ? 'हे टोकन दुसर्‍या कार्यालयाचे आहे'
                        : `Wrong Office. Token is for: ${data.office_name || 'Unknown'}`
                );
                setIsSearching(false);
                return;
            }

            // SAFETY: Handle profiles array/object return from join logic simulation
            const safeData = {
                ...data,
                profiles: data.profiles
            };

            setScannedToken(safeData);
        } catch (error: any) {
            console.error('Search error:', error);
            toast.error(language === 'mr' ? 'टोकन सापडले नाही किंवा आजचे नाही' : 'Token not found or not for today');
        } finally {
            setIsSearching(false);
        }
    };

    // Step 2: Check-In & Redirect
    const handleCheckIn = async () => {
        if (!scannedToken) return;

        try {
            await checkInMutation.mutateAsync(scannedToken.id);
            // On success, clear and allow next scan
            setScannedToken(null);
            setTokenInput('');
            toast.success("Token added to queue!");
        } catch (error: any) {
            // Error handled by hook toast usually, but let's be safe
            // toast.error(error.message);
        }
    };

    const handleReject = () => {
        toast.info("Feature to markup rejection reasoning would go here.");
        setScannedToken(null);
        setTokenInput('');
    };

    // Helper to render documents
    const renderDocuments = () => {
        if (!scannedToken.document_urls || Object.keys(scannedToken.document_urls).length === 0) {
            return <p className="text-muted-foreground text-sm italic">No documents uploaded.</p>;
        }

        return (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-2">
                {Object.entries(scannedToken.document_urls).map(([name, url]: [string, any]) => (
                    <a
                        key={name}
                        href={url}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center p-3 border rounded-lg hover:bg-muted transition-colors group"
                    >
                        <FileText className="h-5 w-5 text-primary mr-3" />
                        <span className="flex-1 font-medium truncate">{name}</span>
                        <ExternalLink className="h-4 w-4 text-muted-foreground group-hover:text-primary" />
                    </a>
                ))}
            </div>
        );
    };

    return (
        <OfficialLayout>
            <div className="p-4 md:p-6 lg:p-8 space-y-6 max-w-4xl mx-auto">
                <div className="text-center mb-8">
                    <h1 className="text-2xl font-bold text-foreground">
                        {language === 'mr' ? 'चेक-इन स्कॅनर' : 'Check-In Scanner'}
                    </h1>
                    <p className="text-muted-foreground mt-1">
                        {language === 'mr' ? 'टोकन स्कॅन करा किंवा शोधा' : 'Scan QR code or enter token number'}
                    </p>
                </div>

                {/* SEARCH & SCAN SECTION */}
                <Card variant="elevated" className="overflow-hidden">
                    <CardContent className="p-6 md:p-8 space-y-6">
                        {/* QR Scanner Area */}
                        {showScanner ? (
                            <div className="max-w-sm mx-auto bg-black rounded-lg overflow-hidden">
                                <div id="reader" className="w-full"></div>
                                <Button variant="destructive" className="w-full rounded-none" onClick={() => setShowScanner(false)}>
                                    Cancel Scan
                                </Button>
                            </div>
                        ) : (
                            <div className="flex justify-center">
                                <Button size="lg" variant="outline" className="gap-2 h-16 px-8 text-lg border-dashed border-2" onClick={() => setShowScanner(true)}>
                                    <Camera className="h-6 w-6" />
                                    Scan QR Code
                                </Button>
                            </div>
                        )}

                        <div className="relative flex items-center gap-4 my-4">
                            <div className="flex-grow h-px bg-border"></div>
                            <span className="text-muted-foreground text-sm uppercase">OR</span>
                            <div className="flex-grow h-px bg-border"></div>
                        </div>

                        <div className="flex flex-col md:flex-row gap-4 items-center">
                            <div className="relative w-full">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                                <Input
                                    placeholder={language === 'mr' ? 'टोकन क्रमांक (उदा. OFF-1202-001)' : 'Enter Token Number (e.g. OFF-1202-001)'}
                                    value={tokenInput}
                                    onChange={(e) => setTokenInput(e.target.value.toUpperCase())}
                                    onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                                    className="pl-10 h-12 text-lg font-mono uppercase"
                                />
                            </div>
                            <Button
                                size="lg"
                                onClick={() => handleSearch()}
                                disabled={isSearching || !tokenInput}
                                className="w-full md:w-auto min-w-[120px]"
                            >
                                {isSearching ? <Loader2 className="animate-spin" /> : language === 'mr' ? 'शोधा' : 'Search'}
                            </Button>
                        </div>
                    </CardContent>
                </Card>

                {/* RESULT PREVIEW */}
                {scannedToken && (
                    <div className="grid md:grid-cols-2 gap-6 animate-fade-in">
                        {/* Token Details */}
                        <Card variant="elevated">
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <ShieldCheck className="h-5 w-5 text-primary" />
                                    {language === 'mr' ? 'टोकन तपशील' : 'Token Details'}
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="p-4 bg-primary/5 rounded-xl border border-primary/20">
                                    <p className="text-sm text-muted-foreground uppercase tracking-wider">Token Number</p>
                                    <p className="text-3xl font-bold text-primary font-mono">{scannedToken.token_number}</p>
                                </div>
                                <div className="grid grid-cols-2 gap-4 text-sm">
                                    <div>
                                        <p className="text-muted-foreground">Status</p>
                                        <p className="font-medium uppercase">{scannedToken.status}</p>
                                    </div>
                                    <div>
                                        <p className="text-muted-foreground">Date</p>
                                        <p className="font-medium">{scannedToken.appointment_date}</p>
                                    </div>
                                    <div className="col-span-2">
                                        <p className="text-muted-foreground">Visitor Name</p>
                                        <p className="font-medium text-lg">{scannedToken.profiles?.full_name || 'N/A'}</p>
                                    </div>
                                    <div className="col-span-2">
                                        <p className="text-muted-foreground">Service</p>
                                        <p className="font-medium text-lg">{scannedToken.service_name}</p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Documents & Action */}
                        <Card variant="elevated" className="flex flex-col">
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <FileText className="h-5 w-5 text-primary" />
                                    {language === 'mr' ? 'कागदपत्रे' : 'Uploaded Documents'}
                                </CardTitle>
                                <CardDescription>
                                    Confirm visitor utility before checking in. Verification happens next.
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="flex-1 flex flex-col">
                                <div className="flex-1 mb-6">
                                    {renderDocuments()}
                                </div>

                                <div className="border-t pt-6 grid grid-cols-2 gap-4">
                                    <Button
                                        variant="outline"
                                        className="w-full text-destructive hover:text-destructive hover:bg-destructive/10"
                                        onClick={handleReject}
                                    >
                                        <XCircle className="mr-2 h-4 w-4" />
                                        {language === 'mr' ? 'नाकारा' : 'Reject'}
                                    </Button>
                                    <Button
                                        className="w-full bg-primary hover:bg-primary/90 text-white"
                                        onClick={handleCheckIn}
                                        disabled={checkInMutation.isPending}
                                    >
                                        {checkInMutation.isPending ? <Loader2 className="animate-spin" /> :
                                            <>
                                                <CheckCircle className="mr-2 h-4 w-4" />
                                                {language === 'mr' ? 'चेक-इन करा' : 'Check-In'}
                                            </>
                                        }
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                )}
            </div>
        </OfficialLayout>
    );
};

export default ScanPage;
