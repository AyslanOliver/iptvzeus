import React, { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext();

export function useAuth() {
  return useContext(AuthContext);
}

export function AuthProvider({ children }) {
  const [credentials, setCredentials] = useState(null);

  useEffect(() => {
    const savedUser = localStorage.getItem('iptvUser');
    if (savedUser) {
      const user = JSON.parse(savedUser);
      setCredentials({
        username: user.username,
        password: user.password,
        dns: 'http://nxczs.top'
      });
    }
  }, []);

  const value = {
    credentials,
    setCredentials
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}