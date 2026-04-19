import { useTranslation } from 'react-i18next';

function LanguageSwitcher() {
  const { i18n, t } = useTranslation();
  const currentLang = (i18n.resolvedLanguage || i18n.language || 'en').split('-')[0];

  const switchLanguage = (lang) => {
    i18n.changeLanguage(lang);
    localStorage.setItem('app_language', lang);
  };

  return (
    <div className="nb-lang-switcher" role="group" aria-label={t('accessibility.languageSwitcher')}>
      <button
        type="button"
        className={`nb-lang-btn${currentLang === 'en' ? ' nb-lang-btn--active' : ''}`}
        onClick={() => switchLanguage('en')}
        aria-pressed={currentLang === 'en'}
        title={t('language.english')}
      >
        EN
      </button>
      <button
        type="button"
        className={`nb-lang-btn${currentLang === 'fr' ? ' nb-lang-btn--active' : ''}`}
        onClick={() => switchLanguage('fr')}
        aria-pressed={currentLang === 'fr'}
        title={t('language.french')}
      >
        FR
      </button>
    </div>
  );
}

export default LanguageSwitcher;
