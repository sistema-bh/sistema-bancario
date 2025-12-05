"use client";

import { useEffect } from 'react';

export default function ClientLogger() {
  useEffect(() => {
    console.log('Client JS executed: Next runtime is running.');
    // expose flag for debugging
    try { (window as any).__NEXT_CLIENT_LOGGED = true; } catch (e) {}
  }, []);
  return null;
}