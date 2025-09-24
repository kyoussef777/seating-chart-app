'use client';

import { useState, useEffect } from 'react';
import { Save, Settings as SettingsIcon, Eye, Heart } from 'lucide-react';

interface EventSettings {
  id: string;
  eventName: string;
  homePageText: string;
  updatedAt: string;
}

export default function EventSettings() {
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
        <div className="w-8 h-8 border-4 border-rose-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="text-gray-600">Loading event settings...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-900">Event Settings</h2>
        <a
          href="/"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
        >
          <Eye className="w-4 h-4" />
          Preview Guest Portal
        </a>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Settings Form */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center gap-3 mb-6">
            <SettingsIcon className="w-6 h-6 text-rose-500" />
            <h3 className="text-lg font-semibold text-gray-900">Configuration</h3>
          </div>

          <form onSubmit={handleSave} className="space-y-6">
            <div>
              <label htmlFor="eventName" className="block text-sm font-medium text-gray-700 mb-2">
                Event Name
              </label>
              <input
                type="text"
                id="eventName"
                value={settings.eventName}
                onChange={(e) => setSettings({ ...settings, eventName: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-rose-500 focus:border-rose-500"
                placeholder="e.g., Sarah & John's Wedding"
                required
              />
              <p className="text-xs text-gray-500 mt-1">
                This will be displayed as the main heading on the guest portal
              </p>
            </div>

            <div>
              <label htmlFor="homePageText" className="block text-sm font-medium text-gray-700 mb-2">
                Welcome Message
              </label>
              <textarea
                id="homePageText"
                value={settings.homePageText}
                onChange={(e) => setSettings({ ...settings, homePageText: e.target.value })}
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-rose-500 focus:border-rose-500"
                placeholder="Enter a welcome message for your guests..."
                required
              />
              <p className="text-xs text-gray-500 mt-1">
                This message will appear below the event name on the guest portal
              </p>
            </div>

            <div className="flex items-center justify-between pt-4 border-t border-gray-200">
              <div>
                {settings.updatedAt && (
                  <p className="text-xs text-gray-500">
                    Last updated: {new Date(settings.updatedAt).toLocaleString()}
                  </p>
                )}
              </div>
              <div className="flex items-center gap-3">
                {saved && (
                  <span className="text-green-600 text-sm font-medium">
                    Settings saved!
                  </span>
                )}
                <button
                  type="submit"
                  disabled={saving}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-rose-500 text-white rounded-lg hover:bg-rose-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {saving ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
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
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-6 flex items-center gap-2">
            <Eye className="w-5 h-5 text-rose-500" />
            Live Preview
          </h3>

          <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 bg-gradient-to-br from-pink-50 via-white to-rose-50">
            <div className="text-center">
              <div className="mx-auto w-12 h-12 bg-gradient-to-br from-pink-400 to-rose-500 rounded-full flex items-center justify-center mb-3">
                <Heart className="w-6 h-6 text-white fill-current" />
              </div>
              <h1 className="text-2xl font-bold text-gray-900 mb-2">
                {settings.eventName || 'Your Event Name'}
              </h1>
              <p className="text-gray-600">
                {settings.homePageText || 'Your welcome message will appear here'}
              </p>
            </div>

            <div className="mt-6 bg-white rounded-lg shadow p-4 border border-rose-100">
              <div className="text-center">
                <p className="text-sm text-gray-500 mb-2">Guest Search Form</p>
                <div className="bg-gray-100 rounded-lg p-3 text-sm text-gray-400">
                  Enter Your Name
                  <div className="mt-2 bg-white rounded border px-3 py-2 text-left">
                    Type your full name...
                  </div>
                  <button className="mt-2 w-full bg-gradient-to-r from-pink-500 to-rose-500 text-white py-2 px-4 rounded-lg text-sm">
                    Find My Table
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-blue-800 text-sm">
              <strong>💡 Tip:</strong> Changes are saved automatically and will be visible to guests immediately on the portal.
            </p>
          </div>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Information</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-gradient-to-br from-pink-50 to-rose-50 rounded-lg p-4 border border-rose-100">
            <h4 className="font-medium text-gray-900 mb-1">Guest Portal URL</h4>
            <p className="text-sm text-gray-600 break-all">
              {typeof window !== 'undefined' ? window.location.origin : 'Your domain'}
            </p>
          </div>
          <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg p-4 border border-blue-100">
            <h4 className="font-medium text-gray-900 mb-1">Admin Portal URL</h4>
            <p className="text-sm text-gray-600 break-all">
              {typeof window !== 'undefined' ? `${window.location.origin}/admin` : 'Your domain/admin'}
            </p>
          </div>
          <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-lg p-4 border border-green-100">
            <h4 className="font-medium text-gray-900 mb-1">CSV Import Format</h4>
            <p className="text-sm text-gray-600">
              Columns: name, phoneNumber, address
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}