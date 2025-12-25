import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import UserMenu from '@/components/UserMenu';
import { 
  Settings as SettingsIcon, 
  User, 
  Palette, 
  Zap, 
  Database, 
  Keyboard,
  Upload,
  Check,
  X
} from 'lucide-react';
import { toast } from 'sonner';
import { SHORTCUT_DEFINITIONS } from '@/hooks/useKeyboardShortcuts';

interface UserSettings {
  displayName: string;
  avatarUrl: string;
  darkMode: boolean;
  autoSave: boolean;
}

interface APIKeys {
  replicate: string;
  gemini: string;
  adobeFirefly: string;
}

const Settings = () => {
  const [userSettings, setUserSettings] = useState<UserSettings>({
    displayName: '',
    avatarUrl: '',
    darkMode: false,
    autoSave: true,
  });
  
  const [apiKeys, setApiKeys] = useState<APIKeys>({
    replicate: '',
    gemini: '',
    adobeFirefly: '',
  });
  
  const [imageQuality, setImageQuality] = useState([80]);
  const [defaultAspectRatio, setDefaultAspectRatio] = useState('1:1');
  const [preferredAIProvider, setPreferredAIProvider] = useState('replicate');

  // Load settings from localStorage
  useEffect(() => {
    const savedSettings = localStorage.getItem('storybook-user-settings');
    if (savedSettings) {
      try {
        const parsed = JSON.parse(savedSettings);
        setUserSettings(parsed.userSettings || userSettings);
        setApiKeys(parsed.apiKeys || apiKeys);
        setImageQuality(parsed.imageQuality || [80]);
        setDefaultAspectRatio(parsed.defaultAspectRatio || '1:1');
        setPreferredAIProvider(parsed.preferredAIProvider || 'replicate');
      } catch (e) {
        console.error('Failed to load settings:', e);
      }
    }
  }, []);

  // Save settings to localStorage
  const saveSettings = () => {
    const settings = {
      userSettings,
      apiKeys,
      imageQuality,
      defaultAspectRatio,
      preferredAIProvider,
    };
    localStorage.setItem('storybook-user-settings', JSON.stringify(settings));
    toast.success('Settings saved successfully!');
  };

  const handleAvatarUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setUserSettings(prev => ({ ...prev, avatarUrl: reader.result as string }));
      };
      reader.readAsDataURL(file);
    }
  };

  const getApiStatus = (key: string) => {
    return key.length > 10;
  };

  const formatShortcut = (shortcut: { key: string; ctrl?: boolean; shift?: boolean; alt?: boolean; description: string }) => {
    const parts = [];
    if (shortcut.ctrl) parts.push('Ctrl');
    if (shortcut.shift) parts.push('Shift');
    if (shortcut.alt) parts.push('Alt');
    parts.push(shortcut.key === ' ' ? 'Space' : shortcut.key);
    return parts.join(' + ');
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-amber-500 via-orange-500 to-rose-500 bg-clip-text text-transparent">
              Settings
            </h1>
            <p className="text-muted-foreground mt-2">
              Configure your preferences and application settings
            </p>
          </div>
          <UserMenu />
        </div>

        <div className="grid gap-6 max-w-4xl">
          {/* User Profile */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                User Profile
              </CardTitle>
              <CardDescription>Manage your profile information</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center gap-6">
                <div className="relative">
                  <Avatar className="h-20 w-20">
                    <AvatarImage src={userSettings.avatarUrl} />
                    <AvatarFallback className="text-2xl">
                      {userSettings.displayName?.charAt(0)?.toUpperCase() || 'U'}
                    </AvatarFallback>
                  </Avatar>
                  <label 
                    htmlFor="avatar-upload" 
                    className="absolute bottom-0 right-0 p-1 bg-primary rounded-full cursor-pointer hover:bg-primary/90 transition-colors"
                  >
                    <Upload className="h-3 w-3 text-primary-foreground" />
                  </label>
                  <input 
                    id="avatar-upload" 
                    type="file" 
                    accept="image/*" 
                    className="hidden" 
                    onChange={handleAvatarUpload}
                  />
                </div>
                <div className="flex-1 space-y-2">
                  <Label htmlFor="display-name">Display Name</Label>
                  <Input
                    id="display-name"
                    value={userSettings.displayName}
                    onChange={(e) => setUserSettings(prev => ({ ...prev, displayName: e.target.value }))}
                    placeholder="Enter your name"
                  />
                </div>
              </div>
              
              <Separator />
              
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="dark-mode">Dark Mode</Label>
                  <p className="text-sm text-muted-foreground">Toggle between light and dark themes</p>
                </div>
                <Switch
                  id="dark-mode"
                  checked={userSettings.darkMode}
                  onCheckedChange={(checked) => setUserSettings(prev => ({ ...prev, darkMode: checked }))}
                />
              </div>
              
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="auto-save">Auto Save</Label>
                  <p className="text-sm text-muted-foreground">Automatically save your work every 30 seconds</p>
                </div>
                <Switch
                  id="auto-save"
                  checked={userSettings.autoSave}
                  onCheckedChange={(checked) => setUserSettings(prev => ({ ...prev, autoSave: checked }))}
                />
              </div>
            </CardContent>
          </Card>

          {/* API Configuration */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Database className="h-5 w-5" />
                API Configuration
              </CardTitle>
              <CardDescription>Connect your AI service providers</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Preferred Provider */}
              <div className="space-y-2">
                <Label>Preferred AI Provider</Label>
                <Select value={preferredAIProvider} onValueChange={setPreferredAIProvider}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select provider" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="replicate">Replicate</SelectItem>
                    <SelectItem value="gemini">Google Gemini</SelectItem>
                    <SelectItem value="adobeFirefly">Adobe Firefly</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-sm text-muted-foreground">
                  This provider will be used for image generation by default
                </p>
              </div>

              <Separator />

              {/* Replicate */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="replicate-key">Replicate API Key</Label>
                  <Badge variant={getApiStatus(apiKeys.replicate) ? "default" : "secondary"}>
                    {getApiStatus(apiKeys.replicate) ? (
                      <><Check className="h-3 w-3 mr-1" /> Connected</>
                    ) : (
                      <><X className="h-3 w-3 mr-1" /> Not configured</>
                    )}
                  </Badge>
                </div>
                <Input
                  id="replicate-key"
                  type="password"
                  value={apiKeys.replicate}
                  onChange={(e) => setApiKeys(prev => ({ ...prev, replicate: e.target.value }))}
                  placeholder="r8_xxxxxxxxxxxx"
                  className="font-mono"
                />
              </div>

              {/* Gemini */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="gemini-key">Google Gemini API Key</Label>
                  <Badge variant={getApiStatus(apiKeys.gemini) ? "default" : "secondary"}>
                    {getApiStatus(apiKeys.gemini) ? (
                      <><Check className="h-3 w-3 mr-1" /> Connected</>
                    ) : (
                      <><X className="h-3 w-3 mr-1" /> Not configured</>
                    )}
                  </Badge>
                </div>
                <Input
                  id="gemini-key"
                  type="password"
                  value={apiKeys.gemini}
                  onChange={(e) => setApiKeys(prev => ({ ...prev, gemini: e.target.value }))}
                  placeholder="AIzaSyxxxxxxxxxx"
                  className="font-mono"
                />
              </div>

              {/* Adobe Firefly */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="firefly-key">Adobe Firefly API Key</Label>
                  <Badge variant={getApiStatus(apiKeys.adobeFirefly) ? "default" : "secondary"}>
                    {getApiStatus(apiKeys.adobeFirefly) ? (
                      <><Check className="h-3 w-3 mr-1" /> Connected</>
                    ) : (
                      <><X className="h-3 w-3 mr-1" /> Not configured</>
                    )}
                  </Badge>
                </div>
                <Input
                  id="firefly-key"
                  type="password"
                  value={apiKeys.adobeFirefly}
                  onChange={(e) => setApiKeys(prev => ({ ...prev, adobeFirefly: e.target.value }))}
                  placeholder="Enter your Adobe Firefly API key"
                  className="font-mono"
                />
              </div>
            </CardContent>
          </Card>

          {/* Generation Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Zap className="h-5 w-5" />
                Generation Settings
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="image-quality">Default Image Quality</Label>
                <div className="px-3">
                  <Slider
                    id="image-quality"
                    value={imageQuality}
                    onValueChange={setImageQuality}
                    min={10}
                    max={100}
                    step={10}
                    className="w-full"
                  />
                  <div className="flex justify-between text-xs text-muted-foreground mt-1">
                    <span>Low</span>
                    <span>Medium</span>
                    <span>High</span>
                  </div>
                </div>
                <p className="text-sm text-muted-foreground">Current: {imageQuality[0]}%</p>
              </div>

              <Separator />

              <div className="space-y-2">
                <Label htmlFor="aspect-ratio">Default Aspect Ratio</Label>
                <Select value={defaultAspectRatio} onValueChange={setDefaultAspectRatio}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select aspect ratio" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1:1">Square (1:1)</SelectItem>
                    <SelectItem value="16:9">Widescreen (16:9)</SelectItem>
                    <SelectItem value="4:3">Standard (4:3)</SelectItem>
                    <SelectItem value="3:2">Portrait (3:2)</SelectItem>
                    <SelectItem value="9:16">Mobile (9:16)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Keyboard Shortcuts */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Keyboard className="h-5 w-5" />
                Keyboard Shortcuts
              </CardTitle>
              <CardDescription>Quick reference for keyboard shortcuts</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {SHORTCUT_DEFINITIONS.map((shortcut, index) => (
                  <div 
                    key={index} 
                    className="flex items-center justify-between py-2 px-3 rounded-md bg-muted/50"
                  >
                    <span className="text-sm text-muted-foreground">{shortcut.description}</span>
                    <kbd className="px-2 py-1 text-xs font-mono bg-background border rounded shadow-sm">
                      {formatShortcut(shortcut)}
                    </kbd>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Theme Customization */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Palette className="h-5 w-5" />
                Theme Customization
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Primary Color</Label>
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-primary rounded border"></div>
                    <Input type="color" defaultValue="#f97316" className="w-16 h-8 p-0 border-0" />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Accent Color</Label>
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-accent rounded border"></div>
                    <Input type="color" defaultValue="#f59e0b" className="w-16 h-8 p-0 border-0" />
                  </div>
                </div>
              </div>

              <Separator />

              <div className="flex justify-between">
                <Button variant="outline">Reset to Default</Button>
                <Button onClick={saveSettings}>Save All Settings</Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Settings;
