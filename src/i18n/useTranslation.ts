import { useCallback } from 'react';
import { useStore } from '../store/useStore';
import { translations, TranslationKey } from './translations';

export function useTranslation() {
  const language = useStore((s) => s.language);

  const t = useCallback(
    (key: TranslationKey): string => {
      return translations[language]?.[key] || translations.en[key] || key;
    },
    [language]
  );

  return { t, language };
}
