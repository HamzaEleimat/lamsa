// Web polyfill for react-native-localize
const getLocales = () => {
  const language = navigator.language || navigator.userLanguage || 'en';
  const languageCode = language.split('-')[0];
  
  return [{
    languageCode,
    languageTag: language,
    countryCode: language.split('-')[1] || 'US',
    currencyCode: 'USD',
    temperatureUnit: 'celsius',
    is24HourCycle: true,
    usesMetricSystem: true
  }];
};

const findBestLanguageTag = (languageTags) => {
  const locales = getLocales();
  const userLanguage = locales[0].languageCode;
  
  // Find exact match first
  const exactMatch = languageTags.find(tag => 
    tag.toLowerCase() === userLanguage.toLowerCase()
  );
  
  if (exactMatch) return { languageTag: exactMatch };
  
  // Return first available language as fallback
  return { languageTag: languageTags[0] };
};

const getNumberFormatSettings = () => ({
  decimalSeparator: '.',
  groupingSeparator: ','
});

const getCalendar = () => 'gregorian';

const getCountry = () => 'US';

const getCurrencies = () => ['USD'];

const getTemperatureUnit = () => 'celsius';

const getTimeZone = () => Intl.DateTimeFormat().resolvedOptions().timeZone;

const uses24HourClock = () => true;

const usesMetricSystem = () => true;

const usesAutoDateAndTime = () => true;

const usesAutoDarkMode = () => false;

export {
  getLocales,
  findBestLanguageTag,
  getNumberFormatSettings,
  getCalendar,
  getCountry,
  getCurrencies,
  getTemperatureUnit,
  getTimeZone,
  uses24HourClock,
  usesMetricSystem,
  usesAutoDateAndTime,
  usesAutoDarkMode,
};

export default {
  getLocales,
  findBestLanguageTag,
  getNumberFormatSettings,
  getCalendar,
  getCountry,
  getCurrencies,
  getTemperatureUnit,
  getTimeZone,
  uses24HourClock,
  usesMetricSystem,
  usesAutoDateAndTime,
  usesAutoDarkMode,
};