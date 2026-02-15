import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CheckCircle2, AlertTriangle, FileText, ArrowRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const AIAdvisor = () => {
    const [step, setStep] = useState(0);
    const [service, setService] = useState('');
    const [eligibilityStatus, setEligibilityStatus] = useState<'idle' | 'checking' | 'eligible' | 'not-eligible'>('idle');

    const handleStart = () => setStep(1);

    const handleCheckEligibility = () => {
        setEligibilityStatus('checking');
        setTimeout(() => {
            // Mock logic
            if (service) {
                setEligibilityStatus('eligible');
                setStep(2);
            }
        }, 1500);
    };

    const services = [
        { id: 'dl_renewal', name: 'Driving License Renewal' },
        { id: 'income_cert', name: 'Income Certificate' },
        { id: 'passport', name: 'Passport Application' },
    ];

    const requiredDocs = [
        "Aadhaar Card",
        "Previous License",
        "Passport Size Photo"
    ];

    return (
        <div className="max-w-2xl mx-auto p-4">
            <Card className="border-t-4 border-t-primary shadow-lg">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <span className="text-2xl">🤖</span> AI Service Advisor
                    </CardTitle>
                    <CardDescription>
                        "Should you visit?" - Let me check your eligibility before you book.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <AnimatePresence mode="wait">
                        {step === 0 && (
                            <motion.div
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: 20 }}
                                key="step0"
                                className="space-y-4"
                            >
                                <p className="text-muted-foreground">
                                    I can help you determine if you have all the necessary documents and meet the criteria for your desired service.
                                    This saves you a wasted trip!
                                </p>
                                <Button onClick={handleStart} className="w-full">Start Eligibility Check <ArrowRight className="ml-2 h-4 w-4" /></Button>
                            </motion.div>
                        )}

                        {step === 1 && (
                            <motion.div
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: 20 }}
                                key="step1"
                                className="space-y-4"
                            >
                                <div className="space-y-2">
                                    <label className="text-sm font-medium">Select Service</label>
                                    <Select onValueChange={setService}>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Choose a service..." />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {services.map(s => (
                                                <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>

                                {service && (
                                    <div className="bg-muted/50 p-4 rounded-md space-y-2">
                                        <p className="text-sm font-semibold flex items-center gap-2">
                                            <FileText className="h-4 w-4 text-primary" /> Required Documents:
                                        </p>
                                        <ul className="list-disc list-inside text-sm text-muted-foreground ml-2">
                                            {requiredDocs.map(doc => <li key={doc}>{doc}</li>)}
                                        </ul>
                                    </div>
                                )}

                                <Button
                                    onClick={handleCheckEligibility}
                                    disabled={!service || eligibilityStatus === 'checking'}
                                    className="w-full"
                                >
                                    {eligibilityStatus === 'checking' ? 'Analyzing...' : 'Check My Eligibility'}
                                </Button>
                            </motion.div>
                        )}

                        {step === 2 && eligibilityStatus === 'eligible' && (
                            <motion.div
                                initial={{ opacity: 0, scale: 0.9 }}
                                animate={{ opacity: 1, scale: 1 }}
                                key="step2"
                                className="text-center space-y-4 py-6"
                            >
                                <div className="flex justify-center mb-4">
                                    <div className="h-16 w-16 bg-green-100 rounded-full flex items-center justify-center">
                                        <CheckCircle2 className="h-8 w-8 text-green-600" />
                                    </div>
                                </div>
                                <h3 className="text-xl font-bold text-green-700">You are Ready to Visit!</h3>
                                <p className="text-muted-foreground">
                                    You have all required documents for <strong>{services.find(s => s.id === service)?.name}</strong>.
                                </p>
                                <div className="flex gap-2 justify-center pt-4">
                                    <Button variant="outline" onClick={() => setStep(0)}>Check Another</Button>
                                    <Button onClick={() => window.location.href = '/citizen/book-token'}>Proceed to Bonding</Button>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </CardContent>
            </Card>
        </div>
    );
};

export default AIAdvisor;
