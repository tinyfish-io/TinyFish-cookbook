"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertTriangle, Trash2 } from 'lucide-react';
import type { QASettings } from '@/types';

interface SettingsPanelProps {
  settings: QASettings;
  onSettingsChange: (settings: Partial<QASettings>) => void;
  onClearData: () => void;
}

export function SettingsPanel({
  settings,
  onSettingsChange,
  onClearData,
}: SettingsPanelProps) {
  return (
    <div className="space-y-6 max-w-2xl">
      {/* Execution Settings */}
      <Card>
        <CardHeader>
          <CardTitle>Execution Settings</CardTitle>
          <CardDescription>
            Configure how tests are executed
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="parallelLimit">Parallel Test Limit</Label>
              <Select
                value={settings.parallelLimit.toString()}
                onValueChange={(v) => onSettingsChange({ parallelLimit: parseInt(v) })}
              >
                <SelectTrigger id="parallelLimit">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">1 (Sequential)</SelectItem>
                  <SelectItem value="2">2</SelectItem>
                  <SelectItem value="3">3</SelectItem>
                  <SelectItem value="5">5</SelectItem>
                  <SelectItem value="10">10</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Number of tests to run simultaneously
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="timeout">Default Timeout (seconds)</Label>
              <Input
                id="timeout"
                type="number"
                min="10"
                max="300"
                value={settings.defaultTimeout / 1000}
                onChange={(e) => onSettingsChange({ defaultTimeout: parseInt(e.target.value) * 1000 })}
              />
              <p className="text-xs text-muted-foreground">
                Maximum time for each test
              </p>
            </div>
          </div>

                  </CardContent>
      </Card>

      {/* Browser Settings */}
      <Card>
        <CardHeader>
          <CardTitle>Browser Settings</CardTitle>
          <CardDescription>
            Configure browser behavior for test execution
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="browserProfile">Browser Profile</Label>
            <Select
              value={settings.browserProfile}
              onValueChange={(v) => onSettingsChange({ browserProfile: v as 'lite' | 'stealth' })}
            >
              <SelectTrigger id="browserProfile">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="lite">Lite (Fast)</SelectItem>
                <SelectItem value="stealth">Stealth (Anti-detection)</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Use &quot;Stealth&quot; for sites with bot protection (Cloudflare, CAPTCHAs)
            </p>
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Enable Proxy</Label>
              <p className="text-xs text-muted-foreground">
                Route requests through a proxy server
              </p>
            </div>
            <Switch
              checked={settings.proxyEnabled}
              onCheckedChange={(v) => onSettingsChange({ proxyEnabled: v })}
            />
          </div>

          {settings.proxyEnabled && (
            <div className="space-y-2">
              <Label htmlFor="proxyCountry">Proxy Country</Label>
              <Select
                value={settings.proxyCountry || 'US'}
                onValueChange={(v) => onSettingsChange({ proxyCountry: v as QASettings['proxyCountry'] })}
              >
                <SelectTrigger id="proxyCountry">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="US">United States</SelectItem>
                  <SelectItem value="GB">United Kingdom</SelectItem>
                  <SelectItem value="CA">Canada</SelectItem>
                  <SelectItem value="DE">Germany</SelectItem>
                  <SelectItem value="FR">France</SelectItem>
                  <SelectItem value="JP">Japan</SelectItem>
                  <SelectItem value="AU">Australia</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Data Management */}
      <Card className="border-destructive/50">
        <CardHeader>
          <CardTitle className="text-destructive">Danger Zone</CardTitle>
          <CardDescription>
            Irreversible actions that affect your data
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Alert variant="destructive" className="mb-4">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Warning</AlertTitle>
            <AlertDescription>
              This will permanently delete all projects, test cases, and test results.
              This action cannot be undone.
            </AlertDescription>
          </Alert>

          <Button variant="destructive" onClick={onClearData}>
            <Trash2 className="mr-2 h-4 w-4" />
            Clear All Data
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
