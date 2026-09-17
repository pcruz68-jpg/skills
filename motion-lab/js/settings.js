(() => {
  const STORAGE_KEY = 'motion-lab:parameters:v1';

  const read = () => {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
    } catch {
      return {};
    }
  };

  const write = (settings) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    } catch {
      // The demos remain usable when storage is unavailable.
    }
  };

  window.MotionLabSettings = {
    get(group, effect, property, fallback) {
      return read()?.[group]?.[effect]?.[property] ?? fallback;
    },
    set(group, effect, property, value) {
      const settings = read();
      settings[group] ||= {};
      settings[group][effect] ||= {};
      settings[group][effect][property] = value;
      write(settings);
    },
  };
})();
