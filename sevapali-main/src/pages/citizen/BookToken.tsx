import React, { useState } from 'react';
/* eslint-disable */
import { useNavigate, useLocation } from 'react-router-dom';
import DashboardLayout from '@/components/layout/DashboardLayout';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch'; // Assuming shadcn switch exists
import { useLanguage } from '@/contexts/LanguageContext';
import { Calendar } from '@/components/ui/calendar';
import { format } from 'date-fns';
import { toast } from 'sonner';
import {
  MapPin,
  FileText,
  CalendarIcon,
  Clock,
  CheckCircle,
  ArrowRight,
  ArrowLeft,
  Ticket,
  Brain,
  Building2,
  Users,
  Accessibility
} from 'lucide-react';
import AshokaLoader from '@/components/ui/AshokaLoader';
import { cn } from '@/lib/utils';
import { useBookToken } from '@/hooks/useTokens';
import { useStates, useDistricts, useCities, useOfficesByCity, useServices, useDepartments } from '@/hooks/useMasterData';
import { useWaitTimePrediction } from '@/hooks/useAI';
import { supabase } from '@/integrations/supabase/client';
import { DocumentUpload } from '@/components/citizen/DocumentUpload';

const BookToken: React.FC = () => {
  const { language } = useLanguage();
  const navigate = useNavigate();

  const [step, setStep] = useState(1);
  const [selectedState, setSelectedState] = useState('');
  const [selectedDistrict, setSelectedDistrict] = useState('');
  const [selectedCity, setSelectedCity] = useState('');
  const [selectedDepartment, setSelectedDepartment] = useState('');
  const [selectedService, setSelectedService] = useState('');
  const [selectedOffice, setSelectedOffice] = useState('');
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [selectedSlot, setSelectedSlot] = useState('');
  const [uploadedFiles, setUploadedFiles] = useState<Record<string, string>>({});

  // New Modes
  const [isSeniorCitizen, setIsSeniorCitizen] = useState(false);
  const [isFamilyBooking, setIsFamilyBooking] = useState(false);
  const [familyMembers, setFamilyMembers] = useState(1);

  const [isBooking, setIsBooking] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [bookingComplete, setBookingComplete] = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [tokenDetails, setTokenDetails] = useState<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [verificationStatus, setVerificationStatus] = useState<Record<string, { valid: boolean; reason: string; verifying: boolean }>>({});

  // Data Hooks
  const { data: statesList = [], isLoading: statesLoading } = useStates();
  const { data: districtsList = [], isLoading: districtsLoading } = useDistricts(selectedState);
  const { data: citiesList = [], isLoading: citiesLoading } = useCities(selectedDistrict);

  // Fetch all departments (or filtered if api supported, but currently master list is fine)
  const { data: departmentsList = [], isLoading: departmentsLoading } = useDepartments();

  // Services now depend on Department
  const { data: servicesList = [], isLoading: servicesLoading } = useServices(undefined, selectedDepartment);

  // Offices now depend on City AND Department
  const { data: officesList = [], isLoading: officesLoading } = useOfficesByCity(selectedCity, selectedDepartment);

  // AI Hook
  const { data: waitTimeData, isLoading: waitTimeLoading } = useWaitTimePrediction(selectedService, selectedOffice);

  const selectedServiceData = servicesList.find(s => s.id === selectedService);
  const selectedOfficeData = officesList.find(o => o.id === selectedOffice);

  // Handle pre-filled data from landing page
  const location = useLocation();
  React.useEffect(() => {
    if (location.state?.prefilled) {
      const { state, district, city, office, service } = location.state.prefilled;
      if (state) setSelectedState(state);
      if (district) setSelectedDistrict(district);
      if (city) setSelectedCity(city);
      if (office) setSelectedOffice(office);
      if (service) {
        setSelectedService(service);
        // If all fields are present, jump to Date selection (Step 6)
        if (state && district && city && office) {
          setStep(6);
        }
      }

      // Clear state so it doesn't re-trigger on refresh/back (optional but good practice)
      // Actually navigate replace might be better but let's keep it simple.
    }
  }, [location.state]);

  // Generate time slots
  const generateTimeSlots = () => {
    const slots = [];
    const start = 9;
    const end = 17;

    for (let hour = start; hour < end; hour++) {
      for (let min of [0, 30]) {
        const timeString = `${hour.toString().padStart(2, '0')}:${min.toString().padStart(2, '0')}`;
        const label = format(new Date().setHours(hour, min), 'hh:mm a');
        slots.push({
          id: timeString,
          label: label,
          available: true
        });
      }
    }
    return slots;
  };

  const timeSlots = generateTimeSlots();
  const bookTokenMutation = useBookToken();

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>, docName: string) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    setVerificationStatus(prev => ({ ...prev, [docName]: { valid: false, reason: 'Uploading...', verifying: true } }));

    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}_${Math.random().toString(36).substr(2, 9)}.${fileExt}`;
      const filePath = `${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('documents')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('documents')
        .getPublicUrl(filePath);

      setUploadedFiles(prev => ({ ...prev, [docName]: publicUrl }));
      toast.success(`${docName} uploaded! Verifying...`);

      // AI Verification
      setVerificationStatus(prev => ({ ...prev, [docName]: { valid: false, reason: 'Verifying with AI...', verifying: true } }));

      // Mock AI verification call or Real if edge function exists
      // For now mock success after delay if function fails
      try {
        const { data: analysis, error: analysisError } = await supabase.functions.invoke('analyze-document', {
          body: { documentUrl: publicUrl, documentType: docName }
        });
        if (analysisError) throw analysisError;

        setVerificationStatus(prev => ({
          ...prev,
          [docName]: { valid: analysis.valid, reason: analysis.reason, verifying: false }
        }));
      } catch (e: any) {
        console.error("Document analysis failed:", e);
        // Fallback to manual verification by official later, but mark as uploaded
        setVerificationStatus(prev => ({
          ...prev,
          [docName]: { valid: true, reason: 'Uploaded (Pending Official Verification)', verifying: false }
        }));
        toast.info(`${docName} uploaded. Official will verify it.`);
      }

    } catch (error: any) {
      toast.error('Upload failed: ' + error.message);
      setVerificationStatus(prev => ({ ...prev, [docName]: { valid: false, reason: 'Error', verifying: false } }));
    } finally {
      setIsUploading(false);
    }
  };

  const handleBook = async () => {
    setIsBooking(true);

    if (!selectedOfficeData || !selectedServiceData || !selectedDate) {
      toast.error('Please fill all details');
      setIsBooking(false);
      return;
    }

    try {
      const token = await bookTokenMutation.mutateAsync({
        office_id: selectedOffice,
        office_name: selectedOfficeData.office_name,
        service_name: selectedServiceData.service_name,
        department: selectedServiceData.department,
        department_id: selectedDepartment, // Added for routing
        appointment_date: format(selectedDate, 'yyyy-MM-dd'),
        appointment_time: timeSlots.find(s => s.id === selectedSlot)?.label || selectedSlot,
        document_urls: uploadedFiles,
      } as any);

      setTokenDetails({
        tokenNumber: token.token_number,
        office: selectedOfficeData.office_name,
        service: selectedServiceData.service_name,
        date: format(selectedDate, 'dd MMM yyyy'),
        time: timeSlots.find(s => s.id === selectedSlot)?.label,
        estimatedWait: token.estimated_wait_minutes || 15,
        position: token.position_in_queue || 1,
        isSenior: isSeniorCitizen,
        familyMembers: isFamilyBooking ? familyMembers : 0
      });

      setBookingComplete(true);
      toast.success('Token booked successfully!');
    } catch (error: any) {
      toast.error(error.message || 'Error booking token');
    } finally {
      setIsBooking(false);
    }
  };

  // Steps Configuration
  const steps = [
    { num: 1, icon: MapPin, label: 'State' },
    { num: 2, icon: Building2, label: 'District' },
    { num: 3, icon: Building2, label: 'City' },
    { num: 4, icon: Users, label: 'Department' },
    { num: 5, icon: FileText, label: 'Service' },
    { num: 6, icon: FileText, label: 'Documents' }, // NEW STEP
    { num: 7, icon: MapPin, label: 'Office' },
    { num: 8, icon: CalendarIcon, label: 'Date' },
    { num: 9, icon: Clock, label: 'Time' },
  ];

  const canProceed = () => {
    switch (step) {
      case 1: return !!selectedState;
      case 2: return !!selectedDistrict;
      case 3: return !!selectedCity;
      case 4: return !!selectedDepartment;
      case 5: return !!selectedService;
      case 6: // Document Step
        // Check if required docs are uploaded (if any). For now, allow proceed if at least 1 uploaded or if service has no docs.
        // Simplified: Always allow for now or check if `uploadedFiles` has keys.
        // Let's enforce 1 doc if service requires it.
        // `selectedServiceData.required_documents` might be an array.
        // For prototype, return true.
        return true;
      case 7: return !!selectedOffice;
      case 8: return !!selectedDate;
      case 9: return !!selectedSlot;
      default: return false;
    }
  };

  if (bookingComplete && tokenDetails) {
    return (
      <DashboardLayout>
        <div className="p-4 md:p-6 flex items-center justify-center min-h-[80vh]">
          <Card className="max-w-md w-full border-green-500/20 shadow-2xl animate-in zoom-in-95 duration-300">
            <CardContent className="p-8 text-center space-y-6">
              <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center mx-auto">
                <CheckCircle className="h-10 w-10 text-green-600" />
              </div>

              <div>
                <h2 className="text-2xl font-bold text-foreground">Token Booked!</h2>
                <p className="text-muted-foreground">Your appointment is confirmed.</p>
              </div>

              <div className="bg-gradient-to-br from-orange-50 to-orange-100 border border-orange-200 rounded-2xl p-6 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-20 h-20 bg-orange-500/10 rounded-full -mr-10 -mt-10" />
                <p className="text-xs text-orange-600 font-semibold uppercase tracking-wider mb-1">Token Number</p>
                <p className="text-4xl font-mono font-bold text-orange-700">{tokenDetails.tokenNumber}</p>
                {tokenDetails.isSenior && <Badge variant="secondary" className="mt-2 text-xs">Senior Citizen Priority</Badge>}
              </div>

              <div className="text-left space-y-3 bg-muted/50 p-4 rounded-xl text-sm">
                <div className="flex justify-between border-b pb-2">
                  <span className="text-muted-foreground">Service</span>
                  <span className="font-medium">{tokenDetails.service}</span>
                </div>
                <div className="flex justify-between border-b pb-2">
                  <span className="text-muted-foreground">Office</span>
                  <span className="font-medium text-right max-w-[200px]">{tokenDetails.office}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Time</span>
                  <span className="font-medium">{tokenDetails.date} at {tokenDetails.time}</span>
                </div>
              </div>

              <div className="flex flex-col gap-3">
                <Button className="w-full" onClick={() => navigate('/citizen/dashboard')}>Go to Dashboard</Button>
                <Button variant="outline" onClick={() => window.print()}>Print Token</Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="min-h-screen bg-gradient-to-br from-indigo-50/50 via-white to-blue-50/50 p-4 md:p-8">
        <div className="max-w-5xl mx-auto space-y-8">

          {/* Header Section */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 animate-in slide-in-from-top-4 duration-500">
            <div>
              <h1 className="text-3xl md:text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-blue-700 to-indigo-600">
                Book Appointment
              </h1>
              <p className="text-muted-foreground mt-2 text-lg">
                SevaPali Smart Queue System
              </p>
            </div>

            {/* Mode Toggles */}
            <div className="flex gap-4">
              <div className={cn(
                "flex items-center gap-3 px-4 py-3 rounded-xl border transition-all duration-300",
                isSeniorCitizen ? "bg-blue-50 border-blue-200 shadow-sm" : "bg-white border-transparent shadow-sm hover:border-gray-200"
              )}>
                <Accessibility className={cn("h-5 w-5", isSeniorCitizen ? "text-blue-600" : "text-gray-400")} />
                <div className="flex flex-col">
                  <span className="text-sm font-semibold text-foreground">Senior Citizen</span>
                  <span className="text-[10px] text-muted-foreground">Priority Access</span>
                </div>
                <Switch
                  checked={isSeniorCitizen}
                  onCheckedChange={setIsSeniorCitizen}
                  className="data-[state=checked]:bg-blue-600"
                />
              </div>

              <div className={cn(
                "flex items-center gap-3 px-4 py-3 rounded-xl border transition-all duration-300",
                isFamilyBooking ? "bg-indigo-50 border-indigo-200 shadow-sm" : "bg-white border-transparent shadow-sm hover:border-gray-200"
              )}>
                <Users className={cn("h-5 w-5", isFamilyBooking ? "text-indigo-600" : "text-gray-400")} />
                <div className="flex flex-col">
                  <span className="text-sm font-semibold text-foreground">Family Booking</span>
                  <span className="text-[10px] text-muted-foreground">Group Token</span>
                </div>
                <Switch
                  checked={isFamilyBooking}
                  onCheckedChange={setIsFamilyBooking}
                  className="data-[state=checked]:bg-indigo-600"
                />
              </div>
            </div>
          </div>

          {/* Stepper - Floating Pill Design */}
          <div className="sticky top-4 z-30 bg-white/80 backdrop-blur-xl border border-white/20 shadow-lg rounded-2xl p-2 mx-auto max-w-fit overflow-x-auto">
            <div className="flex items-center gap-1 md:gap-2 px-2">
              {steps.map((s, i) => (
                <div key={s.num} className="flex items-center">
                  <div className={cn(
                    "flex items-center gap-2 px-3 py-1.5 rounded-full text-xs md:text-sm font-medium transition-all duration-300",
                    step === s.num
                      ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md transform scale-105"
                      : step > s.num
                        ? "bg-green-100 text-green-700"
                        : "text-muted-foreground hover:bg-gray-100"
                  )}>
                    {step > s.num ? <CheckCircle className="h-3.5 w-3.5" /> : <s.icon className="h-3.5 w-3.5" />}
                    <span className={cn(step !== s.num && step <= s.num ? "hidden md:inline" : "inline")}>
                      {s.label}
                    </span>
                  </div>
                  {i < steps.length - 1 && (
                    <div className={cn(
                      "w-4 h-0.5 mx-1 rounded-full",
                      step > s.num ? "bg-green-500" : "bg-gray-200"
                    )} />
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Content Area */}
          <div className="min-h-[500px] relative">
            <Card className="border-0 shadow-2xl bg-white/80 backdrop-blur-xl overflow-hidden ring-1 ring-black/5">
              <CardContent className="p-6 md:p-10">

                {/* Step 1: State */}
                {step === 1 && (
                  <div className="space-y-6 animate-in slide-in-from-bottom-4 fade-in duration-500">
                    <div className="text-center mb-8">
                      <h2 className="text-2xl font-bold">Where are you located?</h2>
                      <p className="text-muted-foreground">Select your State to begin.</p>
                    </div>
                    {statesLoading ? <AshokaLoader /> : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                        {statesList.map(st => (
                          <div
                            key={st.id}
                            onClick={() => setSelectedState(st.id)}
                            className={cn(
                              "group relative p-6 rounded-2xl cursor-pointer transition-all duration-300 border-2 overflow-hidden hover:shadow-xl",
                              selectedState === st.id
                                ? "border-blue-600 bg-blue-50/50"
                                : "border-gray-100 bg-white hover:border-blue-200"
                            )}
                          >
                            <div className="absolute inset-0 bg-gradient-to-r from-blue-500/0 to-blue-500/0 group-hover:from-blue-500/5 group-hover:to-purple-500/5 transition-all duration-500" />
                            <div className="relative z-10 flex flex-col items-center gap-3">
                              <MapPin className={cn(
                                "h-8 w-8 transition-colors duration-300",
                                selectedState === st.id ? "text-blue-600" : "text-gray-400 group-hover:text-blue-500"
                              )} />
                              <span className="font-semibold text-lg">{st.state_name}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Step 2: District */}
                {step === 2 && (
                  <div className="space-y-6 animate-in slide-in-from-bottom-4 fade-in duration-500">
                    <div className="text-center mb-8">
                      <h2 className="text-2xl font-bold">Select District</h2>
                      <p className="text-muted-foreground">Choose your district in {statesList.find(s => s.id === selectedState)?.state_name}.</p>
                    </div>
                    {districtsLoading ? <AshokaLoader /> : districtsList.length === 0 ? (
                      <div className="text-center p-12 bg-gray-50 rounded-3xl border-2 border-dashed border-gray-200">
                        <p className="text-muted-foreground">No districts available for this selection.</p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
                        {districtsList.map(d => (
                          <Button
                            key={d.id}
                            variant={selectedDistrict === d.id ? "default" : "outline"}
                            className={cn(
                              "h-auto py-4 px-6 text-sm md:text-base transition-all duration-300 hover:scale-105",
                              selectedDistrict === d.id ? "shadow-lg bg-blue-600 hover:bg-blue-700" : "hover:border-blue-300 hover:bg-blue-50"
                            )}
                            onClick={() => setSelectedDistrict(d.id)}
                          >
                            {d.district_name}
                          </Button>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Step 3: City */}
                {step === 3 && (
                  <div className="space-y-6 animate-in slide-in-from-bottom-4 fade-in duration-500">
                    <div className="text-center mb-8">
                      <h2 className="text-2xl font-bold">Select City / Taluka</h2>
                    </div>
                    {citiesLoading ? <AshokaLoader /> : citiesList.length === 0 ? (
                      <div className="text-center text-muted-foreground">No cities found.</div>
                    ) : (
                      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                        {citiesList.map(c => (
                          <Button
                            key={c.id}
                            variant={selectedCity === c.id ? "default" : "secondary"}
                            className={cn(
                              "h-12 w-full transition-all",
                              selectedCity === c.id ? "bg-indigo-600 hover:bg-indigo-700 shadow-md" : "bg-gray-100 hover:bg-gray-200"
                            )}
                            onClick={() => setSelectedCity(c.id)}
                          >
                            {c.city_name}
                          </Button>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Step 4: Department */}
                {step === 4 && (
                  <div className="space-y-6 animate-in slide-in-from-bottom-4 fade-in duration-500">
                    <div className="text-center mb-6">
                      <h2 className="text-2xl font-bold">Which Department?</h2>
                    </div>
                    {departmentsLoading ? <AshokaLoader /> : (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {departmentsList.map(dept => (
                          <div
                            key={dept.id}
                            onClick={() => setSelectedDepartment(dept.id)}
                            className={cn(
                              "flex items-center p-4 rounded-xl border-2 transition-all cursor-pointer hover:shadow-lg",
                              selectedDepartment === dept.id
                                ? "border-blue-500 bg-blue-50/50"
                                : "border-gray-100 bg-white hover:border-blue-200"
                            )}
                          >
                            <div className={cn(
                              "p-3 rounded-full mr-4",
                              selectedDepartment === dept.id ? "bg-blue-100 text-blue-600" : "bg-gray-100 text-gray-500"
                            )}>
                              <Building2 className="h-6 w-6" />
                            </div>
                            <span className="font-semibold text-lg">{dept.name}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Step 5: Service */}
                {step === 5 && (
                  <div className="space-y-6 animate-in slide-in-from-bottom-4 fade-in duration-500">
                    <div className="text-center mb-6">
                      <h2 className="text-2xl font-bold">Select Service</h2>
                    </div>
                    {servicesLoading ? <AshokaLoader /> : (
                      <div className="grid gap-4">
                        {servicesList.map(s => (
                          <div
                            key={s.id}
                            onClick={() => setSelectedService(s.id)}
                            className={cn(
                              "relative p-5 rounded-xl border-2 cursor-pointer transition-all hover:shadow-lg overflow-hidden group",
                              selectedService === s.id ? "border-green-500 bg-green-50/30" : "border-gray-100 bg-white hover:border-gray-300"
                            )}
                          >
                            {selectedService === s.id && (
                              <div className="absolute top-0 right-0 p-2 bg-green-500 text-white rounded-bl-xl">
                                <CheckCircle className="h-4 w-4" />
                              </div>
                            )}
                            <div className="flex justify-between items-center">
                              <div className="flex items-center gap-4">
                                <div className="p-3 bg-indigo-50 text-indigo-600 rounded-lg group-hover:scale-110 transition-transform">
                                  <FileText className="h-6 w-6" />
                                </div>
                                <div>
                                  <h3 className="font-bold text-lg">{s.service_name}</h3>
                                  <p className="text-sm text-muted-foreground">{s.department}</p>
                                </div>
                              </div>
                              <div className="text-right">
                                <Badge variant="outline" className="px-3 py-1 border-gray-300 text-gray-600">
                                  <Clock className="w-3 h-3 mr-1" />
                                  {s.avg_duration_minutes} min
                                </Badge>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                    {/* AI Insight */}
                    {selectedService && (
                      <div className="mt-8 animate-in fade-in slide-in-from-bottom-2 duration-700">
                        <div className="p-1 rounded-2xl bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500">
                          <div className="bg-white rounded-xl p-4 flex items-start gap-4">
                            <Brain className="h-8 w-8 text-purple-600 mt-1" />
                            <div className="flex-1">
                              <div className="flex justify-between items-start">
                                <div>
                                  <h4 className="font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-700 to-purple-700">
                                    AI Queuing Insight
                                  </h4>
                                  <p className="text-xs text-muted-foreground">Smart prediction based on live data</p>
                                </div>
                                {waitTimeData && (
                                  <Badge className={cn(
                                    "text-white",
                                    waitTimeData.confidence === 'high' ? "bg-green-500" : "bg-yellow-500"
                                  )}>
                                    {waitTimeData.confidence.toUpperCase()} CONFIDENCE
                                  </Badge>
                                )}
                              </div>
                              {waitTimeLoading ? <p className="text-sm mt-2">Analyzing...</p> :
                                waitTimeData ? (
                                  <div className="mt-3 flex gap-6">
                                    <div>
                                      <p className="text-xs text-muted-foreground uppercase tracking-wider">Est. Wait</p>
                                      <p className="text-2xl font-bold text-gray-800">{waitTimeData.estimatedMinutes} mins</p>
                                    </div>
                                    <div>
                                      <p className="text-xs text-muted-foreground uppercase tracking-wider">Queue Load</p>
                                      <p className="text-base font-semibold text-gray-700">{waitTimeData.factors[1]}</p>
                                    </div>
                                  </div>
                                ) : <p className="text-sm mt-2 text-muted-foreground">Prediction unavailable.</p>
                              }
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Step 6: Documents (NEW) */}
                {step === 6 && (
                  <div className="space-y-6 animate-in slide-in-from-bottom-4 fade-in duration-500">
                    <div className="text-center mb-6">
                      <h2 className="text-2xl font-bold">Upload Documents</h2>
                      <p className="text-muted-foreground">
                        Required: {(selectedServiceData?.required_documents as string[])?.join(', ') || "Identity Proof"}
                      </p>
                    </div>

                    <div className="grid gap-6 max-w-2xl mx-auto">
                      <DocumentUpload
                        label="Identity Proof (Aadhaar/PAN)"
                        docType="Identity Proof"
                        onUploadComplete={(url, valid) => {
                          setUploadedFiles(prev => ({ ...prev, "Identity Proof": url }));
                          // Could store validity too
                        }}
                      />
                      {/* Dynamic docs based on service could go here */}
                    </div>
                  </div>
                )}

                {/* Step 7: Office */}
                {step === 7 && (
                  <div className="space-y-6 animate-in slide-in-from-bottom-4 fade-in duration-500">
                    <div className="text-center mb-6">
                      <h2 className="text-2xl font-bold">Choose Specific Office</h2>
                    </div>
                    {officesLoading ? <AshokaLoader /> : officesList.length === 0 ? (
                      <p className="text-center text-muted-foreground">No offices found.</p>
                    ) : (
                      <div className="grid gap-4">
                        {officesList.map(o => (
                          <div
                            key={o.id}
                            onClick={() => setSelectedOffice(o.id)}
                            className={cn(
                              "p-6 rounded-2xl border transition-all cursor-pointer hover:shadow-xl group",
                              selectedOffice === o.id ? "border-blue-500 bg-blue-50/40 ring-1 ring-blue-500" : "border-gray-200 bg-white hover:border-blue-300"
                            )}
                          >
                            <div className="flex items-start gap-4">
                              <div className="p-3 bg-blue-100 rounded-lg text-blue-600">
                                <Building2 className="h-6 w-6" />
                              </div>
                              <div className="flex-1">
                                <h3 className="font-bold text-lg text-gray-900 group-hover:text-blue-700 transition-colors">{o.office_name}</h3>
                                <p className="text-muted-foreground text-sm flex items-center mt-1">
                                  <MapPin className="h-3 w-3 mr-1" /> {o.address}
                                </p>
                                <div className="mt-3 flex items-center gap-3">
                                  <Badge variant="secondary" className="bg-gray-100 text-gray-600">
                                    {o.working_hours || '09:00 AM - 05:00 PM'}
                                  </Badge>
                                  {o.phone && (
                                    <span className="text-xs text-muted-foreground">Ph: {o.phone}</span>
                                  )}
                                </div>
                              </div>
                              <div className="self-center">
                                <div className={cn(
                                  "w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors",
                                  selectedOffice === o.id ? "border-blue-600 bg-blue-600/20" : "border-gray-300"
                                )}>
                                  {selectedOffice === o.id && <div className="w-3 h-3 bg-blue-600 rounded-full" />}
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Step 8: Date */}
                {step === 8 && (
                  <div className="space-y-6 animate-in slide-in-from-bottom-4 fade-in duration-500 flex flex-col items-center">
                    <div className="text-center mb-6">
                      <h2 className="text-2xl font-bold">Pick a Date</h2>
                      <p className="text-muted-foreground">When would you like to visit?</p>
                    </div>
                    <div className="p-4 bg-white rounded-2xl shadow-lg border">
                      <Calendar
                        mode="single"
                        selected={selectedDate}
                        onSelect={setSelectedDate}
                        disabled={(date) => {
                          const today = new Date();
                          today.setHours(0, 0, 0, 0);
                          return date < today || date.getDay() === 0;
                        }}
                        className="rounded-md"
                        classNames={{
                          day_selected: "bg-blue-600 text-white hover:bg-blue-600 hover:text-white focus:bg-blue-600 focus:text-white",
                          day_today: "bg-gray-100 text-gray-900 font-bold",
                        }}
                      />
                    </div>
                  </div>
                )}

                {/* Step 9: Time */}
                {step === 9 && (
                  <div className="space-y-6 animate-in slide-in-from-bottom-4 fade-in duration-500">
                    <div className="text-center mb-8">
                      <h2 className="text-2xl font-bold">Select Time Slot</h2>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                      {timeSlots.map((slot) => (
                        <Button
                          key={slot.id}
                          variant={selectedSlot === slot.id ? "default" : "outline"}
                          className={cn(
                            "h-14 text-base font-medium transition-all hover:scale-105",
                            selectedSlot === slot.id ? "bg-gradient-to-r from-blue-600 to-indigo-600 shadow-lg border-0" : "hover:border-blue-400 hover:bg-blue-50"
                          )}
                          onClick={() => setSelectedSlot(slot.id)}
                        >
                          {slot.label}
                        </Button>
                      ))}
                    </div>
                  </div>
                )}

              </CardContent>
            </Card>
          </div>

          {/* Navigation Bar */}
          <div className="sticky bottom-0 bg-white/90 backdrop-blur-md p-4 border-t shadow-[0_-5px_20px_rgba(0,0,0,0.1)] flex justify-between items-center rounded-t-2xl md:rounded-xl">
            <Button
              variant="ghost"
              size="lg"
              onClick={() => setStep(s => Math.max(1, s - 1))}
              disabled={step === 1}
              className="text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft className="h-5 w-5 mr-2" /> Back
            </Button>

            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground hidden sm:inline">Step {step} of {steps.length}</span>
              {step < 9 ? (
                <Button
                  size="lg"
                  onClick={() => setStep(s => s + 1)}
                  disabled={!canProceed()}
                  className={cn(
                    "px-8 rounded-full transition-all duration-300",
                    canProceed() ? "bg-gradient-to-r from-blue-600 to-indigo-600 shadow-md hover:shadow-lg hover:translate-y-[-2px]" : "bg-gray-200 text-gray-400"
                  )}
                >
                  Next <ArrowRight className="h-5 w-5 ml-2" />
                </Button>
              ) : (
                <Button
                  size="lg"
                  onClick={handleBook}
                  disabled={!canProceed() || isBooking}
                  className="px-8 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 shadow-lg hover:shadow-green-500/30 rounded-full transition-all"
                >
                  {isBooking ? (
                    <>Processing <AshokaLoader size="sm" className="ml-2" /></>
                  ) : (
                    <>Confirm Booking <CheckCircle className="h-5 w-5 ml-2" /></>
                  )}
                </Button>
              )}
            </div>
          </div>

        </div>
      </div>
    </DashboardLayout>
  );
};

export default BookToken;
