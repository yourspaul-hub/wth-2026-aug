import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { CheckCircle2, AlertCircle } from 'lucide-react';
import { adminListIntegrations } from '../../lib/api';

export const useIntegrationSection = (labelPrefix) => {
  const [section, setSection] = useState(undefined);
  useEffect(() => {
    adminListIntegrations()
      .then(d => setSection((d.sections || []).find(s => s.label.startsWith(labelPrefix)) || null))
      .catch(() => setSection(null));
  }, [labelPrefix]);
  return section;
};

export const IntegrationBanner = ({ section, liveText, offText, testId }) => {
  if (section === undefined) return null;
  const live = section?.status === 'configured';
  return (
    <div data-testid={testId} className={`rounded-lg p-4 mb-6 text-sm flex items-start gap-3 border ${live ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-amber-50 border-amber-200 text-amber-800'}`}>
      {live ? <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0" /> : <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />}
      <div>
        {live ? liveText : <>{offText} <Link to="/admin/integrations" className="underline font-medium">Open Integrations</Link></>}
      </div>
    </div>
  );
};
