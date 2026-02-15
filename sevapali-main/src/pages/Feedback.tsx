import React, { useState, useEffect } from 'react';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Star, Send, MessageSquare, Clock, CheckCircle, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface FeedbackItem {
  id: string;
  category: string;
  subject: string;
  message: string;
  rating: number | null;
  status: string;
  created_at: string;
}

const Feedback: React.FC = () => {
  const { language } = useLanguage();
  const { user, role, isAuthenticated } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [feedbackList, setFeedbackList] = useState<FeedbackItem[]>([]);
  const [formData, setFormData] = useState({
    category: '',
    subject: '',
    message: '',
    rating: 0,
    office_id: '',
    service_name: '',
  });

  const categories = [
    { id: 'general', name: language === 'mr' ? 'सामान्य' : 'General' },
    { id: 'service', name: language === 'mr' ? 'सेवा' : 'Service Quality' },
    { id: 'app', name: language === 'mr' ? 'अ‍ॅप' : 'App Experience' },
    { id: 'suggestion', name: language === 'mr' ? 'सूचना' : 'Suggestion' },
    { id: 'complaint', name: language === 'mr' ? 'तक्रार' : 'Complaint' },
  ];

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }
    fetchFeedback();
  }, [isAuthenticated, navigate]);

  const fetchFeedback = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('feedback' as any)
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setFeedbackList((data as any) || []);
    } catch (error) {
      console.error('Error fetching feedback:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !role) return;

    if (!formData.category || !formData.subject || !formData.message) {
      toast({
        title: language === 'mr' ? 'त्रुटी' : 'Error',
        description: language === 'mr' ? 'कृपया सर्व फील्ड भरा' : 'Please fill all fields',
        variant: 'destructive',
      });
      return;
    }

    setSubmitting(true);
    try {
      const { error } = await supabase.from('feedback' as any).insert({
        user_id: user.id,
        user_role: role,
        category: formData.category,
        subject: formData.subject,
        message: formData.message,
        rating: formData.rating || null,
        office_id: formData.office_id === 'general' ? null : formData.office_id, // Handle 'general' as null
        service_name: formData.service_name === 'general' ? null : formData.service_name,
      });

      if (error) throw error;

      toast({
        title: language === 'mr' ? 'यशस्वी!' : 'Success!',
        description: language === 'mr' ? 'तुमचा अभिप्राय सबमिट झाला' : 'Your feedback has been submitted',
      });

      setFormData({
        category: '',
        subject: '',
        message: '',
        rating: 0,
        office_id: '',
        service_name: ''
      });
      fetchFeedback();
    } catch (error) {
      console.error('Error submitting feedback:', error);
      toast({
        title: language === 'mr' ? 'त्रुटी' : 'Error',
        description: language === 'mr' ? 'अभिप्राय सबमिट करताना त्रुटी' : 'Failed to submit feedback',
        variant: 'destructive',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="secondary"><Clock className="h-3 w-3 mr-1" />{language === 'mr' ? 'प्रलंबित' : 'Pending'}</Badge>;
      case 'reviewed':
        return <Badge variant="outline" className="bg-blue-100 text-blue-800 border-blue-200"><CheckCircle className="h-3 w-3 mr-1" />{language === 'mr' ? 'पुनरावलोकन केले' : 'Reviewed'}</Badge>;
      case 'resolved':
        return <Badge variant="default" className="bg-green-100 text-green-800 border-green-200"><CheckCircle className="h-3 w-3 mr-1" />{language === 'mr' ? 'निराकरण' : 'Resolved'}</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto px-4 pt-28 pb-20">
        <div className="text-center mb-12">
          <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
            {language === 'mr' ? 'अभिप्राय द्या' : 'Give Feedback'}
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            {language === 'mr'
              ? 'आमच्या सेवा सुधारण्यासाठी तुमचा अभिप्राय महत्त्वाचा आहे'
              : 'Your feedback is valuable to improve our services'}
          </p>
        </div>

        <div className="grid lg:grid-cols-2 gap-8 max-w-6xl mx-auto">
          {/* Feedback Form */}
          <Card variant="feature">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5 text-primary" />
                {language === 'mr' ? 'नवीन अभिप्राय' : 'New Feedback'}
              </CardTitle>
              <CardDescription>
                {language === 'mr' ? 'तुमचे विचार आमच्याशी शेअर करा' : 'Share your thoughts with us'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>{language === 'mr' ? 'कार्यालय निवडा' : 'Select Office'}</Label>
                    <Select
                      value={formData.office_id}
                      onValueChange={(value) => setFormData({ ...formData, office_id: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder={language === 'mr' ? 'कार्यालय' : 'Office'} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="general">{language === 'mr' ? 'सामान्य (कोणतेही नाही)' : 'General (None)'}</SelectItem>
                        {/* Mock Offices for now, in real app fetch from DB */}
                        <SelectItem value="rto-pune">RTO Pune</SelectItem>
                        <SelectItem value="mc-mumbai">Municipal Corp Mumbai</SelectItem>
                        <SelectItem value="collector-thane">Collector Office Thane</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>{language === 'mr' ? 'सेवा निवडा' : 'Select Service'}</Label>
                    <Select
                      value={formData.service_name}
                      onValueChange={(value) => setFormData({ ...formData, service_name: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder={language === 'mr' ? 'सेवा' : 'Service'} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="general">{language === 'mr' ? 'सामान्य' : 'General'}</SelectItem>
                        <SelectItem value="license">Driving License</SelectItem>
                        <SelectItem value="birth-cert">Birth Certificate</SelectItem>
                        <SelectItem value="income-cert">Income Certificate</SelectItem>
                        <SelectItem value="property-tax">Property Tax</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>{language === 'mr' ? 'श्रेणी' : 'Category'}</Label>
                  <Select
                    value={formData.category}
                    onValueChange={(value) => setFormData({ ...formData, category: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={language === 'mr' ? 'श्रेणी निवडा' : 'Select category'} />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map((cat) => (
                        <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>{language === 'mr' ? 'विषय' : 'Subject'}</Label>
                  <Input
                    placeholder={language === 'mr' ? 'अभिप्रायाचा विषय' : 'Feedback subject'}
                    value={formData.subject}
                    onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label>{language === 'mr' ? 'संदेश' : 'Message'}</Label>
                  <Textarea
                    placeholder={language === 'mr' ? 'तुमचा अभिप्राय येथे लिहा...' : 'Write your feedback here...'}
                    value={formData.message}
                    onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                    rows={4}
                  />
                </div>

                <div className="space-y-2">
                  <Label>{language === 'mr' ? 'रेटिंग (पर्यायी)' : 'Rating (Optional)'}</Label>
                  <div className="flex gap-1">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        type="button"
                        key={star}
                        onClick={() => setFormData({ ...formData, rating: star })}
                        className="p-1 hover:scale-110 transition-transform"
                      >
                        <Star
                          className={`h-8 w-8 ${star <= formData.rating
                            ? 'fill-yellow-400 text-yellow-400'
                            : 'text-muted-foreground'
                            }`}
                        />
                      </button>
                    ))}
                  </div>
                </div>

                {/* AI Sentiment Analysis Preview */}
                {formData.message.length > 10 && (
                  <div className="bg-muted p-3 rounded-lg text-sm flex items-center gap-2 animate-in fade-in slide-in-from-bottom-2">
                    <span className="text-xl">🧠</span>
                    <div>
                      <p className="font-semibold text-primary">
                        {language === 'mr' ? 'AI विश्लेषण' : 'AI Analysis'}:
                      </p>
                      <p className="text-muted-foreground">
                        {formData.message.toLowerCase().includes('good') || formData.message.toLowerCase().includes('great') || formData.rating > 3
                          ? (language === 'mr' ? 'आम्हाला तुमचा सकारात्मक अनुभव ऐकून आनंद झाला!' : 'We are glad to hear about your positive experience!')
                          : (language === 'mr' ? 'आम्ही या समस्येची दखल घेऊ आणि सुधारणा करू.' : 'We adhere to your concern and will improve.')}
                      </p>
                    </div>
                  </div>
                )}

                <Button type="submit" className="w-full" disabled={submitting}>
                  {submitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      {language === 'mr' ? 'सबमिट करत आहे...' : 'Submitting...'}
                    </>
                  ) : (
                    <>
                      <Send className="mr-2 h-4 w-4" />
                      {language === 'mr' ? 'अभिप्राय सबमिट करा' : 'Submit Feedback'}
                    </>
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* Community Insights Side Panel (Mocked) */}
          <div className="space-y-6">
            <Card className="bg-primary/5 border-primary/20">
              <CardHeader>
                <CardTitle className="text-lg">
                  {language === 'mr' ? 'जनतेचा आवाज' : 'Community Pulse'}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Satff Behavior</span>
                  <Badge variant="outline" className="text-green-600 border-green-200 bg-green-50">85% Positive</Badge>
                </div>
                <div className="w-full bg-background h-2 rounded-full overflow-hidden">
                  <div className="bg-green-500 h-full w-[85%]"></div>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Waiting Time</span>
                  <Badge variant="destructive">Wait times High</Badge>
                </div>
                <div className="w-full bg-background h-2 rounded-full overflow-hidden">
                  <div className="bg-red-500 h-full w-[60%]"></div>
                </div>

                <p className="text-xs text-muted-foreground pt-2">
                  {language === 'mr'
                    ? 'AI द्वारे गेल्या २४ तासांतील ३४०+ अभिप्रायांचे विश्लेषण.'
                    : 'Analyzed from 340+ feedbacks in last 24h by AI.'}
                </p>
              </CardContent>
            </Card>

            {/* Previous Feedback List */}
            <div className="space-y-4">
              <h2 className="text-xl font-semibold">
                {language === 'mr' ? 'तुमचे मागील अभिप्राय' : 'Your Previous Feedback'}
              </h2>

              {loading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : feedbackList.length === 0 ? (
                <Card variant="feature" className="py-8">
                  <CardContent className="text-center text-muted-foreground">
                    <MessageSquare className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>{language === 'mr' ? 'अद्याप कोणताही अभिप्राय नाही' : 'No feedback submitted yet'}</p>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-4 max-h-[600px] overflow-y-auto pr-2">
                  {feedbackList.map((item) => (
                    <Card key={item.id} variant="feature">
                      <CardContent className="pt-4">
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <h3 className="font-semibold">{item.subject}</h3>
                            <p className="text-sm text-muted-foreground">
                              {categories.find(c => c.id === item.category)?.name} • {new Date(item.created_at).toLocaleDateString()}
                            </p>
                          </div>
                          {getStatusBadge(item.status)}
                        </div>
                        <p className="text-sm text-muted-foreground mb-2">{item.message}</p>
                        {item.rating && (
                          <div className="flex gap-0.5">
                            {[1, 2, 3, 4, 5].map((star) => (
                              <Star
                                key={star}
                                className={`h-4 w-4 ${star <= item.rating!
                                  ? 'fill-yellow-400 text-yellow-400'
                                  : 'text-muted-foreground'
                                  }`}
                              />
                            ))}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </main >
      <Footer />
    </div >
  );
};

export default Feedback;
