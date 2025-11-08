'use client';

import { useState, useEffect } from 'react';
import { Save, Settings as SettingsIcon, Eye, Heart } from 'lucide-react';
import { useTheme } from '@/hooks/useTheme';

interface EventSettings {
  id: string;
  eventName: string;
  homePageText: string;
  updatedAt: string;
}

export default function EventSettings() {
  const themeConfig = useTheme();
  const [settings, setSettings] = useState<EventSettings>({
    id: '',
    eventName: 'Our Special Day',
    homePageText: 'Welcome to our wedding! Please find your table below.',
    updatedAt: '',
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const response = await fetch('/api/settings');
      const data = await response.json();
      if (response.ok) {
        setSettings(data.settings);
      }
    } catch (error) {
      console.error('Failed to fetch settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSaved(false);

    try {
      const response = await fetch('/api/settings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          eventName: settings.eventName.trim(),
          homePageText: settings.homePageText.trim(),
        }),
      });

      const data = await response.json();
      if (response.ok) {
        setSettings(data.settings);
        setSaved(true);
        setTimeout(() => setSaved(false), 3000);
      }
    } catch (error) {
      console.error('Failed to save settings:', error);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className={`w-8 h-8 border-4 ${themeConfig.loading.spinner} border-t-transparent rounded-full animate-spin mx-auto mb-4`} />
        <p className={themeConfig.loading.text}>Loading event settings...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className={`text-2xl font-bold ${themeConfig.text.heading}`}>Event Settings</h2>
        <a
          href="/"
          target="_blank"
          rel="noopener noreferrer"
          className={`inline-flex items-center gap-2 px-4 py-2 ${themeConfig.button.secondary}`}
        >
          <Eye className="w-4 h-4" />
          Preview Guest Portal
        </a>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Settings Form */}
        <div className={themeConfig.card}>
          <div className="flex items-center gap-3 mb-6">
            <SettingsIcon className={`w-6 h-6 ${themeConfig.icon.color.primary}`} />
            <h3 className={`text-lg font-semibold ${themeConfig.text.heading}`}>Configuration</h3>
          </div>

          <form onSubmit={handleSave} className="space-y-6">
            <div>
              <label htmlFor="eventName" className={themeConfig.text.label}>
                Event Name
              </label>
              <input
                type="text"
                id="eventName"
                value={settings.eventName}
                onChange={(e) => setSettings({ ...settings, eventName: e.target.value })}
                className={themeConfig.input}
                placeholder="e.g., Sarah & John's Wedding"
                required
              />
              <p className={`text-xs ${themeConfig.text.muted} mt-1`}>
                This will be displayed as the main heading on the guest portal
              </p>
            </div>

            <div>
              <label htmlFor="homePageText" className={themeConfig.text.label}>
                Welcome Message
              </label>
              <textarea
                id="homePageText"
                value={settings.homePageText}
                onChange={(e) => setSettings({ ...settings, homePageText: e.target.value })}
                rows={4}
                className={themeConfig.input}
                placeholder="Enter a welcome message for your guests..."
                required
              />
              <p className={`text-xs ${themeConfig.text.muted} mt-1`}>
                This message will appear below the event name on the guest portal
              </p>
            </div>

            <div className={`flex items-center justify-between pt-4 border-t ${themeConfig.classes.borderDefault}`}>
              <div>
                {settings.updatedAt && (
                  <p className={`text-xs ${themeConfig.text.muted}`}>
                    Last updated: {new Date(settings.updatedAt).toLocaleString()}
                  </p>
                )}
              </div>
              <div className="flex items-center gap-3">
                {saved && (
                  <span className={`${themeConfig.theme.semantic.success.text} text-sm font-medium`}>
                    Settings saved!
                  </span>
                )}
                <button
                  type="submit"
                  disabled={saving}
                  className={`inline-flex items-center gap-2 px-4 py-2 ${themeConfig.button.primary}`}
                >
                  {saving ? (
                    <>
                      <div className="w-4 h-4 border-2 text-white border-t-transparent rounded-full animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4" />
                      Save Settings
                    </>
                  )}
                </button>
              </div>
            </div>
          </form>
        </div>

        {/* Live Preview */}
        <div className={themeConfig.card}>
          <h3 className={`text-lg font-semibold ${themeConfig.text.heading} mb-6 flex items-center gap-2`}>
            <Eye className={`w-5 h-5 ${themeConfig.icon.color.primary}`} />
            Live Preview
          </h3>

          <div className={`border-2 border-dashed ${themeConfig.classes.borderDefault} rounded-lg p-4 ${themeConfig.theme.gradient.floral}`}>
            <div className="text-center">
              <div className={`mx-auto w-12 h-12 ${themeConfig.icon.primary} mb-3`}>
                <Heart className="w-6 h-6 fill-current" />
              </div>
              <h1 className={`text-2xl font-bold ${themeConfig.text.heading} mb-2`}>
                {settings.eventName || 'Your Event Name'}
              </h1>
              <p className={themeConfig.text.body}>
                {settings.homePageText || 'Your welcome message will appear here'}
              </p>
            </div>

            <div className={`mt-6 bg-white rounded-lg shadow p-4 ${themeConfig.classes.borderBeige}`}>
              <div className="text-center">
                <p className={`text-sm ${themeConfig.text.body} mb-2`}>Guest Search Form</p>
                <div className={`${themeConfig.theme.secondary[100]} rounded-lg p-3 text-sm ${themeConfig.text.body}`}>
                  Enter Your Name
                  <div className={`mt-2 bg-white rounded border px-3 py-2 text-left ${themeConfig.text.body}`}>
                    Type your full name...
                  </div>
                  <button className={`mt-2 w-full ${themeConfig.button.primary} text-sm`}>
                    Find My Table
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div className={`mt-4 p-3 ${themeConfig.toast.info}`}>
            <p className="text-sm">
              <strong>💡 Tip:</strong> Changes are saved automatically and will be visible to guests immediately on the portal.
            </p>
          </div>
        </div>
      </div>

      {/* Quick Stats */}
      <div className={themeConfig.card}>
        <h3 className={`text-lg font-semibold ${themeConfig.text.heading} mb-4`}>Quick Information</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className={`${themeConfig.theme.gradient.floral} rounded-lg p-4 ${themeConfig.classes.borderBeige}`}>
            <h4 className={`font-medium ${themeConfig.text.heading} mb-1`}>Guest Portal URL</h4>
            <p className={`text-sm ${themeConfig.text.body} break-all`}>
              {typeof window !== 'undefined' ? window.location.origin : 'Your domain'}
            </p>
          </div>
          <div className={`${themeConfig.theme.gradient.floral} rounded-lg p-4 ${themeConfig.classes.borderBeige}`}>
            <h4 className={`font-medium ${themeConfig.text.heading} mb-1`}>Admin Portal URL</h4>
            <p className={`text-sm ${themeConfig.text.body} break-all`}>
              {typeof window !== 'undefined' ? `${window.location.origin}/admin` : 'Your domain/admin'}
            </p>
          </div>
          <div className={`${themeConfig.theme.gradient.floral} rounded-lg p-4 ${themeConfig.classes.borderBeige}`}>
            <h4 className={`font-medium ${themeConfig.text.heading} mb-1`}>CSV Import Format</h4>
            <p className={`text-sm ${themeConfig.text.body}`}>
              Columns: name, phoneNumber, address
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}