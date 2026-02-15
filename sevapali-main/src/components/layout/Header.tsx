import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { Menu, X, Globe, LogOut, User, Bell } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const Header: React.FC = () => {
  const { t, language, setLanguage } = useLanguage();
  const { isAuthenticated, user, logout } = useAuth();
  const location = useLocation();
  const [isMenuOpen, setIsMenuOpen] = React.useState(false);

  const isLandingPage = location.pathname === '/';

  return (
    <header className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${isLandingPage ? 'bg-background/80 backdrop-blur-md border-b border-white/10' : 'bg-background/95 backdrop-blur-xl border-b border-border shadow-sm'
      }`}>
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16 md:h-20">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-3 group">
            <div className="relative w-10 h-10 rounded-xl bg-gradient-to-tr from-orange-500 via-white to-green-500 p-[2px] shadow-lg group-hover:scale-105 transition-transform overflow-hidden">
              <div className="w-full h-full rounded-[10px] bg-background flex items-center justify-center overflow-hidden">
                <img src="/janseva-logo.png" alt="JanSeva Logo" className="w-full h-full object-cover" />
              </div>
            </div>
            <div className="flex flex-col">
              <h1 className={`font-bold text-xl leading-none tracking-tight ${isLandingPage ? 'text-foreground' : 'text-foreground'}`}>
                JanSeva
              </h1>
              <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-medium">
                Queue System
              </p>
            </div>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-8">
            <Link to="/" className="text-sm font-medium hover:text-primary transition-colors">
              {t.nav.home}
            </Link>
            <Link to="/schemes" className="text-sm font-medium hover:text-primary transition-colors">
              {t.nav.schemes}
            </Link>
            <Link to="/about" className="text-sm font-medium hover:text-primary transition-colors">
              {t.nav.about}
            </Link>
          </nav>

          {/* Actions */}
          <div className="flex items-center gap-3">
            {/* Language Selector */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="gap-2 rounded-full border border-border/50 hover:bg-accent/50"
                >
                  <Globe className="h-4 w-4" />
                  <span className="hidden sm:inline font-medium">
                    {language === 'en' ? 'English' : language === 'mr' ? 'मराठी' : language === 'hi' ? 'हिंदी' : language}
                  </span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-[150px]">
                <DropdownMenuItem onClick={() => setLanguage('en')} className="cursor-pointer">🇬🇧 English</DropdownMenuItem>
                <DropdownMenuItem onClick={() => setLanguage('hi')} className="cursor-pointer">🇮🇳 हिंदी</DropdownMenuItem>
                <DropdownMenuItem onClick={() => setLanguage('mr')} className="cursor-pointer">🚩 मराठी</DropdownMenuItem>
                <DropdownMenuItem onClick={() => setLanguage('kn')} className="cursor-pointer">🟡 ಕನ್ನಡ</DropdownMenuItem>
                <DropdownMenuItem onClick={() => setLanguage('te')} className="cursor-pointer">⚪ తెలుగు</DropdownMenuItem>
                <DropdownMenuItem onClick={() => setLanguage('ta')} className="cursor-pointer">🛕 தமிழ்</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {isAuthenticated ? (
              <div className="flex items-center gap-2">
                <Link to="/citizen/notifications">
                  <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground">
                    <Bell className="h-5 w-5" />
                  </Button>
                </Link>
                <Link to={user?.role === 'citizen' ? '/citizen/dashboard' : '/official/dashboard'}>
                  <Button variant="default" size="sm" className="gap-2 shadow-lg shadow-primary/20">
                    <User className="h-4 w-4" />
                    <span className="hidden sm:inline">{t.nav.dashboard}</span>
                  </Button>
                </Link>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={logout}
                  className="text-muted-foreground hover:text-destructive transition-colors"
                >
                  <LogOut className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <Link to="/login">
                <Button variant="default" size="sm" className="px-6 shadow-lg shadow-primary/25">
                  {t.nav.login}
                </Button>
              </Link>
            )}

            {/* Mobile Menu Button */}
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden"
              onClick={() => setIsMenuOpen(!isMenuOpen)}
            >
              {isMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </Button>
          </div>
        </div>

        {/* Mobile Menu */}
        {isMenuOpen && (
          <div className="md:hidden py-4 border-t border-border/50 animate-in slide-in-from-top-2">
            <nav className="flex flex-col gap-2 p-2">
              <Link
                to="/"
                className="px-4 py-3 text-sm font-medium hover:bg-muted rounded-lg"
                onClick={() => setIsMenuOpen(false)}
              >
                {t.nav.home}
              </Link>
              <Link
                to="/schemes"
                className="px-4 py-3 text-sm font-medium hover:bg-muted rounded-lg"
                onClick={() => setIsMenuOpen(false)}
              >
                {t.nav.schemes}
              </Link>
              <Link
                to="/about"
                className="px-4 py-3 text-sm font-medium hover:bg-muted rounded-lg"
                onClick={() => setIsMenuOpen(false)}
              >
                {t.nav.about}
              </Link>
            </nav>
          </div>
        )}
      </div>
    </header>
  );
};

export default Header;
