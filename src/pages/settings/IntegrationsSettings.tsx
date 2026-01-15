import { SettingsLayout } from '@/layouts/SettingsLayout';
import { Integrations } from '@/components/tabs/Integrations';

export default function IntegrationsSettings() {
  return (
    <SettingsLayout>
      <div className="max-w-4xl">
        <Integrations />
      </div>
    </SettingsLayout>
  );
}
