import React, { createContext, useContext, useState, useEffect } from 'react';

const WatchContext = createContext();

export const WatchProvider = ({ children }) => {
  const [watchProgress, setWatchProgress] = useState(() => {
    const saved = localStorage.getItem('watchProgress');
    return saved ? JSON.parse(saved) : {};
  });

  const [favorites, setFavorites] = useState(() => {
    const saved = localStorage.getItem('favorites');
    return saved ? JSON.parse(saved) : [];
  });

  const [continueWatching, setContinueWatching] = useState(() => {
    const saved = localStorage.getItem('continueWatching');
    return saved ? JSON.parse(saved) : [];
  });

  useEffect(() => {
    localStorage.setItem('watchProgress', JSON.stringify(watchProgress));
  }, [watchProgress]);

  useEffect(() => {
    localStorage.setItem('favorites', JSON.stringify(favorites));
  }, [favorites]);

  useEffect(() => {
    localStorage.setItem('continueWatching', JSON.stringify(continueWatching));
  }, [continueWatching]);

  const updateProgress = (contentId, progress) => {
    setWatchProgress(prev => ({
      ...prev,
      [contentId]: progress
    }));
  };

  const toggleFavorite = (content) => {
    setFavorites(prev => {
      const exists = prev.some(item => item.id === content.id);
      if (exists) {
        return prev.filter(item => item.id !== content.id);
      }
      return [...prev, content];
    });
  };

  const addToContinueWatching = (content) => {
    setContinueWatching(prev => {
      const exists = prev.some(item => item.id === content.id);
      if (exists) {
        return prev.filter(item => item.id !== content.id).concat(content);
      }
      return [...prev, content];
    });
  };

  return (
    <WatchContext.Provider value={{
      watchProgress,
      favorites,
      continueWatching,
      updateProgress,
      toggleFavorite,
      addToContinueWatching
    }}>
      {children}
    </WatchContext.Provider>
  );
};

export const useWatch = () => {
  const context = useContext(WatchContext);
  if (!context) {
    throw new Error('useWatch must be used within a WatchProvider');
  }
  return context;
}; 