import React, { createContext, useContext, useEffect, useState } from 'react';
import { getDb } from './db';
import { getSetting, setSetting } from '../../src/persistence/repository.ts';
import { STRINGS, isLang, type Dict, type Lang } from './i18n';

export interface LangState {
  readonly lang: Lang;
  readonly t: Dict;
  readonly setLang: (lang: Lang) => boolean;
}

const LangContext = createContext<LangState>({ lang: 'es', t: STRINGS.es, setLang: () => true });

export function LangProvider({ children }: { children: React.ReactNode }): React.JSX.Element {
  const [lang, setLangState] = useState<Lang>('es');
  useEffect(() => {
    try {
      const stored = getSetting(getDb(), 'locale');
      if (isLang(stored)) {
        setLangState(stored);
      }
    } catch {
      /* default language stands */
    }
  }, []);
  function setLang(next: Lang): boolean {
    try {
      setSetting(getDb(), 'locale', next);
      setLangState(next);
      return true;
    } catch {
      return false;
    }
  }
  return <LangContext.Provider value={{ lang, t: STRINGS[lang], setLang }}>{children}</LangContext.Provider>;
}

export function useStrings(): LangState {
  return useContext(LangContext);
}
